// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Chat 增强器已安装');
});

// 监听标签页更新事件，用于在支持的网站上显示插件图标
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 检查URL是否匹配支持的网站
    const supportedUrls = [
        'https://chatgpt.com/*',
        'https://www.tongyi.com/*',
        'https://gemini.google.com/*'
    ];

    console.log('标签页更新:', tab.url);

    if (!tab.url) {
        console.log('URL为空，跳过处理');
        return;
    }

    const isSupported = supportedUrls.some(url => {
        const pattern = new RegExp(url.replace(/\*/g, '.*'));
        return pattern.test(tab.url);
    });

    console.log('是否支持的网站:', isSupported);

    // 根据是否支持来设置图标状态
    chrome.action.setIcon({
        tabId: tab.id,
        path: {
            16: 'icons/icon16.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png'
        }
    }).then(() => {
        console.log('图标设置成功');
    }).catch(error => {
        console.error('设置图标失败:', error);
    });

    // 设置图标是否可点击
    chrome.action.setEnabled({
        tabId: tab.id,
        enabled: isSupported
    }).then(() => {
        console.log('图标状态设置成功, enabled:', isSupported);
    }).catch(error => {
        console.error('设置图标状态失败:', error);
    });
});
