document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出窗口加载完成');

    // 标签页切换
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // 隐藏所有 Markdown 输出框和复制按钮
    document.querySelectorAll('.markdown-output, .copy-button, .toc-option').forEach(el => {
        el.style.display = 'none';
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // 更新标签页状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tabId}-content`).classList.add('active');

            // 切换标签页时隐藏 Markdown 输出框和复制按钮
            document.querySelectorAll('.markdown-output, .copy-button, .toc-option').forEach(el => {
                el.style.display = 'none';
            });
        });
    });

    // ChatGPT 设置
    const chatgptSidebarToggle = document.getElementById('chatgpt-sidebarToggle');
    const chatgptWidthSlider = document.getElementById('chatgpt-widthSlider');
    const chatgptExportMarkdown = document.getElementById('chatgpt-exportMarkdown');
    const chatgptMarkdownOutput = document.getElementById('chatgpt-markdownOutput');
    const chatgptCopyMarkdown = document.getElementById('chatgpt-copyMarkdown');
    const chatgptTocOption = document.getElementById('chatgpt-tocOption');
    const chatgptTocToggle = document.getElementById('chatgpt-tocToggle');

    // 通义千问设置
    const qianwenSidebarToggle = document.getElementById('qianwen-sidebarToggle');
    const qianwenWidthSlider = document.getElementById('qianwen-widthSlider');
    const qianwenExportMarkdown = document.getElementById('qianwen-exportMarkdown');
    const qianwenMarkdownOutput = document.getElementById('qianwen-markdownOutput');
    const qianwenCopyMarkdown = document.getElementById('qianwen-copyMarkdown');
    const qianwenTocOption = document.getElementById('qianwen-tocOption');
    const qianwenTocToggle = document.getElementById('qianwen-tocToggle');

    // 检查必需的DOM元素
    if (!chatgptSidebarToggle || !chatgptWidthSlider || !chatgptExportMarkdown || 
        !chatgptMarkdownOutput || !chatgptCopyMarkdown || !chatgptTocOption || !chatgptTocToggle ||
        !qianwenSidebarToggle || !qianwenWidthSlider || !qianwenExportMarkdown ||
        !qianwenMarkdownOutput || !qianwenCopyMarkdown || !qianwenTocOption || !qianwenTocToggle) {
        console.error('某些必需的DOM元素未找到');
        return;
    }

    // 初始化设置
    async function initializeSettings() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                const url = new URL(tab.url);
                const host = url.hostname;

                // 根据当前页面类型加载相应设置
                if (host.includes('chatgpt.com')) {
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'getSettings',
                        type: 'chatgpt'
                    });
                    if (response) {
                        chatgptSidebarToggle.checked = response.sidebarVisible;
                        chatgptWidthSlider.value = response.conversationWidth || 0;
                    }
                } else if (host.includes('tongyi.aliyun.com')) {
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'getSettings',
                        type: 'qianwen'
                    });
                    if (response) {
                        qianwenSidebarToggle.checked = response.sidebarVisible;
                        qianwenWidthSlider.value = response.conversationWidth || 0;
                    }
                }
            }
        } catch (error) {
            console.error('初始化设置失败:', error);
        }
    }

    // ChatGPT 设置处理
    chatgptSidebarToggle.addEventListener('change', async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleSidebar',
                    type: 'chatgpt',
                    visible: this.checked
                });
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
            this.checked = !this.checked;
        }
    });

    let chatgptWidthAdjustTimeout = null;
    chatgptWidthSlider.addEventListener('input', async function() {
        const level = parseInt(this.value);
        clearTimeout(chatgptWidthAdjustTimeout);
        chatgptWidthAdjustTimeout = setTimeout(async () => {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                if (tab) {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'adjustWidth',
                        type: 'chatgpt',
                        widthLevel: level
                    });
                }
            } catch (error) {
                console.error('调整宽度失败:', error);
            }
        }, 200);
    });

    // 通义千问设置处理
    qianwenSidebarToggle.addEventListener('change', async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleSidebar',
                    type: 'qianwen',
                    visible: this.checked
                });
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
            this.checked = !this.checked;
        }
    });

    let qianwenWidthAdjustTimeout = null;
    qianwenWidthSlider.addEventListener('input', async function() {
        const level = parseInt(this.value);
        clearTimeout(qianwenWidthAdjustTimeout);
        qianwenWidthAdjustTimeout = setTimeout(async () => {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                if (tab) {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'adjustWidth',
                        type: 'qianwen',
                        widthLevel: level
                    });
                }
            } catch (error) {
                console.error('调整宽度失败:', error);
            }
        }, 200);
    });

    // Markdown 导出处理
    async function handleExportMarkdown(type) {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                const tocToggle = type === 'chatgpt' ? chatgptTocToggle : qianwenTocToggle;
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getMarkdown',
                    type: type,
                    generateToc: tocToggle.checked
                });
                if (response && response.markdown) {
                    const output = type === 'chatgpt' ? chatgptMarkdownOutput : qianwenMarkdownOutput;
                    const copyButton = type === 'chatgpt' ? chatgptCopyMarkdown : qianwenCopyMarkdown;
                    const tocOption = type === 'chatgpt' ? chatgptTocOption : qianwenTocOption;
                    
                    output.value = response.markdown;
                    output.style.display = 'block';
                    copyButton.style.display = 'block';
                    tocOption.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('获取Markdown失败:', error);
        }
    }

    chatgptExportMarkdown.addEventListener('click', () => handleExportMarkdown('chatgpt'));
    qianwenExportMarkdown.addEventListener('click', () => handleExportMarkdown('qianwen'));

    // 目录切换处理
    chatgptTocToggle.addEventListener('change', () => handleExportMarkdown('chatgpt'));
    qianwenTocToggle.addEventListener('change', () => handleExportMarkdown('qianwen'));

    // 复制功能处理
    function handleCopy(button, output) {
        output.select();
        document.execCommand('copy');
        
        const originalText = button.textContent;
        button.textContent = '复制成功！';
        button.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#2196F3';
        }, 2000);
    }

    chatgptCopyMarkdown.addEventListener('click', () => {
        handleCopy(chatgptCopyMarkdown, chatgptMarkdownOutput);
    });

    qianwenCopyMarkdown.addEventListener('click', () => {
        handleCopy(qianwenCopyMarkdown, qianwenMarkdownOutput);
    });

    // 初始化设置
    initializeSettings();
}); 