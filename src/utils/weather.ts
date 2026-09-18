/**
 * 天气：先按 IP 定位，再取当前气温与天气代码。
 * 两个接口都免 key 且允许跨域：ipwho.is（定位）/ api.open-meteo.com（天气）。
 * 结果缓存 30 分钟，离线时直接用上次缓存。
 */

export type WeatherIconKey = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

export interface WeatherInfo {
  temp: number;
  label: string;
  icon: WeatherIconKey;
  /** 当前所在的区/县（定位到区域），拿不到时退回城市名 */
  area?: string;
  /** 所属省市，用于悬停时展示完整位置 */
  region?: string;
  city?: string;
  updatedAt: number;
}

const CACHE_KEY = 'photo-album-weather';
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
const REQUEST_TIMEOUT = 8000;

/** WMO 天气代码 → 短文案 + 图标 */
function describe(code: number): { label: string; icon: WeatherIconKey } {
  if (code === 0) return { label: '晴', icon: 'sun' };
  if (code === 1) return { label: '大部晴', icon: 'partly' };
  if (code === 2) return { label: '多云', icon: 'partly' };
  if (code === 3) return { label: '阴', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: '雾', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: '毛毛雨', icon: 'rain' };
  if (code >= 61 && code <= 67) return { label: '雨', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: '雪', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: '阵雨', icon: 'rain' };
  if (code === 85 || code === 86) return { label: '阵雪', icon: 'snow' };
  if (code >= 95) return { label: '雷阵雨', icon: 'storm' };
  return { label: '—', icon: 'cloud' };
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[Weather] 请求失败:', url, e);
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** 按 IP 定位（两个服务互为兜底） */
async function locate(): Promise<{ lat: number; lon: number; city?: string } | null> {
  const primary = await fetchJson('https://ipwho.is/');
  if (primary && primary.success !== false && typeof primary.latitude === 'number') {
    return { lat: primary.latitude, lon: primary.longitude, city: primary.city };
  }

  const backup = await fetchJson('https://ipapi.co/json/');
  if (backup && typeof backup.latitude === 'number') {
    return { lat: backup.latitude, lon: backup.longitude, city: backup.city };
  }

  return null;
}

/**
 * 用经纬度反查行政区（省 / 市 / 区县），中文简体。
 * BigDataCloud 的客户端接口免 key 且允许跨域，精度能到区县。
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ area?: string; region?: string; city?: string }> {
  const url =
    'https://api.bigdatacloud.net/data/reverse-geocode-client' +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=zh-Hans`;
  const data = await fetchJson(url);
  if (!data) return {};
  return {
    area: data.locality || undefined, // 区 / 县
    city: data.city || undefined, // 市
    region: data.principalSubdivision || undefined, // 省 / 直辖市
  };
}

export function loadCachedWeather(): WeatherInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WeatherInfo;
    if (typeof data?.temp !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** 获取天气（优先用未过期的缓存） */
export async function getWeather(force = false): Promise<WeatherInfo | null> {
  const cached = loadCachedWeather();
  if (!force && cached && Date.now() - cached.updatedAt < CACHE_TTL) {
    return cached;
  }

  const geo = await locate();
  if (!geo) {
    console.warn('[Weather] 定位失败，沿用缓存（如有）');
    return cached;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
    '&current=temperature_2m,weather_code&timezone=auto';
  const data = await fetchJson(url);
  const current = data?.current;
  if (!current || typeof current.temperature_2m !== 'number') {
    return cached;
  }

  // 反查行政区，定位到区/县一级（失败就沿用 IP 返回的城市）
  const place = await reverseGeocode(geo.lat, geo.lon);

  const { label, icon } = describe(Number(current.weather_code));
  const info: WeatherInfo = {
    temp: Math.round(Number(current.temperature_2m)),
    label,
    icon,
    area: place.area || place.city || geo.city,
    region: place.region,
    city: place.city || geo.city,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(info));
  } catch {
    /* 忽略写入失败 */
  }
  console.log('[Weather] ☀️ 已更新天气:', info.city, info.label, info.temp + '°');
  return info;
}
