// 创建侧边栏容器
function createSidebar() {
    console.log('创建侧边栏');
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-chat-enhancer-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-resizer"></div>
        <div class="sidebar-header">
            对话导航
            <div class="sidebar-header-buttons">
                <button class="sidebar-button" id="multiSelectToggle">多选</button>
                <button class="sidebar-button copy-selected" id="copySelected" disabled>复制选中对话</button>
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

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
        }, { once: true });
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const width = startWidth - (e.pageX - startX);
        if (width >= 200 && width <= 600) {  // 限制最小和最大宽度
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
            copySelected.textContent = '复制成功！';
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
            const userContent = userMessage.querySelector('.whitespace-pre-wrap')?.textContent || '空内容';
            const assistantContent = assistantMessage?.querySelector('.markdown')?.textContent || '等待回复...';
            
            newHtml += `
                <div class="conversation-group" data-index="${index}">
                    <div class="conversation-header">
                        <input type="checkbox" class="conversation-checkbox">
                        <span class="conversation-number">#${index + 1}</span>
                    </div>
                    <div class="conversation-item user">
                        <span class="conversation-icon">Q:</span>
                        <span class="conversation-text">${userContent}</span>
                    </div>
                    <div class="conversation-item assistant">
                        <span class="conversation-icon">A:</span>
                        <span class="conversation-text">${assistantContent}</span>
                    </div>
                </div>
            `;
        }
    });
    
    // 只有当内容真的变化时才更新
    if (sidebarContent.innerHTML !== newHtml) {
        sidebarContent.innerHTML = newHtml;
        console.log('侧边栏更新完成');
    }
}

// 将对话内容转换为Markdown
function convertToMarkdown(generateToc = false) {
    console.log('开始转换Markdown, 是否生成目录:', generateToc);
    let markdown = '';
    const conversations = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    console.log(`找到 ${conversations.length} 条对话`);
    
    // 如果需要生成目录，先收集所有问题
    if (generateToc) {
        const questions = [];
        conversations.forEach((conv, index) => {
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
                // 使用问题的前30个字符作为目录项
                const shortQuestion = question.length > 30 ? question.substring(0, 30) + '...' : question;
                markdown += `${index + 1}. [${shortQuestion}](#问题-${index + 1})\n`;
            });
            markdown += '\n---\n\n';
        }
    }
    
    // 计数器，用于生成问题的锚点
    let questionCount = 0;
    
    // 转换对话内容
    conversations.forEach((conv, index) => {
        const isUser = conv.querySelector('[data-message-author-role="user"]');
        const isAssistant = conv.querySelector('[data-message-author-role="assistant"]');
        
        if (isUser) {
            questionCount++;
            const content = conv.querySelector('.whitespace-pre-wrap')?.textContent || '';
            // 添加带有锚点的标题
            markdown += generateToc ? 
                `\n### 问题 ${questionCount}\n\n${content}\n` :
                `\n### 用户\n\n${content}\n`;
            console.log(`处理用户消息 ${index + 1}`);
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
                console.log(`处理AI消息 ${index + 1}`);
            }
        }
    });
    
    console.log('Markdown转换完成');
    return markdown.trim();
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
            
            if (request.action === 'getSidebarState') {
                const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
                sendResponse({
                    isVisible: sidebar ? sidebar.style.display !== 'none' : false
                });
            }
            
            if (request.action === 'toggleSidebar') {
                const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
                if (sidebar) {
                    sidebar.style.display = request.visible ? 'flex' : 'none';
                    console.log('切换侧边栏显示:', sidebar.style.display);
                    sendResponse({success: true});
                }
            }
            
            if (request.action === 'getMarkdown') {
                try {
                    const markdown = convertToMarkdown(request.generateToc);
                    console.log('生成Markdown完成');
                    sendResponse({success: true, markdown: markdown});
                } catch (error) {
                    console.error('生成Markdown失败:', error);
                    sendResponse({success: false, error: error.message});
                }
            }
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
