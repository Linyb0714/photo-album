use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use image::ImageFormat;
use walkdir::WalkDir;
use tauri::Manager;

/// 媒体类型：image 或 video
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Image,
    Video,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhotoInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub aspect_ratio: f32,
    pub created_at: String,
    pub thumbnail: Option<String>,
    pub media_type: MediaType,
    /// 视频时长（秒），仅 video 类型有效
    pub duration: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderInfo {
    pub path: String,
    pub name: String,
    pub photo_count: usize,
}

const IMAGE_EXTENSIONS: [&str; 8] = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"];
const VIDEO_EXTENSIONS: [&str; 9] = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "wmv", "flv", "mpeg"];

/// 判断扩展名属于图片还是视频
fn classify_media(ext: &str) -> Option<MediaType> {
    let e = ext.to_lowercase();
    if IMAGE_EXTENSIONS.contains(&e.as_str()) {
        Some(MediaType::Image)
    } else if VIDEO_EXTENSIONS.contains(&e.as_str()) {
        Some(MediaType::Video)
    } else {
        None
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've got a Tauri app running!", name)
}

#[tauri::command]
fn read_folder(path: String) -> Result<Vec<PhotoInfo>, String> {
    let mut photos = Vec::new();
    
    println!("[Tauri] 开始读取文件夹：{}", path);
    
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let media_type = match classify_media(ext) {
                    Some(t) => t,
                    None => continue,
                };
                if let Ok(metadata) = fs::metadata(path) {
                    let file_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    
                    let abs_path = path.to_string_lossy().to_string();
                    
                    let (width, height, thumbnail, duration) = match media_type {
                        MediaType::Image => {
                            // 读取图片尺寸并生成缩略图
                            if let Ok(img) = image::open(path) {
                                let (w, h) = (img.width(), img.height());
                                let thumbnail = {
                                    let thumb = img.thumbnail(400, 300);
                                    let mut buf = Vec::new();
                                    let mut cursor = std::io::Cursor::new(&mut buf);
                                    if thumb.write_to(&mut cursor, ImageFormat::Jpeg).is_ok() {
                                        Some(format!("data:image/jpeg;base64,{}",
                                            BASE64.encode(&buf)))
                                    } else {
                                        None
                                    }
                                };
                                (w, h, thumbnail, None)
                            } else {
                                (0, 0, None, None)
                            }
                        }
                        MediaType::Video => {
                            // 视频不解析元数据（避免引入额外依赖），
                            // 默认 16:9 宽高比，尺寸由前端 <video> 标签加载时自动读取
                            (1920, 1080, None, None)
                        }
                    };
                    
                    let aspect_ratio = if height > 0 {
                        width as f32 / height as f32
                    } else {
                        1.0
                    };
                    
                    let created_at = metadata.created()
                        .map(|t| {
                            t.duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_secs().to_string())
                                .unwrap_or_else(|_| String::from("unknown"))
                        })
                        .unwrap_or_else(|_| String::from("unknown"));
                    
                    photos.push(PhotoInfo {
                        id: uuid::Uuid::new_v4().to_string(),
                        path: abs_path,
                        name: file_name.clone(),
                        width,
                        height,
                        aspect_ratio,
                        created_at,
                        thumbnail,
                        media_type,
                        duration,
                    });
                    
                    println!("[Tauri]   ✅ 找到{}：{} ({}x{})",
                        if media_type == MediaType::Video { "视频" } else { "图片" },
                        file_name, width, height);
                }
            }
        }
    }
    
    println!("[Tauri] 读取完成，共找到 {} 个媒体文件", photos.len());
    // 排序：图片在前（按文件名升序），视频在后（按文件名升序）
    photos.sort_by(|a, b| {
        let a_is_video = a.media_type == MediaType::Video;
        let b_is_video = b.media_type == MediaType::Video;
        match (a_is_video, b_is_video) {
            (false, true) => std::cmp::Ordering::Less,
            (true, false) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    Ok(photos)
}

/// 自动定位并扫描【爱你❤️】默认相册
/// 优先级：
///   1. 应用资源目录下的 my-love（生产打包后）
///   2. 项目 public/my-love（dev 模式，通过 CARGO_MANIFEST_DIR 推算项目根）
///   3. ~/Pictures/爱你❤️（用户主目录）
#[tauri::command]
fn read_my_love_album(app: tauri::AppHandle) -> Result<(FolderInfo, Vec<PhotoInfo>), String> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    // 1. 应用资源目录下的 my-love（生产模式）
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("my-love"));
    }

    // 2. 项目 public/my-love（dev 模式）
    //    CARGO_MANIFEST_DIR 是 src-tauri 的绝对路径（编译时确定，最可靠），
    //    其父目录就是项目根，再 join public/my-love
    if let Some(cargo_dir) = std::option_env!("CARGO_MANIFEST_DIR") {
        let cargo_path = std::path::PathBuf::from(cargo_dir);
        // src-tauri 的父目录 = 项目根
        if let Some(project_root) = cargo_path.parent() {
            candidates.push(project_root.join("public").join("my-love"));
            candidates.push(project_root.join("my-love"));
        }
        // 兜底：直接从 src-tauri 向上一级
        candidates.push(cargo_path.join("..").join("public").join("my-love"));
    }

    // 3. 当前工作目录及向上查找（dev 模式 cwd 可能是 src-tauri 或项目根）
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("public").join("my-love"));
        candidates.push(cwd.join("my-love"));
        // 如果 cwd 是 src-tauri，向上一级找项目根的 public
        if let Some(parent) = cwd.parent() {
            candidates.push(parent.join("public").join("my-love"));
            candidates.push(parent.join("my-love"));
        }
    }

    // 4. ~/Pictures/爱你❤️ 和 ~/Pictures/my-love
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("Pictures").join("爱你❤️"));
        candidates.push(home.join("Pictures").join("my-love"));
    }

    let mut chosen: Option<(std::path::PathBuf, Vec<PhotoInfo>)> = None;
    for candidate in &candidates {
        println!("[Tauri] 尝试扫描【爱你❤️】候选目录：{:?}", candidate);
        if candidate.exists() {
            let mut photos = Vec::new();
            for entry in WalkDir::new(candidate).max_depth(2).into_iter().filter_map(|e| e.ok()) {
                let p = entry.path();
                if !p.is_file() { continue; }
                if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    let media_type = match classify_media(ext) {
                        Some(t) => t,
                        None => continue,
                    };
                    if let Ok(metadata) = fs::metadata(p) {
                        let file_name = p.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                            .to_string();
                        let abs_path = p.to_string_lossy().to_string();

                        let (width, height, thumbnail, duration) = match media_type {
                            MediaType::Image => {
                                if let Ok(img) = image::open(p) {
                                    let (w, h) = (img.width(), img.height());
                                    let thumbnail = {
                                        let thumb = img.thumbnail(400, 300);
                                        let mut buf = Vec::new();
                                        let mut cursor = std::io::Cursor::new(&mut buf);
                                        if thumb.write_to(&mut cursor, ImageFormat::Jpeg).is_ok() {
                                            Some(format!("data:image/jpeg;base64,{}",
                                                BASE64.encode(&buf)))
                                        } else {
                                            None
                                        }
                                    };
                                    (w, h, thumbnail, None)
                                } else {
                                    (0, 0, None, None)
                                }
                            }
                            MediaType::Video => (1920, 1080, None, None),
                        };

                        let aspect_ratio = if height > 0 {
                            width as f32 / height as f32
                        } else {
                            1.0
                        };
                        let created_at = metadata.created()
                            .map(|t| t.duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_secs().to_string())
                                .unwrap_or_else(|_| String::from("unknown")))
                            .unwrap_or_else(|_| String::from("unknown"));

                        photos.push(PhotoInfo {
                            id: uuid::Uuid::new_v4().to_string(),
                            path: abs_path,
                            name: file_name,
                            width,
                            height,
                            aspect_ratio,
                            created_at,
                            thumbnail,
                            media_type,
                            duration,
                        });
                    }
                }
            }
            if !photos.is_empty() {
                // 排序：图片在前（按文件名升序），视频在后（按文件名升序）
                // 这样轮播先快速展示图片，视频放最后避免初始加载等待
                photos.sort_by(|a, b| {
                    let a_is_video = a.media_type == MediaType::Video;
                    let b_is_video = b.media_type == MediaType::Video;
                    match (a_is_video, b_is_video) {
                        (false, true) => std::cmp::Ordering::Less,
                        (true, false) => std::cmp::Ordering::Greater,
                        _ => a.name.cmp(&b.name),
                    }
                });
                println!("[Tauri] ❤️ 找到【爱你❤️】相册：{:?}，共 {} 个素材（图片在前，视频在后）", candidate, photos.len());
                chosen = Some((candidate.clone(), photos));
                break;
            } else {
                println!("[Tauri] 候选目录 {:?} 存在但无素材，继续尝试", candidate);
            }
        }
    }

    match chosen {
        Some((path, photos)) => {
            let folder = FolderInfo {
                path: path.to_string_lossy().to_string(),
                name: "爱你❤️".to_string(),
                photo_count: photos.len(),
            };
            Ok((folder, photos))
        }
        None => Err("未找到【爱你❤️】相册素材，请将照片/视频放入 public/my-love 目录".to_string()),
    }
}

#[tauri::command]
fn select_folder() -> Result<Option<String>, String> {
    use rfd::FileDialog;
    
    println!("[Tauri] select_folder 命令被调用");
    
    // 使用 rfd 直接打开文件夹选择对话框
    let folder = FileDialog::new()
        .set_title("选择相册文件夹")
        .pick_folder();
    
    let result = folder.map(|f| f.to_string_lossy().to_string());
    println!("[Tauri] 选中文件夹：{:?}", result);
    
    Ok(result)
}

#[tauri::command]
fn get_photo_thumbnail(path: String, width: u32, height: u32) -> Result<String, String> {
    if let Ok(img) = image::open(&path) {
        let thumbnail = img.thumbnail(width, height);
        let mut buf = Cursor::new(Vec::new());
        
        if thumbnail.write_to(&mut buf, ImageFormat::Png).is_ok() {
            let encoded = BASE64.encode(buf.get_ref());
            return Ok(format!("data:image/png;base64,{}", encoded));
        }
    }
    
    Err("无法生成缩略图".to_string())
}

#[tauri::command]
fn export_photos(_photos: Vec<PhotoInfo>, output_path: String, _format: String) -> Result<String, String> {
    // TODO: 实现导出功能（GIF/MP4/WebM）
    Ok(format!("导出到：{}", output_path))
}

#[tauri::command]
fn get_system_folders() -> Result<Vec<FolderInfo>, String> {
    let mut folders = Vec::new();
    
    // 检查常见的图片文件夹（"爱你❤️"优先）
    let common_paths = [
        dirs::home_dir().map(|p| p.join("Pictures").join("爱你❤️")),
        dirs::picture_dir(),
        dirs::home_dir().map(|p| p.join("Pictures")),
        dirs::home_dir().map(|p| p.join("Desktop")),
        dirs::home_dir().map(|p| p.join("Downloads")),
    ];
    
    for path_opt in common_paths.iter().flatten() {
        if path_opt.exists() {
            let photo_count = WalkDir::new(path_opt)
                .max_depth(2)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path().is_file() && 
                    e.path().extension()
                        .map(|ext| {
                            let ext_str = ext.to_string_lossy().to_lowercase();
                            IMAGE_EXTENSIONS.contains(&ext_str.as_str())
                                || VIDEO_EXTENSIONS.contains(&ext_str.as_str())
                        })
                        .unwrap_or(false)
                })
                .count();
            
            if photo_count > 0 {
                folders.push(FolderInfo {
                    path: path_opt.to_string_lossy().to_string(),
                    name: path_opt.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    photo_count,
                });
            }
        }
    }
    
    Ok(folders)
}

#[tauri::command]
fn save_app_data(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("无法获取数据目录: {}", e))?;

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("无法创建数据目录: {}", e))?;

    let file_path = data_dir.join("app-data.json");
    fs::write(&file_path, &json)
        .map_err(|e| format!("无法写入数据文件: {}", e))?;

    println!("[Tauri] 数据已保存到: {:?}", file_path);
    Ok(())
}

#[tauri::command]
fn load_app_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("无法获取数据目录: {}", e))?;

    let file_path = data_dir.join("app-data.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("无法读取数据文件: {}", e))?;

    println!("[Tauri] 数据已从: {:?} 加载", file_path);
    Ok(Some(content))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_folder,
            select_folder,
            get_photo_thumbnail,
            export_photos,
            get_system_folders,
            read_my_love_album,
            save_app_data,
            load_app_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
