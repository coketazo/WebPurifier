// Content script for WebPurifier extension
// Runs in the context of web pages

(function() {
    'use strict';
    
    // Configuration
    const WEBPURIFIER_CONFIG = {
        enabled: true,
        selectors: {
            ads: [
                '[class*="ad"]', '[id*="ad"]', '.advertisement', '.ads',
                '[class*="banner"]', '.sponsored', '.promo', '[class*="adsense"]',
                '.ad-container', '.ad-wrapper', '[data-ad]', '[data-ads]'
            ],
            trackers: [
                'script[src*="google-analytics"]',
                'script[src*="googletagmanager"]',
                'script[src*="facebook.com"]',
                'script[src*="doubleclick"]',
                'script[src*="googlesyndication"]'
            ],
            popups: [
                '.modal', '.popup', '.overlay', '[class*="popup"]',
                '[class*="modal"]', '.lightbox', '.newsletter-popup'
            ]
        }
    };
    
    // State tracking
    let blockedElements = {
        ads: 0,
        trackers: 0,
        popups: 0
    };
    
    let observer = null;
    let settings = null;
    
    // Initialize content script
    async function init() {
        // Load settings
        settings = await loadSettings();
        
        // Apply initial blocking
        await applyBlocking();
        
        // Set up mutation observer for dynamic content
        setupMutationObserver();
        
        // Update stats
        updateStats();
        
        console.log('WebPurifier content script initialized');
    }
    
    // Load settings from storage
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({
                blockAds: true,
                blockTrackers: true,
                blockPopups: true
            }, resolve);
        });
    }
    
    // Apply blocking based on current settings
    async function applyBlocking() {
        if (settings.blockAds) {
            blockAds();
        }
        
        if (settings.blockTrackers) {
            blockTrackers();
        }
        
        if (settings.blockPopups) {
            blockPopups();
        }
    }
    
    // Block advertisements
    function blockAds() {
        WEBPURIFIER_CONFIG.selectors.ads.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (isVisible(element) && !element.dataset.webpurifierProcessed) {
                    hideElement(element, 'ad');
                    blockedElements.ads++;
                    element.dataset.webpurifierProcessed = 'true';
                }
            });
        });
    }
    
    // Block tracking scripts
    function blockTrackers() {
        WEBPURIFIER_CONFIG.selectors.trackers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!element.dataset.webpurifierProcessed) {
                    element.remove();
                    blockedElements.trackers++;
                    element.dataset.webpurifierProcessed = 'true';
                }
            });
        });
    }
    
    // Block popups
    function blockPopups() {
        WEBPURIFIER_CONFIG.selectors.popups.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (isVisible(element) && !element.dataset.webpurifierProcessed) {
                    // Check if it's likely a popup (covering significant screen area)
                    const rect = element.getBoundingClientRect();
                    if (rect.width > window.innerWidth * 0.3 && rect.height > window.innerHeight * 0.3) {
                        hideElement(element, 'popup');
                        blockedElements.popups++;
                        element.dataset.webpurifierProcessed = 'true';
                    }
                }
            });
        });
    }
    
    // Check if element is visible
    function isVisible(element) {
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    }
    
    // Hide element with animation
    function hideElement(element, type) {
        // Add blocked element class
        element.classList.add('webpurifier-blocked', `webpurifier-blocked-${type}`);
        
        // Apply hiding styles
        element.style.transition = 'opacity 0.3s ease';
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.display = 'none';
            
            // Add placeholder for debugging (in dev mode)
            if (window.location.hostname === 'localhost') {
                const placeholder = document.createElement('div');
                placeholder.className = 'webpurifier-placeholder';
                placeholder.textContent = `[WebPurifier: Blocked ${type}]`;
                placeholder.style.cssText = `
                    background: #f0f0f0;
                    border: 2px dashed #ccc;
                    padding: 10px;
                    margin: 5px;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                `;
                element.parentNode?.insertBefore(placeholder, element);
            }
        }, 300);
    }
    
    // Set up mutation observer to handle dynamic content
    function setupMutationObserver() {
        observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldReapply = true;
                }
            });
            
            if (shouldReapply) {
                // Debounce the reapplication
                clearTimeout(setupMutationObserver.timeout);
                setupMutationObserver.timeout = setTimeout(() => {
                    applyBlocking();
                    updateStats();
                }, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Update statistics
    function updateStats() {
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'updateStats',
            ads: blockedElements.ads,
            trackers: blockedElements.trackers,
            scripts: blockedElements.popups
        });
    }
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'sync') {
            settings = await loadSettings();
            
            // Reset and reapply blocking
            blockedElements = { ads: 0, trackers: 0, popups: 0 };
            
            // Remove previous processing marks
            document.querySelectorAll('[data-webpurifier-processed]').forEach(el => {
                delete el.dataset.webpurifierProcessed;
            });
            
            await applyBlocking();
            updateStats();
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (observer) {
            observer.disconnect();
        }
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();