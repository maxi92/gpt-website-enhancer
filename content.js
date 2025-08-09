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

    multiSelectButton.addEventListener('click', function () {
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
    copySelectedButton.addEventListener('click', function () {
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
            } else if (hostname.includes('www.tongyi.com')) {
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
    if (hostname.includes('chatgpt.com')) {
        return SITE_CONFIGS.chatgpt;
    } else if (hostname.includes('www.tongyi.com')) {
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

        groups.forEach((groupNodes, index) => {
            const groupUserNode = groupNodes[0];
            const userMessage = groupUserNode.querySelector('[data-message-author-role="user"]') || groupUserNode; // 回退使用整个容器
            const assistantMessage = groupNodes[1]?.querySelector('[data-message-author-role="assistant"]') || groupNodes[1];

            if (userMessage) {
                const userContent = userMessage.querySelector?.('.whitespace-pre-wrap')?.textContent?.trim() || userMessage.textContent?.trim() || '空内容';
                const assistantContent = assistantMessage?.querySelector?.('.markdown')?.textContent?.trim() || assistantMessage?.textContent?.trim() || '等待回复...';

                // 为页面中的原始元素打上可定位的锚点属性
                const targetId = groupUserNode.getAttribute('data-ai-enhancer-target-id') || `ai-enhancer-target-${index}`;
                try {
                    groupUserNode.setAttribute('data-ai-enhancer-target-id', targetId);
                } catch (_) { }

                newHtml += `
                    <div class="conversation-group" data-index="${index}" data-target-id="${targetId}">
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
    else if (hostname.includes('www.tongyi.com')) {
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
            // 为原始问元素打上锚点，便于定位
            const targetId = pair.questionElement.getAttribute('data-ai-enhancer-target-id') || `ai-enhancer-target-${index}`;
            try {
                pair.questionElement.setAttribute('data-ai-enhancer-target-id', targetId);
            } catch (_) { }
            newHtml += `
                <div class="conversation-group" data-index="${index}" data-target-id="${targetId}">
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

    // 只当内容真的变化时更新
    if (sidebarContent.innerHTML !== newHtml) {
        sidebarContent.innerHTML = newHtml;
        console.log('侧边栏更新完成');

        // 添加点击事件处理
        const groups = sidebarContent.querySelectorAll('.conversation-group');
        groups.forEach(group => {
            group.addEventListener('click', handleConversationClick);
        });
    }
}

// 修改转换为 markdown 的函数
function convertToMarkdown(element) {
    // 如果没有传入 element，直接返回空字符串
    if (!element) {
        console.warn('convertToMarkdown: No element provided');
        return '';
    }

    return convertElementToMarkdown(element);
}

// 新增辅助函数处理单个素的转换
function convertElementToMarkdown(element) {
    if (!element) return '';

    let markdown = '';

    // 遍历所有子元素
    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            markdown += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 处理代码块
            if (node.classList?.contains('!overflow-visible') ||
                node.tagName === 'PRE') {
                // 移除代码块前后可能存在的多余换行
                markdown = markdown.trimEnd();
                markdown += processCodeBlock(node);
            }
            // 处理其他元素
            else {
                markdown += convertElementToMarkdown(node);
            }
        }
    });

    return markdown;
}

// 修改代码块处理函数
function processCodeBlock(codeBlock) {
    if (!codeBlock) return '';

    // 获取代码语言
    const langDiv = codeBlock.querySelector('.flex.items-center.text-token-text-secondary');
    const language = langDiv ? langDiv.textContent.trim() : '';

    // 直接获取 code 标签中的内容
    const codeContent = codeBlock.querySelector('code');
    let codeText = '';
    if (codeContent) {
        // 获取原始文本内容，移除多余的按钮和式标签
        codeText = codeContent.textContent.trim();
    }

    // 返回格式化后的 markdown 代码块，确保前后都有换行
    return `\n\`\`\`${language}\n${codeText}\n\`\`\`\n`;
}

// 修改复制选中内容的函数
function copySelectedConversations() {
    const selectedGroups = document.querySelectorAll('.conversation-group .conversation-checkbox:checked');
    let markdown = '';

    selectedGroups.forEach(checkbox => {
        const group = checkbox.closest('.conversation-group');
        const items = group.querySelectorAll('.conversation-item');

        items.forEach(item => {
            const isUser = item.classList.contains('user');
            const prefix = isUser ? '**Q:**' : '**A:**';

            // 获取对应的原始对话内容
            const index = parseInt(group.dataset.index);
            const conversations = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
            const originalMessage = conversations[index * 2 + (isUser ? 0 : 1)];

            if (originalMessage) {
                const content = convertElementToMarkdown(originalMessage);
                markdown += `${prefix} ${content}\n\n`;
            }
        });
    });

    navigator.clipboard.writeText(markdown);
    showCopySuccess();
}

// 存储当前宽度设置
let currentWidthLevel = 0;

// 档位对应的像素宽度（用于覆盖样式）
function getWidthPxForLevel(level) {
    const levelToPx = {
        0: 960,
        1: 1100,
        2: 1200
    };
    return levelToPx[level] ?? 1200;
}

// 定义选择器常量
const SELECTORS = {
    MAIN_CONTAINER: '.flex.flex-col.text-sm',
    CONVERSATION_CONTAINER: '.mx-auto.flex.flex-1.gap-4.text-base',
    MESSAGE_CONTAINER: '[data-testid^="conversation-turn-"]'
};

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

async function adjustConversationWidth(level) {
    // 如果是通义千问页面，直接返回
    if (window.location.hostname.includes('www.tongyi.com')) {
        console.log('通义千问页面不需要调整对话宽度');
        return;
    }

    try {
        currentWidthLevel = level;
        await chrome.storage.sync.set({ conversationWidth: level });
        ensureChatGPTWidthStyle(getWidthPxForLevel(level));
        console.log('宽度调整成功完成');
    } catch (error) {
        console.error('宽度调整失败:', error);
    }
}

// 初始化宽度设置
async function initializeWidthSettings() {
    // 如果是通义千问页面，初始化宽度设置
    if (window.location.hostname.includes('www.tongyi.com')) {
        console.log('通义千问页面不需要初始化宽度设置');
        return;
    }

    try {
        const result = await new Promise(resolve => {
            chrome.storage.sync.get(['conversationWidth', 'sidebarVisible'], resolve);
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
            await adjustConversationWidth(currentWidthLevel);
        } else {
            // 未保存过时，设定并持久化为默认档位，避免后续观察器回退
            await adjustConversationWidth(2);
        }
    } catch (error) {
        console.error('初始化宽度设置失败:', error);
    }
}

// 创建宽度调整的 MutationObserver
function createWidthAdjustmentObserver() {
    // 如果是通义千问页面，不创建观察器
    if (window.location.hostname.includes('www.tongyi.com')) {
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
        // 读取当前侧边栏实际宽度（如不可得则回退 380）
        const sidebarWidthPx = (() => {
            if (!sidebar) return 380;
            const computed = parseInt(window.getComputedStyle(sidebar).width, 10);
            if (!Number.isNaN(computed)) return computed;
            const inline = parseInt((sidebar.style.width || '380px').replace('px', ''), 10);
            return Number.isNaN(inline) ? 380 : inline;
        })();

        // 根据页面类型返回不同的设置
        const isTongyi = window.location.hostname.includes('www.tongyi.com');
        sendResponse({
            sidebarVisible: actualSidebarVisible,
            conversationWidth: isTongyi ? undefined : currentWidthLevel, // 通义千问页面不返回宽度设置
            sidebarWidth: sidebarWidthPx,
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
        if (!window.location.hostname.includes('www.tongyi.com')) {
            adjustConversationWidth(request.widthLevel);
            saveSettings({ conversationWidth: request.widthLevel });
        }
        sendResponse({ success: true });
    }

    if (request.action === 'getMarkdown') {
        try {
            const hostname = window.location.hostname;
            let markdown = '';
            let conversations = [];

            if (hostname.includes('chatgpt.com')) {
                // ChatGPT页面的处理
                const elements = document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
                elements.forEach((conversation, index) => {
                    const userMessage = conversation.querySelector('[data-message-author-role="user"]');
                    const assistantMessage = conversation.querySelector('[data-message-author-role="assistant"]');

                    if (userMessage) {
                        const userContent = userMessage.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '';
                        conversations.push({
                            index: Math.floor(index / 2) + 1,
                            title: userContent.length > 50 ? userContent.substring(0, 50) + '...' : userContent
                        });

                        markdown += `### 对话 ${Math.floor(index / 2) + 1}\n\n`;
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(userMessage) + '\n\n';
                    }
                    if (assistantMessage) {
                        markdown += '**A:** ';
                        markdown += convertElementToMarkdown(assistantMessage) + '\n\n';
                        markdown += '---\n\n';
                    }
                });
            } else if (hostname.includes('www.tongyi.com')) {
                // 通义千问页面的处理
                const questions = document.querySelectorAll('.questionItem--dS3Alcnv');
                const answers = document.querySelectorAll('.answerItem--U4_Uv3iw');

                questions.forEach((question, index) => {
                    const answer = answers[index];
                    if (question && answer) {
                        const questionContent = question.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '';
                        conversations.push({
                            index: index + 1,
                            title: questionContent.length > 50 ? questionContent.substring(0, 50) + '...' : questionContent
                        });

                        markdown += `### 对话 ${index + 1}\n\n`;
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(question.querySelector('.bubble--H3ZjjTnP')) + '\n\n';
                        markdown += '**A:** ';
                        markdown += convertElementToMarkdown(answer.querySelector('.tongyi-markdown')) + '\n\n';
                        markdown += '---\n\n';
                    }
                });
            }

            // 如果需要生成目录，在最前面添加目录
            if (request.generateToc) {
                let toc = '## 目录\n\n';
                conversations.forEach(conv => {
                    toc += `- [对话 ${conv.index}](#对话-${conv.index}) - ${conv.title}\n`;
                });
                toc += '\n---\n\n';
                markdown = toc + markdown;
            }

            sendResponse({ markdown: markdown.trim() });
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
        // 先应用存储的设置，避免默认样式覆盖用户选择
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

// 初始化件
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
                } else if (hostname.includes('www.tongyi.com')) {
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
            if (hostname.includes('chatgpt.com')) {
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
            } else if (hostname.includes('www.tongyi.com')) {
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
    } else if (hostname.includes('www.tongyi.com')) {
        question = questionElement.querySelector('.bubble--H3ZjjTnP')?.textContent?.trim() || '';
        answer = answerElement.querySelector('.tongyi-markdown')?.textContent?.trim() || '';
    }

    return { question, answer };
}

// 修改点击事件处理函数
function handleConversationClick(event) {
    console.log('点击事件触发');
    const checkbox = event.target.closest('.conversation-checkbox');
    const group = event.target.closest('.conversation-group');

    console.log('点击元素信息:', {
        isCheckbox: !!checkbox,
        hasGroup: !!group,
        targetElement: event.target.tagName,
        targetClass: event.target.className
    });

    if (!group) {
        console.log('未找到conversation-group元素，退出处理');
        return;
    }

    const isMultiSelect = document.getElementById('ai-chat-enhancer-sidebar').classList.contains('multi-select-mode');
    console.log('是否多选模式:', isMultiSelect);

    // 处理复选框点击
    if (checkbox) {
        console.log('处理复选框点击');
        event.stopPropagation();
        updateCopyButtonState();
        return;
    }

    // 处理多选模式
    if (isMultiSelect) {
        console.log('处理多选模式点击');
        const groupCheckbox = group.querySelector('.conversation-checkbox');
        if (groupCheckbox) {
            groupCheckbox.checked = !groupCheckbox.checked;
            updateCopyButtonState();
        }
        return;
    }

    // 处理导航点击
    const index = parseInt(group.dataset.index);
    const hostname = window.location.hostname;
    console.log('处理导航点击:', {
        index: index,
        hostname: hostname
    });

    if (hostname.includes('chatgpt.com')) {
        try {
            // 优先使用我们注入的锚点属性进行定位，更稳健
            const targetId = group.getAttribute('data-target-id');
            let targetConversation = null;

            if (targetId) {
                targetConversation = document.querySelector(`[data-ai-enhancer-target-id="${CSS.escape(targetId)}"]`);
            }

            // 回退：旧方案，按 turn 容器 + 偶/奇配对
            if (!targetConversation) {
                console.log('未通过锚点找到元素，回退到旧选择器逻辑');
                const conversationContainers = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));
                const userMessageContainers = [];
                for (let i = 0; i < conversationContainers.length; i += 2) {
                    const userContainer = conversationContainers[i];
                    if (userContainer && userContainer.querySelector('[data-message-author-role="user"]')) {
                        userMessageContainers.push(userContainer);
                    }
                }
                targetConversation = userMessageContainers[index] || conversationContainers[index * 2] || conversationContainers[index];
            }

            if (targetConversation && typeof targetConversation.scrollIntoView === 'function') {
                targetConversation.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // 注入并应用高亮样式（非必需，仅视觉反馈）
                ensureHighlightStyle();
                targetConversation.classList.add('ai-enhancer-highlight');
                setTimeout(() => targetConversation.classList.remove('ai-enhancer-highlight'), 1600);
            } else {
                console.warn('无法定位到目标对话元素，使用估算滚动');
                const estimatedPosition = Math.max(0, index * 300);
                window.scrollTo({ top: estimatedPosition, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('处理ChatGPT对话时发生错误:', error);
        }
    } else if (hostname.includes('www.tongyi.com')) {
        const questions = document.querySelectorAll('.questionItem--dS3Alcnv');
        const targetQuestion = questions[index];
        if (targetQuestion) {
            targetQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// 确保注入高亮样式
function ensureHighlightStyle() {
    if (document.getElementById('ai-enhancer-highlight-style')) return;
    const style = document.createElement('style');
    style.id = 'ai-enhancer-highlight-style';
    style.textContent = `
    .ai-enhancer-highlight {
        animation: ai-enhancer-highlight-fade 1.6s ease;
        background-color: rgba(255, 255, 0, 0.35) !important;
        transition: background-color 0.6s ease;
    }
    @keyframes ai-enhancer-highlight-fade {
        0% { background-color: rgba(255, 255, 0, 0.65); }
        100% { background-color: transparent; }
    }`;
    document.head.appendChild(style);
}

// 确保注入 ChatGPT 宽度覆盖样式（使用 !important 覆盖页面原有 max-w 类）
function ensureChatGPTWidthStyle(maxWidthPx = 1200) {
    console.log('确保注入 ChatGPT 宽度覆盖样式');
    // 仅在 ChatGPT 页面生效
    if (!window.location.hostname.includes('chatgpt.com')) return;
    const existing = document.getElementById('ai-enhancer-width-style');
    const cssText = `
        main div[class*="max-w-"] {
            max-width: ${maxWidthPx}px !important;
        }
    `;
    if (existing) {
        console.log('已存在宽度覆盖样式，更新样式');
        if (existing.textContent !== cssText) existing.textContent = cssText;
        return;
    }
    console.log('不存在样式')
    const style = document.createElement('style');
    style.id = 'ai-enhancer-width-style';
    style.textContent = cssText;
    document.head.appendChild(style);
}
