// =============================================================================
// render.js — DOM Rendering Functions
// =============================================================================
// All functions that read from window.state and write to the DOM.
// These are the "view layer" — they never mutate state, only render it.
// =============================================================================

// ---------------------------------------------------------------------------
// Top-level render coordinator
// Calls all sub-renderers. Call this after any state mutation.
// ---------------------------------------------------------------------------
window.renderStateToDashboard = function() {
    window.ensureStateSanity();
    if (window.state && window.state.chronicle) {
        window.state.chronicle = window.expandChronicleRanges(window.state.chronicle);
    }

    const cash = window.state && window.state.cash !== undefined ? formatCurrency(window.state.cash) : "0";
    const burn = window.state && window.state.burn !== undefined ? formatCurrency(window.state.burn) : "0";
    const progress = window.state && window.state.protoProgress !== undefined ? window.state.protoProgress : "0";
    const week = window.state && window.state.week !== undefined ? window.state.week : "1";

    const dashCash = document.getElementById("dash-cash");
    const dashBurn = document.getElementById("dash-burn");
    const txtProto = document.getElementById("txt-proto");
    const lblCurrentWeek = document.getElementById("lbl-current-week");

    if (dashCash) dashCash.innerText = `$${cash}`;
    if (dashBurn) dashBurn.innerText = `$${burn}`;
    if (txtProto) txtProto.innerText = `${progress}%`;
    if (lblCurrentWeek) lblCurrentWeek.innerText = `W${week}`;

    if (window.state && window.state.meta) {
        const power = document.getElementById("lbl-meta-power");
        const seg = document.getElementById("lbl-meta-seg");
        const fund = document.getElementById("lbl-meta-fund");
        const perk = document.getElementById("lbl-meta-perk");
        if (power) power.innerText = window.state.meta.powertrain || "";
        if (seg) seg.innerText = window.state.meta.segment || "";
        if (fund) fund.innerText = window.state.meta.funding || "";
        if (perk) perk.innerText = window.state.meta.perk || "";
    }

    const timelineBox = document.getElementById("timeline-container");
    if (timelineBox) {
        if (window.state && window.state.chronicle && window.state.chronicle.length > 0) {
            timelineBox.innerHTML = [...window.state.chronicle].reverse()
                .map((item) => `<li class="ledger-entry">${item}</li>`)
                .join("");
        } else {
            timelineBox.innerHTML = `<li class="ledger-entry" style="color: var(--text-muted);">No records found. Paste game turns or import data slates.</li>`;
        }
    }

    window.updateCharacterUIPanels();

    if (window.state && !window.state.network) {
        window.state.network = {};
    }
    window.renderRolodexView();
    window.renderAnalyticsView();
};

// ---------------------------------------------------------------------------
// Crew Roster (character cards + synergy bridges)
// ---------------------------------------------------------------------------
window.updateCharacterUIPanels = async function() {
    const container = document.getElementById("crew-roster-container");
    if (!container) return;

    if (!window.state || !window.state.personnel) {
        container.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted);">No crew members in state.</div>`;
        return;
    }

    const nameMap = {
        leo: "COUSIN LEO",
        lucius: "LUCIUS",
        sarah: "SARAH"
    };

    let html = "";
    for (const [key, charData] of Object.entries(window.state.personnel)) {
        if (key === "synergy") continue;
        const displayName = nameMap[key] || key.toUpperCase();

        const morale = charData.morale;
        let moraleColor = "";
        let borderStyle = "";
        let ringBorderStyle = "";

        if (morale !== undefined) {
            moraleColor = morale > 75
                ? "var(--comic-green)"
                : morale > 40
                    ? "var(--comic-amber)"
                    : "var(--comic-red)";
            borderStyle = `style="border-color: ${moraleColor};"`;
            ringBorderStyle = `style="border-color: ${moraleColor};"`;
        } else {
            ringBorderStyle = `style="border-color: var(--comic-amber);"`;
        }

        let roleText = "";
        let roleStyle = "";
        if (charData.role && morale !== undefined) {
            roleText = `${charData.role} | EFFICIENCY: ${morale}%`;
            roleStyle = `style="color: ${moraleColor};"`;
        } else if (charData.role) {
            roleText = charData.role;
        } else if (morale !== undefined) {
            roleText = `EFFICIENCY: ${morale}%`;
            roleStyle = `style="color: ${moraleColor};"`;
        }

        const statValueStyle = (key === "lucius" || morale === undefined)
            ? `style="color: var(--comic-amber);"`
            : `style="color: #fff;"`;

        // Resolve avatar: local FS for new chars, otherwise static images/
        let imgSrc = `images/${key.toLowerCase()}_avatar.png`;
        const baseChars = ["lucius", "sarah", "leo"];
        if (!baseChars.includes(key.toLowerCase()) && window.dirHandle) {
            try {
                const permitted = await window.verifyDirectoryPermission(false);
                if (permitted) {
                    const avatarsDir = await window.dirHandle.getDirectoryHandle("avatars", { create: false });
                    const fileHandle = await avatarsDir.getFileHandle(`${key.toLowerCase()}_avatar.png`, { create: false });
                    const file = await fileHandle.getFile();
                    imgSrc = URL.createObjectURL(file);
                }
            } catch (e) {
                console.debug(`Local avatar for new char ${key} not found in avatars/ directory.`);
            }
        }

        html += `
            <div class="crew-card" ${borderStyle}>
                <div class="avatar-pill-container" ${ringBorderStyle}>
                    <img
                        src="${imgSrc}"
                        alt="${displayName}"
                        onerror="this.style.display = 'none'"
                    />
                </div>
                <div class="crew-info-block">
                    <div class="crew-name">${displayName}</div>
                    <div class="crew-role" ${roleStyle}>
                        ${roleText}
                    </div>
                    <div class="stat-badge-grid">
                        <div>TECH: <span ${statValueStyle}>${charData.tech !== undefined ? charData.tech : 0}</span></div>
                        <div>CHA:  <span ${statValueStyle}>${charData.cha  !== undefined ? charData.cha  : 0}</span></div>
                        <div>LOG:  <span ${statValueStyle}>${charData.log  !== undefined ? charData.log  : 0}</span></div>
                        <div>PER:  <span ${statValueStyle}>${charData.per  !== undefined ? charData.per  : 0}</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Synergy relationship cards
    const synergyObj = window.state.personnel.synergy || {};
    for (const [synKey, synVal] of Object.entries(synergyObj)) {
        const parts = synKey.split("_and_");
        if (parts.length !== 2) continue;

        const name1 = nameMap[parts[0]] || parts[0].toUpperCase();
        const name2 = nameMap[parts[1]] || parts[1].toUpperCase();

        const val = Math.min(Math.max(parseInt(synVal, 10) || 0, -3), 3);

        let colorClass = "active-neutral";
        let label = "STANDARD ALIGNMENT";
        if (val > 0) { colorClass = "active-positive"; label = "COOPERATIVE EFFICIENCY"; }
        else if (val < 0) { colorClass = "active-negative"; label = "ACTIVE FRICTION NODE"; }

        const formattedVal = val > 0 ? `+${val}` : val;

        let cellsHtml = "";
        for (let i = -3; i <= 3; i++) {
            let fillClass = "";
            if (i === val) {
                if (val > 0) fillClass = "fill-positive";
                else if (val < 0) fillClass = "fill-negative";
                else fillClass = "fill-neutral";
            }
            cellsHtml += `<div class="synergy-block-cell ${fillClass}"></div>`;
        }

        html += `
            <div class="synergy-bridge-panel ${colorClass}">
                <div class="synergy-header">🤝 RELATIONSHIP</div>
                <div class="synergy-header" style="font-size: 11px; color: var(--text-muted); margin-top: -6px;">
                    ${name1} ✦ ${name2}
                </div>
                <div class="synergy-indicator-label ${colorClass}">
                    ${label} (${formattedVal})
                </div>
                <div class="synergy-visual-bar">
                    ${cellsHtml}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
};

// ---------------------------------------------------------------------------
// NPC Rolodex
// ---------------------------------------------------------------------------
window.renderRolodexView = async function() {
    const grid = document.getElementById("rolodex-grid-container");
    if (!grid) return;

    if (!window.state || !window.state.network || Object.keys(window.state.network).length === 0) {
        grid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px;">No secondary contacts registered in network. Submit narrative slates introducing NPCs to build database.</div>`;
        return;
    }

    let html = "";
    for (const [npcId, npc] of Object.entries(window.state.network)) {
        const name = npc.name || npcId.toUpperCase();
        const role = npc.role || "Contact";
        const status = npc.status || "Neutral";
        const notes = npc.notes || "No description files saved.";

        let statusColor = "var(--comic-amber)";
        const sl = status.toLowerCase();
        if (sl.includes("favorable") || sl.includes("friendly") || sl.includes("ally")) {
            statusColor = "var(--comic-green)";
        } else if (sl.includes("unfavorable") || sl.includes("hostile") || sl.includes("enemy")) {
            statusColor = "var(--comic-red)";
        }

        const avatarSrc = await window.getNpcAvatarSrc(npcId);
        const imgHtml = avatarSrc
            ? `<img src="${avatarSrc}" alt="${name}" />`
            : `<div class="rolodex-avatar-fallback">NO DOSSIER IMAGERY FILE</div>`;

        html += `
            <div class="rolodex-card">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;">
                    <div class="rolodex-avatar-pill" style="border-color: var(--comic-amber);">
                        ${imgHtml}
                    </div>
                    <label class="btn-utility-upload">
                        📁 UPLOAD
                        <input type="file" accept="image/*" style="display: none;" onchange="window.handleNpcAvatarUpload(event, '${npcId}')" />
                    </label>
                </div>
                <div class="crew-info-block">
                    <div class="crew-name" style="color: var(--comic-amber);">${name}</div>
                    <div class="crew-role" style="margin-bottom: 4px; color: var(--text-main); font-weight: bold; text-transform: uppercase;">${role}</div>
                    <div style="font-size: 10px; font-weight: bold; margin-bottom: 8px;">
                        STATUS: <span style="color: ${statusColor}; text-transform: uppercase;">${status}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.3; background: rgba(0,0,0,0.2); padding: 8px; border: var(--border-thin); min-height: 48px; border-color: rgba(255,255,255,0.05);">
                        ${notes}
                    </div>
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
};

// ---------------------------------------------------------------------------
// Visual Storybook
// ---------------------------------------------------------------------------
window.renderStorybookView = async function() {
    const storybookBox = document.getElementById("storybook-container");
    if (!storybookBox) return;

    if (!window.state || !window.state.chronicle || window.state.chronicle.length === 0) {
        storybookBox.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">Your storybook canvas remains completely unwritten. Submit a log slate with active graphics to generate pages.</div>`;
        return;
    }

    // Phase 1: render skeleton cards immediately (reversed — latest week first)
    const reversedChronicle = [...window.state.chronicle].reverse();
    storybookBox.innerHTML = reversedChronicle.map((logString, index) => {
        const matchPattern = logString.match(/^W(\d+(?:-W?\d+)?):/i);
        const rawWeek = matchPattern ? matchPattern[1] : null;

        let weekTagText = "LOG SEGMENT";
        if (rawWeek) {
            if (rawWeek.includes("-")) {
                weekTagText = `WEEKS ${rawWeek.replace(/W/gi, "")}`;
            } else {
                weekTagText = `WEEK ${rawWeek.length < 2 ? '0' + rawWeek : rawWeek}`;
            }
        }

        return `
            <div class="storybook-card">
                <div class="storybook-image-frame" id="storybook-img-container-${index}">
                    <div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:10px; text-align:center; color:var(--text-muted); padding:10px; font-weight:bold;">LOADING...</div>
                </div>
                <div class="storybook-content">
                    <div class="storybook-week-tag">${weekTagText}</div>
                    <p class="storybook-desc" id="storybook-desc-${index}">${logString}</p>
                </div>
            </div>
        `;
    }).join("");

    // Phase 2: load images asynchronously (use same reversed array for index consistency)
    for (let index = 0; index < reversedChronicle.length; index++) {
        const logString = reversedChronicle[index];
        const matchPattern = logString.match(/^W(\d+(?:-W?\d+)?):/i);
        const rawWeek = matchPattern ? matchPattern[1] : null;

        const imgContainer = document.getElementById(`storybook-img-container-${index}`);
        if (!imgContainer) continue;

        const isRange = rawWeek && rawWeek.includes("-");
        const parsedWeek = (rawWeek && !isRange) ? rawWeek : null;

        if (parsedWeek) {
            try {
                const imgSrc = await window.getStorybookImageSrc(parsedWeek);
                if (imgSrc) {
                    imgContainer.innerHTML = `
                        <img src="${imgSrc}" alt="Week ${parsedWeek} Vector Frame" />
                        <div class="storybook-image-overlay">🔍 VIEW FULL BLUEPRINT</div>
                    `;
                    imgContainer.onclick = () => {
                        const descText = document.getElementById(`storybook-desc-${index}`).innerText;
                        window.openLightbox(imgSrc, `WEEK ${parsedWeek} ASSEMBLY RECORD`, descText);
                    };
                    imgContainer.style.cursor = "pointer";
                    continue;
                }
            } catch (e) {
                console.error(e);
            }
            imgContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:10px; text-align:center; color:var(--text-muted); padding:10px; font-weight:bold; border-right:1px solid #1a3254;">IMAGE DECK EMPTY [W${parsedWeek}]</div>`;
            imgContainer.onclick = null;
            imgContainer.style.cursor = "default";
        } else {
            imgContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:10px; text-align:center; color:var(--text-muted); padding:10px; font-weight:bold; border-right:1px solid #1a3254; background: #0c1c2e;">HISTORICAL RECORD</div>`;
            imgContainer.onclick = null;
            imgContainer.style.cursor = "default";
        }
    }
};

// ---------------------------------------------------------------------------
// Welcome screen (campaign slot list)
// ---------------------------------------------------------------------------
window.renderWelcomeScreen = function() {
    const listContainer = document.getElementById("welcome-campaign-list");
    if (!listContainer) return;

    const list = window.getCampaignsList();
    if (list.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; padding: 15px; color: var(--text-muted); font-size: 12px; font-family: 'JetBrains Mono', monospace; border: var(--border-thin); background: rgba(0,0,0,0.1);">No saved campaigns found. Start a new timeline above!</div>`;
    } else {
        listContainer.innerHTML = list.map(campaign => {
            const dateStr = new Date(campaign.timestamp).toLocaleString();
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border: var(--border-thin); padding: 8px 12px; gap: 10px;">
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${campaign.name}</div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Saved: ${dateStr}</div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn-utility" style="padding: 4px 8px; font-size: 11px; background: var(--comic-green); color: var(--ink-black); font-weight: bold;" onclick="window.loadCampaignFromSlot('${campaign.id}')">LOAD</button>
                        <button class="btn-utility" style="padding: 4px 8px; font-size: 11px; background: var(--comic-red); color: #fff;" onclick="window.deleteCampaignFromList('${campaign.id}')">DELETE</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    const folderOption = document.getElementById("welcome-folder-option");
    if (folderOption) {
        folderOption.style.display = window.dirHandle ? "block" : "none";
    }
};

// ---------------------------------------------------------------------------
// Config tab view
// ---------------------------------------------------------------------------
window.renderConfigView = function() {
    window.updateDashboardFolderStatus();

    const statusNode = document.getElementById("dir-status-text");
    const folderNameNode = document.getElementById("dir-folder-name");
    const connectBtn = document.getElementById("btn-connect-dir");
    const manualBackupBtn = document.getElementById("btn-manual-backup");

    if (!window.showDirectoryPicker) {
        window.directoryStatus = "Unsupported";
    }

    if (window.directoryStatus === "Connected" && window.dirHandle) {
        if (statusNode) statusNode.innerHTML = `<span style="color: var(--comic-green)">CONNECTED</span>`;
        if (folderNameNode) folderNameNode.innerText = `📂 Folder: ${window.dirHandle.name}`;
        if (connectBtn) connectBtn.innerText = "🔌 DISCONNECT DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "inline-block";
    } else if (window.directoryStatus === "Re-auth Required") {
        if (statusNode) statusNode.innerHTML = `<span style="color: var(--comic-amber)">RE-AUTHORIZATION REQUIRED</span>`;
        if (folderNameNode) folderNameNode.innerText = `📂 Folder: ${window.dirHandle ? window.dirHandle.name : 'Unknown'} (Disconnected)`;
        if (connectBtn) connectBtn.innerText = "🔑 RE-AUTHORIZE DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    } else if (window.directoryStatus === "Unsupported") {
        if (statusNode) statusNode.innerHTML = `<span style="color: var(--comic-red)">UNSUPPORTED BROWSER</span>`;
        if (folderNameNode) folderNameNode.innerText = "Directory API not supported on this browser. Use Chrome, Edge, or Opera.";
        if (connectBtn) connectBtn.style.display = "none";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    } else {
        if (statusNode) statusNode.innerHTML = `<span style="color: var(--text-muted)">DISCONNECTED</span>`;
        if (folderNameNode) folderNameNode.innerText = "No directory connected. Backups and images disabled.";
        if (connectBtn) connectBtn.innerText = "📁 CONNECT LOCAL DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    }

    // Reauth banner
    const banner = document.getElementById("reauth-banner");
    const reauthFolderName = document.getElementById("reauth-folder-name");
    if (window.directoryStatus === "Re-auth Required") {
        if (banner) {
            banner.style.display = "block";
            if (reauthFolderName && window.dirHandle) {
                reauthFolderName.innerText = window.dirHandle.name;
            }
        }
    } else {
        if (banner) banner.style.display = "none";
    }

    // Asset tracker table
    const trackerBody = document.getElementById("asset-tracker-body");
    if (!trackerBody) return;

    if (!window.state || !window.state.chronicle || window.state.chronicle.length === 0) {
        trackerBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No chronicle entries yet. Sync a delta slate to track assets.</td></tr>`;
        return;
    }

    trackerBody.innerHTML = window.state.chronicle.map((logString) => {
        const matchPattern = logString.match(/^W(\d+):/i);
        const parsedWeek = matchPattern ? matchPattern[1] : null;
        if (!parsedWeek) return "";

        const expectedName = `storybook_week_${parsedWeek}.png`;
        const isTrackedInJson = window.state.storybook_images && window.state.storybook_images[parsedWeek] ? "Tracked" : "Not Tracked";
        const isTrackedColor = isTrackedInJson === "Tracked" ? "var(--comic-green)" : "var(--text-muted)";

        let localStatus = "Disconnected";
        let localColor = "var(--text-muted)";
        if (window.dirHandle) {
            const exists = window.localFilesMap[parsedWeek];
            localStatus = exists ? "Found in Folder" : "Not Found";
            localColor = exists ? "var(--comic-green)" : "var(--comic-red)";
        } else if (!window.showDirectoryPicker) {
            localStatus = "Unsupported";
            localColor = "var(--comic-red)";
        }

        return `
            <tr>
                <td style="font-weight: bold; color: var(--comic-amber)">Week ${parsedWeek}</td>
                <td style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">storybook/${expectedName}</td>
                <td style="color: ${isTrackedColor}; font-weight: bold;">${isTrackedInJson}</td>
                <td style="color: ${localColor}; font-weight: bold;">${localStatus}</td>
                <td>
                    <button class="btn-utility" style="padding: 4px 8px; font-size: 11px; margin: 0 auto; display: block;" onclick="window.bindAssetForWeek(${parsedWeek})">
                        📁 UPLOAD & BIND
                    </button>
                </td>
            </tr>
        `;
    }).join("");
};
