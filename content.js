// 创建侧边栏容器
function createSidebar() {
    console.log('创建侧边栏');
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-chat-enhancer-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">对话导航</div>
        <div class="sidebar-content"></div>
    `;
    document.body.appendChild(sidebar);
    console.log('侧边栏创建完成');
    return sidebar;
}

// 将对话内容转换为Markdown
function convertToMarkdown() {
    console.log('开始转换Markdown');
    let markdown = '';
    const conversations = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    console.log(`找到 ${conversations.length} 条对话`);
    
    conversations.forEach((conv, index) => {
        // 判断是用户还是AI的消息
        const isUser = conv.querySelector('[data-message-author-role="user"]');
        const isAssistant = conv.querySelector('[data-message-author-role="assistant"]');
        
        if (isUser) {
            const content = conv.querySelector('.whitespace-pre-wrap')?.textContent || '';
            markdown += `\n### 用户\n\n${content}\n`;
            console.log(`处理用户消息 ${index + 1}`);
        } else if (isAssistant) {
            const content = conv.querySelector('.markdown')?.textContent || '';
            markdown += `\n### ChatGPT\n\n${content}\n`;
            console.log(`处理AI消息 ${index + 1}`);
        }
    });
    
    console.log('Markdown转换完成');
    return markdown.trim();
}

// 更新侧边栏内容
function updateSidebar() {
    console.log('更新侧边栏内容');
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.error('未找到侧边栏内容容器');
        return;
    }

    const conversations = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    console.log(`找到 ${conversations.length} 条对话用于侧边栏`);
    
    // 防止无限循环
    const oldHtml = sidebarContent.innerHTML;
    let newHtml = '';
    
    conversations.forEach((conv, index) => {
        const isUser = conv.querySelector('[data-message-author-role="user"]');
        const contentElement = isUser ? 
            conv.querySelector('.whitespace-pre-wrap') :
            conv.querySelector('.markdown');
            
        const content = contentElement?.textContent || '空内容';
        const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        newHtml += `<div class="sidebar-item" data-index="${index}">${title}</div>`;
    });
    
    // 只有当内容真的变化时才更新
    if (oldHtml !== newHtml) {
        sidebarContent.innerHTML = newHtml;
        // 重新添加点击事件
        document.querySelectorAll('.sidebar-item').forEach((item, index) => {
            item.onclick = () => {
                const conversations = document.querySelectorAll('[data-testid^="conversation-turn-"]');
                conversations[index]?.scrollIntoView({ behavior: 'smooth' });
            };
        });
        console.log('侧边栏更新完成');
    }
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
        
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('收到消息:', request.action);
            if (request.action === 'toggleSidebar') {
                sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
                console.log('切换侧边栏显示:', sidebar.style.display);
                sendResponse({success: true});
            } else if (request.action === 'getMarkdown') {
                const markdown = convertToMarkdown();
                console.log('生成Markdown完成');
                sendResponse({markdown: markdown});
            }
            return true; // 保持消息通道开放
        });
        
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
