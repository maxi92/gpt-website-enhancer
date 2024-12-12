// 创建侧边栏容器
function createSidebar() {
    console.log('创建侧边栏');
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        #ai-chat-enhancer-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            width: 380px;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            transition: width 0.3s ease;
            border-left: 1px solid #e8f0fe;
        }

        .sidebar-resizer {
            position: absolute;
            left: -5px;
            top: 0;
            width: 10px;
            height: 100%;
            cursor: col-resize;
            background: transparent;
            z-index: 1001;
        }

        .sidebar-resizer:hover {
            background: rgba(26, 115, 232, 0.1);
        }

        .sidebar-header {
            padding: 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #e8f0fe;
            font-size: 16px;
            font-weight: 600;
            color: #1a73e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-header-buttons {
            display: flex;
            gap: 8px;
        }

        .sidebar-button {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #e8f0fe;
            color: #1a73e8;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .sidebar-button:hover {
            background: #d2e3fc;
        }

        .sidebar-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: #ffffff;
        }

        .conversation-group {
            margin-bottom: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e8f0fe;
            transition: all 0.2s ease;
        }

        .conversation-group:hover {
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .conversation-header {
            padding: 8px 12px;
            background: #e8f0fe;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .conversation-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .conversation-number {
            font-size: 13px;
            font-weight: 500;
            color: #1a73e8;
        }

        .conversation-item {
            padding: 12px;
            border-bottom: 1px solid #e8f0fe;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .conversation-item:hover {
            background: #f1f3f4;
        }

        .conversation-item:last-child {
            border-bottom: none;
        }

        .conversation-icon {
            display: inline-block;
            width: 24px;
            font-weight: 600;
            color: #5f6368;
        }

        .conversation-text {
            display: inline-block;
            margin-left: 8px;
            color: #3c4043;
            font-size: 13px;
            line-height: 1.4;
            word-break: break-word;
        }

        .conversation-item.user {
            background: #f8f9fa;
        }

        .conversation-item.assistant {
            background: #ffffff;
        }

        /* 滚动条样式 */
        .sidebar-content::-webkit-scrollbar {
            width: 8px;
        }

        .sidebar-content::-webkit-scrollbar-track {
            background: #f1f3f4;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
            background: #dadce0;
            border-radius: 4px;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
            background: #bdc1c6;
        }

        /* 多选模式样式 */
        .multi-select-mode .conversation-group {
            border: 1px solid #1a73e8;
        }

        .multi-select-mode .conversation-checkbox {
            display: block;
        }

        .conversation-checkbox {
            display: none;
        }
    `;
    
    document.head.appendChild(style);

    const sidebar = document.createElement('div');
    sidebar.id = 'ai-chat-enhancer-sidebar';
    sidebar.style.width = '380px';
    
    // 从存储中读取保存的宽度和显示状态
    chrome.storage.sync.get(['sidebarWidth', 'sidebarVisible'], (result) => {
        console.log('读取侧边栏设置:', result);
        if (result.sidebarWidth) {
            sidebar.style.width = result.sidebarWidth + 'px';
        }
        const isVisible = result.sidebarVisible !== false;
        sidebar.style.display = isVisible ? 'flex' : 'none';
        chrome.storage.sync.set({ sidebarVisible: isVisible });
    });

    sidebar.innerHTML = `
        <div class="sidebar-resizer"></div>
        <div class="sidebar-header">
            对话导航
            <div class="sidebar-header-buttons">
                <button class="sidebar-button copy-selected" id="copySelected" disabled>复制选中对话</button>
                <button class="sidebar-button" id="multiSelectToggle">多选</button>
            </div>
        </div>
        <div class="sidebar-content"></div>
    `;

    document.body.appendChild(sidebar);

    // 添加宽度调整功能
    const resizer = sidebar.querySelector('.sidebar-resizer');
    let isResizing = false;
    let startX;
    let startWidth;

    // 添加防止文字选中的样式
    function addNoSelectStyle() {
        const style = document.createElement('style');
        style.id = 'no-select-style';
        style.textContent = 'body.resizing * { user-select: none !important; }';
        document.head.appendChild(style);
    }

    function removeNoSelectStyle() {
        const style = document.getElementById('no-select-style');
        if (style) {
            style.remove();
        }
    }

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        
        document.body.classList.add('resizing');
        addNoSelectStyle();

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.classList.remove('resizing');
            removeNoSelectStyle();
            document.removeEventListener('mousemove', handleMouseMove);
            
            // 保存当前宽度到存储
            const currentWidth = parseInt(sidebar.style.width);
            chrome.storage.sync.set({ sidebarWidth: currentWidth });
        }, { once: true });
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const width = startWidth - (e.pageX - startX);
        if (width >= 240 && width <= 700) {  // 使用与 CSS 中相同的最小和最大宽度
            sidebar.style.width = `${width}px`;
        }
    }

    // 添加多选按钮事件
    const multiSelectToggle = sidebar.querySelector('#multiSelectToggle');
    const copySelected = sidebar.querySelector('#copySelected');
    
    multiSelectToggle.addEventListener('click', () => {
        const isMultiSelect = sidebar.classList.toggle('multi-select-mode');
        multiSelectToggle.textContent = isMultiSelect ? '取消多选' : '多选';
        copySelected.style.display = isMultiSelect ? 'inline-block' : 'none';
        updateCopyButtonState();
    });

    copySelected.addEventListener('click', () => {
        const selectedGroups = Array.from(document.querySelectorAll('.conversation-group'))
            .filter(group => group.querySelector('.conversation-checkbox:checked'));
        
        if (selectedGroups.length > 0) {
            const markdown = convertSelectedToMarkdown(selectedGroups);
            copyToClipboard(markdown);
            copySelected.textContent = '复制成功';
            setTimeout(() => {
                copySelected.textContent = '复制选中对话';
            }, 2000);
        }
    });

    // 添加全局事件处理
    sidebar.addEventListener('click', (event) => {
        const conversationItem = event.target.closest('.conversation-item');
        const checkbox = event.target.closest('.conversation-checkbox');
        const group = event.target.closest('.conversation-group');
        
        if (checkbox) {
            event.stopPropagation();
            updateCopyButtonState();
        } else if (conversationItem && sidebar.classList.contains('multi-select-mode') && group) {
            event.stopPropagation();
            const groupCheckbox = group.querySelector('.conversation-checkbox');
            if (groupCheckbox) {
                groupCheckbox.checked = !groupCheckbox.checked;
                updateCopyButtonState();
            }
        } else if (conversationItem) {
            const index = parseInt(group.dataset.index);
            const conversations = document.querySelectorAll('[data-testid^="conversation-turn-"]');
            conversations[index * 2]?.scrollIntoView({ behavior: 'smooth' });
        }
    });

    console.log('侧边栏创建完成');
    return sidebar;
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// 将选中的对话转换为Markdown
function convertSelectedToMarkdown(groups) {
    let markdown = '';
    groups.forEach((group, index) => {
        const userContent = group.querySelector('.conversation-item.user .conversation-text').textContent;
        const assistantContent = group.querySelector('.conversation-item.assistant .conversation-text').textContent;
        
        markdown += `### 对话 ${index + 1}\n\n`;
        markdown += `**问题**：${userContent}\n\n`;
        markdown += `**回答**：${assistantContent}\n\n`;
        markdown += '---\n\n';
    });
    return markdown.trim();
}

// 更新复制按钮状态
function updateCopyButtonState() {
    const copyButton = document.querySelector('#copySelected');
    const selectedCount = document.querySelectorAll('.conversation-checkbox:checked').length;
    copyButton.disabled = selectedCount === 0;
}

// 截断文本，为问题和回答设置不同的长度限制
function truncateText(text, maxLength = 100, isAnswer = false) {
    const limit = isAnswer ? 60 : maxLength; // 回答的显示长度更短
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
}

// 更新侧边栏内容
function updateSidebar() {
    console.log('更新侧边栏内容');
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.error('未找到侧边栏内容容器');
        return;
    }

    const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
    console.log(`找到 ${conversations.length} 条对话用于侧边栏`);
    
    // 将对话按组配对
    const groups = [];
    for (let i = 0; i < conversations.length; i += 2) {
        if (i + 1 < conversations.length) {
            groups.push([conversations[i], conversations[i + 1]]);
        } else {
            groups.push([conversations[i]]);
        }
    }
    
    // 生成新的HTML
    let newHtml = '';
    groups.forEach((group, index) => {
        const userMessage = group[0].querySelector('[data-message-author-role="user"]');
        const assistantMessage = group[1]?.querySelector('[data-message-author-role="assistant"]');
        
        if (userMessage) {
            const userContent = userMessage.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '空内容';
            const assistantContent = assistantMessage?.querySelector('.markdown')?.textContent?.trim() || '等待回复...';
            
            newHtml += `
                <div class="conversation-group" data-index="${index}">
                    <div class="conversation-header" role="button" tabindex="0">
                        <input type="checkbox" class="conversation-checkbox">
                        <span class="conversation-number">#${index + 1}</span>
                    </div>
                    <div class="conversation-item user">
                        <span class="conversation-icon">Q:</span>
                        <span class="conversation-text">${truncateText(userContent, 100, false)}</span>
                    </div>
                    <div class="conversation-item assistant">
                        <span class="conversation-icon">A:</span>
                        <span class="conversation-text">${truncateText(assistantContent, 100, true)}</span>
                    </div>
                </div>
            `;
        }
    });
    
    // 只有当内容真的变化时才更新
    if (sidebarContent.innerHTML !== newHtml) {
        sidebarContent.innerHTML = newHtml;
        console.log('侧边栏更新完成');
        
        // 添加点击事件处理
        const headers = sidebarContent.querySelectorAll('.conversation-header');
        headers.forEach(header => {
            header.addEventListener('click', (event) => {
                if (document.getElementById('ai-chat-enhancer-sidebar').classList.contains('multi-select-mode')) {
                    const checkbox = header.querySelector('.conversation-checkbox');
                    if (event.target !== checkbox) { // 避免重复触发
                        checkbox.checked = !checkbox.checked;
                        updateCopyButtonState();
                    }
                }
            });
            
            // 添加键盘访问支持
            header.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (document.getElementById('ai-chat-enhancer-sidebar').classList.contains('multi-select-mode')) {
                        const checkbox = header.querySelector('.conversation-checkbox');
                        checkbox.checked = !checkbox.checked;
                        updateCopyButtonState();
                    }
                }
            });
        });
    }
}

// 将对话内容转换为Markdown
function convertToMarkdown(generateToc = false) {
    console.log('开始转换Markdown, 是否生成目录:', generateToc);
    let markdown = '';
    
    // 检查当前网站类型
    const isTongyi = window.location.href.includes('tongyi.aliyun.com/qianwen');
    
    if (isTongyi) {
        // 通义千问的对话处理
        const conversations = document.querySelectorAll('.questionItem--dS3Alcnv, .answerItem--U4_Uv3iw');
        console.log(`找到 ${conversations.length} 条通义千问对话`);
        
        // 如果需要生成目录，先收集所有问题
        if (generateToc) {
            const questions = [];
            conversations.forEach((conv) => {
                if (conv.classList.contains('questionItem--dS3Alcnv')) {
                    const content = conv.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '';
                    if (content) {
                        questions.push(content);
                    }
                }
            });
            
            if (questions.length > 0) {
                markdown += '## 目录\n\n';
                questions.forEach((question, index) => {
                    const shortQuestion = question.length > 30 ? question.substring(0, 30) + '...' : question;
                    markdown += `${index + 1}. [${shortQuestion}](#问题-${index + 1})\n`;
                });
                markdown += '\n---\n\n';
            }
        }
        
        // 计数器，用于生成问题的锚点
        let questionCount = 0;
        
        // 转换对话内容
        conversations.forEach((conv) => {
            if (conv.classList.contains('questionItem--dS3Alcnv')) {
                questionCount++;
                const content = conv.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '';
                markdown += generateToc ? 
                    `\n### 问题 ${questionCount}\n\n${content}\n` :
                    `\n### 用户\n\n${content}\n`;
            } else if (conv.classList.contains('answerItem--U4_Uv3iw')) {
                const markdownElement = conv.querySelector('.tongyi-markdown');
                if (markdownElement) {
                    let content = '';
                    
                    markdownElement.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            content += node.textContent.trim() + '\n';
                        } else if (node.nodeName === 'P') {
                            content += node.textContent.trim() + '\n\n';
                        } else if (node.nodeName === 'PRE') {
                            const code = node.textContent.trim();
                            const language = node.querySelector('code')?.className?.replace('language-', '') || '';
                            content += '\n```' + language + '\n' + code + '\n```\n\n';
                        } else if (node.nodeName === 'OL' || node.nodeName === 'UL') {
                            node.querySelectorAll('li').forEach((li, i) => {
                                const prefix = node.nodeName === 'OL' ? `${i + 1}.` : '-';
                                content += `${prefix} ${li.textContent.trim()}\n`;
                            });
                            content += '\n';
                        } else if (node.nodeName === 'TABLE') {
                            const rows = node.querySelectorAll('tr');
                            rows.forEach((row, i) => {
                                const cells = Array.from(row.querySelectorAll('td, th'))
                                    .map(cell => cell.textContent.trim())
                                    .join(' | ');
                                content += `| ${cells} |\n`;
                                if (i === 0) {
                                    content += '|' + ' --- |'.repeat(cells.split('|').length) + '\n';
                                }
                            });
                            content += '\n';
                        }
                    });
                    
                    markdown += `\n### 通义千问\n\n${content}`;
                }
            }
        });
    } else {
        // ChatGPT的对话处理
        const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
        console.log(`找到 ${conversations.length} 条对话`);
        
        // 如果需要生成目录，先收集所有问题
        if (generateToc) {
            const questions = [];
            conversations.forEach((conv) => {
                const isUser = conv.querySelector('[data-message-author-role="user"]');
                if (isUser) {
                    const content = conv.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '';
                    if (content) {
                        questions.push(content);
                    }
                }
            });
            
            if (questions.length > 0) {
                markdown += '## 目录\n\n';
                questions.forEach((question, index) => {
                    const shortQuestion = question.length > 30 ? question.substring(0, 30) + '...' : question;
                    markdown += `${index + 1}. [${shortQuestion}](#问题-${index + 1})\n`;
                });
                markdown += '\n---\n\n';
            }
        }
        
        // 计数器，用于生成问题的锚点
        let questionCount = 0;
        
        // 转换对话内容
        conversations.forEach((conv) => {
            const isUser = conv.querySelector('[data-message-author-role="user"]');
            const isAssistant = conv.querySelector('[data-message-author-role="assistant"]');
            
            if (isUser) {
                questionCount++;
                const content = conv.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '';
                markdown += generateToc ? 
                    `\n### 问题 ${questionCount}\n\n${content}\n` :
                    `\n### 用户\n\n${content}\n`;
            } else if (isAssistant) {
                const markdownElement = conv.querySelector('.markdown');
                if (markdownElement) {
                    let content = '';
                    
                    markdownElement.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            content += node.textContent.trim() + '\n';
                        } else if (node.nodeName === 'P') {
                            content += node.textContent.trim() + '\n\n';
                        } else if (node.nodeName === 'PRE') {
                            const code = node.textContent.trim();
                            const language = node.querySelector('code')?.className?.replace('language-', '') || '';
                            content += '\n```' + language + '\n' + code + '\n```\n\n';
                        } else if (node.nodeName === 'OL' || node.nodeName === 'UL') {
                            node.querySelectorAll('li').forEach((li, i) => {
                                const prefix = node.nodeName === 'OL' ? `${i + 1}.` : '-';
                                content += `${prefix} ${li.textContent.trim()}\n`;
                            });
                            content += '\n';
                        } else if (node.nodeName === 'TABLE') {
                            const rows = node.querySelectorAll('tr');
                            rows.forEach((row, i) => {
                                const cells = Array.from(row.querySelectorAll('td, th'))
                                    .map(cell => cell.textContent.trim())
                                    .join(' | ');
                                content += `| ${cells} |\n`;
                                if (i === 0) {
                                    content += '|' + ' --- |'.repeat(cells.split('|').length) + '\n';
                                }
                            });
                            content += '\n';
                        }
                    });
                    
                    markdown += `\n### ChatGPT\n\n${content}`;
                }
            }
        });
    }
    
    console.log('Markdown转换完成');
    return markdown.trim();
}

// 存储当前宽度设置
let currentWidthLevel = 0;

// 定义宽度设置
const WIDTH_SETTINGS = {
    0: { // 默认
        classes: ['md:max-w-3xl', 'lg:max-w-[40rem]', 'xl:max-w-[48rem]']
    },
    1: { // 较宽
        classes: ['md:max-w-4xl', 'lg:max-w-[48rem]', 'xl:max-w-[56rem]']
    },
    2: { // 宽
        classes: ['md:max-w-5xl', 'lg:max-w-[56rem]', 'xl:max-w-[64rem]']
    }
};

// 定义选择器常量
const SELECTORS = {
    MAIN_CONTAINER: '.flex.flex-col.text-sm',
    CONVERSATION_CONTAINER: '.mx-auto.flex.flex-1.gap-4.text-base',
    MESSAGE_CONTAINER: '[data-testid^="conversation-turn-"]'
};

// 所有可能的宽度类前缀
const WIDTH_CLASS_PREFIXES = [
    'md:max-w-',
    'lg:max-w-',
    'xl:max-w-'
];

// 查找对话容器的函数
function findConversationContainers() {
    const containers = document.querySelectorAll(SELECTORS.CONVERSATION_CONTAINER);
    console.log('找到对话容器数量:', containers.length);
    if (containers.length > 0) {
        console.log('对话容器当前类名:', containers[0].className);
    }
    return containers;
}

// 重试函数
async function retry(fn, maxAttempts = 5, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            console.log(`尝试第 ${attempt} 次失败，${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// 调整对话宽度
async function adjustConversationWidth(level) {
    console.log('调整宽度到级别:', level);
    
    const setting = WIDTH_SETTINGS[level];
    if (!setting) {
        console.error('无效的宽度级别:', level);
        return;
    }

    try {
        await retry(async () => {
            const containers = findConversationContainers();
            if (containers.length === 0) {
                throw new Error('未找到对话容器');
            }

            containers.forEach(container => {
                // 移除所有现有的宽度类
                WIDTH_CLASS_PREFIXES.forEach(prefix => {
                    container.classList.forEach(cls => {
                        if (cls.startsWith(prefix)) {
                            console.log('移除宽度类:', cls);
                            container.classList.remove(cls);
                        }
                    });
                });

                // 添加新的宽度类
                setting.classes.forEach(cls => {
                    console.log('添加宽度类:', cls);
                    container.classList.add(cls);
                });

                console.log('更新后的类名:', container.className);
            });

            // 更新状态并保存
            currentWidthLevel = level;
            return chrome.storage.sync.set({ 
                conversationWidth: level,
                widthClasses: setting.classes // 保存实际的宽度类
            });
        }, 3, 500);
        
        console.log('宽度调整成功完成');
    } catch (error) {
        console.error('宽度调整失败:', error);
    }
}

// 初始化宽度设置
async function initializeWidthSettings() {
    try {
        const result = await new Promise(resolve => {
            chrome.storage.sync.get(['conversationWidth', 'widthClasses', 'sidebarVisible'], resolve);
        });
        
        console.log('加载保存的设置:', result);
        
        // 设置导航栏显示状态
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        if (sidebar) {
            sidebar.style.display = result.sidebarVisible === false ? 'none' : 'flex';
        }

        // 应用对话宽度设置
        if (result.conversationWidth !== undefined) {
            currentWidthLevel = result.conversationWidth;
            // 等待一段时间确保DOM已经加载
            await new Promise(resolve => setTimeout(resolve, 500));
            await adjustConversationWidth(currentWidthLevel);
            
            // 添加重试机制
            let retryCount = 0;
            const maxRetries = 3;
            const checkWidth = async () => {
                const containers = findConversationContainers();
                if (containers.length === 0 && retryCount < maxRetries) {
                    retryCount++;
                    console.log(`未找到对话容器，${retryCount}秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await adjustConversationWidth(currentWidthLevel);
                    await checkWidth();
                }
            };
            await checkWidth();
        }
    } catch (error) {
        console.error('初始化宽度设置失败:', error);
    }
}

// 创建宽度调整的 MutationObserver
function createWidthAdjustmentObserver() {
    const observer = new MutationObserver((mutations) => {
        const relevantMutation = mutations.some(mutation => {
            if (mutation.type !== 'childList' && mutation.type !== 'attributes') return false;
            
            const target = mutation.target;
            if (!target || !(target instanceof Element)) return false;

            // 检查是否是对话容器或其父元素
            return target.matches(SELECTORS.CONVERSATION_CONTAINER) ||
                   target.closest(SELECTORS.CONVERSATION_CONTAINER);
        });

        if (relevantMutation) {
            console.log('检测到对话容器变化，重新应用宽度设置');
            adjustConversationWidth(currentWidthLevel);
        }
    });

    // 观察整个聊天容器
    retry(() => {
        const chatContainer = document.querySelector(SELECTORS.MAIN_CONTAINER);
        if (!chatContainer) {
            throw new Error('未找到主容器');
        }
        
        observer.observe(chatContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        console.log('宽度调整观察器已启动');
    });

    return observer;
}

// 保存设置
function saveSettings(settings) {
    return new Promise((resolve) => {
        // 如果包含侧边栏显示状态，确保与实际状态一致
        if ('sidebarVisible' in settings) {
            const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
            if (sidebar) {
                const actualVisible = sidebar.style.display !== 'none';
                settings.sidebarVisible = actualVisible;
            }
        }
        
        chrome.storage.sync.set(settings, () => {
            console.log('保存设置:', settings);
            resolve();
        });
    });
}

// 加载设置
function loadSettings() {
    return new Promise((resolve) => {
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        const actualSidebarVisible = sidebar ? sidebar.style.display !== 'none' : true;
        
        chrome.storage.sync.get(['sidebarVisible', 'conversationWidth', 'sidebarWidth'], (result) => {
            console.log('加载设置:', result, '实际侧边栏状态:', actualSidebarVisible);
            
            // 如果存储的状态与实际状态不一致，以实际状态为准
            if (result.sidebarVisible !== actualSidebarVisible) {
                chrome.storage.sync.set({ sidebarVisible: actualSidebarVisible });
            }
            
            resolve({
                sidebarVisible: actualSidebarVisible,
                conversationWidth: result.conversationWidth || 0,
                sidebarWidth: result.sidebarWidth || 380
            });
        });
    });
}

// 应用设置
async function applySettings() {
    const settings = await loadSettings();
    console.log('应用设置:', settings);

    // 应用侧边栏显示状态
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    if (sidebar) {
        sidebar.style.display = settings.sidebarVisible ? 'flex' : 'none';
    }

    // 应用对话宽度
    if (settings.conversationWidth !== undefined) {
        adjustConversationWidth(settings.conversationWidth);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request.action);
    
    if (request.action === 'getSettings') {
        // 确保返回实际的侧边栏状态
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        const actualSidebarVisible = sidebar ? sidebar.style.display !== 'none' : true;
        
        loadSettings().then(settings => {
            // 如果实际状态与存储状态不一致，更新存储
            if (settings.sidebarVisible !== actualSidebarVisible) {
                chrome.storage.sync.set({ sidebarVisible: actualSidebarVisible });
                settings.sidebarVisible = actualSidebarVisible;
            }
            sendResponse(settings);
        });
        return true;
    }
    
    if (request.action === 'toggleSidebar') {
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        if (sidebar) {
            const isVisible = request.visible;
            sidebar.style.display = isVisible ? 'flex' : 'none';
            // 确保立即保存状态
            chrome.storage.sync.set({ sidebarVisible: isVisible }, () => {
                console.log('保存侧边栏状态:', isVisible);
                sendResponse({ 
                    success: true, 
                    actualState: isVisible,
                    displayStyle: sidebar.style.display
                });
            });
        }
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'adjustWidth') {
        adjustConversationWidth(request.widthLevel);
        saveSettings({ conversationWidth: request.widthLevel });
        sendResponse({ success: true });
    }

    if (request.action === 'getMarkdown') {
        try {
            const markdown = convertToMarkdown(request.generateToc);
            sendResponse({ markdown });
        } catch (error) {
            console.error('转换Markdown失败:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
});

// 在页面加载完成后应用设置
async function initialize() {
    try {
        await applySettings();
        await initializeWidthSettings();
        
        // 添加 MutationObserver 来监听动态加载的内容
        const observer = new MutationObserver(async (mutations) => {
            const hasNewContent = mutations.some(mutation => 
                mutation.addedNodes.length > 0 && 
                Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && 
                    (node.matches(SELECTORS.CONVERSATION_CONTAINER) || 
                     node.querySelector(SELECTORS.CONVERSATION_CONTAINER))
                )
            );

            if (hasNewContent) {
                console.log('检测到新的对话内容，重新应用宽度设置');
                await adjustConversationWidth(currentWidthLevel);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } catch (error) {
        console.error('初始化失败:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// 监听页面变化以重新应用设置
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            mutation.target.classList.contains('mx-auto') &&
            mutation.target.classList.contains('flex') &&
            mutation.target.classList.contains('flex-1')) {
            applySettings();
        }
    });
});

// 观察整个聊天容器
const chatContainer = document.querySelector('.flex.flex-col.text-sm');
if (chatContainer) {
    observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}

// 初始化插件
function init() {
    console.log('开始初始化插件');
    try {
        // 创建侧边栏
        const sidebar = createSidebar();
        
        // 创建观察器以监听页面变化
        let updateTimeout = null;
        const observer = new MutationObserver((mutations) => {
            // 检查是否是我们关心的变化
            const shouldUpdate = mutations.some(mutation => {
                // 忽略对侧边栏的修改
                const target = mutation.target.nodeType === Node.ELEMENT_NODE 
                    ? mutation.target 
                    : mutation.target.parentElement;
                
                if (!target) return false;
                
                if (target.closest('#ai-chat-enhancer-sidebar')) {
                    return false;
                }
                // 只关注对话内容的变化
                return target.closest('[data-testid^="conversation-turn-"]');
            });

            if (shouldUpdate) {
                // 使用防抖，避免频繁更新
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    console.log('检测到对话变化');
                    updateSidebar();
                }, 500);
            }
        });
        
        // 开始观察页面变化
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        console.log('已启动页面观察器');
        
        // 初始更新侧边栏
        updateSidebar();
        
        console.log('插件初始化完成');
    } catch (error) {
        console.error('插件初始化失败:', error);
    }
}

// 初始化代码
console.log('content.js 已加载');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
