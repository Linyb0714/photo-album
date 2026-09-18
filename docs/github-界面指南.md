# GitHub 界面导览（中文对照）

> 个人速查手册，长期维护。
>
> - **最后更新**：2026-09-18
> - **关联仓库**：https://github.com/Linyb0714/photo-album
> - **维护方式**：见文末「维护指南」

---

## 0. 我最常做的三件事（快速跳转）

| 我想做的事 | 去哪儿 | 详见 |
|-----------|--------|------|
| 手动跑一次 Windows 构建 | `Actions` → 左侧选工作流 → 右上 `Run workflow` | [§5.1](#51-手动触发构建) |
| 下载安装包 exe | 进某次**成功的** run → 拉到**页面最底部** → `Artifacts` | [§5.2](#52-下载安装包) |
| 看构建为什么失败 | 找红色 ✗ 的 step → 点开 → 拖到日志**最末尾** | [§5.3](#53-定位失败原因) |

---

## 1. 汉化方案

### 1.1 结论速查

| 方式 | 翻什么 | 推荐度 | 代价 |
|------|--------|--------|------|
| 油猴脚本 | 菜单、按钮、标题、相对时间 | ⭐ 推荐 | 装一次插件 |
| 浏览器自带翻译 | 全文（**含日志，有坑**） | 临时可用 | 见 §1.3 警告 |
| 官方中文文档 | 只翻文档，不翻界面 | 必备补充 | 无 |

**核心结论：GitHub 的产品界面官方没有中文，也没有语言开关。**

### 1.2 油猴脚本汉化（推荐）

项目：[maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)

- 33k+ star，GPL-3.0，仍在活跃维护
- 前身是 `52cik/github-hans`
- 官网：https://maboloshi.github.io/github-chinese/

**安装步骤**

1. 浏览器装 **Tampermonkey**（篡改猴）
2. **Chrome / Edge 内核必须做这两步**，否则装了不生效：
   - 打开 `chrome://extensions` → 右上角开启 **开发者模式**
   - 在 Tampermonkey 的详情里允许 **「允许运行用户脚本」**
3. 装脚本（作者建议普通用户用**稳定版**）：
   - 稳定版：GreasyFork 源
   - 开发版：GitHub 源（更新更及时）
4. 刷新 `github.com` 生效；不行就重启浏览器

**已知限制**（别以为是装坏了）

- GitHub 前端改用 React 后，部分版本里**顶部导航条和搜索框那块暂时不翻译**——作者为了修「搜索框消失」把整个头部加入了忽略规则
- 期望值定在「大部分界面变中文」而不是 100%

**安全提醒**

- 该项目 README 明确声明：**从未发布到 GitCode**。如果你在 GitCode 看到同名项目，是冒充的

### 1.3 浏览器自带翻译（注意日志）

Chrome / Edge 右键页面 → 「翻译成中文」即可，零安装。

> ⚠️ **重要**：整页翻译会把 **Actions 日志正文**也翻掉。
>
> `npm error Exit handler never called!` 这类报错一旦被翻成中文，就**没法拿去搜索、也没法贴给别人排查**——翻译后再贴出来，对方看不懂。
>
> **建议**：在 Actions 日志页面把翻译关掉，或者复制原文后再翻译。

油猴脚本没这个问题，因为它只翻**词库里的界面词条**，不碰日志正文。

### 1.4 官方中文文档

GitHub 的**文档**是有官方中文的（这是唯一官方的中文化）：

| 用途 | 地址 |
|------|------|
| 中文文档首页 | https://docs.github.com/zh |
| **Actions 中文文档** | https://docs.github.com/zh/actions |
| 动作市场（Actions 的官方仓库） | https://github.com/marketplace?type=actions |

> `/cn/` 老地址也能用，会自动 301 跳到 `/zh/`。

### 1.5 避坑

网上搜 "GitHub 设置中文" 会出来大量教程声称：

> 「进入 Settings → 切换语言，支持 14 种语言」

**这是错的。** 属于 AI 生成的内容农场文章。GitHub 的 `Settings` 里**根本没有语言这一项**，照着找纯浪费时间。

判断方法：凡是说「官方支持在设置里切中文」的，基本都是这类垃圾内容。

---

## 2. 概念层级（看懂这个，界面就不晕）

```
工作流 Workflow   ← 一个 .yml 文件，例如 .github/workflows/build-windows.yml
  └─ 任务 Job      ← 本仓库里只有一个：build-windows
       └─ 步骤 Step ← Set up job / Install frontend deps / Build frontend ……
```

| 词 | 含义 |
|----|------|
| **Workflow** 工作流 | 一个 yml 文件，描述「什么时候、按什么顺序做什么」 |
| **Job** 任务 | 工作流里的一个执行单元，见 §2.1 关于步骤编号跳号 |
| **Step** 步骤 | 任务里的一步，界面上可以单独展开看日志 |
| **Runner** 运行器 | 实际跑代码的机器，如 `windows-latest` |
| **Event / Trigger** 触发条件 | `push`（推代码自动跑）/ `workflow_dispatch`（手动点）/ `schedule`（定时） |
| **Artifact** 产物 | 构建生成的文件，比如安装包 exe |

### 2.1 为什么步骤编号会跳号

run 详情页里会看到步骤编号是 `1 2 3 4 5 6 7 8 9` 然后直接跳到 `18 19 20 21`。

**这不是出错。** GitHub 除了 yml 里写的步骤，还会在前后插入若干「准备 / 收尾」步骤（`Set up job`、`Post Checkout` 等），并且会为内部步骤预留编号，所以中间会出现空缺。**跳号不影响任何结果，忽略即可。**

值得知道的两点：

- `Set up job` 是准备环境，几乎总是成功
- `Post …` 开头的步骤是收尾清理，**失败了通常也不影响构建结果**；真正要关注的是中间那些你认识的步骤

---

## 3. 常用网址（存下来省点击）

```
https://github.com/Linyb0714/photo-album/actions
  → 所有运行记录

https://github.com/Linyb0714/photo-album/actions/workflows/build-windows.yml
  → 只看「Build Windows Installer」这一个工作流

https://github.com/Linyb0714/photo-album/actions/runs/<run_id>
  → 某一次运行的详情（把 <run_id> 换成具体数字）

https://github.com/Linyb0714/photo-album/settings/actions
  → 产物保留期、权限等仓库级设置
```

**技巧**：在任意 run 详情页，浏览器地址栏最后那串数字就是 run ID。以后想直达某次运行，改数字即可。

---

## 4. Actions 页面结构

### 4.1 运行记录列表页

进去后是「**左窄右宽**」布局：

- **左栏**：列出所有工作流（你只有一个：`Build Windows Installer`）
- **右栏**：该工作流的运行记录列表，每行显示：状态图标、提交信息、分支、run 号、触发者、耗时
- **列表上方**：筛选框 `Filter workflow runs`，支持语法
- **右上**：`Run workflow` 按钮（手动触发用）

**筛选语法示例**

```
branch:main status:failure         只看 main 分支上失败的
event:workflow_dispatch            只看手动触发的
actor:Linyb0714                    只看某人触发的
```

### 4.2 run 详情页（最常看的页面）

| 位置 | 英文 | 说明 |
|------|------|------|
| 顶部 | 提交信息 + 状态徽章 | 如 `#35302087542`、触发方式、总耗时 |
| 右上 | `Re-run all jobs` | 全部重跑 |
| 右上 | `Re-run failed jobs` | **只重跑失败的部分**（省时间） |
| 右上 | `Cancel workflow` | 取消正在跑的 |
| 主体 | job 名（`build-windows`） | 点开可折叠/展开 |
| 主体 | 每个 step 一行 | `✓` 成功 / `✗` 失败 / `⊘` 跳过 |
| 点 step | 展开日志 | 失败时**日志末尾**就是错误 |
| 日志区右上 | `Download log archive` | 下载全部日志压缩包 |
| **页面底部** | **`Artifacts`** | **构建产物，下载安装包的地方** |

---

## 5. 三个常用操作（分步）

### 5.1 手动触发构建

1. 打开 `Actions` 标签页
2. 左侧点 `Build Windows Installer`
3. 右上角点 `Run workflow` 下拉按钮
4. 勾选/选择分支：`main`
5. 点绿色的 `Run workflow`

> 注意：`workflow_dispatch` 是手动触发的前提。工作流 yml 顶部的 `on:` 里必须有这一项，这个按钮才存在。

### 5.2 下载安装包

1. 进入某次**成功**（绿色 ✓）的 run
2. 拉到页面**最底部**
3. `Artifacts` 区 → 点 `PhotoAlbum-Windows-Installer`
4. 下载得到 zip，解压里面就是 `.exe` 安装包

**注意**

- **必须登录 GitHub**，未登录看不到下载链接
- 产物有**保留期**（默认 90 天，可在 `settings/actions` 调整），过期就没了
- 产物只在**成功**的 run 里才有；失败时 `Artifacts` 区是空的

### 5.3 定位失败原因

1. run 详情页从上往下扫一遍，**找那个红色 ✗ 的 step**
2. 点开它
3. 直接拖到日志**最末尾**——错误都在最后几行
4. **别从头读**。前面几百行都是正常的安装输出，只会浪费时间

如果用 `gh` 或在终端里，也可以直接搜关键词：`error`、`Error`、`failed`、`ETIMEDOUT`。

---

## 6. 术语对照表

### 6.1 仓库导航

| 英文 | 中文 |
|------|------|
| Code | 代码 |
| Issues | 议题 |
| Pull requests | 拉取请求（PR） |
| **Actions** | **操作 / 工作流** |
| Projects | 项目 |
| Wiki | 维基 |
| Security | 安全 |
| Insights | 洞察（统计） |
| Settings | 设置 |
| Branches | 分支 |
| Tags | 标签 |
| Commits | 提交 |
| Star / Watch / Fork | 收藏 / 关注 / 复刻 |
| Releases | 发行版 |

### 6.2 运行状态

| 英文 | 中文 |
|------|------|
| Queued | 排队中 |
| In progress | 进行中 |
| Completed | 已完成 |
| **Success** | **成功** |
| **Failure** | **失败** |
| Cancelled | 已取消 |
| Skipped | 已跳过 |
| Timed out | 超时 |
| Summary | 摘要 |
| Duration | 耗时 |
| Attempt | 第几次尝试（重跑后会 +1） |

### 6.3 Actions 专有词

| 英文 | 含义 |
|------|------|
| workflow | 工作流（一个 yml 文件） |
| job | 任务 |
| step | 步骤 |
| runner | 运行器（`windows-latest` = GitHub 提供的 Windows 虚拟机） |
| event / trigger | 触发事件（push / workflow_dispatch / schedule） |
| artifact | 构建产物 |
| secret | 密钥（加密的环境变量，如 token） |
| `actions/checkout@v4` | 使用名为 checkout 的官方动作，`@v4` 是版本 |
| `Set up job` | 初始化任务（准备环境，几乎总是成功） |
| `Post …` | 收尾清理（跑在最后，失败一般不影响结果） |
| `uses:` | 引用现成的动作 |
| `run:` | 直接执行 shell 命令 |
| `if: failure()` | 仅当前面步骤失败时才执行 |

---

## 7. 本仓库构建工作流导览

**工作流名**：`Build Windows Installer`
**文件**：`.github/workflows/build-windows.yml`
**运行器**：`windows-latest`（GitHub 托管的 Windows 虚拟机）

**触发条件**

| 事件 | 条件 |
|------|------|
| `workflow_dispatch` | 手动点 `Run workflow` |
| `push` | 推送到 `main` 分支，或推送 `v*` 标签 |

**步骤一览**（正常一轮约 5 分钟）

| # | 步骤 | 失败说明什么 |
|---|------|-------------|
| 1 | Checkout | 拉代码，很少失败 |
| 2 | Setup Node | Node 环境（当前 22.x） |
| 3 | Setup Rust | Rust 工具链 |
| 4 | Cache Rust build | Rust 编译缓存，命中就快 |
| 5 | **Install frontend deps** | 前端依赖装不上（**曾出过问题，见 §7.1**） |
| 6 | Dump npm debug logs | 只在前面失败时才跑；成功时显示「已跳过」，正常 |
| 7 | Build frontend | Vue 编译 / TS 类型检查报错 |
| 8 | **Build Windows installer (NSIS)** | Rust 编译或打安装包失败，**最耗时** |
| 9 | Upload installer | 产物没生成出来 |

**产物**：`PhotoAlbum-Windows-Installer`（约 5 MB）

### 7.1 已知坑：内网 npm 镜像

**现象**：步骤 5 失败，报

```
npm error Exit handler never called!
npm error This is an error with npm itself.
```

**真实原因**：本机 `~/.npmrc` 的 registry 指向内网 Nexus 镜像
`https://gz01-srdart.srdcloud.cn/npm/public/public-npm-virtual/`（解析到 `10.158.231.17`，私网地址）。
如果 `package-lock.json` 里 180 个 `resolved` 地址被写成了这个内网 host，
**GitHub 托管 runner 路由不到 10.x 内网**，拉每个 tarball 都 ETIMEDOUT，
npm 中止时就吐出上面那句与真实原因无关的报错。

**排查要点**

- 别往 npm bug / Node 版本上查。Node 22.5.0 那个同名回归问题已在 22.5.1 修掉
- 真实错误只在 **npm debug log** 里，路径是 `<npm cache>/_logs/*-debug-0.log`
- 本工作流已加 `Dump npm debug logs` 步骤，失败时会自动把关键行打出来

**修复办法**

- 本机加依赖或重装后，**检查 `package-lock.json` 的 `resolved` host 是不是 `https://registry.npmjs.org/`**
- 内网镜像与公网路径后缀一致，可以直接替换 host 修好，版本和 integrity 都不用动：
  `https://gz01-srdart.srdcloud.cn/npm/public/public-npm-virtual/<包>/-/<文件>.tgz`
  → `https://registry.npmjs.org/<包>/-/<文件>.tgz`
- 本机不会变慢：npm 的 `replace-registry-host` 默认值 `npmjs` 会把 lockfile 里的
  `registry.npmjs.org` 自动换成当前配置的 registry，所以本地照旧走内网快镜像

---

## 8. 附：不想点界面的话

命令行能替代大部分界面操作，但需要先装 GitHub CLI：

```bash
brew install gh          # 安装
gh auth login            # 登录一次

gh run list --repo Linyb0714/photo-album          # 列出运行记录
gh run view <run_id>                              # 看某次运行
gh run view <run_id> --log-failed                 # 只看失败步骤的日志
gh run watch <run_id>                             # 实时盯到结束
gh run download <run_id>                          # 下载产物
gh workflow run build-windows.yml                 # 手动触发
```

另外，CodeBuddy Code 也可以直接帮你查（run 状态、步骤成败、产物链接），
不用你手点界面——把 run ID 发过去就行。

---

## 维护指南

### 更新记录

| 日期 | 改了什么 |
|------|---------|
| 2026-09-18 | 创建；对应 workflow 修复（lockfile 内网 host 问题）后的状态 |

### 哪些内容容易过期

| 内容 | 为什么会过期 | 怎么核对 |
|------|-------------|---------|
| §1.2 汉化插件的安装步骤 | 浏览器 / 插件策略变化（如 Manifest V3） | 看插件项目 README |
| §1.2 已知限制 | 插件作者会修，限制会变 | 看插件 Changelog |
| §2.1 步骤编号跳号 | GitHub 调整 job 结构 | 打开任意 run 对比 |
| §5.2 产物保留期 | 默认 90 天，可被仓库设置改 | `settings/actions` |
| §7 步骤一览 | 工作流 yml 改动后就会变 | 对照 `.github/workflows/build-windows.yml` |
| §7.1 内网镜像地址 | 公司镜像地址可能变更 | `npm config get registry` |
| 全局：界面按钮位置 | GitHub 改版 | 打开 Actions 页面核对 |

### 怎么加内容

- **新踩的坑** → 加进 §7 对应位置，或新开 §7.x 小节，写「现象 / 真实原因 / 排查要点 / 修复办法」四段
- **新术语** → 加进 §6.3 表格
- **改了工作流** → 同步更新 §7 的步骤表
- 每次改动**记得更新顶部「最后更新」日期和 §维护指南 的更新记录表**

---

*本文件由 CodeBuddy Code 整理。发现内容与实际界面不符时，以 GitHub 实际界面为准。*
