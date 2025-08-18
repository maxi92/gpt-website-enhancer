document.addEventListener('DOMContentLoaded', () => {
    const ipElement = document.getElementById('ip')
    const tokenElement = document.getElementById('token')
    const showTipElement = document.getElementById('showTip')
    const searchDocElement = document.getElementById('searchDoc')
    const parentDocElement = document.getElementById('parentDoc')
    const tagsElement = document.getElementById('tags')
    const assetsElement = document.getElementById('assets')
    const expOpenAfterClipElement = document.getElementById('expOpenAfterClip')
    const expElement = document.getElementById('exp')
    const expGroupElement = document.getElementById('expGroup')
    const expSpanElement = document.getElementById('expSpan')
    const expBoldElement = document.getElementById('expBold')
    const expItalicElement = document.getElementById('expItalic')
    const expRemoveImgLinkElement = document.getElementById('expRemoveImgLink')
    const expListDocTreeElement = document.getElementById('expListDocTree')
    const expSvgToImgElement = document.getElementById('expSvgToImg')
    const languageElement = document.getElementById('language')
    const templateTextElement = document.getElementById('templateText')
    const statusMessage = document.getElementById('statusMessage')

    // Load saved settings
    chrome.storage.sync.get({
        ip: 'http://127.0.0.1:6806',
        showTip: true,
        token: '',
        searchKey: '',
        notebook: '',
        parentDoc: '',
        parentHPath: '',
        tags: '',
        assets: true,
        expOpenAfterClip: false,
        expSpan: false,
        expBold: false,
        expItalic: false,
        expRemoveImgLink: false,
        expListDocTree: false,
        expSvgToImg: false,
        clipTemplate: '---\n\n- ${title}${siteName ? " - " + siteName : ""}\n- [${urlDecoded}](${url}) \n- ${excerpt}\n- ${date} ${time}\n\n---\n\n${content}',
        langCode: 'zh_CN'
    }, function (items) {
        ipElement.value = items.ip || 'http://127.0.0.1:6806'
        tokenElement.value = items.token || ''
        showTipElement.checked = items.showTip
        searchDocElement.value = items.searchKey || ''
        tagsElement.value = items.tags || ''
        assetsElement.checked = items.assets
        expOpenAfterClipElement.checked = items.expOpenAfterClip
        expSpanElement.checked = items.expSpan
        expBoldElement.checked = items.expBold
        expItalicElement.checked = items.expItalic
        expRemoveImgLinkElement.checked = items.expRemoveImgLink
        expListDocTreeElement.checked = items.expListDocTree
        expSvgToImgElement.checked = items.expSvgToImg
        expElement.checked = items.expSpan || items.expBold || items.expItalic || items.expRemoveImgLink || items.expListDocTree || items.expSvgToImg
        templateTextElement.value = items.clipTemplate
        languageElement.value = items.langCode || 'zh_CN'

        // Update exp group visibility
        if (expElement.checked) {
            expGroupElement.style.display = 'block'
        }

        // Update parent doc selection
        if (items.notebook && items.parentDoc) {
            parentDocElement.setAttribute('data-notebook', items.notebook)
            parentDocElement.setAttribute('data-parent', items.parentDoc)
            parentDocElement.setAttribute('data-parenthpath', items.parentHPath)
        }

        updateSearch()
    })

    // Event listeners
    ipElement.addEventListener('change', () => {
        let ip = ipElement.value
        // Remove trailing slashes
        for (let i = ip.length - 1; i >= 0; i--) {
            if ('/' === ip[i]) {
                ip = ip.substring(0, i)
            } else {
                break
            }
        }
        ipElement.value = ip
    })

    tokenElement.addEventListener('change', () => {
        updateSearch()
    })

    searchDocElement.addEventListener('change', () => {
        updateSearch()
    })

    parentDocElement.addEventListener('change', () => {
        const selectedOption = parentDocElement.options[parentDocElement.selectedIndex]
        const notebook = selectedOption.getAttribute('data-notebook')
        const parentDoc = selectedOption.getAttribute('data-parent')

        chrome.storage.sync.set({
            notebook: notebook,
            parentDoc: parentDoc,
            parentHPath: selectedOption.innerText,
        })
    })

    tagsElement.addEventListener('change', () => {
        tagsElement.value = tagsElement.value.replace(/#/g, '')
    })

    expElement.addEventListener('change', function () {
        if (expElement.checked) {
            expGroupElement.style.display = 'block'
        } else {
            expGroupElement.style.display = 'none'
        }
    })

    languageElement.addEventListener('change', () => {
        const langCode = languageElement.value
        chrome.storage.sync.set({
            langCode: langCode,
        })
    })

    // Password toggle
    const togglePassword = document.getElementById('togglePassword')
    togglePassword.addEventListener('click', () => {
        if (tokenElement.getAttribute('type') === 'password') {
            tokenElement.setAttribute('type', 'text')
            togglePassword.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>'
        } else {
            tokenElement.setAttribute('type', 'password')
            togglePassword.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
        }
    })

    // Save configuration
    const saveBtn = document.getElementById('saveBtn')
    saveBtn.addEventListener('click', () => {
        const config = {
            ip: ipElement.value,
            token: tokenElement.value,
            showTip: showTipElement.checked,
            searchKey: searchDocElement.value,
            tags: tagsElement.value,
            assets: assetsElement.checked,
            expOpenAfterClip: expOpenAfterClipElement.checked,
            expSpan: expSpanElement.checked,
            expBold: expBoldElement.checked,
            expItalic: expItalicElement.checked,
            expRemoveImgLink: expRemoveImgLinkElement.checked,
            expListDocTree: expListDocTreeElement.checked,
            expSvgToImg: expSvgToImgElement.checked,
            clipTemplate: templateTextElement.value,
            langCode: languageElement.value
        }

        // Update notebook and parent doc if selected
        if (parentDocElement.selectedOptions && parentDocElement.selectedOptions.length > 0) {
            const selected = parentDocElement.selectedOptions[0]
            config.notebook = selected.getAttribute('data-notebook')
            config.parentDoc = selected.getAttribute('data-parent')
            config.parentHPath = selected.innerText
        }

        chrome.storage.sync.set(config, () => {
            showStatus('✅ 配置保存成功！您可以继续修改配置或关闭此页面。', 'success')
            // 不再自动关闭页面，让用户可以继续操作
        })
    })

    // Test connection button
    const testConnectionBtn = document.getElementById('testConnectionBtn')
    testConnectionBtn.addEventListener('click', () => {
        testConnection()
    })

    // Reset button
    const resetBtn = document.getElementById('resetBtn')
    resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置所有配置吗？')) {
            resetConfiguration()
        }
    })
})

const updateSearch = () => {
    const ipElement = document.getElementById('ip')
    const tokenElement = document.getElementById('token')
    const searchDocElement = document.getElementById('searchDoc')
    const parentDocElement = document.getElementById('parentDoc')

    if (!tokenElement.value || !searchDocElement.value) {
        return
    }

    fetch(ipElement.value + '/api/filetree/searchDocs', {
        method: 'POST',
        redirect: 'manual',
        headers: {
            'Authorization': 'Token ' + tokenElement.value,
        },
        body: JSON.stringify({
            'k': searchDocElement.value,
            'flashcard': false
        })
    }).then((response) => {
        if (response.status !== 200) {
            showStatus('认证失败，请检查 API Token', 'error')
            return
        }

        return response.json()
    }).then((response) => {
        if (!response || response.code !== 0) {
            showStatus('搜索文档失败', 'error')
            return
        }

        let optionsHTML = '<option value="">请选择父文档</option>'
        response.data.forEach(doc => {
            const parentDoc = doc.path.substring(doc.path.toString().lastIndexOf('/') + 1).replace('.sy', '')
            let selected = ''
            
            if (parentDocElement.dataset.notebook === doc.box && 
                parentDocElement.dataset.parent === parentDoc &&
                parentDocElement.dataset.parenthpath === doc.hPath) {
                selected = 'selected'
            }
            
            optionsHTML += `<option ${selected} data-notebook="${doc.box}" data-parent="${parentDoc}">${escapeHtml(doc.hPath)}</option>`
        })
        
        parentDocElement.innerHTML = optionsHTML

        if (parentDocElement.selectedOptions && parentDocElement.selectedOptions.length > 0) {
            let selected = parentDocElement.querySelector('option[selected]')
            if (!selected) {
                selected = parentDocElement.selectedOptions[0]
                chrome.storage.sync.set({
                    notebook: selected.getAttribute('data-notebook'),
                    parentDoc: selected.getAttribute('data-parent'),
                    parentHPath: selected.innerText,
                })
            }
        }
    }).catch((error) => {
        console.error('Search error:', error)
        showStatus('搜索文档时出错', 'error')
    })
}

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

const testConnection = () => {
    const ipElement = document.getElementById('ip')
    const tokenElement = document.getElementById('token')
    
    if (!ipElement.value || !tokenElement.value) {
        showStatus('请先填写 API 地址和 Token', 'error')
        return
    }
    
    showStatus('正在测试连接...', 'info')
    
    fetch(ipElement.value + '/api/system/version', {
        method: 'GET',
        headers: {
            'Authorization': 'Token ' + tokenElement.value,
        }
    }).then((response) => {
        if (response.status === 200) {
            return response.json()
        } else {
            throw new Error('连接失败')
        }
    }).then((data) => {
        if (data && data.code === 0) {
            showStatus('连接成功！SiYuan 版本: ' + (data.data || '未知'), 'success')
        } else {
            showStatus('连接失败：' + (data.msg || '未知错误'), 'error')
        }
    }).catch((error) => {
        console.error('Connection test error:', error)
        showStatus('连接失败：无法连接到 SiYuan 服务器', 'error')
    })
}

const resetConfiguration = () => {
    const defaultConfig = {
        ip: 'http://127.0.0.1:6806',
        showTip: true,
        token: '',
        searchKey: '',
        notebook: '',
        parentDoc: '',
        parentHPath: '',
        tags: '',
        assets: true,
        expOpenAfterClip: false,
        expSpan: false,
        expBold: false,
        expItalic: false,
        expRemoveImgLink: false,
        expListDocTree: false,
        expSvgToImg: false,
        clipTemplate: '---\n\n- ${title}${siteName ? " - " + siteName : ""}\n- [${urlDecoded}](${url}) \n- ${excerpt}\n- ${date} ${time}\n\n---\n\n${content}',
        langCode: 'zh_CN'
    }
    
    chrome.storage.sync.set(defaultConfig, () => {
        // 重新加载页面
        location.reload()
    })
}

const showStatus = (message, type) => {
    const statusElement = document.getElementById('statusMessage')
    statusElement.textContent = message
    statusElement.className = `status-message status-${type}`
    statusElement.style.display = 'block'
    
    // 根据消息类型设置不同的显示时间
    let displayTime = 3000 // 默认3秒
    if (type === 'success') {
        displayTime = 5000 // 成功消息显示5秒
    } else if (type === 'error') {
        displayTime = 8000 // 错误消息显示8秒
    }
    
    setTimeout(() => {
        statusElement.style.display = 'none'
    }, displayTime)
}