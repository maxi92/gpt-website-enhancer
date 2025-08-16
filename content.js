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
            <div class="sidebar-title-section">
                <span class="sidebar-title">对话导航</span>
                <div class="conversation-count" id="conversationCount">总计：0 条对话</div>
            </div>
            <div class="sidebar-header-buttons">
                <button id="multiSelect" class="sidebar-button">多选</button>
            </div>
        </div>
        <div class="sidebar-divider"></div>
        <div class="sidebar-search-container" id="searchContainer" style="display: none;">
            <input type="text" class="sidebar-search-input" id="searchInput" placeholder="搜索对话内容...">
            <div class="search-results-count" id="searchResultsCount"></div>
        </div>
        <div class="sidebar-actions" id="sidebarActions" style="display: none;">
            <button id="selectAll" class="sidebar-button select-all-button">
                <span class="button-icon">✓</span>
                <span class="button-text">全选</span>
            </button>
            <button id="clearAll" class="sidebar-button clear-all-button">
                <span class="button-icon">✗</span>
                <span class="button-text">清空</span>
            </button>
            <button id="copySelected" class="sidebar-button copy-selected" disabled>复制选中</button>
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
    const selectAllButton = sidebar.querySelector('#selectAll');
    const clearAllButton = sidebar.querySelector('#clearAll');

    // 多选按钮：进入多选模式
    multiSelectButton.addEventListener('click', function () {
        const isMultiSelectMode = sidebar.classList.toggle('multi-select-mode');
        
        // 更新按钮文字
        this.textContent = isMultiSelectMode ? '取消多选' : '多选';
        
        // 进入多选模式
        if (isMultiSelectMode) {
            // 显示操作按钮和搜索框
            document.getElementById('sidebarActions').style.display = 'flex';
            document.getElementById('searchContainer').style.display = 'flex';
            
            // 确保所有对话都可见，除非用户有搜索输入
            const searchInput = document.getElementById('searchInput');
            if (searchInput.value.trim() === '') {
                const allGroups = sidebar.querySelectorAll('.conversation-group');
                allGroups.forEach(group => {
                    group.style.display = 'block';
                });
                document.getElementById('searchResultsCount').textContent = '';
                currentSearchTerm = '';
            }
        } else {
            // 退出多选模式：隐藏操作按钮和搜索框
            document.getElementById('sidebarActions').style.display = 'none';
            document.getElementById('searchContainer').style.display = 'none';
            
            // 清空搜索框
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResultsCount').textContent = '';
            
            // 恢复显示所有对话
            const allGroups = sidebar.querySelectorAll('.conversation-group');
            allGroups.forEach(group => {
                group.style.display = 'block';
            });
            
            // 重置搜索状态
            currentSearchTerm = '';
        }

        // 重置所有复选框的状态
        const checkboxes = sidebar.querySelectorAll('.conversation-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // 重置范围选择状态
        lastSelectedIndex = -1;

        // 更新复制按钮状态和计数显示
        copySelectedButton.disabled = true;
        updateConversationCount();
        
        console.log('🔄 [多选模式] 切换:', { isMultiSelectMode });
    });

    // 添加全选按钮事件监听器：选中当前筛选结果的所有选项
    selectAllButton.addEventListener('click', function () {
        // 获取所有可见的对话组（搜索过滤后的），然后选择其中的复选框
        const visibleGroups = sidebar.querySelectorAll('.conversation-group:not([style*="display: none"])');
        const visibleCheckboxes = Array.from(visibleGroups).map(group => group.querySelector('.conversation-checkbox')).filter(Boolean);
        const totalVisibleCheckboxes = visibleCheckboxes.length;
        
        // 选中所有可见的复选框
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // 重置范围选择状态
        lastSelectedIndex = -1;
        
        // 更新复制按钮状态和计数
        updateCopyButtonState();
        
        console.log('🔄 [全选操作] 选中了:', { 
            selectedCount: totalVisibleCheckboxes,
            totalVisibleCheckboxes,
            totalGroups: sidebar.querySelectorAll('.conversation-group').length,
            visibleGroups: visibleGroups.length,
            searchActive: !!currentSearchTerm
        });
    });

    // 添加清空按钮事件监听器：清空当前筛选结果的所有选项
    clearAllButton.addEventListener('click', function () {
        // 获取所有可见的对话组（搜索过滤后的），然后清空其中的复选框
        const visibleGroups = sidebar.querySelectorAll('.conversation-group:not([style*="display: none"])');
        const visibleCheckboxes = Array.from(visibleGroups).map(group => group.querySelector('.conversation-checkbox')).filter(Boolean);
        
        // 清空所有可见的复选框
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 重置范围选择状态
        lastSelectedIndex = -1;
        
        // 更新复制按钮状态和计数
        updateCopyButtonState();
        
        console.log('🔄 [清空操作] 清空了:', { 
            clearedCount: visibleCheckboxes.length,
            totalGroups: sidebar.querySelectorAll('.conversation-group').length,
            visibleGroups: visibleGroups.length,
            searchActive: !!currentSearchTerm
        });
    });

    // 添加复制选中按钮事件监听器 - 调用新的复制函数
    copySelectedButton.addEventListener('click', copySelectedConversations);

    document.body.appendChild(sidebar);

    // 添加搜索框事件监听器
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        debouncedSearch(this.value);
    });

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

// 搜索过滤功能
let searchTimeout;
let currentSearchTerm = '';

// 范围选择功能
let lastSelectedIndex = -1;
let isShiftClick = false;

// 执行搜索过滤
function performSearch(searchTerm) {
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    const groups = sidebar.querySelectorAll('.conversation-group');
    const resultsCountElement = document.getElementById('searchResultsCount');
    
    currentSearchTerm = searchTerm.toLowerCase().trim();
    let visibleCount = 0;
    
    groups.forEach(group => {
        const questionText = group.querySelector('.conversation-item.user .conversation-text').textContent.toLowerCase();
        const answerText = group.querySelector('.conversation-item.assistant .conversation-text').textContent.toLowerCase();
        
        const matchesSearch = currentSearchTerm === '' || 
                            questionText.includes(currentSearchTerm) || 
                            answerText.includes(currentSearchTerm);
        
        if (matchesSearch) {
            group.style.display = 'block';
            visibleCount++;
        } else {
            group.style.display = 'none';
        }
    });
    
    // 更新搜索结果计数
    if (currentSearchTerm === '') {
        resultsCountElement.textContent = '';
        resultsCountElement.classList.remove('has-results');
    } else {
        resultsCountElement.textContent = `筛选结果：${visibleCount} 条`;
        resultsCountElement.classList.add('has-results');
    }
    
    console.log('🔍 [搜索过滤] 完成:', { 
        searchTerm: currentSearchTerm, 
        totalGroups: groups.length, 
        visibleCount 
    });
    
    // 更新主计数显示
    updateConversationCount();
}

// 防抖搜索函数
function debouncedSearch(searchTerm) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(searchTerm);
    }, 300);
}

// 将选中的对话转换为Markdown
function convertSelectedToMarkdown(groups) {
    let markdown = '# AI对话记录\n\n';
    groups.forEach((group, index) => {
        const userContent = group.querySelector('.conversation-item.user .conversation-text').textContent;
        const assistantContent = group.querySelector('.conversation-item.assistant .conversation-text').textContent;

        markdown += `## 对话 ${index + 1}\n\n`;
        markdown += `**问题**：${userContent}\n\n`;
        markdown += `**回答**：${assistantContent}\n\n`;
        markdown += '---\n\n';
    });
    return markdown.trim();
}

// 更新计数显示
function updateConversationCount() {
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    const countElement = sidebar.querySelector('#conversationCount');
    const isMultiSelect = sidebar.classList.contains('multi-select-mode');
    
    // 获取总的对话数量（始终不变）
    const totalCount = sidebar.querySelectorAll('.conversation-group').length;
    
    if (isMultiSelect) {
        // 多选模式：计算所有已选中的数量（包括被过滤掉的）
        const allCheckboxes = sidebar.querySelectorAll('.conversation-checkbox');
        const selectedCount = Array.from(allCheckboxes).filter(checkbox => checkbox.checked).length;
        
        const newText = `已选：${selectedCount} / ${totalCount} 条`;
        
        // 如果文字有变化，添加动画效果
        if (countElement.textContent !== newText) {
            countElement.classList.add('updating');
            countElement.textContent = newText;
            
            // 移除动画类
            setTimeout(() => {
                countElement.classList.remove('updating');
            }, 300);
        }
    } else {
        // 正常模式：显示总数
        const newText = `总计：${totalCount} 条对话`;
        
        if (countElement.textContent !== newText) {
            countElement.classList.add('updating');
            countElement.textContent = newText;
            
            setTimeout(() => {
                countElement.classList.remove('updating');
            }, 300);
        }
    }
    
    // 更新搜索结果显示（独立显示）
    const searchResultsElement = document.getElementById('searchResultsCount');
    if (searchResultsElement) {
        const hasSearchFilter = currentSearchTerm && currentSearchTerm.trim() !== '';
        if (hasSearchFilter) {
            const visibleCount = sidebar.querySelectorAll('.conversation-group:not([style*="display: none"])').length;
            searchResultsElement.textContent = `筛选结果：${visibleCount} 条`;
            searchResultsElement.classList.add('has-results');
        } else {
            searchResultsElement.textContent = '';
            searchResultsElement.classList.remove('has-results');
        }
    }
    
    console.log('📊 [计数更新] 模式:', { isMultiSelect, totalCount });
}

// 更新复制按钮状态
function updateCopyButtonState() {
    const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
    const copyButton = sidebar.querySelector('#copySelected');
    
    // 只计算可见对话组中已选中的数量
    const visibleGroups = sidebar.querySelectorAll('.conversation-group:not([style*="display: none"])');
    const visibleCheckboxes = Array.from(visibleGroups).map(group => group.querySelector('.conversation-checkbox')).filter(Boolean);
    const selectedCount = visibleCheckboxes.filter(checkbox => checkbox.checked).length;
    
    copyButton.disabled = selectedCount === 0;
    
    // 更新选中状态的视觉反馈
    const groups = sidebar.querySelectorAll('.conversation-group');
    groups.forEach(group => {
        const checkbox = group.querySelector('.conversation-checkbox');
        if (checkbox && checkbox.checked) {
            group.classList.add('selected');
        } else {
            group.classList.remove('selected');
        }
    });
    
    // 同时更新计数显示
    updateConversationCount();
    
    console.log('🔄 [状态更新] 选中状态:', { selectedCount, totalGroups: groups.length });
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
        conversationSelector: '[data-testid^="conversation-turn-"], [data-message-author-role="user"], [data-message-author-role="assistant"]',
        humanMessageSelector: '[data-message-author-role="user"]',
        aiMessageSelector: '[data-message-author-role="assistant"]',
        messageContentSelector: {
            human: '.whitespace-pre-wrap',
            ai: '.markdown'
        },
        site: 'chatgpt'
    },
    tongyi: {
        conversationSelector: '[class*="questionItem"], [class*="answerItem"]',
        humanMessageSelector: '[class*="questionItem"]',
        aiMessageSelector: '[class*="answerItem"]',
        messageContentSelector: {
            human: '[class*="bubble"]',
            ai: '[class*="markdown"]'
        },
        site: 'tongyi'
    },
    gemini: {
        conversationSelector: 'div.conversation-container',
        humanMessageSelector: 'user-query',
        aiMessageSelector: 'model-response',
        messageContentSelector: {
            human: '.query-text',
            ai: '.model-response-text'
        },
        codeBlockSelector: 'code-block',
        codeLanguageSelector: '.header-formatted > span',
        codeContentSelector: 'code[data-test-id="code-content"]',
        scrollContainerSelector: 'infinite-scroller',
        site: 'gemini',
        supportsWidthAdjustment: false,
        supportsInfiniteScroll: true
    }
};

// 获取当前网站的配置
function getCurrentSiteConfig() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com')) {
        return SITE_CONFIGS.chatgpt;
    } else if (hostname.includes('www.tongyi.com')) {
        return SITE_CONFIGS.tongyi;
    } else if (hostname.includes('gemini.google.com')) {
        return SITE_CONFIGS.gemini;
    }
    return null;
}

// 获取对话内容的函数
function getConversationContent() {
    try {
        const siteConfig = getCurrentSiteConfig();
        if (!siteConfig) {
            console.error('getConversationContent: 未获取到站点配置');
            return [];
        }

        console.log('getConversationContent: 开始处理', siteConfig.site, '页面');
        const conversations = [];
        
        // Gemini页面的特殊处理
        if (siteConfig.site === 'gemini') {
            const containers = document.querySelectorAll(siteConfig.conversationSelector);
            console.log('找到Gemini对话容器数量:', containers.length);
            
            containers.forEach((container, index) => {
                try {
                    const userQuery = container.querySelector(siteConfig.humanMessageSelector);
                    const modelResponse = container.querySelector(siteConfig.aiMessageSelector);
                    
                    if (userQuery && modelResponse) {
                        const questionElement = userQuery.querySelector(siteConfig.messageContentSelector.human);
                        const answerElement = modelResponse.querySelector(siteConfig.messageContentSelector.ai);
                        
                        if (questionElement && answerElement) {
                            const question = questionElement.textContent.trim();
                            const answer = answerElement.textContent.trim();
                            
                            conversations.push({
                                id: index,
                                type: 'group',
                                question: question,
                                answer: answer,
                                questionElement: userQuery,
                                answerElement: modelResponse,
                                previewText: {
                                    question: question.length > 50 ? question.substring(0, 50) + '...' : question,
                                    answer: answer.length > 50 ? answer.substring(0, 50) + '...' : answer
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error(`处理第${index}个Gemini对话时出错:`, error);
                }
            });
        } else if (siteConfig.site === 'chatgpt') {
            // ChatGPT页面的特殊处理
            const userMessages = document.querySelectorAll(siteConfig.humanMessageSelector);
            const aiMessages = document.querySelectorAll(siteConfig.aiMessageSelector);
            
            console.log('找到ChatGPT用户消息数量:', userMessages.length);
            console.log('找到ChatGPT AI消息数量:', aiMessages.length);
            
            // 确保消息成对出现
            const pairCount = Math.min(userMessages.length, aiMessages.length);
            
            for (let i = 0; i < pairCount; i++) {
                try {
                    const userMessage = userMessages[i];
                    const aiMessage = aiMessages[i];
                    
                    const questionElement = userMessage.querySelector(siteConfig.messageContentSelector.human);
                    const answerElement = aiMessage.querySelector(siteConfig.messageContentSelector.ai);
                    
                    if (questionElement && answerElement) {
                        const question = questionElement.textContent.trim();
                        const answer = answerElement.textContent.trim();
                        
                        if (question) { // 只有问题不为空时才添加
                            conversations.push({
                                id: i,
                                type: 'group',
                                question: question,
                                answer: answer,
                                questionElement: userMessage,
                                answerElement: aiMessage,
                                previewText: {
                                    question: question.length > 50 ? question.substring(0, 50) + '...' : question,
                                    answer: answer.length > 50 ? answer.substring(0, 50) + '...' : answer
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error(`处理第${i}个ChatGPT对话时出错:`, error);
                }
            }
        } else {
            // 通义千问等其他站点的处理
            const elements = document.querySelectorAll(siteConfig.conversationSelector);
            console.log('找到元素数量:', elements.length);

            // 将问答组织成对
            const pairs = [];
            let currentPair = {};

            elements.forEach((element, index) => {
                try {
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
                } catch (error) {
                    console.error(`处理第${index}个元素时出错:`, error);
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
        }

        console.log('处理后的对话组数:', conversations.length);
        return conversations;
    } catch (error) {
        console.error('getConversationContent 发生未预期的错误:', error);
        return [];
    }
}

// 更新侧边栏内容
function updateSidebar() {
    try {
        console.log('更新侧边栏内容');
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) {
            console.error('updateSidebar: 未找到侧边栏内容容器');
            return;
        }

        const siteConfig = getCurrentSiteConfig();
        if (!siteConfig) {
            console.error('updateSidebar: 未获取到站点配置');
            return;
        }

        let newHtml = '';

        // 使用统一的对话获取逻辑
        const conversations = getConversationContent();
        console.log(`找到 ${conversations.length} 条对话`);

        conversations.forEach((conversation, index) => {
            try {
                // 为原始元素打上锚点属性
                const targetId = conversation.questionElement.getAttribute('data-ai-enhancer-target-id') || `ai-enhancer-target-${index}`;
                try {
                    if (conversation.questionElement) {
                        conversation.questionElement.setAttribute('data-ai-enhancer-target-id', targetId);
                    }
                } catch (error) {
                    console.warn(`设置第${index}个对话锚点时出错:`, error);
                }

                // 安全地转义HTML内容
                const safeQuestion = escapeHtml(conversation.question || '');
                const safeAnswer = escapeHtml(conversation.answer || '');

                newHtml += `
                    <div class="conversation-group" data-index="${index}" data-target-id="${targetId}">
                        <div class="conversation-header" role="button" tabindex="0">
                            <input type="checkbox" class="conversation-checkbox">
                            <span class="conversation-number">#${index + 1}</span>
                        </div>
                        <div class="conversation-item user">
                            <span class="conversation-icon">Q:</span>
                            <span class="conversation-text">${truncateText(safeQuestion, 100, false)}</span>
                        </div>
                        <div class="conversation-item assistant">
                            <span class="conversation-icon">A:</span>
                            <span class="conversation-text">${truncateText(safeAnswer, 100, true)}</span>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`生成第${index}个对话的HTML时出错:`, error);
            }
        });

        // 只当内容真的变化时更新
        if (sidebarContent.innerHTML !== newHtml) {
            sidebarContent.innerHTML = newHtml;
            console.log('侧边栏更新完成');

            // 添加点击事件处理
            const groups = sidebarContent.querySelectorAll('.conversation-group');
            groups.forEach(group => {
                group.addEventListener('click', handleConversationClick);
            });
            
            // 更新计数显示
            updateConversationCount();
        }
    } catch (error) {
        console.error('updateSidebar 发生未预期的错误:', error);
    }
}

// HTML转义函数，防止XSS攻击
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// HTML实体解码函数 - 将HTML实体转换为普通字符
function decodeHtmlEntities(text) {
    if (!text) return '';
    
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

// Markdown文本转义函数 - 转义Markdown特殊字符
function escapeMarkdownText(text, decodeHtml = false) {
    if (!text) return '';
    
    // 如果需要，先解码HTML实体
    let processedText = decodeHtml ? decodeHtmlEntities(text) : text;
    
    return processedText
        // 转义反斜杠
        .replace(/\\/g, '\\\\')
        // 转义反引号
        .replace(/`/g, '\\`')
        // 转义星号
        .replace(/\*/g, '\\*')
        // 转义下划线
        .replace(/_/g, '\\_')
        // 转义花括号
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        // 转义方括号
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        // 转义括号
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        // 转义井号
        .replace(/#/g, '\\#')
        // 转义加号
        .replace(/\+/g, '\\+')
        // 转义减号
        .replace(/-/g, '\\-')
        // 转义点号
        .replace(/\./g, '\\.')
        // 转义感叹号
        .replace(/!/g, '\\!')
        // 转义管道符
        .replace(/\|/g, '\\|')
        // 转义大于号
        .replace(/>/g, '\\>')
        // 转义小于号
        .replace(/</g, '\\<')
        // 转义等号
        .replace(/=/g, '\\=')
        // 转义波浪号
        .replace(/~/g, '\\~');
}

// 统一代码块格式函数
function formatCodeBlock(language, code) {
    if (!code) return '';
    
    // 使用更多的换行符来确保代码块前后有足够的间距
    // 即使经过 trimEnd 和 ensureLineSpacing 处理也能保持正确格式
    const block = `\`\`\`${language}\n${code}\n\`\`\``;
    return `\n\n\n${block}\n\n\n`;
}

// 确保行间距函数 - 处理多余换行
function ensureLineSpacing(text) {
    if (!text) return '';
    
    // 将多个连续换行替换为最多2个换行
    return text.replace(/\n{3,}/g, '\n\n');
}

// 修复代码块结尾换行符 - 简单粗暴的解决方案
function fixCodeBlockEndings(markdown) {
    if (!markdown) return '';
    
    // 确保所有代码块结尾的 ``` 后面都有换行符
    // 匹配代码块结尾的 ```（前面有换行符，后面没有换行符或字符串结尾）
    return markdown.replace(/\n```(?!\n|$)/g, '\n```\n');
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

// 新增辅助函数处理单个元素的转换
function convertElementToMarkdown(element) {
    if (!element) return '';

    console.log('转换元素到Markdown:', element.tagName, element.className);

    let markdown = '';

    // 遍历所有子元素
    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                // 对普通文本应用Markdown转义
                markdown += escapeMarkdownText(text);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 处理代码块 - 改进检测逻辑
            if (node.tagName === 'PRE' || 
                node.tagName === 'CODE-BLOCK' || 
                node.classList?.contains('!overflow-visible') ||
                (node.querySelector('[class*="highlighter"]') && node.tagName === 'PRE')) {
                // 移除代码块前后可能存在的多余换行
                markdown = markdown.trimEnd();
                markdown += processCodeBlock(node);
            }
            // 处理内联代码
            else if (node.tagName === 'CODE' && !node.closest('PRE') && !node.closest('CODE-BLOCK')) {
                // 内联代码：先解码HTML实体，然后用反引号包装
                const decodedContent = decodeHtmlEntities(node.textContent);
                markdown += '`' + decodedContent + '`';
            }
            // 处理其他元素
            else {
                markdown += processHtmlElement(node);
            }
        }
    });

    const result = ensureLineSpacing(markdown);
    console.log('元素转换完成，长度:', result.length);
    // 修复代码块结尾的换行符
    return fixCodeBlockEndings(result);
}

// 处理单个HTML元素转换为Markdown
function processHtmlElement(node) {
    const tagName = node.tagName.toLowerCase();
    
    switch (tagName) {
        case 'p':
            return convertElementToMarkdown(node) + '\n\n';
            
        case 'strong':
        case 'b':
            // 检查是否包含code标签，如果包含则只保留代码格式
            if (node.querySelector('code')) {
                return convertElementToMarkdown(node).trim();
            } else {
                const boldContent = convertElementToMarkdown(node).trim();
                return `**${boldContent}**`;
            }
            
        case 'em':
        case 'i':
            const italicContent = convertElementToMarkdown(node).trim();
            return `*${italicContent}*`;
            
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            const level = parseInt(tagName.substring(1));
            const headingText = escapeMarkdownText(node.textContent.trim());
            return `${'#'.repeat(level)} ${headingText}\n\n`;
            
        case 'ul':
            return processList(node, '-');
            
        case 'ol':
            return processList(node, (index) => `${index + 1}.`);
            
        case 'li':
            // 列表项内容，可能包含代码块
            const hasCodeBlock = node.querySelector('pre, [class*="highlighter"]');
            if (hasCodeBlock) {
                return processComplexListItem(node);
            } else {
                return convertElementToMarkdown(node).trim();
            }
            
        case 'a':
            const linkText = escapeMarkdownText(node.textContent.trim());
            return `[${linkText}](${node.href})`;
            
        case 'table':
            return processTable(node);
            
        case 'div':
        case 'span':
            // 对于纯布局元素，只处理内容
            // 但需要特殊处理包含代码块的div/span
            if (node.querySelector('[class*="highlighter"]') || node.querySelector('pre, code-block')) {
                // 如果包含代码块，先处理文本内容，再处理代码块
                let content = '';
                node.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.textContent.trim();
                        if (text) {
                            content += escapeMarkdownText(text) + ' ';
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        if (child.tagName === 'PRE' || 
                            child.tagName === 'CODE-BLOCK' || 
                            child.querySelector('[class*="highlighter"]')) {
                            content += processCodeBlock(child);
                        } else {
                            content += convertElementToMarkdown(child);
                        }
                    }
                });
                return content.trim();
            } else {
                return convertElementToMarkdown(node);
            }
            
        case 'br':
            return '\n';
            
        default:
            // 未知元素，递归处理子元素
            return convertElementToMarkdown(node);
    }
}

// 处理列表（有序和无序）
function processList(listNode, prefix) {
    let markdown = '\n';
    const items = listNode.querySelectorAll('li');
    
    items.forEach((item, index) => {
        const itemPrefix = typeof prefix === 'function' ? prefix(index) : prefix;
        const itemContent = processListItemContent(item);
        markdown += `${itemPrefix} ${itemContent}\n`;
    });
    
    markdown += '\n';
    return markdown;
}

// 处理包含代码块的复杂列表项
function processComplexListItem(liElement) {
    let content = '';
    
    // 分离文本内容和代码块
    liElement.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                content += escapeMarkdownText(text) + ' ';
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'PRE' || 
                node.tagName === 'CODE-BLOCK' || 
                node.querySelector('[class*="highlighter"]')) {
                // 处理代码块
                content += processCodeBlock(node);
            } else {
                // 处理其他元素 - 递归处理，确保不丢失文本内容
                content += convertElementToMarkdown(node) + ' ';
            }
        }
    });
    
    return content.trim();
}

// 处理列表项内容
function processListItemContent(liElement) {
    // 检查是否包含代码块
    const hasCodeBlock = liElement.querySelector('pre, [class*="highlighter"]');
    if (hasCodeBlock) {
        return processComplexListItem(liElement);
    }
    
    return convertElementToMarkdown(liElement).trim();
}

// 处理表格
function processTable(tableNode) {
    let markdown = '\n';
    const rows = tableNode.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowContent = Array.from(cells).map(cell => {
            return escapeMarkdownText(cell.textContent.trim());
        }).join(' | ');
        
        markdown += `| ${rowContent} |\n`;
        
        // 添加表头分隔线
        if (rowIndex === 0) {
            const separator = Array.from(cells).map(() => '---').join(' | ');
            markdown += `| ${separator} |\n`;
        }
    });
    
    markdown += '\n';
    return markdown;
}

// 专门处理Gemini元素的转换函数
function convertGeminiElementToMarkdown(element) {
    if (!element) return '';

    let markdown = '';

    // 遍历所有子元素
    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 对普通文本应用Markdown转义
            markdown += escapeMarkdownText(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 处理Gemini代码块
            if (node.tagName === 'CODE-BLOCK') {
                markdown = markdown.trimEnd();
                markdown += processGeminiCodeBlock(node);
            }
            // 处理其他HTML元素
            else {
                switch (node.tagName.toLowerCase()) {
                    case 'p':
                        markdown += convertGeminiElementToMarkdown(node) + '\n\n';
                        break;
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        const level = parseInt(node.tagName.substring(1));
                        markdown += `${'#'.repeat(level)} ${escapeMarkdownText(node.textContent.trim())}\n\n`;
                        break;
                    case 'ul':
                        markdown += '\n';
                        node.querySelectorAll('li').forEach(li => {
                            const liContent = convertGeminiElementToMarkdown(li).trim();
                            markdown += `- ${liContent}\n`;
                        });
                        markdown += '\n';
                        break;
                    case 'ol':
                        markdown += '\n';
                        node.querySelectorAll('li').forEach((li, index) => {
                            const liContent = convertGeminiElementToMarkdown(li).trim();
                            markdown += `${index + 1}. ${liContent}\n`;
                        });
                        markdown += '\n';
                        break;
                    case 'pre':
                        // 可能是未包装在code-block中的代码
                        markdown += formatCodeBlock('', node.textContent.trim());
                        break;
                    case 'code':
                        // 内联代码
                        if (!node.closest('pre') && !node.closest('code-block')) {
                            // 内联代码：先解码HTML实体，然后用反引号包装
                            const decodedContent = decodeHtmlEntities(node.textContent.trim());
                            markdown += `\`${decodedContent}\``;
                        } else {
                            markdown += convertGeminiElementToMarkdown(node);
                        }
                        break;
                    case 'a':
                        markdown += `[${escapeMarkdownText(node.textContent.trim())}](${node.href})`;
                        break;
                    case 'strong':
                    case 'b':
                        // 处理嵌套内容，而不是直接使用textContent
                        const boldContent = convertGeminiElementToMarkdown(node).trim();
                        markdown += `**${boldContent}**`;
                        break;
                    case 'em':
                    case 'i':
                        // 处理嵌套内容，而不是直接使用textContent
                        const italicContent = convertGeminiElementToMarkdown(node).trim();
                        markdown += `*${italicContent}*`;
                        break;
                    case 'table':
                        // 简单表格处理
                        markdown += '\n';
                        const rows = node.querySelectorAll('tr');
                        rows.forEach((row, rowIndex) => {
                            const cells = row.querySelectorAll('th, td');
                            const rowContent = Array.from(cells).map(cell => escapeMarkdownText(cell.textContent.trim())).join(' | ');
                            markdown += `| ${rowContent} |\n`;
                            if (rowIndex === 0) {
                                markdown += `| ${Array.from(cells).map(() => '---').join(' | ')} |\n`;
                            }
                        });
                        markdown += '\n';
                        break;
                    default:
                        markdown += convertGeminiElementToMarkdown(node);
                }
            }
        }
    });

    const result = ensureLineSpacing(markdown.trim());
    // 修复代码块结尾的换行符
    return fixCodeBlockEndings(result);
}

// 通用代码块处理函数
function processCodeBlock(codeBlock) {
    if (!codeBlock) return '';

    console.log('处理代码块:', codeBlock.tagName, codeBlock.className);

    // 检查是否是Gemini的代码块
    if (codeBlock.tagName === 'CODE-BLOCK' || codeBlock.querySelector('.header-formatted')) {
        return processGeminiCodeBlock(codeBlock);
    }

    // 检查是否是通义千问的代码块
    if (codeBlock.tagName === 'PRE' && codeBlock.querySelector('[class*="highlighter"]')) {
        return processTongyiCodeBlock(codeBlock);
    }

    // 通用代码块处理（ChatGPT和其他平台）
    return processGenericCodeBlock(codeBlock);
}

// 通义千问代码块处理
function processTongyiCodeBlock(preElement) {
    if (!preElement) return '';

    console.log('处理通义千问代码块');

    const highlighter = preElement.querySelector('[class*="highlighter"]');
    if (!highlighter) {
        // 回退到通用处理
        return processGenericCodeBlock(preElement);
    }

    // 提取语言信息
    const langElement = highlighter.querySelector('[class*="lang"]');
    const language = langElement ? langElement.textContent.trim().toLowerCase() : '';

    console.log('通义千问代码语言:', language);

    // 提取代码内容
    const codeElement = highlighter.querySelector('code');
    if (!codeElement) {
        console.warn('未找到code元素');
        return '';
    }

    // 处理代码内容，移除行号等干扰元素
    let codeText = '';
    codeElement.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            codeText += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 跳过行号元素
            if (!node.classList || !node.classList.contains('linenumber')) {
                codeText += node.textContent;
            }
        }
    });

    // 清理代码文本
    codeText = codeText.trim();
    console.log('处理后的通义千问代码:', codeText.substring(0, 100) + '...');

    return formatCodeBlock(language, codeText);
}

// 通用代码块处理
function processGenericCodeBlock(codeBlock) {
    // 尝试提取语言信息
    let language = '';
    
    // 查找语言指示器
    const langSelectors = [
        '[class*="language"]',
        '[data-language]',
        '.language-indicator',
        '.code-language'
    ];
    
    for (const selector of langSelectors) {
        const langElement = codeBlock.querySelector(selector);
        if (langElement) {
            language = langElement.textContent.trim();
            break;
        }
    }

    // 获取代码内容
    let codeText = '';
    const codeElement = codeBlock.querySelector('code') || codeBlock;
    
    if (codeElement) {
        // 获取原始文本内容
        codeText = codeElement.textContent || codeElement.innerText || '';
        
        // 清理代码文本
        codeText = codeText.trim();
        
        // 移除常见的复制按钮等干扰文本
        codeText = codeText.replace(/Copy\s*code$/i, '').trim();
    }

    console.log('通用代码块处理，语言:', language, '代码长度:', codeText.length);

    return formatCodeBlock(language, codeText);
}

// 处理Gemini代码块的专用函数
function processGeminiCodeBlock(codeBlock) {
    if (!codeBlock) return '';

    // 获取代码语言
    const languageElement = codeBlock.querySelector('.header-formatted > span');
    const language = languageElement ? languageElement.textContent.trim() : '';

    // 获取代码内容 - 使用innerText避免高亮span标签
    const codeContentElement = codeBlock.querySelector('code[data-test-id="code-content"]');
    let codeText = '';
    if (codeContentElement) {
        codeText = codeContentElement.innerText.trim();
    }

    // 使用统一的代码块格式函数
    return formatCodeBlock(language, codeText);
}

// 复制选中对话的函数 - 复用getMarkdown逻辑
function copySelectedConversations() {
    const selectedGroups = document.querySelectorAll('.conversation-checkbox:checked');
    if (selectedGroups.length === 0) return;

    let markdown = '# AI对话记录\n\n';
    const hostname = window.location.hostname;

    selectedGroups.forEach(checkbox => {
        const group = checkbox.closest('.conversation-group');
        const index = parseInt(group.dataset.index);

        markdown += `## 对话 ${index + 1}\n\n`;

        // 根据不同网站使用相应的转换逻辑
        if (hostname.includes('chatgpt.com')) {
            // ChatGPT处理逻辑 - 复用getMarkdown中的代码
            const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
            const aiMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
            
            if (userMessages[index]) {
                const userMessage = userMessages[index];
                markdown += '**Q:** ';
                markdown += convertElementToMarkdown(userMessage) + '\n\n';
            }
            
            if (aiMessages[index]) {
                const assistantMessage = aiMessages[index];
                markdown += '**A:** ';
                markdown += convertElementToMarkdown(assistantMessage) + '\n\n';
            }
        } else if (hostname.includes('www.tongyi.com')) {
            // 通义千问处理逻辑 - 复用getMarkdown中的代码
            const siteConfig = getCurrentSiteConfig();
            if (siteConfig) {
                const questions = document.querySelectorAll(siteConfig.humanMessageSelector);
                const answers = document.querySelectorAll(siteConfig.aiMessageSelector);
                
                if (questions[index] && answers[index]) {
                    const question = questions[index];
                    const answer = answers[index];
                    
                    const questionElement = question.querySelector(siteConfig.messageContentSelector.human);
                    const answerElement = answer.querySelector(siteConfig.messageContentSelector.ai);
                    
                    if (questionElement) {
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(questionElement) + '\n\n';
                    }
                    
                    if (answerElement) {
                        markdown += '**A:** ';
                        markdown += convertElementToMarkdown(answerElement) + '\n\n';
                    }
                }
            }
        } else if (hostname.includes('gemini.google.com')) {
            // Gemini处理逻辑 - 复用getMarkdown中的代码
            const containers = document.querySelectorAll('div.conversation-container');
            if (containers[index]) {
                const container = containers[index];
                const userQuery = container.querySelector('user-query .query-text');
                const modelResponse = container.querySelector('model-response .model-response-text');
                
                if (userQuery) {
                    markdown += '**Q:** ';
                    markdown += convertElementToMarkdown(userQuery) + '\n\n';
                }
                
                if (modelResponse) {
                    markdown += '**A:** ';
                    markdown += convertGeminiElementToMarkdown(modelResponse) + '\n\n';
                }
            }
        }
        
        markdown += '---\n\n';
    });

    // 复制到剪贴板并提供反馈
    navigator.clipboard.writeText(markdown.trim()).then(() => {
        const copyButton = document.querySelector('#copySelected');
        if (copyButton) {
            const originalText = copyButton.textContent;
            copyButton.textContent = '已复制！';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        }
    }).catch(error => {
        console.error('复制失败:', error);
        const copyButton = document.querySelector('#copySelected');
        if (copyButton) {
            const originalText = copyButton.textContent;
            copyButton.textContent = '复制失败';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        }
    });
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
    MESSAGE_CONTAINER: '[data-message-author-role="user"], [data-message-author-role="assistant"]'
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
        const isGemini = window.location.hostname.includes('gemini.google.com');
        sendResponse({
            sidebarVisible: actualSidebarVisible,
            conversationWidth: (isTongyi || isGemini) ? undefined : currentWidthLevel, // 通义千问和Gemini页面不返回宽度设置
            sidebarWidth: sidebarWidthPx,
            isTongyi: isTongyi, // 添加页面类型标识
            isGemini: isGemini // 添加Gemini页面标识
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
        // 如果是通义千问或Gemini页面，忽略宽度调整请求
        if (!window.location.hostname.includes('www.tongyi.com') && 
            !window.location.hostname.includes('gemini.google.com')) {
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
            let currentTitle = null; // 用于存储当前对话标题

            if (hostname.includes('chatgpt.com')) {
                // ChatGPT页面的处理
                const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
                const aiMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
                
                // 确保消息成对出现
                const pairCount = Math.min(userMessages.length, aiMessages.length);
                
                for (let i = 0; i < pairCount; i++) {
                    const userMessage = userMessages[i];
                    const assistantMessage = aiMessages[i];
                    
                    if (userMessage) {
                        const userContent = userMessage.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '';
                        conversations.push({
                            index: i + 1,
                            title: userContent.length > 50 ? userContent.substring(0, 50) + '...' : userContent
                        });

                        markdown += `## 对话 ${i + 1}\n\n`;
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(userMessage) + '\n\n';
                    }
                    if (assistantMessage) {
                        markdown += '**A:** ';
                        markdown += convertElementToMarkdown(assistantMessage) + '\n\n';
                        markdown += '---\n\n';
                    }
                }
            } else if (hostname.includes('www.tongyi.com')) {
                // 通义千问页面的处理
                const siteConfig = getCurrentSiteConfig();
                if (!siteConfig) {
                    console.error('未获取到通义千问站点配置');
                    sendResponse({ error: '未获取到站点配置' });
                    return true;
                }

                const questions = document.querySelectorAll(siteConfig.humanMessageSelector);
                const answers = document.querySelectorAll(siteConfig.aiMessageSelector);

                console.log(`找到 ${questions.length} 个问题，${answers.length} 个回答`);

                questions.forEach((question, index) => {
                    const answer = answers[index];
                    if (question && answer) {
                        const questionElement = question.querySelector(siteConfig.messageContentSelector.human);
                        const answerElement = answer.querySelector(siteConfig.messageContentSelector.ai);
                        
                        const questionContent = questionElement?.textContent?.trim() || '';
                        conversations.push({
                            index: index + 1,
                            title: questionContent.length > 50 ? questionContent.substring(0, 50) + '...' : questionContent
                        });

                        markdown += `## 对话 ${index + 1}\n\n`;
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(questionElement) + '\n\n';
                        markdown += '**A:** ';
                        markdown += convertElementToMarkdown(answerElement) + '\n\n';
                        markdown += '---\n\n';
                    }
                });
            } else if (hostname.includes('gemini.google.com')) {
                // Gemini页面的处理
                const containers = document.querySelectorAll('div.conversation-container');
                
                // 获取当前对话标题
                currentTitle = getGeminiCurrentConversationTitle();
                
                containers.forEach((container, index) => {
                    const userQuery = container.querySelector('user-query .query-text');
                    const modelResponse = container.querySelector('model-response .model-response-text');
                    
                    if (userQuery && modelResponse) {
                        const questionContent = userQuery.textContent?.trim() || '';
                        conversations.push({
                            index: index + 1,
                            title: questionContent.length > 50 ? questionContent.substring(0, 50) + '...' : questionContent
                        });

                        markdown += `## 对话 ${index + 1}\n\n`;
                        markdown += '**Q:** ';
                        markdown += convertElementToMarkdown(userQuery) + '\n\n';
                        markdown += '**A:** ';
                        markdown += convertGeminiElementToMarkdown(modelResponse) + '\n\n';
                        markdown += '---\n\n';
                    }
                });
            }

            // 如果是Gemini页面且有对话标题，在最前面添加标题
            if (hostname.includes('gemini.google.com') && currentTitle) {
                markdown = `# ${currentTitle}\n\n${markdown}`;
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
                    return target.closest('[data-message-author-role="user"]') || 
                           target.closest('[data-message-author-role="assistant"]');
                } else if (hostname.includes('www.tongyi.com')) {
                    const siteConfig = getCurrentSiteConfig();
                    if (siteConfig) {
                        return target.closest(siteConfig.humanMessageSelector) ||
                            target.closest(siteConfig.aiMessageSelector) ||
                            target.closest('[class*="scrollWrapper"]');
                    }
                } else if (hostname.includes('gemini.google.com')) {
                    return target.closest('div.conversation-container') ||
                        target.closest('user-query') ||
                        target.closest('model-response') ||
                        target.closest('infinite-scroller');
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
                const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
                if (userMessages.length > 0) {
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
                const siteConfig = getCurrentSiteConfig();
                if (siteConfig) {
                    const questions = document.querySelectorAll(siteConfig.humanMessageSelector);
                    const answers = document.querySelectorAll(siteConfig.aiMessageSelector);
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
            } else if (hostname.includes('gemini.google.com')) {
                const containers = document.querySelectorAll('div.conversation-container');
                if (containers.length > 0) {
                    console.log('Gemini对话已加载，更新导航栏');
                    updateSidebar();
                    
                    // 延迟执行历史对话加载，避免影响初始性能
                    setTimeout(() => {
                        loadAllGeminiConversations();
                    }, 2000);
                    
                    clearInterval(updateInterval);
                } else {
                    console.log('等待Gemini对话加载...');
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
        question = questionElement.querySelector('.whitespace-pre-wrap')?.textContent?.trim() || '';
        answer = answerElement?.querySelector('.markdown')?.textContent?.trim() || '';
    } else if (hostname.includes('www.tongyi.com')) {
        const siteConfig = getCurrentSiteConfig();
        if (siteConfig) {
            question = questionElement.querySelector(siteConfig.messageContentSelector.human)?.textContent?.trim() || '';
            answer = answerElement.querySelector(siteConfig.messageContentSelector.ai)?.textContent?.trim() || '';
        }
    } else if (hostname.includes('gemini.google.com')) {
        question = questionElement.querySelector('.query-text')?.textContent?.trim() || '';
        answer = answerElement.querySelector('.model-response-text')?.textContent?.trim() || '';
    }

    return { question, answer };
}

// 获取Gemini当前对话标题
function getGeminiCurrentConversationTitle() {
    const selectedTitleElement = document.querySelector('.conversation.selected .conversation-title');
    
    if (selectedTitleElement) {
        const title = selectedTitleElement.innerText.trim();
        console.log("找到当前Gemini对话标题:", title);
        return title;
    } else {
        console.log("未找到当前选中的Gemini对话。");
        return null;
    }
}

// Gemini专用：加载所有历史对话
async function loadAllGeminiConversations() {
    const siteConfig = getCurrentSiteConfig();
    if (!siteConfig || siteConfig.site !== 'gemini') {
        console.log('非Gemini页面，跳过动态加载');
        return;
    }

    const scrollContainer = document.querySelector(siteConfig.scrollContainerSelector);
    if (!scrollContainer) {
        console.error('未找到Gemini滚动容器');
        return;
    }

    console.log('开始加载Gemini历史对话...');
    let previousCount = 0;
    let attempts = 0;
    const maxAttempts = 10; // 最大尝试次数，避免无限循环

    while (attempts < maxAttempts) {
        attempts++;
        const currentCount = document.querySelectorAll(siteConfig.conversationSelector).length;
        console.log(`第${attempts}次尝试，当前对话数量: ${currentCount}`);

        // 如果数量没有变化，说明已经加载完毕
        if (previousCount > 0 && currentCount === previousCount) {
            console.log('Gemini历史对话加载完成');
            break;
        }

        previousCount = currentCount;

        // 滚动到顶部触发加载
        scrollContainer.scrollTop = 0;

        // 等待新内容加载
        await waitForGeminiContentLoad(scrollContainer);
        
        // 给一点延迟，避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Gemini对话加载完成，总共${document.querySelectorAll(siteConfig.conversationSelector).length}条对话`);
    updateSidebar(); // 更新侧边栏显示
}

// 等待Gemini新内容加载
function waitForGeminiContentLoad(scrollContainer) {
    return new Promise((resolve) => {
        const observer = new MutationObserver((mutations, obs) => {
            // 检查是否有新的对话容器被添加
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    const hasNewConversation = Array.from(mutation.addedNodes).some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            return node.matches('div.conversation-container') || 
                                   node.querySelector('div.conversation-container');
                        }
                        return false;
                    });
                    
                    if (hasNewConversation) {
                        obs.disconnect();
                        resolve();
                        return;
                    }
                }
            }
        });

        // 观察滚动容器的第一个子元素（通常是内容容器）
        const firstChild = scrollContainer.firstElementChild;
        if (firstChild) {
            observer.observe(firstChild, { 
                childList: true, 
                subtree: true 
            });
        }

        // 设置超时，避免无限等待
        setTimeout(() => {
            observer.disconnect();
            resolve();
        }, 3000); // 3秒超时
    });
}

// 修改点击事件处理函数
function handleConversationClick(event) {
    console.log('🖱️ [对话点击] 事件触发');
    const checkbox = event.target.closest('.conversation-checkbox');
    const group = event.target.closest('.conversation-group');

    console.log('📋 [对话点击] 元素信息:', {
        isCheckbox: !!checkbox,
        hasGroup: !!group,
        targetElement: event.target.tagName,
        targetClass: event.target.className,
        targetText: event.target.textContent?.substring(0, 50) + '...'
    });

    if (!group) {
        console.warn('⚠️ [对话点击] 未找到conversation-group元素，退出处理');
        return;
    }

    const isMultiSelect = document.getElementById('ai-chat-enhancer-sidebar').classList.contains('multi-select-mode');
    console.log('🔍 [对话点击] 模式状态:', { isMultiSelectMode: isMultiSelect });

    // 处理复选框点击
    if (checkbox) {
        console.log('✅ [复选框] 直接点击复选框，状态:', checkbox.checked);
        event.stopPropagation();
        updateCopyButtonState();
        return;
    }

    // 处理多选模式
    if (isMultiSelect) {
        console.log('🎯 [多选模式] 点击对话项进行选择');
        const groupCheckbox = group.querySelector('.conversation-checkbox');
        if (groupCheckbox) {
            const currentIndex = parseInt(group.dataset.index);
            const isShiftPressed = event.shiftKey;
            
            if (isShiftPressed && lastSelectedIndex !== -1) {
                // Shift + 点击：范围选择
                console.log('🔗 [范围选择] Shift+点击检测:', { 
                    lastIndex: lastSelectedIndex, 
                    currentIndex: currentIndex 
                });
                
                const startIndex = Math.min(lastSelectedIndex, currentIndex);
                const endIndex = Math.max(lastSelectedIndex, currentIndex);
                
                // 选中范围内的所有对话
                const sidebar = document.getElementById('ai-chat-enhancer-sidebar');
                const allGroups = sidebar.querySelectorAll('.conversation-group');
                
                for (let i = startIndex; i <= endIndex; i++) {
                    const targetGroup = allGroups[i];
                    if (targetGroup && targetGroup.style.display !== 'none') { // 只选择可见的
                        const targetCheckbox = targetGroup.querySelector('.conversation-checkbox');
                        if (targetCheckbox) {
                            targetCheckbox.checked = true;
                        }
                    }
                }
                
                console.log('🔗 [范围选择] 已选择范围:', { 
                    startIndex, 
                    endIndex, 
                    totalCount: endIndex - startIndex + 1 
                });
            } else {
                // 普通点击：切换单个选中状态
                const newCheckedState = !groupCheckbox.checked;
                groupCheckbox.checked = newCheckedState;
                console.log('✅ [多选模式] 单项选择状态变更:', { 
                    index: currentIndex, 
                    newState: newCheckedState 
                });
            }
            
            // 更新最后选择的索引
            lastSelectedIndex = currentIndex;
            updateCopyButtonState();
        } else {
            console.warn('⚠️ [多选模式] 未找到复选框元素');
        }
        return;
    }

    // 处理导航点击
    const index = parseInt(group.dataset.index);
    const hostname = window.location.hostname;
    console.log('🧭 [导航模式] 点击对话项进行跳转:', {
        index: index,
        hostname: hostname
    });

    if (hostname.includes('chatgpt.com')) {
        try {
            console.log('🤖 [ChatGPT] 开始处理导航跳转');
            // 优先使用我们注入的锚点属性进行定位，更稳健
            const targetId = group.getAttribute('data-target-id');
            let targetConversation = null;

            if (targetId) {
                targetConversation = document.querySelector(`[data-ai-enhancer-target-id="${CSS.escape(targetId)}"]`);
                console.log('🎯 [ChatGPT] 通过锚点定位:', { targetId, found: !!targetConversation });
            }

            // 回退：使用新的选择器逻辑
            if (!targetConversation) {
                console.log('🔄 [ChatGPT] 未通过锚点找到元素，回退到新选择器逻辑');
                const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
                targetConversation = userMessages[index];
                console.log('📋 [ChatGPT] 通过索引定位:', { 
                    index, 
                    totalMessages: userMessages.length, 
                    found: !!targetConversation 
                });
            }

            if (targetConversation && typeof targetConversation.scrollIntoView === 'function') {
                console.log('✅ [ChatGPT] 成功定位，开始滚动');
                targetConversation.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // 注入并应用高亮样式（非必需，仅视觉反馈）
                ensureHighlightStyle();
                targetConversation.classList.add('ai-enhancer-highlight');
                setTimeout(() => targetConversation.classList.remove('ai-enhancer-highlight'), 1600);
            } else {
                console.warn('⚠️ [ChatGPT] 无法定位到目标对话元素，使用估算滚动');
                const estimatedPosition = Math.max(0, index * 300);
                window.scrollTo({ top: estimatedPosition, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('❌ [ChatGPT] 处理对话时发生错误:', error);
        }
    } else if (hostname.includes('www.tongyi.com')) {
        console.log('🔷 [通义千问] 开始处理导航跳转');
        const siteConfig = getCurrentSiteConfig();
        if (siteConfig) {
            const questions = document.querySelectorAll(siteConfig.humanMessageSelector);
            const targetQuestion = questions[index];
            console.log('📋 [通义千问] 定位结果:', { 
                index, 
                totalQuestions: questions.length, 
                found: !!targetQuestion 
            });
            if (targetQuestion) {
                console.log('✅ [通义千问] 成功定位，开始滚动');
                targetQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                console.warn('⚠️ [通义千问] 未找到目标问题');
            }
        } else {
            console.warn('⚠️ [通义千问] 未获取站点配置');
        }
    } else if (hostname.includes('gemini.google.com')) {
        try {
            console.log('💎 [Gemini] 开始处理导航跳转');
            // 使用统一的锚点定位机制
            const targetId = group.getAttribute('data-target-id');
            let targetConversation = null;

            if (targetId) {
                targetConversation = document.querySelector(`[data-ai-enhancer-target-id="${CSS.escape(targetId)}"]`);
                console.log('🎯 [Gemini] 通过锚点定位:', { targetId, found: !!targetConversation });
            }

            // 回退：通过conversation-container索引定位
            if (!targetConversation) {
                const containers = document.querySelectorAll('div.conversation-container');
                targetConversation = containers[index];
                console.log('📋 [Gemini] 通过索引定位:', { 
                    index, 
                    totalContainers: containers.length, 
                    found: !!targetConversation 
                });
            }

            if (targetConversation && typeof targetConversation.scrollIntoView === 'function') {
                console.log('✅ [Gemini] 成功定位，开始滚动');
                targetConversation.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // 注入并应用高亮样式
                ensureHighlightStyle();
                targetConversation.classList.add('ai-enhancer-highlight');
                setTimeout(() => targetConversation.classList.remove('ai-enhancer-highlight'), 1600);
            } else {
                console.warn('⚠️ [Gemini] 无法定位到目标对话元素，使用估算滚动');
                const estimatedPosition = Math.max(0, index * 400);
                window.scrollTo({ top: estimatedPosition, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('❌ [Gemini] 处理对话时发生错误:', error);
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
