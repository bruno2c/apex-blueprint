# 🏭 APEX BLUEPRINT // WORKSHOP TERMINAL v8.5

A strategic control panel interface for the PbtA (Powered by the Apocalypse) simulation game APEX BLUEPRINT.

## Project Structure

This project is organized into focused modules — each file has a single clear responsibility:

```
├── css/
│   └── styles.css              # Core visual theme (Indie Cyberpunk Graphic Novel aesthetic)
├── js/
│   ├── prompts.js              # GM system rules prompt loader & template engine
│   ├── state.js                # Game state, localStorage persistence, sanity helpers
│   ├── ui.js                   # UI primitives: toast, tab routing, lightbox, stat counters
│   ├── charts.js               # SVG analytics chart generation
│   ├── crop.js                 # Avatar image crop tool (self-contained)
│   ├── directory.js            # File System Access API & IndexedDB handle persistence
│   ├── render.js               # All DOM rendering functions (dashboard, crew, rolodex, etc.)
│   ├── sync.js                 # Delta sync, JSON export & import
│   ├── campaign.js             # Campaign lifecycle, prompt compilation, app state machine
│   └── init.js                 # DOMContentLoaded bootstrap
├── images/
│   ├── leo_avatar.png          # Crew avatar assets
│   ├── lucius_avatar.png
│   └── sarah_avatar.png
├── prompts/
│   ├── system_rules.md         # PbtA GM system rules (loaded via HTTP; fallback inline)
│   ├── dynamic_template.md     # Session state payload template
│   └── char_img_creation.md   # Character image generation prompt reference
├── index.html                  # Main terminal template
├── WIKI.md                     # Gameplay manual & mechanics reference
└── README.md                   # Project documentation
```

## Running the Application

To load the terminal locally:

### Option 1: Double Click `index.html`
You can open `index.html` directly in your browser. (Note: Importing/exporting data saves localslates using browser `localStorage` works fine, but standard ES6 imports are avoided to ensure compatibility with direct `file://` protocol loads).

### Option 2: Run a Local HTTP Server
For full web feature compliance, run a lightweight HTTP server in the root of this project:

```bash
# Using python (standard on most systems)
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000
```
Then visit `http://localhost:8000` in your web browser.

---

## 🚀 Recent Core Feature Updates

1. **Global Campaign Objectives**: Added support for dynamic session milestones and campaign targets (e.g. Low-Volume Monocoque integration runs). Standardized data formats track active goals, metrics, and narrative bottlenecks reactively, syncing with the ledger and auto-saves.
2. **Extensible Facility State Architecture**: Moved away from hardcoded facility properties to an extensible, open-ended array structure. Standardized facility entries to include a `rule_modifier` block that defines exact mechanics (such as negative or positive modifiers to attribute checks like `TECH` or `LOG` under specific trigger conditions).
3. **Reactive Visual Prompt Compiler**: Integrated a live prompt generator into the **Config & Assets** tab that references active equipment, bays, and structural drawbacks, compiling an optimized isometric layout prompt for local image generators.
4. **Workshop Monitor Blueprint Carousel**: Created a visual blueprint display directly in the workshop monitor to track facility layout evolution. The system supports full file sync (using naming rules like `facility/facility_week_{week}.png`) and a historical scroll wheel.
5. **Separated Financial Charts**: Split the combined Capital/Burn charts on the Analytics tab into two independent, auto-scaling SVGs (💵 Capital Trend and 🔥 Burn Trend) with a dashed representation for burn rate, improving data readability across massive scaling steps.
