# 🏭 APEX BLUEPRINT // WORKSHOP TERMINAL v8.5

A strategic control panel interface for the PbtA (Powered by the Apocalypse) simulation game APEX BLUEPRINT.

## Project Structure

This project has been modularized to separate concern logic, stylesheet configuration, and asset management:

```
├── css/
│   └── styles.css          # Core visual theme stylesheet (Indie Cyberpunk Novel aesthetic)
├── js/
│   ├── prompts.js          # Tabletop RPG GM system rules prompt and templates
│   └── app.js              # Application state, event hooks, and DOM controllers
├── images/
│   ├── leo_avatar.png      # Crew avatar assets
│   ├── lucius_avatar.png   
│   └── sarah_avatar.png    
├── index.html              # Main terminal template
└── README.md               # Project documentation
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
