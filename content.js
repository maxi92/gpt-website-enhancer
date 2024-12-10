// 全局设置对象
let settings = {
    chatgpt: {
        sidebarVisible: false,
        conversationWidth: 0,
        sidebarWidth: 400
    },
    qianwen: {
        sidebarVisible: false,
        conversationWidth: 0,
        sidebarWidth: 400
    }
};

// 防止无限循环的标志
let isUpdating = false;
let updateTimeout = null;

// 存储初始默认宽度
let initialDefaultWidth = null;

// 检测当前页面类型
function getPageType() {
    const url = window.location.href;
    if (url.includes('chatgpt.com/c/')) {
        return 'chatgpt';
    } else if (url.includes('tongyi.aliyun.com/qianwen')) {
        return 'qianwen';
    }
    return null;
}

// 获取主容器
function getMainContainer(type) {
    if (type === 'chatgpt') {
        return document.querySelector('.flex.flex-col.text-sm.md\\:pb-9');
    } else if (type === 'qianwen') {
        return document.querySelector('.containerWrap--lFLVsVCe');
    }
    return null;
}

// 获取对话内容
function getConversations(type) {
    if (type === 'chatgpt') {
        return document.querySelectorAll('[data-testid^="conversation-turn-"]');
    } else if (type === 'qianwen') {
        return document.querySelectorAll('.questionItem--dS3Alcnv, .answerItem--U4_Uv3iw');
    }
    return [];
}

// 建议添加一个新的函数来提取对话内容
function extractConversationContent(element, type) {
    if (type === 'qianwen') {
        if (element.classList.contains('questionItem--dS3Alcnv')) {
            // 提取问题内容
            return element.querySelector('.bubble--H3ZjjTnP')?.textContent || '';
        } else if (element.classList.contains('answerItem--U4_Uv3iw')) {
            // 提取回答内容
            return element.querySelector('.tongyi-markdown')?.textContent || '';
        }
    }
    return '';
}

// 检查页面是否已准备好
function checkPageReady(type) {
    if (type === 'qianwen') {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const container = document.querySelector('.containerWrap--lFLVsVCe');
                if (container) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 500);
            
            // 设置超时
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(false);
            }, 10000);
        });
    }
    return Promise.resolve(true);
}

// 初始化设置
async function initializeSettings() {
    console.log('开始初始化设置');
    const pageType = getPageType();
    if (!pageType) {
        console.log('不支持的页面类型');
        return;
    }

    // 添加页面准备检查
    const isReady = await checkPageReady(pageType);
    if (!isReady) {
        console.log('页面加载超时');
        return;
    }

    try {
        const result = await chrome.storage.sync.get(pageType);
        if (result[pageType]) {
            settings[pageType] = { ...settings[pageType], ...result[pageType] };
        }
        console.log('加载设置:', settings[pageType]);
        applySettings(pageType);
    } catch (error) {
        console.error('初始化设置失败:', error);
    }
}

// 保存设置
async function saveSettings(type) {
    console.log('保存设置:', type, settings[type]);
    try {
        await chrome.storage.sync.set({ [type]: settings[type] });
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 应用设置
function applySettings(type) {
    console.log('应用设置:', type, settings[type]);
    if (settings[type].sidebarVisible) {
        showSidebar(type);
    } else {
        hideSidebar(type);
    }
    adjustConversationWidth(type, settings[type].conversationWidth);
}

// 创建侧边栏
function createSidebar(type) {
    console.log('创建侧边栏:', type);
    const existingSidebar = document.getElementById(`${type}-sidebar`);
    if (existingSidebar) {
        existingSidebar.remove();
    }

    const sidebar = document.createElement('div');
    sidebar.id = `${type}-sidebar`;
    sidebar.className = 'ai-chat-enhancer-sidebar';
    
    // 添加基本结构
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
    
    // 处理侧边栏宽度调整
    const resizer = sidebar.querySelector('.sidebar-resizer');
    let isResizing = false;
    let startX;
    let startWidth;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth - (e.clientX - startX);
        if (width >= 240 && width <= 700) {
            settings[type].sidebarWidth = width;
            sidebar.style.width = `${width}px`;
            saveSettings(type);
            adjustMainContent(type);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    return sidebar;
}

// 显示侧边栏
function showSidebar(type) {
    console.log('显示侧边栏:', type);
    let sidebar = document.getElementById(`${type}-sidebar`);
    if (!sidebar) {
        sidebar = createSidebar(type);
    }
    sidebar.style.display = 'flex';
    updateSidebarContent(type);
    adjustMainContent(type);
}

// 隐藏侧边栏
function hideSidebar(type) {
    console.log('隐藏侧边栏:', type);
    const sidebar = document.getElementById(`${type}-sidebar`);
    if (sidebar) {
        sidebar.style.display = 'none';
        adjustMainContent(type);
    }
}

// 调整主内容区域
function adjustMainContent(type) {
    console.log('调整主内容区域:', type);
    let mainContent;
    if (type === 'chatgpt') {
        mainContent = document.querySelector('.flex.flex-col.text-sm.md\\:pb-9');
    } else if (type === 'qianwen') {
        mainContent = document.querySelector('.react-scroll-to-bottom--css-hdcsd-1n7m0yu');
    }

    if (!mainContent) {
        console.log('未找到主内容区域');
        return;
    }

    const sidebar = document.getElementById(`${type}-sidebar`);
    if (sidebar && sidebar.style.display !== 'none') {
        mainContent.style.marginRight = `${settings[type].sidebarWidth}px`;
        mainContent.style.width = `calc(100% - ${settings[type].sidebarWidth}px)`;
    } else {
        mainContent.style.marginRight = '0';
        mainContent.style.width = '100%';
    }
}

// 获取初始默认宽度
function getInitialDefaultWidth(type) {
    if (initialDefaultWidth !== null) {
        return initialDefaultWidth;
    }

    const container = getMainContainer(type);
    if (!container) {
        console.log('未找到对话容器');
        return null;
    }

    // 获取当前容器的计算样式
    const computedStyle = window.getComputedStyle(container);
    let defaultWidth = parseInt(computedStyle.maxWidth);
    
    // 如果maxWidth是'none'或其他非数值，则使用实际宽度
    if (isNaN(defaultWidth)) {
        defaultWidth = container.offsetWidth;
    }
    
    initialDefaultWidth = defaultWidth;
    console.log('初始默认宽度:', initialDefaultWidth);
    return initialDefaultWidth;
}

// 调整对话宽度
function adjustConversationWidth(type, position) {
    console.log('调整对话宽度:', position, type);
    let width;

    // 获取初始默认宽度
    const defaultWidth = getInitialDefaultWidth(type);
    console.log('初始默认宽度:', defaultWidth);
    if (!defaultWidth) {
        return;
    }

    // 根据档位直接设置宽度倍数
    switch (position) {
        case 0:
            width = defaultWidth; // 默认宽度
            break;
        case 1:
            width = Math.round(defaultWidth * 1.2); // 较宽 (1.2倍)
            break;
        case 2:
            width = Math.round(defaultWidth * 1.5); // 最宽 (1.5倍)
            break;
        default:
            width = defaultWidth; // 默认情况
    }

    console.log('调整对话宽度:', width, type);

    if (type === 'chatgpt') {
        // 对于 ChatGPT，直接修改对话容器的宽度
        const conversations = document.querySelectorAll('.text-base.md\\:max-w-2xl.lg\\:max-w-xl.xl\\:max-w-3xl.md\\:flex-col.flex.flex-1.gap-3');
        console.log('对话容器:', conversations);
        conversations.forEach(conv => {
            conv.style.maxWidth = `${width}px`;
        });

        // 同时修改主容器的宽度
        const mainContainer = document.querySelector('.flex.flex-col.text-sm.dark\\:bg-gray-800');
        console.log('主容器:', mainContainer);
        if (mainContainer) {
            mainContainer.style.maxWidth = `${width}px`;
        }
    } else {
        // 对于其他页面（如通义千问），使用 CSS 变量
        document.documentElement.style.setProperty('--conversation-max-width', `${width}px`);
    }

    console.log('调整之后宽度为', width);
    saveSettings(type, { conversationWidth: width });
}

// 更新侧边栏内容
function updateSidebarContent(type) {
    if (isUpdating) return;
    isUpdating = true;

    try {
        console.log('更新侧边栏内容:', type);
        const sidebar = document.getElementById(`${type}-sidebar`);
        if (!sidebar) return;

        const content = sidebar.querySelector('.sidebar-content');
        if (!content) return;

        content.innerHTML = '';

        const conversations = getConversations(type);
        if (!conversations.length) {
            console.log('未找到对话内容');
            return;
        }

        conversations.forEach((conv, index) => {
            let text, isQuestion;
            
            if (type === 'chatgpt') {
                const role = conv.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
                isQuestion = role === 'user';
                text = conv.querySelector('.whitespace-pre-wrap')?.textContent.trim();
            } else {
                isQuestion = conv.classList.contains('questionItem--dS3Alcnv');
                text = isQuestion ? 
                    conv.querySelector('.bubble--H3ZjjTnP')?.textContent.trim() : 
                    conv.querySelector('.tongyi-markdown')?.textContent.trim();
            }

            if (!text) return;

            const item = document.createElement('div');
            item.className = `conversation-item ${isQuestion ? 'user' : 'assistant'}`;
            item.innerHTML = `
                <input type="checkbox" class="conversation-checkbox">
                <span class="conversation-icon">${isQuestion ? 'Q:' : 'A:'}</span>
                <span class="conversation-text">${text.substring(0, 50)}${text.length > 50 ? '...' : ''}</span>
            `;

            item.addEventListener('click', () => {
                conv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            content.appendChild(item);
        });
    } finally {
        isUpdating = false;
    }
}

// 转换为Markdown格式
function convertToMarkdown(type, generateToc = false) {
    console.log('转换为Markdown:', type);
    const conversations = getConversations(type);
    let markdown = '';
    
    // 如果需要生成目录
    if (generateToc) {
        markdown += '## 目录\n\n';
        let questionCount = 0;
        conversations.forEach((conv) => {
            let text;
            if (type === 'chatgpt') {
                const role = conv.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
                if (role === 'user') {
                    text = conv.querySelector('.whitespace-pre-wrap')?.textContent.trim();
                    if (text) {
                        questionCount++;
                        const shortText = text.length > 30 ? text.substring(0, 30) + '...' : text;
                        markdown += `${questionCount}. [${shortText}](#问题-${questionCount})\n`;
                    }
                }
            } else if (conv.classList.contains('questionItem--dS3Alcnv')) {
                text = conv.querySelector('.bubble--H3ZjjTnP')?.textContent.trim();
                if (text) {
                    questionCount++;
                    const shortText = text.length > 30 ? text.substring(0, 30) + '...' : text;
                    markdown += `${questionCount}. [${shortText}](#问题-${questionCount})\n`;
                }
            }
        });
        markdown += '\n---\n\n';
    }

    // 转换对话内容
    let questionCount = 0;
    conversations.forEach((conv) => {
        let role, content;
        
        if (type === 'chatgpt') {
            role = conv.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
            content = conv.querySelector('.whitespace-pre-wrap')?.textContent.trim();
            if (role === 'user') {
                questionCount++;
                markdown += generateToc ? 
                    `\n### 问题 ${questionCount}\n\n${content}\n` :
                    `\n### 用户\n\n${content}\n`;
            } else if (role === 'assistant') {
                markdown += `\n### ChatGPT\n\n${content}\n`;
            }
        } else {
            if (conv.classList.contains('questionItem--dS3Alcnv')) {
                questionCount++;
                content = conv.querySelector('.bubble--H3ZjjTnP')?.textContent.trim();
                markdown += generateToc ?
                    `\n### 问题 ${questionCount}\n\n${content}\n` :
                    `\n### 用户\n\n${content}\n`;
            } else {
                content = conv.querySelector('.tongyi-markdown')?.textContent.trim();
                markdown += `\n### 通义千问\n\n${content}\n`;
            }
        }
    });

    return markdown.trim();
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);
    const pageType = getPageType();
    if (!pageType) {
        console.log('不支持的页面类型');
        sendResponse({ error: '不支持的页面类型' });
        return true;
    }

    switch (request.action) {
        case 'getSettings':
            if (request.type === pageType) {
                sendResponse({
                    sidebarVisible: settings[pageType].sidebarVisible,
                    conversationWidth: settings[pageType].conversationWidth
                });
            }
            break;

        case 'toggleSidebar':
            if (request.type === pageType) {
                settings[pageType].sidebarVisible = request.visible;
                saveSettings(pageType);
                if (request.visible) {
                    showSidebar(pageType);
                } else {
                    hideSidebar(pageType);
                }
                sendResponse({ success: true });
            }
            break;

        case 'adjustWidth':
            if (request.type === pageType) {
                console.log('调整对话宽度:', request.widthLevel, pageType);
                adjustConversationWidth(pageType, request.widthLevel);
                sendResponse({ success: true });
            }
            break;

        case 'getMarkdown':
            if (request.type === pageType) {
                const markdown = convertToMarkdown(pageType, request.generateToc);
                sendResponse({ markdown });
            }
            break;
    }

    return true;  // 保持消息通道开放
});

// 监听DOM变化
const observer = new MutationObserver((mutations) => {
    if (isUpdating) return;

    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        const pageType = getPageType();
        if (pageType && settings[pageType].sidebarVisible) {
            const sidebar = document.getElementById(`${pageType}-sidebar`);
            if (sidebar && sidebar.style.display !== 'none') {
                updateSidebarContent(pageType);
            }
        }
    }, 500);
});

// 开始观察DOM变化
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// 初始化
console.log('content.js 加载完成');
initializeSettings(); 

// 通义千问网站特定的处理函数
function handleTongyiPage() {
    // 对话容器的选择器
    const containerSelector = '.containerWrap--lFLVsVCe';
    const contentWrapperSelector = '.contentWrapper--nKrTYKHP';
    
    // 监听宽度变化消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'adjustWidth') {
            const containers = document.querySelectorAll(containerSelector);
            const contentWrappers = document.querySelectorAll(contentWrapperSelector);
            
            containers.forEach(container => {
                container.style.maxWidth = request.width + 'px';
                container.style.transition = 'max-width 0.3s ease';
            });
            
            contentWrappers.forEach(wrapper => {
                wrapper.style.maxWidth = 'none';
            });
            
            sendResponse({success: true});
        }
    });
}

// 检测是否是通义千问网站
if (window.location.hostname === 'qianwen.aliyun.com') {
    handleTongyiPage();
} 

function createNavigationItem(index, content, isUser) {
    const item = document.createElement('div');
    item.className = `conversation-item ${isUser ? 'user' : 'assistant'}`;
    
    // 添加复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'conversation-checkbox';
    item.appendChild(checkbox);
    
    // 添加序号
    const icon = document.createElement('span');
    icon.className = 'conversation-icon';
    icon.textContent = `对话${index}`;
    item.appendChild(icon);
    
    // 添加内容预览
    const text = document.createElement('span');
    text.className = 'conversation-text';
    text.textContent = content;
    item.appendChild(text);
    
    return item;
}

function toggleMultiSelect(sidebar) {
    const isMultiSelect = sidebar.classList.toggle('multi-select-mode');
    const copySelectedButton = sidebar.querySelector('.copy-selected');
    const checkboxes = sidebar.querySelectorAll('.conversation-checkbox');
    
    if (isMultiSelect) {
        copySelectedButton.style.display = 'inline-block';
        checkboxes.forEach(checkbox => {
            checkbox.style.display = 'inline-block';
        });
    } else {
        copySelectedButton.style.display = 'none';
        checkboxes.forEach(checkbox => {
            checkbox.style.display = 'none';
            checkbox.checked = false;
        });
    }
}

function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'ai-chat-enhancer-sidebar';
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const title = document.createElement('span');
    title.textContent = '对话导航';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'sidebar-header-buttons';
    
    const multiSelectButton = document.createElement('button');
    multiSelectButton.className = 'sidebar-button';
    multiSelectButton.textContent = '多选';
    multiSelectButton.onclick = () => toggleMultiSelect(sidebar);
    
    const copySelectedButton = document.createElement('button');
    copySelectedButton.className = 'sidebar-button copy-selected';
    copySelectedButton.textContent = '复制选中';
    copySelectedButton.style.display = 'none';
    copySelectedButton.onclick = () => handleCopySelected(sidebar);
    
    buttonContainer.appendChild(multiSelectButton);
    buttonContainer.appendChild(copySelectedButton);
    
    header.appendChild(title);
    header.appendChild(buttonContainer);
    
    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'sidebar-content';
    
    // 创建拖动条
    const resizer = document.createElement('div');
    resizer.className = 'sidebar-resizer';
    
    sidebar.appendChild(header);
    sidebar.appendChild(content);
    sidebar.appendChild(resizer);
    
    return sidebar;
}

function handleCopySelected(sidebar) {
    const selectedItems = sidebar.querySelectorAll('.conversation-checkbox:checked');
    if (selectedItems.length === 0) return;
    
    let markdownContent = '';
    selectedItems.forEach(checkbox => {
        const item = checkbox.closest('.conversation-item');
        const icon = item.querySelector('.conversation-icon').textContent;
        const text = item.querySelector('.conversation-text').textContent;
        const isUser = item.classList.contains('user');
        
        markdownContent += `### ${icon}\n${isUser ? '**用户**' : '**助手**'}：${text}\n\n`;
    });
    
    navigator.clipboard.writeText(markdownContent).then(() => {
        alert('已复制选中的对话内容！');
    });
}

// 通义千问网站的对话内容获取函数
function getTongyiConversations() {
    const conversations = [];
    let index = 1;
    
    // 获取所有问题
    const questions = document.querySelectorAll('.questionItem--dS3Alcnv .bubble--H3ZjjTnP');
    // 获所有回答
    const answers = document.querySelectorAll('.answerItem--U4_Uv3iw .tongyi-markdown');
    
    // 将问题和回答配对
    for (let i = 0; i < questions.length; i++) {
        if (questions[i] && answers[i]) {
            conversations.push({
                question: questions[i].textContent.trim(),
                answer: answers[i].textContent.trim(),
                index: index++
            });
        }
    }
    
    return conversations;
}

// 更新导航栏内容
function updateNavigationContent(sidebar) {
    const content = sidebar.querySelector('.sidebar-content');
    content.innerHTML = '';
    
    // 根据网站选择不同的获取对话方法
    let conversations;
    if (window.location.hostname === 'qianwen.aliyun.com') {
        conversations = getTongyiConversations();
    } else if (window.location.hostname === 'chat.openai.com') {
        conversations = getChatGPTConversations();
    }
    
    if (!conversations || conversations.length === 0) return;
    
    conversations.forEach(conv => {
        // 添加问题
        const questionItem = createNavigationItem(conv.index, conv.question, true);
        content.appendChild(questionItem);
        
        // 添加回答
        const answerItem = createNavigationItem(conv.index, conv.answer, false);
        content.appendChild(answerItem);
    });
}

// 初始化导航栏
function initializeNavigation() {
    const sidebar = createSidebar();
    document.body.appendChild(sidebar);
    
    // 初始更新内容
    updateNavigationContent(sidebar);
    
    // 定期更新内容（每5秒检查一次）
    setInterval(() => {
        updateNavigationContent(sidebar);
    }, 5000);
} 

function adjustConversationWidth() {
    console.log('调整对话宽度');
    // 获取主容器 - 使用正确的选择器
    const mainContainer = document.querySelector('.flex-1.overflow-hidden.\\@container\\/thread');
    
    // 获取对话容器 - 使用正确的选择器
    const conversations = document.querySelector('.flex.flex-col.text-sm.md\\:pb-9');
    
    console.log('主容器:', mainContainer);
    console.log('对话容器:', conversations);
    
    if (!mainContainer || !conversations) {
        console.log('Container elements not found');
        return;
    }

    // 获取窗口宽度
    const windowWidth = window.innerWidth;
    
    // 设置宽度
    if (windowWidth >= 1280) { // xl
        conversations.style.maxWidth = '48rem';
    } else if (windowWidth >= 1024) { // lg
        conversations.style.maxWidth = '40rem';
    } else if (windowWidth >= 768) { // md
        conversations.style.maxWidth = '48rem';
    } else {
        conversations.style.maxWidth = '100%';
    }
    
    // 确保容器居中
    conversations.style.margin = '0 auto';
}

// 添加窗口调整监听器
window.addEventListener('resize', adjustConversationWidth);

// 初始调用
adjustConversationWidth(); 