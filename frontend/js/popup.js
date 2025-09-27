// Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const adsBlocked = document.getElementById('adsBlocked');
const trackersBlocked = document.getElementById('trackersBlocked');
const scriptsBlocked = document.getElementById('scriptsBlocked');
const blockAdsToggle = document.getElementById('blockAds');
const blockTrackersToggle = document.getElementById('blockTrackers');
const blockPopupsToggle = document.getElementById('blockPopups');
const purifyBtn = document.getElementById('purifyBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const recommendations = document.getElementById('recommendations');
const recommendationsList = document.getElementById('recommendationsList');

// State
let currentTab = null;
let analysisData = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await getCurrentTab();
    await updateUI();
});

// Load user settings
async function loadSettings() {
    const settings = await chrome.storage.sync.get({
        blockAds: true,
        blockTrackers: true,
        blockPopups: true
    });
    
    blockAdsToggle.checked = settings.blockAds;
    blockTrackersToggle.checked = settings.blockTrackers;
    blockPopupsToggle.checked = settings.blockPopups;
}

// Save user settings
async function saveSettings() {
    await chrome.storage.sync.set({
        blockAds: blockAdsToggle.checked,
        blockTrackers: blockTrackersToggle.checked,
        blockPopups: blockPopupsToggle.checked
    });
}

// Get current active tab
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
}

// Update UI based on current state
async function updateUI() {
    if (!currentTab) {
        updateStatus('error', 'Unable to access current tab');
        return;
    }
    
    // Get stored data for current tab
    const tabData = await getTabData(currentTab.id);
    
    if (tabData) {
        updateStats(tabData.adsBlocked || 0, tabData.trackersBlocked || 0, tabData.scriptsBlocked || 0);
        updateStatus('active', 'Page protected');
    } else {
        updateStatus('analyzing', 'Ready to analyze');
    }
}

// Update status indicator and text
function updateStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
}

// Update statistics display
function updateStats(ads, trackers, scripts) {
    adsBlocked.textContent = ads;
    trackersBlocked.textContent = trackers;
    scriptsBlocked.textContent = scripts;
}

// Get stored data for a tab
async function getTabData(tabId) {
    const result = await chrome.storage.local.get(`tab_${tabId}`);
    return result[`tab_${tabId}`];
}

// Store data for a tab
async function setTabData(tabId, data) {
    await chrome.storage.local.set({ [`tab_${tabId}`]: data });
}

// Analyze current page
async function analyzePage() {
    if (!currentTab) return;
    
    updateStatus('analyzing', 'Analyzing page...');
    
    try {
        // Get page content
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: getPageContent
        });
        
        const htmlContent = result.result;
        
        // Send to backend for analysis
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ html_content: htmlContent })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        analysisData = await response.json();
        
        // Update UI with analysis results
        updateStats(analysisData.ads_detected, analysisData.trackers_detected, analysisData.suspicious_scripts);
        showRecommendations(analysisData.recommendations);
        updateStatus('active', 'Analysis complete');
        
    } catch (error) {
        console.error('Analysis failed:', error);
        updateStatus('error', 'Analysis failed');
    }
}

// Purify current page
async function purifyPage() {
    if (!currentTab) return;
    
    updateStatus('analyzing', 'Purifying page...');
    
    try {
        const settings = {
            remove_ads: blockAdsToggle.checked,
            remove_trackers: blockTrackersToggle.checked,
            remove_popups: blockPopupsToggle.checked
        };
        
        // Send purification request to backend
        const response = await fetch(`${API_BASE_URL}/purify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: currentTab.url,
                ...settings
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Inject purified content
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: injectPurifiedContent,
                args: [result.cleaned_content]
            });
            
            // Store results
            const tabData = {
                adsBlocked: result.removed_elements.filter(e => e.includes('Ad')).length,
                trackersBlocked: result.removed_elements.filter(e => e.includes('Tracking')).length,
                scriptsBlocked: result.removed_elements.filter(e => e.includes('script')).length,
                purified: true
            };
            
            await setTabData(currentTab.id, tabData);
            updateStats(tabData.adsBlocked, tabData.trackersBlocked, tabData.scriptsBlocked);
            updateStatus('active', 'Page purified successfully');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Purification failed:', error);
        updateStatus('error', 'Purification failed');
    }
}

// Show recommendations
function showRecommendations(recommendationList) {
    recommendationsList.innerHTML = '';
    recommendationList.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });
    recommendations.style.display = 'block';
}

// Content script functions (injected into page)
function getPageContent() {
    return document.documentElement.outerHTML;
}

function injectPurifiedContent(cleanedHtml) {
    document.documentElement.innerHTML = cleanedHtml;
}

// Event listeners
blockAdsToggle.addEventListener('change', saveSettings);
blockTrackersToggle.addEventListener('change', saveSettings);
blockPopupsToggle.addEventListener('change', saveSettings);

analyzeBtn.addEventListener('click', analyzePage);
purifyBtn.addEventListener('click', purifyPage);

// Settings link
document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});