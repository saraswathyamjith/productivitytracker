// Default site categories
const DEFAULT_PRODUCTIVE = [
  'docs.google.com',
  'stackoverflow.com',
  'github.com',
  'wikipedia.org',
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'leetcode.com',
  'developer.mozilla.org',
  'notion.so',
  'linear.app',
  'figma.com'
];

const DEFAULT_DISTRACTING = [
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'facebook.com',
  'netflix.com',
  'twitch.tv',
  'discord.com'
];

// Level system
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Newbie' },
  { level: 2, xpRequired: 60, title: 'Apprentice' },
  { level: 3, xpRequired: 180, title: 'Scholar' },
  { level: 4, xpRequired: 360, title: 'Adept' },
  { level: 5, xpRequired: 600, title: 'Expert' },
  { level: 6, xpRequired: 900, title: 'Sage' },
  { level: 7, xpRequired: 1260, title: 'Master' },
  { level: 8, xpRequired: 1680, title: 'Grandmaster' },
  { level: 9, xpRequired: 2160, title: 'Legend' },
  { level: 10, xpRequired: 2700, title: 'Transcendent' }
];

// State
let currentDomain = null;
let trackingStartTime = null;

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['productiveSites', 'distractingSites', 'totalXP']);
  if (!data.productiveSites) {
    await chrome.storage.local.set({ productiveSites: DEFAULT_PRODUCTIVE });
  }
  if (!data.distractingSites) {
    await chrome.storage.local.set({ distractingSites: DEFAULT_DISTRACTING });
  }
  if (data.totalXP === undefined) {
    await chrome.storage.local.set({ totalXP: 0 });
  }
});

// Set up alarm for periodic saving (every 30 seconds)
chrome.alarms.create('saveTime', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'saveTime') {
    await saveCurrentSession();
  }
});

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await saveCurrentSession();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    startTracking(tab.url);
  } catch (e) {
    // Tab might not exist anymore
    currentDomain = null;
    trackingStartTime = null;
  }
});

// Track URL changes within a tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await saveCurrentSession();
    startTracking(changeInfo.url);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await saveCurrentSession();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    currentDomain = null;
    trackingStartTime = null;
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) {
        startTracking(tab.url);
      }
    } catch (e) {
      currentDomain = null;
      trackingStartTime = null;
    }
  }
});

function extractDomain(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return null;
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname || null;
  } catch (e) {
    return null;
  }
}

function startTracking(url) {
  const domain = extractDomain(url);
  currentDomain = domain;
  trackingStartTime = domain ? Date.now() : null;
}

function getDateKey() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function getSiteCategory(domain) {
  const data = await chrome.storage.local.get(['productiveSites', 'distractingSites']);
  const productive = data.productiveSites || DEFAULT_PRODUCTIVE;
  const distracting = data.distractingSites || DEFAULT_DISTRACTING;

  // Check if domain matches or is a subdomain of any categorized site
  for (const site of productive) {
    if (domain === site || domain.endsWith('.' + site)) {
      return 'productive';
    }
  }
  for (const site of distracting) {
    if (domain === site || domain.endsWith('.' + site)) {
      return 'distracting';
    }
  }
  return 'neutral';
}

async function saveCurrentSession() {
  if (!currentDomain || !trackingStartTime) return;

  const now = Date.now();
  const elapsed = Math.floor((now - trackingStartTime) / 1000); // seconds
  trackingStartTime = now; // Reset for next interval

  if (elapsed <= 0 || elapsed > 3600) return; // Skip invalid or too-long intervals

  const dateKey = getDateKey();
  const storageKey = `day_${dateKey}`;
  const data = await chrome.storage.local.get([storageKey, 'totalXP']);

  let dayData = data[storageKey] || {
    domains: {},
    totalProductive: 0,
    totalDistracting: 0,
    xpEarned: 0
  };

  // Add time to domain
  dayData.domains[currentDomain] = (dayData.domains[currentDomain] || 0) + elapsed;

  // Categorize and update totals
  const category = await getSiteCategory(currentDomain);
  if (category === 'productive') {
    dayData.totalProductive += elapsed;
    // 1 XP per minute of productive time
    const xpGained = elapsed / 60;
    dayData.xpEarned += xpGained;

    // Update lifetime XP
    const totalXP = (data.totalXP || 0) + xpGained;
    await chrome.storage.local.set({ totalXP });
  } else if (category === 'distracting') {
    dayData.totalDistracting += elapsed;
  }

  await chrome.storage.local.set({ [storageKey]: dayData });
}

// Initialize tracking on service worker start
async function initialize() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      startTracking(tab.url);
    }
  } catch (e) {
    // No active tab
  }
}

initialize();
