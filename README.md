# Productivity Tracker

A Chrome extension that tracks time spent on websites, categorizes them as productive or distracting, and gamifies the experience with an MMO-style XP and leveling system.

## Features

- **Automatic time tracking** — tracks active tab time per domain using tab and window focus events
- **Site categorization** — sites are classified as productive (green), distracting (red), or neutral (gray)
- **XP & leveling** — earn 1 XP per productive minute, level up through 10 tiers with MMO-style rank colors
- **Live overlay** — floating badge on every page showing your level and time ticking in real time
- **History** — browse past days' stats with day navigation in the popup
- **Customizable** — add/remove sites from productive or distracting lists via the settings page

## Leveling Tiers

| Level | Title | Color |
|-------|-------|-------|
| 1 | Newbie | Gray |
| 2 | Apprentice | Green |
| 3 | Journeyman | Blue |
| 4 | Adept | Purple |
| 5 | Expert | Gold |
| 6 | Sage | Red |
| 7 | Master | Yellow |
| 8 | Grandmaster | Orange |
| 9 | Legend | Crimson |
| 10 | Transcendent | Gold |

## Installation

1. Clone this repo
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder

## File Structure

```
├── manifest.json      # Manifest V3 config
├── background.js      # Service worker for time tracking
├── popup.html/js/css   # Dashboard popup
├── options.html/js/css # Settings page
├── overlay.js/css      # Floating live overlay (content script)
└── icons/              # Extension icons
```
