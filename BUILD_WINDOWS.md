# 给爱的你 - Windows 安装包打包说明

本应用基于 Tauri 2.x，Windows 安装包（`.exe` / `.msi`）**只能在 Windows 机器上编译生成**，
macOS / Linux 无法交叉编译产出 Windows 安装包。

## 一、前置依赖（Windows 机器上，一次性安装）

1. **Rust 工具链**
   - 安装 https://rustup.rs
   - 安装后确认 `cargo --version`、`rustc --version` 可用

2. **Visual Studio Build Tools 2019/2022**
   - 安装时勾选工作负载「使用 C++ 的桌面开发」
   - 提供 MSVC 编译器与 Windows SDK

3. **WebView2 Runtime**
   - Windows 10 / 11 通常已自带；旧系统可单独安装 Evergreen 运行时

4. **NSIS**（Tauri 生成 `.exe` 安装包时会自动调用）
   - 从 https://nsis.sourceforge.io/ 安装，或让 Tauri 自动下载

5. **WiX Toolset v3**（仅当需要 `.msi` 安装包时）
   - 从 https://wixtoolset.org/ 安装 v3（注意是 v3，不是 v4）

## 二、打包步骤

```powershell
# 1. 进入项目根目录（photo-album）
cd photo-album

# 2. 安装前端依赖
npm install

# 3. 打包（自动先执行 npm run build，再执行 tauri build）
npm run tauri build
```

打包完成后，产物位于：

- **NSIS 安装包（推荐发给别人）**：
  `src-tauri\target\release\bundle\nsis\PhotoAlbum_0.1.0_x64-setup.exe`
- **MSI 安装包**：
  `src-tauri\target\release\bundle\msi\PhotoAlbum_0.1.0_x64_zh-CN.msi`

> 版本号取自 `src-tauri/tauri.conf.json` 的 `version` 字段，升级时记得同步修改。

## 三、两个相册如何一并打包

| 相册 | 类型 | 来源目录 | 打包方式 |
|------|------|---------|---------|
| 爱你❤️ | 本地相册 | `public/my-love/` | 随 `dist/` 内嵌进安装包 |
| 周杰伦精选 | 线上相册 | `public/jay-chou/` + `src/data/jayChouAlbum.ts` | 随 `dist/` 内嵌进安装包 |

- `public/` 下的静态资源会在 `npm run build` 时复制到 `dist/`，再由 Tauri 内嵌进最终二进制。
- 用户运行时「爱你❤️」优先从应用资源目录读取，找不到时回退到 `~/Pictures/爱你❤️`。
- 因此**无需额外操作**，两个相册会随安装包一起交付。

## 四、常见问题

- **报 `link.exe not found` / `cl.exe not found`**：未正确安装 Visual Studio Build Tools 的 C++ 桌面开发工作负载。
- **报 NSIS 相关错误**：安装 NSIS 或确认其在 PATH 中。
- **中文乱码**：`tauri.conf.json` 已配置 `wix.language = zh-CN` 与 NSIS `SimpChinese`，一般无需额外处理。
- **杀毒软件误报**：未签名的 Tauri 安装包可能被个别杀软误报，可联系签名证书后重新打包。
