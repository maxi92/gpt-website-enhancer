// 创建侧边栏容器
function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-chat-enhancer-sidebar';
    // 默认设置为不显示
    sidebar.style.display = 'none';
    // 设置初始宽度
    sidebar.style.width = '380px';
    
    sidebar.innerHTML = `
        <div class="sidebar-resizer"></div>
        <div class="sidebar-header">
            <span>对话导航</span>
            <div class="sidebar-header-buttons">
                <button id="multiSelect" class="sidebar-button">多选</button>
                <button id="copySelected" class="sidebar-button copy-selected" disabled>复制选中</button>
            </div>
        </div>
        <div class="sidebar-content"></div>
    `;
    
    // 添加宽度调整功能
    const resizer = sidebar.querySelector('.sidebar-resizer');
    let isResizing = false;
    let startX;
    let startWidth;
    let currentWidth;
    let animationFrameId;

    // 添加防止文字选中的样式
    const noSelectStyle = document.createElement('style');
    noSelectStyle.id = 'no-select-style';
    noSelectStyle.textContent = 'body.resizing * { user-select: none !important; }';

    function addNoSelectStyle() {
        if (!document.getElementById('no-select-style')) {
            document.head.appendChild(noSelectStyle);
        }
    }

    function removeNoSelectStyle() {
        const style = document.getElementById('no-select-style');
        if (style) {
            style.remove();
        }
    }

    function updateSidebarWidth() {
        if (!isResizing) return;
        
        if (currentWidth >= 240 && currentWidth <= 600) {
            sidebar.style.width = `${currentWidth}px`;
        }
        animationFrameId = requestAnimationFrame(updateSidebarWidth);
    }

    function handleMouseMove(e) {
        if (!isResizing) return;
        
        // 计算新宽度
        currentWidth = startWidth - (e.pageX - startX);
        
        // 如果没有正在运行的动画帧，启动一个
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updateSidebarWidth);
        }
    }

    function handleMouseUp() {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.classList.remove('resizing');
        removeNoSelectStyle();
        
        // 清除事件监听
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // 取消任何待处理的动画帧
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // 保存最终宽度到存储
        // 使用防抖来避免频繁存储
        if (currentWidth >= 240 && currentWidth <= 600) {
            chrome.storage.sync.set({ sidebarWidth: currentWidth });
        }
    }

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        currentWidth = startWidth;
        
        document.body.classList.add('resizing');
        addNoSelectStyle();

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    });
    
    // 添加多选按钮事件监听
    const multiSelectButton = sidebar.querySelector('#multiSelect');
    const copySelectedButton = sidebar.querySelector('#copySelected');
    
    multiSelectButton.addEventListener('click', function() {
        const isMultiSelectMode = sidebar.classList.toggle('multi-select-mode');
        this.textContent = isMultiSelectMode ? '取消多选' : '多选';
        
        // 重置所有复选框的状态
        const checkboxes = sidebar.querySelectorAll('.conversation-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 更新复制按钮状态
        copySelectedButton.disabled = true;
    });
    
    // 添加复制选中按钮事件监听
    copySelectedButton.addEventListener('click', function() {
        const selectedGroups = sidebar.querySelectorAll('.conversation-checkbox:checked');
        if (selectedGroups.length === 0) return;
        
        let copyText = '';
        selectedGroups.forEach(checkbox => {
            const group = checkbox.closest('.conversation-group');
            const index = parseInt(group.dataset.index);
            
            // 获取原始元素
            const hostname = window.location.hostname;
            let questionElement, answerElement;
            
            if (hostname.includes('chatgpt.com')) {
                const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
                questionElement = conversations[index * 2];
                answerElement = conversations[index * 2 + 1];
            } else if (hostname.includes('tongyi.aliyun.com')) {
                const questions = document.querySelectorAll('.questionItem--dS3Alcnv');
                const answers = document.querySelectorAll('.answerItem--U4_Uv3iw');
                questionElement = questions[index];
                answerElement = answers[index];
            }
            
            if (questionElement && answerElement) {
                const { question, answer } = getFullConversationContent(questionElement, answerElement);
                copyText += `### 对话 ${index + 1}\n\n**问题**：${question}\n\n**回答**：${answer}\n\n---\n\n`;
            }
        });
        
        navigator.clipboard.writeText(copyText.trim()).then(() => {
            const button = this;
            const originalText = button.textContent;
            button.textContent = '已复制！';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    });
    
    document.body.appendChild(sidebar);
    
    // 从存储中读取并应用保存的宽度
    chrome.storage.sync.get(['sidebarWidth'], (result) => {
        if (result.sidebarWidth) {
            sidebar.style.width = `${result.sidebarWidth}px`;
        }
    });
    
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
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    const copyButton = sidebar.querySelector('#copySelected');
    const selectedCount = sidebar.querySelectorAll('.conversation-checkbox:checked').length;
    copyButton.disabled = selectedCount === 0;
}

// 截断文本，为问题和回答设置不同的长度限制
function truncateText(text, maxLength = 100, isAnswer = false) {
    const limit = isAnswer ? 60 : maxLength; // 回答的显示长度更短
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
}

// 网站配置
const SITE_CONFIGS = {
    chatgpt: {
        conversationSelector: '[data-testid^="conversation-turn-"]',
        humanMessageSelector: '[data-message-author-role="user"]',
        aiMessageSelector: '[data-message-author-role="assistant"]',
        messageContentSelector: {
            human: '.whitespace-pre-wrap',
            ai: '.markdown'
        },
        site: 'chatgpt'
    },
    tongyi: {
        conversationSelector: '.questionItem--dS3Alcnv, .answerItem--U4_Uv3iw',
        humanMessageSelector: '.questionItem--dS3Alcnv',
        aiMessageSelector: '.answerItem--U4_Uv3iw',
        messageContentSelector: {
            human: '.bubble--H3ZjjTnP',
            ai: '.tongyi-markdown'
        },
        site: 'tongyi'
    }
};

// 获取当前网站的配置
function getCurrentSiteConfig() {
    const hostname = window.location.hostname;
    if (hostname.includes('chat.openai.com')) {
        return SITE_CONFIGS.chatgpt;
    } else if (hostname.includes('tongyi.aliyun.com')) {
        return SITE_CONFIGS.tongyi;
    }
    return null;
}

// 获取对话内容的函数
function getConversationContent() {
    const siteConfig = getCurrentSiteConfig();
    if (!siteConfig) return [];
    
    const conversations = [];
    const elements = document.querySelectorAll(siteConfig.conversationSelector);
    console.log('找到元素数量:', elements.length);
    
    // 将问答组织成对
    const pairs = [];
    let currentPair = {};
    
    elements.forEach((element) => {
        const isHuman = element.matches(siteConfig.humanMessageSelector);
        const contentSelector = isHuman 
            ? siteConfig.messageContentSelector.human 
            : siteConfig.messageContentSelector.ai;
        const contentElement = element.querySelector(contentSelector);
        
        if (contentElement) {
            const content = contentElement.textContent.trim();
            if (isHuman) {
                currentPair = { question: content, questionElement: element };
            } else {
                if (currentPair.question) {
                    currentPair.answer = content;
                    currentPair.answerElement = element;
                    pairs.push({ ...currentPair });
                    currentPair = {};
                }
            }
        }
    });
    
    // 转换为导航项格式
    pairs.forEach((pair, index) => {
        conversations.push({
            id: index,
            type: 'group',
            question: pair.question,
            answer: pair.answer,
            questionElement: pair.questionElement,
            answerElement: pair.answerElement,
            previewText: {
                question: pair.question.length > 50 ? pair.question.substring(0, 50) + '...' : pair.question,
                answer: pair.answer.length > 50 ? pair.answer.substring(0, 50) + '...' : pair.answer
            }
        });
    });
    
    console.log('处理后的对话组数:', conversations.length);
    return conversations;
}

// 更新侧边栏内容
function updateSidebar() {
    console.log('更新侧边栏内容');
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.error('未找到侧边栏内容容器');
        return;
    }

    const hostname = window.location.hostname;
    let newHtml = '';

    // ChatGPT页面的处理
    if (hostname.includes('chatgpt.com')) {
        const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
        console.log(`找到 ${conversations.length} 条ChatGPT对话`);
        
        // 将对话按组配
        const groups = [];
        for (let i = 0; i < conversations.length; i += 2) {
            if (i + 1 < conversations.length) {
                groups.push([conversations[i], conversations[i + 1]]);
            } else {
                groups.push([conversations[i]]);
            }
        }
        
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
    }
    // 通义千问页面的处理
    else if (hostname.includes('tongyi.aliyun.com')) {
        // 等待主容器加载
        const mainContainer = document.querySelector('.scrollWrapper--oanFSFJG');
        if (!mainContainer) {
            console.log('通义千问主容器未加载，跳过更新');
            return;
        }

        const questions = mainContainer.querySelectorAll('.questionItem--dS3Alcnv');
        const answers = mainContainer.querySelectorAll('.answerItem--U4_Uv3iw');
        console.log(`找到 ${questions.length} 个问题和 ${answers.length} 个回答`);

        // 将问答组织成对
        const pairs = [];
        questions.forEach((question, index) => {
            const answer = answers[index];
            if (question && answer) {
                const questionContent = question.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '空内容';
                const answerContent = answer.querySelector('.tongyi-markdown')?.textContent?.trim() || '等待回复...';
                pairs.push({
                    question: questionContent,
                    answer: answerContent,
                    questionElement: question,
                    answerElement: answer
                });
            }
        });

        pairs.forEach((pair, index) => {
            newHtml += `
                <div class="conversation-group" data-index="${index}">
                    <div class="conversation-header" role="button" tabindex="0">
                        <input type="checkbox" class="conversation-checkbox">
                        <span class="conversation-number">#${index + 1}</span>
                    </div>
                    <div class="conversation-item user">
                        <span class="conversation-icon">Q:</span>
                        <span class="conversation-text">${truncateText(pair.question, 100, false)}</span>
                    </div>
                    <div class="conversation-item assistant">
                        <span class="conversation-icon">A:</span>
                        <span class="conversation-text">${truncateText(pair.answer, 100, true)}</span>
                    </div>
                </div>
            `;
        });
    }

    // 只有当内容真的变化时更新
    if (sidebarContent.innerHTML !== newHtml) {
        sidebarContent.innerHTML = newHtml;
        console.log('侧边栏更新完成');
        
        // 添加点击事件处理
        const groups = sidebarContent.querySelectorAll('.conversation-group');
        groups.forEach(group => {
            group.addEventListener('click', (event) => {
                const checkbox = event.target.closest('.conversation-checkbox');
                const isMultiSelect = document.getElementById('ai-chat-enhancer-sidebar').classList.contains('multi-select-mode');
                
                if (checkbox) {
                    event.stopPropagation();
                    updateCopyButtonState();
                } else if (isMultiSelect) {
                    const groupCheckbox = group.querySelector('.conversation-checkbox');
                    if (groupCheckbox) {
                        groupCheckbox.checked = !groupCheckbox.checked;
                        updateCopyButtonState();
                    }
                } else {
                    const index = parseInt(group.dataset.index);
                    if (hostname.includes('chat.openai.com')) {
                        const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
                        conversations[index * 2]?.scrollIntoView({ behavior: 'smooth' });
                    } else if (hostname.includes('tongyi.aliyun.com')) {
                        const questions = document.querySelectorAll('.questionItem--dS3Alcnv');
                        questions[index]?.scrollIntoView({ behavior: 'smooth' });
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
        
        // 如果需要生成目录，先收集所有题
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
        console.log('对话容器当前类:', containers[0].className);
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
    // 如果是通义千问页面，直接返回
    if (window.location.hostname.includes('tongyi.aliyun.com')) {
        console.log('通义千问页面不需要调整对话宽度');
        return;
    }

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

                console.log('更新后类名:', container.className);
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
    // 如果是通义千问页面，不初始化宽度设置
    if (window.location.hostname.includes('tongyi.aliyun.com')) {
        console.log('通义千问页面不需要初始化宽度设置');
        return;
    }

    try {
        const result = await new Promise(resolve => {
            chrome.storage.sync.get(['conversationWidth', 'widthClasses', 'sidebarVisible'], resolve);
        });
        
        console.log('加载保存的设置:', result);
        
        // 设置导航栏显示态
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
    // 如果是通义千问页面，不创建观察器
    if (window.location.hostname.includes('tongyi.aliyun.com')) {
        console.log('通义千问页面不需要创建宽度调整观察器');
        return null;
    }

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
        chrome.storage.sync.get(['sidebarVisible'], (result) => {
            // 如果存储中没有值，默认为false
            const isVisible = result.sidebarVisible === true;
            resolve(isVisible);
        });
    });
}

// 应用设置
async function applySettings() {
    const isVisible = await loadSettings();
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    if (sidebar) {
        sidebar.style.display = isVisible ? 'flex' : 'none';
        // 同步存储状态
        chrome.storage.sync.set({ sidebarVisible: isVisible });
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request.action);
    
    if (request.action === 'getSettings') {
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        // 使用实际的显示状态来判断
        const actualSidebarVisible = sidebar ? sidebar.style.display === 'flex' : false;
        
        // 根据页面类型返回不同的设置
        const isTongyi = window.location.hostname.includes('tongyi.aliyun.com');
        sendResponse({
            sidebarVisible: actualSidebarVisible,
            conversationWidth: isTongyi ? undefined : currentWidthLevel, // 通义千问页面不返回宽度设置
            sidebarWidth: 380,
            isTongyi: isTongyi // 添加页面类型标识
        });
        return true;
    }
    
    if (request.action === 'toggleSidebar') {
        const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
        if (sidebar) {
            const isVisible = request.visible;
            sidebar.style.display = isVisible ? 'flex' : 'none';
            // 保存状态
            chrome.storage.sync.set({ sidebarVisible: isVisible }, () => {
                sendResponse({ 
                    success: true, 
                    actualState: isVisible,
                    displayStyle: sidebar.style.display
                });
            });
        }
        return true;
    }
    
    if (request.action === 'adjustWidth') {
        // 如果是通义千问页面，忽略宽度调整请求
        if (!window.location.hostname.includes('tongyi.aliyun.com')) {
            adjustConversationWidth(request.widthLevel);
            saveSettings({ conversationWidth: request.widthLevel });
        }
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
        
        // 添加 MutationObserver 监听动态加载的内容
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
async function init() {
    console.log('开始初始化插件');
    try {
        // 创建侧边栏（默认隐藏）
        const sidebar = createSidebar();
        
        // 应用存储的设置
        await applySettings();
        
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

                const hostname = window.location.hostname;
                if (hostname.includes('chatgpt.com')) {
                    return target.closest(SELECTORS.MESSAGE_CONTAINER);
                } else if (hostname.includes('tongyi.aliyun.com')) {
                    return target.closest('.questionItem--dS3Alcnv') || 
                           target.closest('.answerItem--U4_Uv3iw') ||
                           target.closest('.scrollWrapper--oanFSFJG');
                }
                return false;
            });

            if (shouldUpdate) {
                // 使用抖，避免频繁更新
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
        
        // 初始化定时更新机制
        let updateAttempts = 0;
        const maxAttempts = 10;
        
        const updateInterval = setInterval(() => {
            const hostname = window.location.hostname;
            if (hostname.includes('chat.openai.com')) {
                const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
                if (conversations.length > 0) {
                    console.log('ChatGPT对话已加载，更新导航栏');
                    updateSidebar();
                    clearInterval(updateInterval);
                } else {
                    console.log('等待ChatGPT对话加载...');
                    updateAttempts++;
                    if (updateAttempts >= maxAttempts) {
                        console.log('达到最大尝试次数，停止自动更新');
                        clearInterval(updateInterval);
                    }
                }
            } else if (hostname.includes('tongyi.aliyun.com')) {
                const questions = document.querySelectorAll('.questionItem--dS3Alcnv');
                const answers = document.querySelectorAll('.answerItem--U4_Uv3iw');
                if (questions.length > 0 || answers.length > 0) {
                    console.log('通义千问对话已加载，更新导航栏');
                    updateSidebar();
                    clearInterval(updateInterval);
                } else {
                    console.log('等待通义千问对话加载...');
                    updateAttempts++;
                    if (updateAttempts >= maxAttempts) {
                        console.log('达到最大尝试次数，停止自动更新');
                        clearInterval(updateInterval);
                    }
                }
            }
        }, 1000);
        
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

// 获取对话的完整内容
function getFullConversationContent(questionElement, answerElement) {
    const hostname = window.location.hostname;
    let question = '';
    let answer = '';

    if (hostname.includes('chatgpt.com')) {
        question = questionElement.querySelector('[data-message-author-role="user"] .whitespace-pre-wrap')?.textContent?.trim() || '';
        answer = answerElement?.querySelector('[data-message-author-role="assistant"] .markdown')?.textContent?.trim() || '';
    } else if (hostname.includes('tongyi.aliyun.com')) {
        question = questionElement.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '';
        answer = answerElement.querySelector('.tongyi-markdown')?.textContent?.trim() || '';
    }

    return { question, answer };
}
