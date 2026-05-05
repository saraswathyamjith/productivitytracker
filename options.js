async function loadSites() {
  const data = await chrome.storage.local.get(['productiveSites', 'distractingSites']);
  renderList('productiveList', data.productiveSites || [], 'productiveSites');
  renderList('distractingList', data.distractingSites || [], 'distractingSites');
}

function renderList(elementId, sites, storageKey) {
  const list = document.getElementById(elementId);
  if (sites.length === 0) {
    list.innerHTML = '<li class="site-item"><span class="site-item-name" style="color:#555">No sites added</span></li>';
    return;
  }
  list.innerHTML = sites.map(site => `
    <li class="site-item">
      <span class="site-item-name">${site}</span>
      <button class="site-item-remove" data-site="${site}" data-key="${storageKey}">&times;</button>
    </li>
  `).join('');
}

function cleanDomain(input) {
  let domain = input.trim().toLowerCase();
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '');
  // Remove path
  domain = domain.split('/')[0];
  // Remove www prefix
  domain = domain.replace(/^www\./, '');
  return domain;
}

async function addSite(storageKey, inputId) {
  const input = document.getElementById(inputId);
  const domain = cleanDomain(input.value);

  if (!domain || !domain.includes('.')) {
    input.style.borderColor = '#ef4444';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
    return;
  }

  const data = await chrome.storage.local.get([storageKey]);
  const sites = data[storageKey] || [];

  if (sites.includes(domain)) {
    input.value = '';
    return;
  }

  sites.push(domain);
  await chrome.storage.local.set({ [storageKey]: sites });
  input.value = '';
  loadSites();
}

async function removeSite(storageKey, site) {
  const data = await chrome.storage.local.get([storageKey]);
  const sites = (data[storageKey] || []).filter(s => s !== site);
  await chrome.storage.local.set({ [storageKey]: sites });
  loadSites();
}

// Event listeners
document.getElementById('addProductive').addEventListener('click', () => {
  addSite('productiveSites', 'productiveInput');
});

document.getElementById('addDistracting').addEventListener('click', () => {
  addSite('distractingSites', 'distractingInput');
});

// Enter key support
document.getElementById('productiveInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addSite('productiveSites', 'productiveInput');
});

document.getElementById('distractingInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addSite('distractingSites', 'distractingInput');
});

// Remove site delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('site-item-remove')) {
    const site = e.target.dataset.site;
    const key = e.target.dataset.key;
    removeSite(key, site);
  }
});

// Reset all data
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset ALL tracking data and XP? This cannot be undone.')) {
    // Get all keys and remove day_ entries and totalXP
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter(k => k.startsWith('day_') || k === 'totalXP');
    await chrome.storage.local.remove(keysToRemove);
    await chrome.storage.local.set({ totalXP: 0 });
    alert('All tracking data has been reset.');
  }
});

// Initial load
loadSites();
