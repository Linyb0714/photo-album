/**
 * 图片裁剪位置配置
 * 根据人脸位置调整 object-position
 */

/**
 * 根据宽高比获取裁剪位置
 * 纵向图片人脸通常在上方，横向图片人脸在中心
 */
export function getImagePosition(_photoId: string, aspectRatio: number): string {
  // 纵向图片 (aspectRatio < 1)
  if (aspectRatio < 1) {
    // 非常竖长的图片 (≤0.67，如 9:16, 2:3)，人脸通常在顶部
    if (aspectRatio <= 0.67) {
      return 'top center';
    }
    // 中等竖图 (0.67-0.85，如 3:4)，人脸在中上部
    if (aspectRatio <= 0.85) {
      return 'center top';
    }
    // 接近方形的图片 (>0.85，如 4:5, 1:1)，人脸居中
    return 'center';
  }
  
  // 横向图片 (aspectRatio >= 1)
  // 人脸通常在中心
  return 'center';
}
