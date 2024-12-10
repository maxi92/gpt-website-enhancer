document.addEventListener('DOMContentLoaded', function() {
    console.log('弹出窗口加载完成');
    
    const toggleSidebarButton = document.getElementById('toggleSidebar');
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');

    if (!toggleSidebarButton || !exportMarkdownButton || !markdownOutput || !copyMarkdownButton) {
        console.error('某些必需的DOM元素未找到');
        return;
    }

    // 切换侧边栏显示
    toggleSidebarButton.addEventListener('click', function() {
        console.log('点击切换侧边栏按钮');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSidebar'}, function(response) {
                    console.log('侧边栏切换响应:', response);
                });
            } else {
                console.error('未找到活动标签页');
            }
        });
    });

    // 导出为Markdown
    exportMarkdownButton.addEventListener('click', function() {
        console.log('点击导出Markdown按钮');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'getMarkdown'}, function(response) {
                    if (response && response.markdown) {
                        console.log('收到Markdown内容');
                        markdownOutput.value = response.markdown;
                        markdownOutput.style.display = 'block';
                        copyMarkdownButton.style.display = 'block';
                    } else {
                        console.error('未收到Markdown内容');
                    }
                });
            } else {
                console.error('未找到活动标签页');
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
