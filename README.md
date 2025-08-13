# AI Chat Enhancer

AI Chat Enhancer 是一个功能强大的浏览器扩展程序，为 ChatGPT、Gemini 和通义千问等AI聊天网站提供全面的增强功能。

## 主要功能

### 1. 智能对话导航
- 在页面右侧显示导航栏，实时列出所有对话内容
- 支持快速跳转到指定对话，带高亮效果
- 可拖拽调整导航栏宽度（240px-600px）
- 支持多选模式，可选择性复制多个对话
- 导航栏状态和宽度自动保存

### 2. 专业 Markdown 转换
- 一键将对话内容转换为标准 Markdown 格式
- **完整的 HTML 元素支持**：
  - 加粗文本 (`<strong>`, `<b>`) → `**text**`
  - 段落 (`<p>`) → 正确换行
  - 标题 (`<h1>`-`<h6>`) → `#` `##` `###`
  - 列表 (`<ul>`, `<ol>`) → `-` `1.` `2.`
  - 链接 (`<a>`) → `[text](url)`
  - 表格 (`<table>`) → Markdown 表格
  - 代码块 (`<code>`, `<pre>`) → `` `code` `` 和 triple backticks
- **智能 HTML 实体处理**：`&lt;`, `&gt;` 等正确解码
- 支持生成带锚点的目录
- 一键复制转换后的内容

### 3. 对话宽度调整
- 提供三档宽度调整选项：默认(960px)、较宽(1100px)、宽(1200px)
- 设置会自动保存并在所有页面同步
- 仅适用于 ChatGPT 页面

### 4. 多平台支持
- **ChatGPT**：完整功能支持
- **Gemini**：支持对话导航和 Markdown 转换，自动加载历史对话
- **通义千问**：支持对话导航和 Markdown 转换

## 支持的网站
- **ChatGPT** (https://chatgpt.com/*) - 完整功能支持
- **Gemini** (https://gemini.google.com/*) - 对话导航和 Markdown 转换
- **通义千问** (https://www.tongyi.com/qianwen/*) - 对话导航和 Markdown 转换

## 安装方法

1. 下载项目代码
2. 打开 Chrome 浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用说明

### 导航栏功能
- 点击扩展图标中的"显示导航栏"开关来显示/隐藏导航栏
- 拖动导航栏左侧边缘可调整宽度（240px-600px）
- 点击导航栏中的对话可快速跳转到对应位置，带高亮效果
- 支持多选模式，可选择多个对话进行批量复制
- 导航栏状态和宽度设置自动保存

### Markdown 转换
1. 点击扩展图标，选择"转换为 Markdown 格式"
2. 可选择是否生成带锚点的目录
3. 点击"复制 Markdown 内容"按钮复制到剪贴板
4. **支持的转换内容**：
   - 完整的 HTML 元素（加粗、段落、标题、列表、链接、表格等）
   - 代码块和内联代码
   - HTML 实体（`&lt;`, `&gt;` 等）自动解码
   - 智能的段落换行和格式处理

### 宽度调整（仅 ChatGPT）
- 使用滑块选择合适的宽度：
  - 默认（960px）：适合一般阅读
  - 较宽（1100px）：适合长文本
  - 宽（1200px）：适合大屏幕

## 注意事项
- 插件仅在支持的网站上显示图标和功能
- 宽度设置会自动保存并在所有页面同步
- 导航栏的显示状态和宽度会被记住
- Gemini 页面支持自动加载历史对话
- 所有设置使用 `chrome.storage.sync` 进行同步

## 技术栈
- **JavaScript (ES6+)**: 主要开发语言
- **Chrome Extension API (MV3)**: 扩展程序框架
- **DOM 操作**: 实时页面元素处理
- **Markdown 转换**: 智能HTML到Markdown转换
- **MutationObserver**: 动态内容监听
- **CSS3**: 现代样式和动画效果

## 开发说明
如需修改或开发新功能，主要文件说明：

### 核心文件
- `manifest.json`: 扩展程序配置文件（MV3）
- `content.js`: 主要功能实现（约1500行）
- `popup.js`: 弹出窗口逻辑
- `popup.html`: 弹出窗口界面
- `styles.css`: 样式文件
- `background.js`: 后台服务脚本

### 关键功能模块
- **对话导航**: `createSidebar()`, `updateSidebar()`, `handleConversationClick()`
- **Markdown转换**: `convertElementToMarkdown()`, `convertGeminiElementToMarkdown()`
- **代码块处理**: `processCodeBlock()`, `processGeminiCodeBlock()`
- **HTML实体处理**: `decodeHtmlEntities()`, `escapeMarkdownText()`
- **宽度调整**: `adjustConversationWidth()`, `ensureChatGPTWidthStyle()`
- **多平台适配**: `SITE_CONFIGS`, `getCurrentSiteConfig()`

### 调试方法
1. 修改代码后重新加载扩展
2. Chrome DevTools → Sources → Extension scripts 调试内容脚本
3. 扩展详情页 → Service Worker 检查调试后台脚本

## 许可证
MIT License 