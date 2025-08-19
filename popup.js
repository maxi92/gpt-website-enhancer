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

// 获取网站名称
function getSiteName(url) {
    if (!url) return 'Unknown';
    
    if (url.includes('chatgpt.com')) {
        return 'ChatGPT';
    } else if (url.includes('tongyi.com')) {
        return '通义千问';
    } else if (url.includes('gemini.google.com')) {
        return 'Gemini';
    } else {
        return 'Unknown';
    }
}

// 获取当前时间（格式：HHmmss）
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 300px;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        white-space: pre-line;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // 设置不同类型的样式
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#d4edda';
            notification.style.color = '#155724';
            notification.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.border = '1px solid #f5c6cb';
            break;
        default:
            notification.style.backgroundColor = '#d1ecf1';
            notification.style.color = '#0c5460';
            notification.style.border = '1px solid #bee5eb';
    }
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 设置自动消失
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000); // 显示4秒
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
                        
                        // 显示思源笔记按钮
                        const sendToSiyuanButton = document.getElementById('sendToSiyuan');
                        if (sendToSiyuanButton) {
                            sendToSiyuanButton.style.display = 'block';
                        }

                        // 确保按钮可见
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

    // 发送到思源笔记按钮事件监听
    const sendToSiyuanButton = document.getElementById('sendToSiyuan');
    if (sendToSiyuanButton) {
        sendToSiyuanButton.addEventListener('click', function() {
            const markdownContent = markdownOutput.value.trim();
            if (!markdownContent) {
                alert('请先转换为Markdown格式');
                return;
            }

            // 获取当前网站信息
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentUrl = tabs[0]?.url || '';
                const siteName = getSiteName(currentUrl);
                const currentTime = getCurrentTime();
                const docName = `${siteName}${currentTime}`;

                // 禁用按钮，显示发送中状态
                const button = sendToSiyuanButton;
                const originalText = button.textContent;
                button.disabled = true;
                button.textContent = '发送中...';

                // 直接调用思源笔记创建函数
                createSiyuanDocument(docName, markdownContent, (error, result) => {
                    // 恢复按钮状态
                    button.disabled = false;
                    button.textContent = originalText;

                    if (error) {
                        // 显示错误信息
                        showNotification(error, 'error');
                    } else {
                        // 显示成功信息
                        showNotification(`✅ 已发送到思源笔记！\n📄 文档名: ${docName}\n📂 路径: ${result.path}`, 'success');
                    }
                });
            });
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

// 创建思源笔记文档函数
function createSiyuanDocument(docName, docContent, callback) {
    // 获取当前配置
    chrome.storage.sync.get({
        ip: 'http://127.0.0.1:6806',
        token: '',
        notebook: '',
        parentDoc: '',
        parentHPath: ''
    }, function (items) {
        // 验证必要配置
        if (!items.token) {
            callback('❌ 缺少API Token，请先配置思源笔记的API Token', null);
            return;
        }
        
        if (!items.notebook) {
            callback('❌ 缺少笔记本配置，请先搜索并选择父文档', null);
            return;
        }
        
        if (!items.parentDoc) {
            callback('❌ 缺少父文档配置，请先搜索并选择父文档', null);
            return;
        }
        
        // 构建文档路径（移除笔记本名称）
        const parentPathWithoutNotebook = items.parentHPath ? items.parentHPath.substring(items.parentHPath.indexOf('/')) : '';
        const docPath = parentPathWithoutNotebook ? `${parentPathWithoutNotebook}/${docName}` : `/${docName}`;
        
        // 准备API请求
        const apiData = {
            notebook: items.notebook,
            path: docPath,
            markdown: docContent
        };
        
        // 发送创建文档请求
        fetch(items.ip + '/api/filetree/createDocWithMd', {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + items.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 0) {
                callback(null, { success: true, path: docPath, docId: data.data || '未知' });
            } else {
                callback(`❌ 创建文档失败: ${data.msg || '未知错误'}`, null);
            }
        })
        .catch(error => {
            console.error('Create siyuan document error:', error);
            let errorMessage = '❌ 创建文档时发生错误';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage = '❌ 无法连接到思源笔记服务器，请检查API地址是否正确';
            } else if (error.message.includes('HTTP error! status: 401')) {
                errorMessage = '❌ API Token 验证失败，请检查Token是否正确';
            } else if (error.message.includes('HTTP error! status: 404')) {
                errorMessage = '❌ API 接口不存在，请检查思源笔记版本是否支持此功能';
            } else if (error.message.includes('HTTP error! status: 400')) {
                errorMessage = '❌ 请求参数错误，请检查配置是否正确';
            }
            
            callback(errorMessage, null);
        });
    });
}
