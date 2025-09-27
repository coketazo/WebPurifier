// Background service worker for WebPurifier extension

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('WebPurifier extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
        blockAds: true,
        blockTrackers: true,
        blockPopups: true,
        autoProtect: false
    });
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if auto-protect is enabled
        const settings = await chrome.storage.sync.get('autoProtect');
        if (settings.autoProtect) {
            await autoProtectPage(tabId, tab.url);
        }
    }
});

// Auto-protect page function
async function autoProtectPage(tabId, url) {
    try {
        // Skip chrome:// and extension:// pages
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            return;
        }
        
        const settings = await chrome.storage.sync.get({
            blockAds: true,
            blockTrackers: true,
            blockPopups: true
        });
        
        // Inject content script for auto-protection
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: autoProtectContent,
            args: [settings]
        });
        
        console.log(`Auto-protection applied to tab ${tabId}`);
        
    } catch (error) {
        console.error('Auto-protection failed:', error);
    }
}

// Content function for auto-protection (injected into page)
function autoProtectContent(settings) {
    let blockedElements = {
        ads: 0,
        trackers: 0,
        popups: 0
    };
    
    if (settings.blockAds) {
        // Block common ad elements
        const adSelectors = [
            '[class*="ad"]', '[id*="ad"]', '.advertisement', '.ads',
            '[class*="banner"]', '.sponsored', '.promo', '[class*="adsense"]'
        ];
        
        adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                    element.style.display = 'none';
                    blockedElements.ads++;
                }
            });
        });
    }
    
    if (settings.blockTrackers) {
        // Block tracking scripts
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.src;
            if (src && (
                src.includes('google-analytics') ||
                src.includes('googletagmanager') ||
                src.includes('facebook.com') ||
                src.includes('doubleclick') ||
                src.includes('googlesyndication')
            )) {
                script.remove();
                blockedElements.trackers++;
            }
        });
    }
    
    if (settings.blockPopups) {
        // Block popup elements
        const popupSelectors = [
            '.modal', '.popup', '.overlay', '[class*="popup"]',
            '[class*="modal"]', '.lightbox'
        ];
        
        popupSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.offsetWidth > 100 && element.offsetHeight > 100) {
                    element.style.display = 'none';
                    blockedElements.popups++;
                }
            });
        });
    }
    
    // Store results
    chrome.storage.local.set({
        [`tab_${chrome.runtime.sendMessage ? 'current' : window.location.href}`]: {
            adsBlocked: blockedElements.ads,
            trackersBlocked: blockedElements.trackers,
            scriptsBlocked: blockedElements.popups,
            autoProtected: true,
            timestamp: Date.now()
        }
    });
    
    return blockedElements;
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStats') {
        // Update badge with blocked count
        const total = (request.ads || 0) + (request.trackers || 0) + (request.scripts || 0);
        if (total > 0) {
            chrome.action.setBadgeText({
                text: total.toString(),
                tabId: sender.tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#667eea',
                tabId: sender.tab.id
            });
        }
        sendResponse({ success: true });
    }
});

// Clean up old tab data periodically
setInterval(async () => {
    const storage = await chrome.storage.local.get();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    Object.keys(storage).forEach(key => {
        if (key.startsWith('tab_') && storage[key].timestamp) {
            if (now - storage[key].timestamp > oneDay) {
                chrome.storage.local.remove(key);
            }
        }
    });
}, 60 * 60 * 1000); // Run every hour