const LEVELS = [
  { level: 1,  xpRequired: 0,    title: 'Newbie',       color: '#808080' },
  { level: 2,  xpRequired: 60,   title: 'Apprentice',   color: '#4a7c59' },
  { level: 3,  xpRequired: 180,  title: 'Journeyman',   color: '#2e86c1' },
  { level: 4,  xpRequired: 360,  title: 'Adept',        color: '#7d3c98' },
  { level: 5,  xpRequired: 600,  title: 'Expert',       color: '#b9770e' },
  { level: 6,  xpRequired: 900,  title: 'Sage',         color: '#c0392b' },
  { level: 7,  xpRequired: 1260, title: 'Master',       color: '#d4ac0d' },
  { level: 8,  xpRequired: 1680, title: 'Grandmaster',  color: '#e67e22' },
  { level: 9,  xpRequired: 2160, title: 'Legend',        color: '#e74c3c' },
  { level: 10, xpRequired: 2700, title: 'Transcendent', color: '#f39c12' }
];

// Local state for live ticking
let productiveSeconds = 0;
let distractingSeconds = 0;
let currentSiteCategory = 'neutral';

function getLevelInfo(totalXP) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }
  return { currentLevel, nextLevel };
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createOverlay() {
  const host = document.createElement('div');
  host.id = 'pt-overlay-host';
  host.style.cssText = 'position:fixed!important;bottom:20px!important;right:20px!important;z-index:2147483647!important;width:auto!important;height:auto!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;margin:0!important;padding:0!important;border:none!important;background:none!important;transform:none!important;';

  const shadow = host.attachShadow({ mode: 'closed' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .overlay {
        background: #f5f0e8;
        border: 1px solid #d4c9b0;
        border-radius: 5px;
        padding: 12px 16px;
        font-family: 'Times New Roman', Times, serif;
        font-size: 15px;
        color: #2c2c2c;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.14);
        cursor: default;
        user-select: none;
        transition: opacity 0.2s;
        line-height: 1.4;
      }
      .overlay:hover { opacity: 0.4; }
      .level {
        color: #fff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        flex-shrink: 0;
        transition: background 0.3s, border-color 0.3s;
      }
      .info { display: flex; flex-direction: column; gap: 3px; }
      .title { font-style: italic; font-size: 14px; transition: color 0.3s; }
      .times { display: flex; gap: 12px; font-size: 13px; }
      .time-productive { color: #2d5a3a; }
      .time-distracting { color: #8b3a3a; }
    </style>
    <div class="overlay">
      <div class="level" style="background:#808080;border:3px solid #808080;">1</div>
      <div class="info">
        <div class="title" style="color:#808080;">Newbie</div>
        <div class="times">
          <span class="time-productive">0s productive</span>
          <span class="time-distracting">0s distracting</span>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);
  return shadow;
}

let shadowRef = null;

// Figure out category of this page's domain
function detectCategory() {
  const hostname = location.hostname.replace(/^www\./, '');
  chrome.storage.local.get(['productiveSites', 'distractingSites'], (data) => {
    const productive = data.productiveSites || [];
    const distracting = data.distractingSites || [];
    for (const site of productive) {
      if (hostname === site || hostname.endsWith('.' + site)) {
        currentSiteCategory = 'productive';
        return;
      }
    }
    for (const site of distracting) {
      if (hostname === site || hostname.endsWith('.' + site)) {
        currentSiteCategory = 'distracting';
        return;
      }
    }
    currentSiteCategory = 'neutral';
  });
}

// Sync from storage — only accept values that are >= local (never jump backward)
function syncFromStorage() {
  if (!shadowRef) return;
  const dateKey = getDateKey();
  const storageKey = `day_${dateKey}`;
  chrome.storage.local.get([storageKey, 'totalXP'], (data) => {
    const totalXP = data.totalXP || 0;
    const dayData = data[storageKey] || { totalProductive: 0, totalDistracting: 0 };
    const { currentLevel } = getLevelInfo(totalXP);

    productiveSeconds = Math.max(productiveSeconds, dayData.totalProductive);
    distractingSeconds = Math.max(distractingSeconds, dayData.totalDistracting);

    const levelEl = shadowRef.querySelector('.level');
    levelEl.textContent = currentLevel.level;
    levelEl.style.background = currentLevel.color;
    levelEl.style.borderColor = currentLevel.color;

    const titleEl = shadowRef.querySelector('.title');
    titleEl.textContent = currentLevel.title;
    titleEl.style.color = currentLevel.color;

    renderTimes();
  });
}

// Render just the time displays
function renderTimes() {
  if (!shadowRef) return;
  shadowRef.querySelector('.time-productive').textContent = formatTime(productiveSeconds) + ' productive';
  shadowRef.querySelector('.time-distracting').textContent = formatTime(distractingSeconds) + ' distracting';
}

// Tick every second — only if this page actually has focus
function tick() {
  if (document.hasFocus()) {
    if (currentSiteCategory === 'productive') {
      productiveSeconds++;
    } else if (currentSiteCategory === 'distracting') {
      distractingSeconds++;
    }
    renderTimes();
  }
}

if (!document.getElementById('pt-overlay-host')) {
  shadowRef = createOverlay();
  detectCategory();
  syncFromStorage();

  // Tick the display every second
  setInterval(tick, 1000);

  // Re-sync when the page regains focus (picks up correct totals from storage)
  window.addEventListener('focus', () => syncFromStorage());

  // Re-sync from storage whenever it changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.productiveSites || changes.distractingSites) {
        detectCategory();
      }
      syncFromStorage();
    }
  });
}
