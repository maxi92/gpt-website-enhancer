document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出窗口加载完成');
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');
    const tocToggle = document.getElementById('tocToggle');
    const widthSlider = document.getElementById('widthSlider');
    const optionRow = document.querySelector('.option-row');

    // 状态管理
    let currentState = {
        sidebarVisible: true,
        conversationWidth: 0,
        isAdjustingWidth: false
    };

    // 显示状态反馈
    function showFeedback(element, message, isError = false) {
        const originalStyle = element.style.backgroundColor;
        element.style.backgroundColor = isError ? '#ff6b6b' : '#4CAF50';
        element.textContent = message;
        
        setTimeout(() => {
            element.style.backgroundColor = originalStyle;
            element.textContent = element.dataset.originalText;
        }, 2000);
    }

    // 初始化元素状态
    function initializeElements() {
        if (!sidebarToggle || !exportMarkdownButton || !markdownOutput || 
            !copyMarkdownButton || !tocToggle || !widthSlider || !optionRow) {
            throw new Error('必需的DOM元素未找到');
        }

        // 保存原始文本用于状态恢复
        document.querySelectorAll('button').forEach(button => {
            button.dataset.originalText = button.textContent;
        });
    }

    // 异步操作的通用错误处理
    async function handleAsyncOperation(operation, errorMessage) {
        try {
            return await operation();
        } catch (error) {
            console.error(errorMessage, error);
            throw error;
        }
    }

    // 初始化设置
    async function initializeSettings() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) throw new Error('未找到活动标签页');

            const response = await chrome.tabs.sendMessage(tab.id, {action: 'getSettings'});
            if (!response) throw new Error('未收到设置响应');

            currentState = {
                ...currentState,
                sidebarVisible: response.sidebarVisible,
                conversationWidth: response.conversationWidth || 0
            };

            sidebarToggle.checked = currentState.sidebarVisible;
            widthSlider.value = currentState.conversationWidth;
            
            console.log('设置初始化完成:', currentState);
        } catch (error) {
            console.error('初始化设置失败:', error);
            showFeedback(exportMarkdownButton, '初始化失败', true);
        }
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 监听侧边栏开关
    sidebarToggle.addEventListener('change', async function() {
        const newState = this.checked;
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) throw new Error('未找到活动标签页');

            await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleSidebar',
                visible: newState
            });

            currentState.sidebarVisible = newState;
        } catch (error) {
            console.error('切换侧边栏失败:', error);
            this.checked = currentState.sidebarVisible; // 恢复之前的状态
            showFeedback(exportMarkdownButton, '切换失败', true);
        }
    });

    // 监听宽度调节
    const debouncedWidthAdjust = debounce(async (level) => {
        if (currentState.isAdjustingWidth) return;
        currentState.isAdjustingWidth = true;

        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) throw new Error('未找到活动标签页');

            await chrome.tabs.sendMessage(tab.id, {
                action: 'adjustWidth',
                widthLevel: level
            });

            currentState.conversationWidth = level;
        } catch (error) {
            console.error('调整宽度失败:', error);
            widthSlider.value = currentState.conversationWidth; // 恢复之前的值
            showFeedback(exportMarkdownButton, '调整失败', true);
        } finally {
            currentState.isAdjustingWidth = false;
        }
    }, 200);

    widthSlider.addEventListener('input', function() {
        const level = parseInt(this.value);
        debouncedWidthAdjust(level);
    });

    // 导出Markdown功能
    exportMarkdownButton.addEventListener('click', async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) throw new Error('未找到活动标签页');

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getMarkdown',
                generateToc: tocToggle.checked
            });

            if (!response?.markdown) throw new Error('未收到Markdown内容');

            markdownOutput.value = response.markdown;
            markdownOutput.style.display = 'block';
            copyMarkdownButton.style.display = 'block';
            document.querySelector('.option-row:nth-child(2)').style.display = 'flex';

            showFeedback(this, '导出成功');
        } catch (error) {
            console.error('导出Markdown失败:', error);
            showFeedback(this, '导出失败', true);
        }
    });

    // 复制Markdown内容
    copyMarkdownButton.addEventListener('click', function() {
        try {
            markdownOutput.select();
            document.execCommand('copy');
            showFeedback(this, '复制成功！');
        } catch (error) {
            console.error('复制失败:', error);
            showFeedback(this, '复制失败', true);
        }
    });

    // 初始化
    try {
        initializeElements();
        initializeSettings();
    } catch (error) {
        console.error('初始化失败:', error);
        showFeedback(exportMarkdownButton, '初始化失败', true);
    }
});
