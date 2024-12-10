document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出窗口加载完成');
    
    const toggleSidebarButton = document.getElementById('toggleSidebar');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');
    const tocRadios = document.querySelectorAll('input[name="tocOption"]');

    if (!toggleSidebarButton || !exportMarkdownButton || !markdownOutput || !copyMarkdownButton || !tocRadios.length) {
        console.error('某些必需的DOM元素未找到');
        return;
    }

    let currentMarkdown = ''; // 存储原始的 Markdown 内容

    // 切换侧边栏显示
    toggleSidebarButton.addEventListener('click', async function() {
        console.log('点击切换侧边栏按钮');
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {action: 'toggleSidebar'});
            } else {
                console.error('未找到活动标签页');
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
        }
    });

    // 导出为Markdown
    exportMarkdownButton.addEventListener('click', async function() {
        console.log('点击导出Markdown按钮');
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab) {
                const generateToc = document.querySelector('input[name="tocOption"]:checked').value === 'true';
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getMarkdown',
                    generateToc: generateToc
                });
                if (response && response.markdown) {
                    console.log('收到Markdown内容');
                    currentMarkdown = response.markdown; // 保存原始内容
                    markdownOutput.value = currentMarkdown;
                    markdownOutput.style.display = 'block';
                    copyMarkdownButton.style.display = 'block';
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

    // 监听单选按钮的变化
    tocRadios.forEach(radio => {
        radio.addEventListener('change', async function() {
            if (!currentMarkdown) return; // 如果还没有内容，不做处理
            
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                if (tab) {
                    const generateToc = this.value === 'true';
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'getMarkdown',
                        generateToc: generateToc
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
