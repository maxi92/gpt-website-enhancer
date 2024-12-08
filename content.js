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
        return document.querySelector('.react-scroll-to-bottom--css-hdcsd-1n7m0yu');
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

// 初始化设置
async function initializeSettings() {
    console.log('开始初始化设置');
    const pageType = getPageType();
    if (!pageType) {
        console.log('不支持的页面类型');
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

// 调整对话宽度
function adjustConversationWidth(type, level) {
    console.log('调整对话宽度:', type, level);
    settings[type].conversationWidth = level;
    saveSettings(type);

    const container = getMainContainer(type);
    if (!container) {
        console.log('未找到对话容器');
        return;
    }

    let maxWidth;
    switch (level) {
        case 0: // 默认
            maxWidth = type === 'chatgpt' ? '48rem' : '100%';
            break;
        case 1: // 较宽
            maxWidth = type === 'chatgpt' ? '56rem' : '80%';
            break;
        case 2: // 宽
            maxWidth = type === 'chatgpt' ? '64rem' : '60%';
            break;
    }

    if (type === 'chatgpt') {
        // 对于 ChatGPT，需要修改所有对话容器的宽度类
        const conversations = document.querySelectorAll('.mx-auto.flex.flex-1.gap-4.text-base.md\\:gap-5.lg\\:gap-6');
        conversations.forEach(conv => {
            conv.style.maxWidth = maxWidth;
        });
    } else {
        container.style.maxWidth = maxWidth;
    }
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