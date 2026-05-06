const LEVELS = [
  { level: 1,  xpRequired: 0,    title: 'Newbie',       color: '#808080', bg: '#808080' },
  { level: 2,  xpRequired: 60,   title: 'Apprentice',   color: '#4a7c59', bg: '#4a7c59' },
  { level: 3,  xpRequired: 180,  title: 'Journeyman',   color: '#2e86c1', bg: '#2e86c1' },
  { level: 4,  xpRequired: 360,  title: 'Adept',        color: '#7d3c98', bg: '#7d3c98' },
  { level: 5,  xpRequired: 600,  title: 'Expert',       color: '#b9770e', bg: '#b9770e' },
  { level: 6,  xpRequired: 900,  title: 'Sage',         color: '#c0392b', bg: '#c0392b' },
  { level: 7,  xpRequired: 1260, title: 'Master',       color: '#d4ac0d', bg: '#d4ac0d' },
  { level: 8,  xpRequired: 1680, title: 'Grandmaster',  color: '#e67e22', bg: '#e67e22' },
  { level: 9,  xpRequired: 2160, title: 'Legend',        color: '#e74c3c', bg: '#e74c3c' },
  { level: 10, xpRequired: 2700, title: 'Transcendent', color: '#f39c12', bg: '#f39c12' }
];

// Day offset from today (0 = today, -1 = yesterday, etc.)
let dayOffset = 0;

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
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function getDateForOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(offset) {
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

async function getSiteCategory(domain) {
  const data = await chrome.storage.local.get(['productiveSites', 'distractingSites']);
  const productive = data.productiveSites || [];
  const distracting = data.distractingSites || [];

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

async function loadData(offset) {
  const dateKey = getDateForOffset(offset);
  const storageKey = `day_${dateKey}`;
  const data = await chrome.storage.local.get([storageKey, 'totalXP']);

  const dayData = data[storageKey] || {
    domains: {},
    totalProductive: 0,
    totalDistracting: 0,
    xpEarned: 0
  };
  const totalXP = data.totalXP || 0;

  return { dayData, totalXP };
}

async function render() {
  const { dayData, totalXP } = await loadData(dayOffset);
  const { currentLevel, nextLevel } = getLevelInfo(totalXP);

  // Update level display with tier color
  const badge = document.getElementById('levelBadge');
  badge.textContent = currentLevel.level;
  badge.style.background = currentLevel.bg;
  badge.style.borderColor = currentLevel.color;

  const title = document.getElementById('levelTitle');
  title.textContent = currentLevel.title;
  title.style.color = currentLevel.color;

  document.getElementById('levelNumber').textContent = `Level ${currentLevel.level}`;

  // Update XP bar with tier color
  const xpBar = document.getElementById('xpBar');
  const xpText = document.getElementById('xpText');
  xpBar.style.background = currentLevel.color;

  if (nextLevel) {
    const xpInLevel = totalXP - currentLevel.xpRequired;
    const xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
    const percentage = Math.min((xpInLevel / xpNeeded) * 100, 100);
    xpBar.style.width = `${percentage}%`;
    xpText.textContent = `${Math.floor(totalXP)} / ${nextLevel.xpRequired} XP`;
  } else {
    xpBar.style.width = '100%';
    xpText.textContent = `${Math.floor(totalXP)} XP — MAX LEVEL!`;
  }

  // Update day label and nav buttons
  document.getElementById('dayLabel').textContent = formatDayLabel(dayOffset);
  document.getElementById('nextDay').disabled = (dayOffset >= 0);

  // Update stats
  document.getElementById('productiveTime').textContent = formatTime(dayData.totalProductive);
  document.getElementById('distractingTime').textContent = formatTime(dayData.totalDistracting);
  document.getElementById('xpToday').textContent = `+${Math.floor(dayData.xpEarned)}`;

  // Update sites list
  const sitesList = document.getElementById('sitesList');
  const domains = Object.entries(dayData.domains);

  if (domains.length === 0) {
    sitesList.innerHTML = '<div class="empty-state">No activity tracked for this day.</div>';
    return;
  }

  // Sort by time descending
  domains.sort((a, b) => b[1] - a[1]);
  const maxTime = domains[0][1];

  // Show top 8 sites
  const topDomains = domains.slice(0, 8);
  const categorizedDomains = await Promise.all(
    topDomains.map(async ([domain, time]) => {
      const category = await getSiteCategory(domain);
      return { domain, time, category };
    })
  );

  sitesList.innerHTML = categorizedDomains.map(({ domain, time, category }) => {
    const barWidth = Math.max((time / maxTime) * 100, 5);
    return `
      <div class="site-item">
        <div class="site-dot ${category}"></div>
        <div class="site-name">${domain}</div>
        <div class="site-bar-container">
          <div class="site-bar ${category}" style="width: ${barWidth}%"></div>
        </div>
        <div class="site-time">${formatTime(time)}</div>
      </div>
    `;
  }).join('');
}

// Day navigation
document.getElementById('prevDay').addEventListener('click', () => {
  dayOffset--;
  render();
});

document.getElementById('nextDay').addEventListener('click', () => {
  if (dayOffset < 0) {
    dayOffset++;
    render();
  }
});

// Open options page
document.getElementById('optionsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Initial render
render();
