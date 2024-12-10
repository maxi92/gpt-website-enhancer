document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出窗口加载完成');
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');
    const tocToggle = document.getElementById('tocToggle');
    const optionRow = document.querySelector('.option-row');

    if (!sidebarToggle || !exportMarkdownButton || !markdownOutput || 
        !copyMarkdownButton || !tocToggle || !optionRow) {
        console.error('某些必需的DOM元素未找到');
        return;
    }

    let currentMarkdown = ''; // 存储原始的 Markdown 内容

    // 初始化侧边栏状态
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
        if (tabs[0]) {
            try {
                const response = await chrome.tabs.sendMessage(tabs[0].id, {action: 'getSidebarState'});
                sidebarToggle.checked = response.isVisible;
            } catch (error) {
                console.error('获取侧边栏状态失败:', error);
            }
        }
    });

    // 切换侧边栏显示
    sidebarToggle.addEventListener('change', async function() {
        console.log('切换侧边栏状态:', this.checked);
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleSidebar',
                    visible: this.checked
                });
            } else {
                console.error('未找到活动标签页');
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
            this.checked = !this.checked; // 如果失败，恢复状态
        }
    });

    // 导出为Markdown
    exportMarkdownButton.addEventListener('click', async function() {
        console.log('点击导出Markdown按钮');
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getMarkdown',
                    generateToc: tocToggle.checked
                });
                if (response && response.markdown) {
                    console.log('收到Markdown内容');
                    currentMarkdown = response.markdown;
                    markdownOutput.value = currentMarkdown;
                    markdownOutput.style.display = 'block';
                    copyMarkdownButton.style.display = 'block';
                    document.querySelector('.option-row:nth-child(2)').style.display = 'flex';  // 显示目录开关
                } else {
                    console.error('未收到Markdown内容');
                }
            } else {
                console.error('未找到活动标签页');
            }
        } catch (error) {
            console.error('获取Markdown失败:', error);
        }
    });

    // 监听Toggle Switch的变化
    tocToggle.addEventListener('change', async function() {
        if (!currentMarkdown) return; // 如果还没有内容，不做处理
        
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getMarkdown',
                    generateToc: this.checked
                });
                if (response && response.markdown) {
                    console.log('更新Markdown内容');
                    currentMarkdown = response.markdown;
                    markdownOutput.value = currentMarkdown;
                }
            }
        } catch (error) {
            console.error('更新Markdown失败:', error);
        }
    });

    // 复制Markdown内容
    copyMarkdownButton.addEventListener('click', function() {
        console.log('点击复制按钮');
        markdownOutput.select();
        document.execCommand('copy');
        
        // 显示复制成功提示
        const originalText = copyMarkdownButton.textContent;
        copyMarkdownButton.textContent = '复制成功！';
        copyMarkdownButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            copyMarkdownButton.textContent = originalText;
            copyMarkdownButton.style.backgroundColor = '#2196F3';
            console.log('复制按钮状态已重置');
        }, 2000);
    });
});
