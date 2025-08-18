// 检查网站是否受支持
function isSupportedSite(url) {
    if (!url) return false;
    
    const supportedUrls = [
        'https://chatgpt.com/*',
        'https://www.tongyi.com/*',
        'https://gemini.google.com/*'
    ];
    
    return supportedUrls.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(url);
    });
}

// 显示不支持网站的提示
function showUnsupportedSite() {
    const body = document.body;
    if (body) {
        // 清空整个body内容
        body.innerHTML = '';
        
        // 添加不支持网站的提示
        const unsupportedDiv = document.createElement('div');
        unsupportedDiv.className = 'unsupported-site';
        unsupportedDiv.innerHTML = `
            <h3>⚠️ 不支持此网站</h3>
            <p>AI Chat Enhancer 仅支持以下网站：</p>
            <ul>
                <li>🤖 ChatGPT (chatgpt.com)</li>
                <li>🔷 通义千问 (www.tongyi.com)</li>
                <li>💎 Gemini (gemini.google.com)</li>
            </ul>
            <p>请访问支持的网站以使用此插件功能。</p>
        `;
        body.appendChild(unsupportedDiv);
    }
}

// 初始化popup
function initializePopup() {
    // 首先检查当前网站是否受支持
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentUrl = tabs[0]?.url;
        
        if (!isSupportedSite(currentUrl)) {
            showUnsupportedSite();
            return;
        }
        
        // 获取当前标签页的设置
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
                // 在通义千问和Gemini页面隐藏宽度控制区域
                if (response.isTongyi || response.isGemini) {
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

                        // 确保复制按钮可见
                        try {
                            copyMarkdownButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        } catch (e) {}

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

    // SiYuan 配置按钮事件监听
    const siyuanConfigBtn = document.getElementById('siyuanConfigBtn');

    if (siyuanConfigBtn) {
        siyuanConfigBtn.addEventListener('click', function() {
            // 打开 SiYuan 配置页面（新标签页）
            chrome.runtime.openOptionsPage();
        });
    }
});
