// 初始化popup
function initializePopup() {
    // 获取当前标签页的设置
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getSettings' }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('获取设置失败:', chrome.runtime.lastError);
                return;
            }

            if (!response) {
                console.error('未收到响应');
                return;
            }

            console.log('收到设置:', response);

            // 更新导航栏开关状态
            const sidebarToggle = document.getElementById('sidebarToggle');
            if (sidebarToggle) {
                sidebarToggle.checked = response.sidebarVisible;
            }

            // 根据页面类型显示或隐藏宽度调整控件
            const widthControlGroup = document.getElementById('widthControlGroup');
            if (widthControlGroup) {
                // 只在通义千问页面隐藏宽度控制区域
                if (response.isTongyi) {
                    widthControlGroup.classList.add('hidden');
                } else {
                    widthControlGroup.classList.remove('hidden');
                    // 更新宽度控制状态
                    if (response.conversationWidth !== undefined) {
                        const widthSlider = document.getElementById('widthSlider');
                        if (widthSlider) {
                            widthSlider.value = response.conversationWidth;
                        }
                    }
                }
            }
        });
    });
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化popup
    initializePopup();

    // 导航栏开关事件监听
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('change', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleSidebar',
                    visible: sidebarToggle.checked
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('切换导航栏失败:', chrome.runtime.lastError);
                        return;
                    }
                    console.log('导航栏状态已更新:', response);
                });
            });
        });
    }

    // 宽度调整滑块事件监听
    const widthSlider = document.getElementById('widthSlider');
    if (widthSlider) {
        widthSlider.addEventListener('input', function() {
            // 检查是否在ChatGPT页面
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getSettings' }, function(response) {
                    if (response && !response.isTongyi) {
                        const level = parseInt(widthSlider.value);
                        // 发送消息到content script
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'adjustWidth',
                            widthLevel: level
                        }, function(response) {
                            if (chrome.runtime.lastError) {
                                console.error('调整宽度失败:', chrome.runtime.lastError);
                                return;
                            }
                            console.log('宽度已调整:', response);
                        });
                    }
                });
            });
        });
    }

    // Markdown导���按钮事件监听
    const exportMarkdownButton = document.getElementById('exportMarkdown');
    const markdownOutput = document.getElementById('markdownOutput');
    const copyMarkdownButton = document.getElementById('copyMarkdown');
    const tocContainer = document.getElementById('tocContainer');
    const tocToggle = document.getElementById('tocToggle');

    if (exportMarkdownButton) {
        exportMarkdownButton.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getMarkdown',
                    generateToc: tocToggle.checked
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('导出Markdown失败:', chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.markdown) {
                        // 显示Markdown内容
                        markdownOutput.value = response.markdown;
                        markdownOutput.style.display = 'block';
                        copyMarkdownButton.style.display = 'block';
                        tocContainer.style.display = 'flex';

                        // 显示复制成功反馈
                        const button = exportMarkdownButton;
                        const originalText = button.textContent;
                        button.textContent = '转换成功！';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 2000);
                    }
                });
            });
        });
    }

    // 目录开关事件监听
    if (tocToggle) {
        tocToggle.addEventListener('change', function() {
            if (markdownOutput.style.display === 'block') {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'getMarkdown',
                        generateToc: tocToggle.checked
                    }, function(response) {
                        if (response && response.markdown) {
                            markdownOutput.value = response.markdown;
                        }
                    });
                });
            }
        });
    }

    // 复制按钮事件监听
    if (copyMarkdownButton) {
        copyMarkdownButton.addEventListener('click', function() {
            markdownOutput.select();
            document.execCommand('copy');
            
            const button = this;
            const originalText = button.textContent;
            button.textContent = '已复制！';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    }
});
