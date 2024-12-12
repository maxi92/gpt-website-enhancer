document.addEventListener('DOMContentLoaded', async function() {
    // 检查当前页面是否为支持的网站
    async function checkValidSite() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab?.url) return false;

            const validUrls = [
                'https://chatgpt.com/c',
                'https://tongyi.aliyun.com/qianwen'
            ];

            return validUrls.some(url => tab.url.startsWith(url));
        } catch (error) {
            console.error('检查网站有效性失败:', error);
            return false;
        }
    }

    // 如果不是有效网站，直接关闭弹窗
    const isValidSite = await checkValidSite();
    if (!isValidSite) {
        window.close();
        return;
    }

    console.log('弹出窗口加载完成');
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');
    const tocToggle = document.getElementById('tocToggle');
    const tocContainer = document.getElementById('tocContainer');
    const widthSlider = document.getElementById('widthSlider');
    const optionRow = document.querySelector('.option-row');

    // 状态管理
    let currentState = {
        sidebarVisible: true,
        conversationWidth: 0,
        isAdjustingWidth: false,
        currentMarkdown: '' // 存储当前的Markdown内容
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
            !copyMarkdownButton || !tocToggle || !tocContainer || !widthSlider || !optionRow) {
            throw new Error('必需的DOM元素未找到');
        }

        // 保存原始文本用于状态恢复
        document.querySelectorAll('button').forEach(button => {
            button.dataset.originalText = button.textContent;
        });
    }

    // 异步获取Markdown内容
    async function getMarkdownContent(generateToc = false) {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab) throw new Error('未找到活动标签页');

        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getMarkdown',
            generateToc
        });

        if (!response?.markdown) throw new Error('未收到Markdown内容');
        return response.markdown;
    }

    // 更新Markdown显示
    async function updateMarkdownDisplay(generateToc = false, shouldShowFeedback = true) {
        try {
            const markdown = await getMarkdownContent(generateToc);
            currentState.currentMarkdown = markdown;
            markdownOutput.value = markdown;
            if (shouldShowFeedback) {
                showFeedback(exportMarkdownButton, '转换成功');
            }
        } catch (error) {
            console.error('获取Markdown失败:', error);
            if (shouldShowFeedback) {
                showFeedback(exportMarkdownButton, '转换失败', true);
            }
        }
    }

    // 导出Markdown功能
    exportMarkdownButton.addEventListener('click', async function() {
        try {
            await updateMarkdownDisplay(tocToggle.checked, true);
            markdownOutput.style.display = 'block';
            copyMarkdownButton.style.display = 'block';
            tocContainer.style.display = 'flex';
        } catch (error) {
            console.error('导出Markdown失败:', error);
            showFeedback(this, '转换失败', true);
        }
    });

    // 监听目录开关
    tocToggle.addEventListener('change', async function() {
        if (markdownOutput.style.display === 'block') {
            await updateMarkdownDisplay(this.checked, false);
        }
    });

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
            this.checked = currentState.sidebarVisible;
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
            widthSlider.value = currentState.conversationWidth;
            showFeedback(exportMarkdownButton, '调整失败', true);
        } finally {
            currentState.isAdjustingWidth = false;
        }
    }, 200);

    widthSlider.addEventListener('input', function() {
        const level = parseInt(this.value);
        debouncedWidthAdjust(level);
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

    // 初始化
    try {
        initializeElements();
        // 初始化设置
        chrome.storage.sync.get(['sidebarVisible', 'conversationWidth'], (result) => {
            if (result.sidebarVisible !== undefined) {
                sidebarToggle.checked = result.sidebarVisible;
                currentState.sidebarVisible = result.sidebarVisible;
            }
            if (result.conversationWidth !== undefined) {
                widthSlider.value = result.conversationWidth;
                currentState.conversationWidth = result.conversationWidth;
            }
        });
    } catch (error) {
        console.error('初始化失败:', error);
        showFeedback(exportMarkdownButton, '初始化失败', true);
    }
});
