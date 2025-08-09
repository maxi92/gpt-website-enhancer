## 项目概览

AI Chat Enhancer 是一个 Chrome（MV3）浏览器扩展，用于在 AI 聊天网站（当前支持 `chatgpt.com` 与 `www.tongyi.com`）上：
- 提供右侧“对话导航”侧边栏（可多选、复制选中）
- 一键导出整段对话为 Markdown（支持代码块）
- 在 ChatGPT 页面调整对话区最大宽度

技术要点：Manifest V3、content script 注入 DOM 与样式、service worker 背景脚本、popup 与 content 间消息通信、`chrome.storage.sync` 持久化、`MutationObserver` 动态监听、Clipboard 复制。

支持站点（以 manifest 为准）：
- `https://chatgpt.com/*`
- `https://www.tongyi.com/*`


## 目录结构（精简）

- `manifest.json`：扩展声明（MV3）、权限、注入脚本/样式、service worker
- `background.js`：后台 service worker（安装日志、根据 URL 设置图标与可点击状态）
- `content.js`：核心逻辑，运行在目标站点页面
  - 创建/管理侧边栏导航（多选与复制）
  - 解析页面 DOM 抽取问答配对
  - Markdown 转换（含代码块语言提取）
  - ChatGPT 页面宽度调整与持久化
  - 监听 popup 消息并返回设置或生成 Markdown
  - 通过 `MutationObserver` 监听内容变化并更新导航
- `styles.css`：侧边栏与导航项样式、交互细节（拖拽、滚动条、多选态）
- `popup.html` / `popup.js`：弹窗 UI 与交互（显示/隐藏侧边栏、调整宽度、导出 Markdown/复制、是否生成目录）
- `icons/`：扩展图标
- `website_demo/chatgpt.html`、`chatgpt.html`：示例/演示文件（仅开发辅助）
- `README.md`：项目简介（如需补充可参考本文档）


## 权限与注入

- `permissions`: `activeTab`, `storage`
- `host_permissions`: `https://chatgpt.com/*`, `https://www.tongyi.com/*`
- `content_scripts`：在上述域名注入 `content.js` 与 `styles.css`，`run_at: document_end`
- `background.service_worker`: `background.js`
- `action.default_popup`: `popup.html`


## 核心文件职责与关键接口

### content.js（页面侧脚本）
- 侧边栏构建：`createSidebar()` 创建 id 为 `ai-chat-enhancer-sidebar` 的 DOM 结构，包含：
  - 标题与按钮区（`多选`、`复制选中`）
  - 内容区 `.sidebar-content` 渲染对话卡片
  - 左侧拖拽区域 `.sidebar-resizer`，支持宽度拖拽并将最终值存入 `chrome.storage.sync.sidebarWidth`
- 站点适配：
  - ChatGPT：通过 `data-testid^="conversation-turn-"`、`[data-message-author-role="user|assistant"]` 与 `.whitespace-pre-wrap` / `.markdown` 提取问答
  - 通义千问：通过 `.questionItem--dS3Alcnv` 与 `.answerItem--U4_Uv3iw` 及内层 `.bubble--H3ZjjTnP` / `.tongyi-markdown` 提取问答
- 导航与多选：
  - 生成 `.conversation-group` 列表，点击滚动定位，支持多选复选框（开启“多选模式”显示）
  - `copySelectedConversations()` 与从原始 DOM 转 Markdown 的流程整合
- Markdown 转换：
  - `convertElementToMarkdown(element)` 递归遍历节点，保留文本
  - 代码块处理 `processCodeBlock()`：
    - 读取语言标签 `.flex.items-center.text-token-text-secondary`
    - 读取 `<code>` 文本，输出为三反引号代码块
- 宽度调整（仅 ChatGPT）：
  - 宽度档位 `WIDTH_SETTINGS`（0/1/2）对应一组 Tailwind 类（如 `md:max-w-3xl` 等）
  - `adjustConversationWidth(level)` 查找 `.mx-auto.flex.flex-1.gap-4.text-base` 容器并替换宽度类
  - 设置持久化：`chrome.storage.sync` 键 `conversationWidth`、`widthClasses`
- 状态持久化：
  - `sidebarVisible`（侧边栏显示态）
  - `conversationWidth`（ChatGPT 对话区宽度档位）
  - `widthClasses`（已应用宽度类集合）
  - `sidebarWidth`（侧边栏像素宽度，拖拽后保存）
- 消息处理（与 popup 通信）：
  - `getSettings`：返回当前页面实际态（是否通义站、侧边栏显示态、宽度档位等）
  - `toggleSidebar`：显示/隐藏侧边栏并持久化 `sidebarVisible`
  - `adjustWidth`：设置并保存宽度档位（非通义站）
  - `getMarkdown`：遍历问答生成整段 Markdown；可按需在最前添加“目录”
- 内容变化监听：
  - 多处 `MutationObserver` 与重试逻辑保证在增量渲染时重新应用宽度与更新导航

### popup.js（弹窗）
- 初始化：向活动标签发送 `getSettings`，据返回值同步弹窗控件（侧边栏开关、宽度滑块显隐与初始值）
- 事件：
  - 开关侧边栏：`toggleSidebar`
  - 调整宽度：`adjustWidth`（仅 ChatGPT）
  - 导出 Markdown：`getMarkdown`（可选生成目录）→ 将返回写入 `#markdownOutput`，并提供复制按钮

### background.js（service worker）
- `onInstalled` 安装日志
- `tabs.onUpdated` 根据 URL 判断是否“支持站点”，设置扩展图标与 `action.setEnabled`
  - 注意：当前 `supportedUrls` 包含 `https://qianwen.aliyun.com/*`，与 manifest 中的 `www.tongyi.com` 不一致（见“已知问题”）


## 消息与数据流（高层）

1) 用户在扩展图标打开 `popup.html`
2) `popup.js` → 活动标签：`getSettings`
3) `content.js` 返回当前页面态（是否通义、侧边栏显示、宽度档位）
4) 用户操作：
   - 切换侧边栏 → `toggleSidebar` → `content.js` 应用并保存 `sidebarVisible`
   - 调整宽度 → `adjustWidth`（仅 ChatGPT）→ `content.js` 替换容器 class 并保存 `conversationWidth`
   - 导出 Markdown → `getMarkdown` → `content.js` 解析 DOM、转换并回传
5) `content.js` 通过 `MutationObserver` 与定时轮询保证页面动态变化时侧边栏与宽度设置保持一致


## 存储键一览（chrome.storage.sync）

- `sidebarVisible: boolean` 侧边栏是否显示
- `conversationWidth: 0|1|2` ChatGPT 对话区宽度档位
- `widthClasses: string[]` 已应用的宽度 class 列表（便于恢复）
- `sidebarWidth: number` 侧边栏像素宽度（拖拽结束时保存）


## 站点选择器与脆弱点

- ChatGPT：
  - 容器：`[data-testid^="conversation-turn-"]`
  - 用户：`[data-message-author-role="user"] .whitespace-pre-wrap`
  - AI：`[data-message-author-role="assistant"] .markdown`
  - 宽度容器：`.mx-auto.flex.flex-1.gap-4.text-base`
- 通义千问：
  - 问：`.questionItem--dS3Alcnv .bubble--H3ZjjTnP`
  - 答：`.answerItem--U4_Uv3iw .tongyi-markdown`

以上类名/结构属于页面私有实现，随产品更新可能变更。建议为每站点抽象“选择器配置”与“解析器”，并增加兜底与容错日志。


## 已知问题与建议

- 站点域名不一致：
  - `manifest.json` 使用 `www.tongyi.com`
  - `background.js` 的 `supportedUrls` 使用了 `qianwen.aliyun.com`
  - 建议统一：均使用 `https://www.tongyi.com/*`（或根据最新官方域名统一升级）

- 复制逻辑混用：
  - 弹窗中使用 `document.execCommand('copy')`；内容脚本中多处使用 `navigator.clipboard.writeText`
  - 建议统一到 `navigator.clipboard`（并在权限/HTTPS 环境下工作），或在不支持时回退 `execCommand`

- `MutationObserver` 与定时轮询：
  - 当前同时使用多个观察器与轮询，可能造成性能开销
  - 建议集中管理，统一防抖，降低重复解析与 DOM 写入

- Markdown 转换：
  - 目前对块级/行内元素统一递归处理；代码块语言识别依赖 ChatGPT 特定结构
  - 建议：在通用 Markdown 转换层面增加元素类型映射（h1/h2/ul/ol/a/img/table...）与富文本边界处理

- 宽度调整：
  - 通过替换容器类名实现，易与站点升级的 class 变化产生偏差
  - 建议：在容器外包裹自定义样式层，或直接注入一段 CSS 覆盖最大宽度，减少依赖具体类名


## 安装与开发要点

- 在 Chrome 打开“扩展程序” → 开发者模式 → “加载已解压的扩展程序”，选择项目根目录
- 变更 `content.js`/`background.js` 等后，需在扩展页“重新加载”，并刷新目标站点页面
- 如需调试 content 脚本：打开目标站点 DevTools → Sources → 页内的扩展脚本；调试 service worker：扩展详情页 → Service Worker 检视


## 未来演进（建议）

- 抽象站点适配层：`SITE_CONFIGS` + 可插拔解析器，便于新增更多站点
- 完整 Markdown 渲染：有序/无序列表、表格、链接、图片、行内代码/粗体/斜体等
- 一键下载 `.md` 文件与图片资源引用规整
- UI/UX：侧边栏搜索、筛选、折叠分组；对话标题自动提取；导出范围选择
- 单元测试：核心解析与 Markdown 转换函数的用例，保证升级稳定性


## 快速事实卡（便于回忆）

- 入口：`manifest.json`（MV3）
- 页面脚本：`content.js`（侧边栏/解析/导出/宽度/通信/存储）
- 弹窗：`popup.html`/`popup.js`（控制入口与导出 UI）
- 后台：`background.js`（安装、标签页更新、图标/启用态）
- 样式：`styles.css`（侧边栏与交互视觉）
- 存储键：`sidebarVisible` | `conversationWidth` | `widthClasses` | `sidebarWidth`
- 支持域名：`chatgpt.com`、`www.tongyi.com`（请统一 background 中域名）



