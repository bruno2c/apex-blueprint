// Initialize global configuration hooks safely up-front
window.state = {
    week: 1,
    cash: 120000,
    burn: 8000,
    protoProgress: 0,
    meta: {
        powertrain: "EV",
        segment: "Track Weapon",
        funding: "Bootstrapped",
        perk: "Corporate Dropout",
    },
    network: {},
    facility_modifiers: {
        flaw: "Drafty Roof",
        active_penalties: [],
    },
    personnel: {
        lucius: {
            role: "ARCHITECT",
            tech: 2,
            cha: 2,
            log: 2,
            per: 2,
        },
        sarah: { morale: 100, tech: 4, cha: 1, log: 2, per: 4 },
        leo: { morale: 100, tech: 2, cha: 3, log: 3, per: 1 },
    },
    storybook_images: {},
    chronicle: [],
};
window.stats = { tech: 2, cha: 2, log: 2, per: 2 };
window.pointPool = 4;

// Directory API local states
window.dirHandle = null;
window.directoryName = "";
window.directoryStatus = "Disconnected"; // "Disconnected", "Connected", "Re-auth Required", "Unsupported"
window.localFilesMap = {}; // mapping of week -> Boolean (exists)

// Simple IndexedDB Directory Handle Persistence Storage
async function saveDirHandle(handle) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ApexBlueprintDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("handles")) {
                db.createObjectStore("handles");
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("handles", "readwrite");
            const store = tx.objectStore("handles");
            store.put(handle, "dirHandle");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
    });
}

async function loadDirHandle() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ApexBlueprintDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("handles")) {
                db.createObjectStore("handles");
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("handles", "readonly");
            const store = tx.objectStore("handles");
            const getReq = store.get("dirHandle");
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => reject(getReq.error);
        };
        request.onerror = () => resolve(null);
    });
}

// Bind explicitly into the window environment to prevent uninitialized execution crashes
window.switchTab = function(tabId) {
    document
        .querySelectorAll(".tab-content")
        .forEach((el) => el.classList.remove("active"));
    document
        .querySelectorAll(".tab-btn")
        .forEach((el) => el.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    
    const targetTabBtn = Array.from(document.querySelectorAll(".tab-btn")).find(
        (btn) => {
            const clickAttr = btn.getAttribute("onclick");
            return clickAttr && clickAttr.includes(tabId);
        }
    );
    if (targetTabBtn) {
        targetTabBtn.classList.add("active");
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add("active");
    }
};

window.triggerToast = function(title, message) {
    document.getElementById("toast-title").innerText = title;
    document.getElementById("toast-msg").innerText = message;
    const box = document.getElementById("toast-layer");
    box.classList.add("active");
    setTimeout(() => box.classList.remove("active"), 4000);
};

window.adjustStat = function(stat, delta) {
    if (delta > 0 && window.pointPool > 0 && window.stats[stat] < 5) {
        window.stats[stat]++;
        window.pointPool--;
    } else if (delta < 0 && window.stats[stat] > 1) {
        window.stats[stat]--;
        window.pointPool++;
    }
    document.getElementById(`v-${stat}`).innerText = window.stats[stat];
    document.getElementById("pool-display").innerText = window.pointPool;
};

function formatCurrency(val) {
    if (val === undefined || val === null) return "0";
    if (typeof val === 'string' && (val.includes(',') || val.includes('$'))) {
        return val.replace('$', '').trim();
    }
    const num = Number(val);
    if (isNaN(num)) {
        return String(val).replace('$', '').trim();
    }
    return num.toLocaleString();
}

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
        const displayName = nameMap[key] || key.toUpperCase();
        
        // Morale status and colors
        const morale = charData.morale;
        let moraleColor = "";
        let borderStyle = "";
        let ringBorderStyle = "";
        
        if (morale !== undefined) {
            moraleColor =
                morale > 75
                    ? "var(--comic-green)"
                    : morale > 40
                      ? "var(--comic-amber)"
                      : "var(--comic-red)";
            borderStyle = `style="border-color: ${moraleColor};"`;
            ringBorderStyle = `style="border-color: ${moraleColor};"`;
        } else {
            // For characters without morale (e.g. lucius by default, or others)
            ringBorderStyle = `style="border-color: var(--comic-amber);"`;
        }

        // Role & Morale text
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

        // Stats coloring: lucius (or any character without morale) uses var(--comic-amber) for stat values
        const statValueStyle = key === "lucius" || morale === undefined ? `style="color: var(--comic-amber);"` : `style="color: #fff;"`;

        // Image source matching pattern: images/[key]_avatar.png
        let imgSrc = `images/${key.toLowerCase()}_avatar.png`;

        // If it's a new character (not lucius, sarah, or leo) and folder is connected, load from avatars/ folder
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
                        <div>
                            TECH:
                            <span ${statValueStyle}>${charData.tech !== undefined ? charData.tech : 0}</span>
                        </div>
                        <div>
                            CHA:
                            <span ${statValueStyle}>${charData.cha !== undefined ? charData.cha : 0}</span>
                        </div>
                        <div>
                            LOG:
                            <span ${statValueStyle}>${charData.log !== undefined ? charData.log : 0}</span>
                        </div>
                        <div>
                            PER:
                            <span ${statValueStyle}>${charData.per !== undefined ? charData.per : 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
};

window.expandChronicleRanges = function(chronicle) {
    if (!chronicle) return [];
    const expanded = [];
    for (const entry of chronicle) {
        const rangeMatch = entry.match(/^W(\d+)-W?(\d+):(.*)$/i);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            const content = rangeMatch[3];
            for (let w = start; w <= end; w++) {
                expanded.push(`W${w}:${content}`);
            }
        } else {
            expanded.push(entry);
        }
    }
    return expanded;
};

window.renderStateToDashboard = function() {
    if (window.state && window.state.chronicle) {
        window.state.chronicle = window.expandChronicleRanges(window.state.chronicle);
    }
    const cash = window.state.cash !== undefined ? formatCurrency(window.state.cash) : "0";
    const burn = window.state.burn !== undefined ? formatCurrency(window.state.burn) : "0";
    const progress = window.state.protoProgress !== undefined ? window.state.protoProgress : "0";
    const week = window.state.week !== undefined ? window.state.week : "1";

    const dashCash = document.getElementById("dash-cash");
    const dashBurn = document.getElementById("dash-burn");
    const txtProto = document.getElementById("txt-proto");
    const lblCurrentWeek = document.getElementById("lbl-current-week");
    
    if (dashCash) dashCash.innerText = `$${cash}`;
    if (dashBurn) dashBurn.innerText = `$${burn}`;
    if (txtProto) txtProto.innerText = `${progress}%`;
    if (lblCurrentWeek) lblCurrentWeek.innerText = `W${week}`;

    if (window.state.meta) {
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
        if (window.state.chronicle && window.state.chronicle.length > 0) {
            timelineBox.innerHTML = window.state.chronicle
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
};

// =================== NPC ROLODEX & AVATAR CROP UTILITIES ===================
window.activeCropNpcId = null;
window.cropPanX = 0;
window.cropPanY = 0;
window.cropZoom = 1;
window.isDraggingCropImg = false;
window.dragStartX = 0;
window.dragStartY = 0;

window.getNpcAvatarSrc = async function(npcId) {
    if (window.dirHandle) {
        try {
            const permitted = await window.verifyDirectoryPermission(false);
            if (permitted) {
                const avatarsDir = await window.dirHandle.getDirectoryHandle("avatars", { create: false });
                const fileHandle = await avatarsDir.getFileHandle(`${npcId}_avatar.png`, { create: false });
                const file = await fileHandle.getFile();
                return URL.createObjectURL(file);
            }
        } catch (e) {
            console.debug(`Local avatar file avatars/${npcId}_avatar.png not found.`);
        }
    }
    if (window.state.network && window.state.network[npcId] && window.state.network[npcId].avatar) {
        return window.state.network[npcId].avatar;
    }
    return null;
};

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
        if (status.toLowerCase().includes("favorable") || status.toLowerCase().includes("friendly") || status.toLowerCase().includes("ally")) {
            statusColor = "var(--comic-green)";
        } else if (status.toLowerCase().includes("unfavorable") || status.toLowerCase().includes("hostile") || status.toLowerCase().includes("enemy")) {
            statusColor = "var(--comic-red)";
        }

        const avatarSrc = await window.getNpcAvatarSrc(npcId);

        let imgHtml = "";
        if (avatarSrc) {
            imgHtml = `<img src="${avatarSrc}" alt="${name}" />`;
        } else {
            imgHtml = `<div class="rolodex-avatar-fallback">NO DOSSIER IMAGERY FILE</div>`;
        }

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

window.handleNpcAvatarUpload = function(event, npcId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        window.openCropModal(e.target.result, npcId);
        event.target.value = "";
    };
    reader.readAsDataURL(file);
};

window.openCropModal = function(imageSrc, npcId) {
    window.activeCropNpcId = npcId;
    window.cropPanX = 0;
    window.cropPanY = 0;
    window.cropZoom = 1;
    
    const modal = document.getElementById("crop-modal");
    const imgNode = document.getElementById("crop-img-node");
    const slider = document.getElementById("crop-zoom-slider");
    
    if (imgNode) {
        imgNode.src = imageSrc;
        imgNode.style.display = "block";
        imgNode.style.transform = `translate(0px, 0px) scale(1)`;
    }
    if (slider) {
        slider.value = 1;
    }
    if (modal) {
        modal.classList.add("active");
    }
};

window.cancelAvatarCrop = function() {
    const modal = document.getElementById("crop-modal");
    if (modal) modal.classList.remove("active");
    window.activeCropNpcId = null;
};

window.applyAvatarCrop = function() {
    const npcId = window.activeCropNpcId;
    if (!npcId) return;

    const imgNode = document.getElementById("crop-img-node");
    if (!imgNode || !imgNode.src) return;

    const canvas = document.createElement("canvas");
    canvas.width = 168;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#102a43";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const zoom = window.cropZoom;
    const dx = window.cropPanX - 56;
    const dy = window.cropPanY - 55;

    ctx.drawImage(
        imgNode,
        dx,
        dy,
        imgNode.naturalWidth * zoom,
        imgNode.naturalHeight * zoom
    );

    const base64Data = canvas.toDataURL("image/png");
    
    if (!window.state.network) window.state.network = {};
    if (!window.state.network[npcId]) window.state.network[npcId] = {};
    window.state.network[npcId].avatar = base64Data;
    
    window.saveState();
    window.renderRolodexView();
    window.triggerToast("📁 DOSSIER UPDATED", "Aligned dossier photo saved for contact.");

    canvas.toBlob(async (blob) => {
        if (blob && window.dirHandle) {
            try {
                const avatarsDir = await window.dirHandle.getDirectoryHandle("avatars", { create: true });
                const fileHandle = await avatarsDir.getFileHandle(`${npcId}_avatar.png`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log(`Binary avatar file saved locally under avatars/${npcId}_avatar.png`);
            } catch (err) {
                console.error("Local file system directory save failed:", err);
            }
        }
    }, "image/png");

    window.cancelAvatarCrop();
};

window.getStorybookImageSrc = async function(week) {
    if (window.dirHandle) {
        try {
            const permitted = await window.verifyDirectoryPermission(false);
            if (permitted) {
                const storybookDirHandle = await window.dirHandle.getDirectoryHandle("storybook", { create: true });
                const fileName = `storybook_week_${week}.png`;
                const fileHandle = await storybookDirHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                return URL.createObjectURL(file);
            }
        } catch (e) {
            console.debug(`Image storybook_week_${week}.png not found in storybook/ directory.`);
        }
    }
    return null;
};

window.openLightbox = function(imgSrc, title, desc) {
    const modal = document.getElementById("blueprint-lightbox-modal");
    const img = document.getElementById("lightbox-img-node");
    const titleNode = document.getElementById("lightbox-title-node");
    const descNode = document.getElementById("lightbox-desc-node");

    if (modal && img && titleNode && descNode) {
        img.src = imgSrc;
        titleNode.innerText = title;
        descNode.innerText = desc;
        modal.classList.add("active");
    }
};

window.closeLightbox = function() {
    const modal = document.getElementById("blueprint-lightbox-modal");
    const img = document.getElementById("lightbox-img-node");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            if (img && !modal.classList.contains("active")) {
                img.src = "";
            }
        }, 300);
    }
};

window.renderStorybookView = async function() {
    const storybookBox = document.getElementById("storybook-container");
    
    if (!window.state.chronicle || window.state.chronicle.length === 0) {
        storybookBox.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">Your storybook canvas remains completely unwritten. Submit a log slate with active graphics to generate pages.</div>`;
        return;
    }

    // Build the container skeletons first to prevent lag
    storybookBox.innerHTML = window.state.chronicle.map((logString, index) => {
        const matchPattern = logString.match(/^W(\d+(?:-W?\d+)?):/i);
        const rawWeek = matchPattern ? matchPattern[1] : null;
        
        let weekTagText = "LOG SEGMENT";
        if (rawWeek) {
            if (rawWeek.includes("-")) {
                const rangeStr = rawWeek.replace(/W/gi, "");
                weekTagText = `WEEKS ${rangeStr}`;
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

    // Load directory/external images asynchronously
    for (let index = 0; index < window.state.chronicle.length; index++) {
        const logString = window.state.chronicle[index];
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
            // For ranges or general text segments, display a historical summary placeholder
            imgContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:10px; text-align:center; color:var(--text-muted); padding:10px; font-weight:bold; border-right:1px solid #1a3254; background: #0c1c2e;">HISTORICAL RECORD</div>`;
            imgContainer.onclick = null;
            imgContainer.style.cursor = "default";
        }
    }
};

window.autosaveBackupToLocalDirectory = async function() {
    if (!window.dirHandle) return;
    try {
        const permitted = await window.verifyDirectoryPermission(true);
        if (!permitted) {
            console.warn("Autosave skipped: directory write permissions not authorized.");
            return;
        }

        const serialized = JSON.stringify(window.state, null, 2);
        
        // Create/Get "backups" directory handle
        const backupsDirHandle = await window.dirHandle.getDirectoryHandle("backups", { create: true });
        
        // 1. Write rolling campaign_state.json
        const rootSaveHandle = await backupsDirHandle.getFileHandle("campaign_state.json", { create: true });
        const writableRoot = await rootSaveHandle.createWritable();
        await writableRoot.write(serialized);
        await writableRoot.close();

        // 2. Write archive save_week_{N}.json
        const archiveName = `save_week_${window.state.week}.json`;
        const archiveSaveHandle = await backupsDirHandle.getFileHandle(archiveName, { create: true });
        const writableArchive = await archiveSaveHandle.createWritable();
        await writableArchive.write(serialized);
        await writableArchive.close();

        console.log("Autosave backing files generated successfully.");
        window.triggerToast("💾 BACKUP SECURED", `Autosaved campaign_state.json & save_week_${window.state.week}.json to backups/ folder.`);
    } catch (e) {
        console.error("Autosave backup failed:", e);
        window.triggerToast("🚨 AUTOSAVE FAILED", "Could not write save files to backups/ directory.");
    }
};

window.triggerManualBackup = async function() {
    if (!window.dirHandle) {
        window.triggerToast("⚠️ DIRECTORY DISCONNECTED", "Connect a local folder in the CONFIG tab to save backups.");
        return;
    }
    try {
        const permitted = await window.verifyDirectoryPermission(true);
        if (permitted) {
            await window.autosaveBackupToLocalDirectory();
        } else {
            window.triggerToast("🚨 PERMISSION DENIED", "Write permission denied for directory.");
        }
    } catch (e) {
        console.error("Manual backup failed:", e);
        window.triggerToast("🚨 BACKUP FAILED", "Could not complete backup.");
    }
};

window.syncDelta = function() {
    try {
        const deltaInputNode = document.getElementById("delta-input");
        if (!deltaInputNode) {
            console.error("delta-input element not found in DOM.");
            return;
        }

        let raw = deltaInputNode.value || "";
        
        // Strip markdown code fences if present
        raw = raw.trim();
        raw = raw.replace(/^```json\s*/i, "");
        raw = raw.replace(/^```\s*/, "");
        raw = raw.replace(/\s*```$/, "");
        raw = raw.trim();

        const delta = JSON.parse(raw);

        if (!window.state) {
            window.state = {
                campaignId: Date.now().toString(),
                week: 1,
                cash: 120000,
                burn: 8000,
                protoProgress: 0,
                meta: {
                    powertrain: "EV",
                    segment: "Track Weapon",
                    funding: "Bootstrapped",
                    perk: "Corporate Dropout"
                },
                network: {},
                facility_modifiers: {
                    flaw: "Drafty Roof",
                    active_penalties: []
                },
                personnel: {
                    lucius: { role: "ARCHITECT", tech: 2, cha: 2, log: 2, per: 2 },
                    sarah: { morale: 100, tech: 4, cha: 1, log: 2, per: 4 },
                    leo: { morale: 100, tech: 2, cha: 3, log: 3, per: 1 }
                },
                storybook_images: {},
                chronicle: []
            };
            window.setAppState("game");
        } else if (!window.state.campaignId) {
            window.state.campaignId = Date.now().toString();
        }

        if (!window.state.campaignName || delta.meta || delta.week !== undefined) {
            const pt = (delta.meta && delta.meta.powertrain) || (window.state.meta && window.state.meta.powertrain) || "EV";
            const sg = (delta.meta && delta.meta.segment) || (window.state.meta && window.state.meta.segment) || "Track Weapon";
            const wk = delta.week !== undefined ? delta.week : (window.state.week || 1);
            window.state.campaignName = `Campaign: ${pt} ${sg} (W${wk})`;
        }

        if (delta.week !== undefined) window.state.week = delta.week;
        if (delta.cash !== undefined) window.state.cash = delta.cash;
        if (delta.burn !== undefined) window.state.burn = delta.burn;
        if (delta.protoProgress !== undefined) window.state.protoProgress = delta.protoProgress;
        if (delta.meta) window.state.meta = { ...(window.state.meta || {}), ...delta.meta };
        if (delta.facility_modifiers) window.state.facility_modifiers = { ...(window.state.facility_modifiers || {}), ...delta.facility_modifiers };
        if (delta.chronicle !== undefined) {
            const chkOverwrite = document.getElementById("chk-overwrite-chronicle");
            const shouldOverwrite = chkOverwrite ? chkOverwrite.checked : false;
            
            if (shouldOverwrite) {
                window.state.chronicle = delta.chronicle;
            } else {
                if (!window.state.chronicle) window.state.chronicle = [];
                const existing = new Set(window.state.chronicle);
                for (const entry of delta.chronicle) {
                    if (!existing.has(entry)) {
                        window.state.chronicle.push(entry);
                    }
                }
            }
        }
        if (delta.storybook_images !== undefined) window.state.storybook_images = delta.storybook_images;

        if (!window.state.personnel) window.state.personnel = {};
        if (delta.personnel) {
            for (const [key, val] of Object.entries(delta.personnel)) {
                window.state.personnel[key] = { ...(window.state.personnel[key] || {}), ...val };
            }
        }

        if (!window.state.network) window.state.network = {};
        if (delta.network) {
            for (const [key, val] of Object.entries(delta.network)) {
                window.state.network[key] = { ...(window.state.network[key] || {}), ...val };
            }
        }

        if (!window.state.storybook_images) {
            window.state.storybook_images = {};
        }

        const imgInput = document.getElementById("scenario-img-input");
        const imgNode = imgInput ? imgInput.files[0] : null;
        if (imgNode) {
            if (window.dirHandle) {
                const weekNum = window.state.week;
                window.verifyDirectoryPermission(true).then(async (permitted) => {
                    if (permitted) {
                        try {
                            const storybookDirHandle = await window.dirHandle.getDirectoryHandle("storybook", { create: true });
                            const fileName = `storybook_week_${weekNum}.png`;
                            const fileHandle = await storybookDirHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(imgNode);
                            await writable.close();

                            window.state.storybook_images[weekNum] = fileName;
                            window.saveState();
                            
                            await window.scanLocalDirectoryFiles();
                            window.renderStateToDashboard();
                            window.renderStorybookView();
                            window.renderConfigView();
                            
                            if (imgInput) imgInput.value = "";
                            
                            window.triggerToast(
                                "⚡ LOGS & IMAGES MOUNTED",
                                `MATRIX SYNCED // GRAPHICS WRITTEN TO local storybook/ AT WEEK ${weekNum}.`
                            );
                            
                            await window.autosaveBackupToLocalDirectory();
                        } catch (err) {
                            console.error("Error writing uploaded file to folder:", err);
                            window.triggerToast("🚨 WRITE FAILED", "Could not save uploaded scene artwork to local folder.");
                        }
                    } else {
                        window.triggerToast("🚨 PERMISSION DENIED", "Write permission denied for local directory.");
                    }
                });
                return; // Early return to handle async file writes cleanly
            } else {
                window.triggerToast(
                    "⚠️ DIRECTORY DISCONNECTED",
                    "A picture was attached but no folder is connected. Connect folder in CONFIG tab."
                );
                if (imgInput) imgInput.value = "";
            }
        }

        window.saveState();
        window.renderStateToDashboard();
        window.renderStorybookView();
        window.renderConfigView();
        window.triggerToast(
            "⚡ DEEP LINK SECURED",
            `MATRIX SYNCED // ALL ENVIRO-MODIFIERS LOCKED AT WEEK ${window.state.week}.`
        );
        
        window.autosaveBackupToLocalDirectory();
        if (deltaInputNode) deltaInputNode.value = "";
    } catch (e) {
        console.error("syncDelta parsing error:", e);
        window.triggerToast(
            "🚨 PARSE EXCEPTION",
            "DEEP MATRIX DATA BLOCKS FAULTY. INSURE RAW PAYLOAD IS CLEAN VALID JSON."
        );
    }
};

window.exportDataSlateJson = function() {
    try {
        const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.state, null, 2));
        const dlAnchorNode = document.createElement("a");
        dlAnchorNode.setAttribute("href", dataString);
        dlAnchorNode.setAttribute("download", `apex_blueprint_week_${window.state.week}_save.json`);
        document.body.appendChild(dlAnchorNode);
        dlAnchorNode.click();
        dlAnchorNode.remove();
        window.triggerToast("💾 DATA SLATE EXPORTED", `Save file downloaded cleanly for Week ${window.state.week}.`);
    } catch (e) {
        window.triggerToast("🚨 EXPORT FAULT", "System blocked file formatting anchor.");
    }
};

window.importDataSlateJson = function(event) {
    const fileNode = event.target.files[0];
    if (!fileNode) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const loadedState = JSON.parse(e.target.result);
            if (loadedState.cash === undefined || loadedState.chronicle === undefined) {
                window.triggerToast("🚨 DATA REJECTION", "Save file missing required core structural properties keys.");
                return;
            }
            window.state = loadedState;
            if (!window.state.storybook_images) {
                window.state.storybook_images = {};
            }
            localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
            
            window.scanLocalDirectoryFiles().then(() => {
                window.renderStateToDashboard();
                window.renderStorybookView();
                window.renderConfigView();
                window.triggerToast("📁 DATA SLATE MOUNTED", `Loaded campaign successfully from backup slot at Week ${window.state.week}.`);
            });
        } catch (err) {
            window.triggerToast("🚨 UNREADABLE SLATE", "JSON string format invalid or scrambled file stream blocks.");
        }
    };
    reader.readAsText(fileNode);
    if (event && event.target) {
        event.target.value = "";
    }
};

window.saveState = function() {
    if (!window.state) return;
    localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
    if (window.state.campaignId) {
        window.saveCampaignToList(window.state);
    }
};

window.getCampaignsList = function() {
    const listJson = localStorage.getItem("apex_blueprint_campaign_list");
    if (!listJson) return [];
    try {
        return JSON.parse(listJson);
    } catch (e) {
        return [];
    }
};

window.saveCampaignToList = function(stateObj) {
    if (!stateObj || !stateObj.campaignId) return;
    let list = window.getCampaignsList();
    
    const powertrain = stateObj.meta ? stateObj.meta.powertrain : "EV";
    const segment = stateObj.meta ? stateObj.meta.segment : "Track Weapon";
    const week = stateObj.week || 1;
    const name = stateObj.campaignName || `Campaign: ${powertrain} ${segment} (W${week})`;
    
    const existingIndex = list.findIndex(c => c.id === stateObj.campaignId);
    const campaignEntry = {
        id: stateObj.campaignId,
        name: name,
        timestamp: Date.now(),
        state: stateObj
    };
    
    if (existingIndex !== -1) {
        list[existingIndex] = campaignEntry;
    } else {
        list.push(campaignEntry);
    }
    
    localStorage.setItem("apex_blueprint_campaign_list", JSON.stringify(list));
};

window.deleteCampaignFromList = function(campaignId) {
    let list = window.getCampaignsList();
    list = list.filter(c => c.id !== campaignId);
    localStorage.setItem("apex_blueprint_campaign_list", JSON.stringify(list));
    
    if (window.state && window.state.campaignId === campaignId) {
        window.state = null;
        localStorage.removeItem("linc_motors_save_slate");
    }
    
    window.renderWelcomeScreen();
};

window.loadCampaignFromSlot = function(campaignId) {
    const list = window.getCampaignsList();
    const campaign = list.find(c => c.id === campaignId);
    if (campaign) {
        window.state = campaign.state;
        localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
        
        window.renderStateToDashboard();
        window.renderStorybookView();
        window.renderConfigView();
        window.setAppState("game");
        window.triggerToast("🎰 CAMPAIGN ACTIVATED", `Restored campaign: ${campaign.name}`);
    } else {
        window.triggerToast("🚨 LOAD FAILED", "Could not find selected campaign slot.");
    }
};

window.loadCampaignFromConnectedFolder = async function() {
    if (!window.dirHandle) return;
    try {
        const permitted = await window.verifyDirectoryPermission(false);
        if (!permitted) {
            window.triggerToast("🔑 RE-AUTHORIZATION REQUIRED", "Accept permissions to read backup file from folder.");
            return;
        }

        const backupsDir = await window.dirHandle.getDirectoryHandle("backups", { create: false });
        const fileHandle = await backupsDir.getFileHandle("campaign_state.json", { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        const loadedState = JSON.parse(content);
        
        if (loadedState && loadedState.week !== undefined) {
            if (!loadedState.campaignId) {
                loadedState.campaignId = Date.now().toString();
            }
            if (!loadedState.campaignName) {
                const pt = loadedState.meta ? loadedState.meta.powertrain : "EV";
                const sg = loadedState.meta ? loadedState.meta.segment : "Track Weapon";
                loadedState.campaignName = `Imported Folder - Week ${loadedState.week} (${pt} ${sg})`;
            }

            window.state = loadedState;
            localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
            window.saveCampaignToList(window.state);
            
            window.renderStateToDashboard();
            window.renderStorybookView();
            window.renderConfigView();
            window.setAppState("game");
            
            window.triggerToast("💾 DIRECTORY SYNCED", `Successfully imported campaign state from connected folder.`);
        }
    } catch (e) {
        console.error("Folder import failed:", e);
        const errMsg = e instanceof SyntaxError 
            ? "The campaign_state.json file contains invalid JSON syntax."
            : "Could not find or parse campaign_state.json backup in directory.";
        window.triggerToast("🚨 IMPORT FAILED", errMsg);
    }
};

window.startNewCampaignWizard = function() {
    window.stats = { tech: 2, cha: 2, log: 2, per: 2 };
    window.pointPool = 4;
    
    document.getElementById("p-powertrain").selectedIndex = 0;
    document.getElementById("p-segment").selectedIndex = 0;
    document.getElementById("p-funding").selectedIndex = 0;
    document.getElementById("p-perk").selectedIndex = 0;
    document.getElementById("p-flaw").selectedIndex = 0;
    
    document.getElementById("v-tech").innerText = "2";
    document.getElementById("v-cha").innerText = "2";
    document.getElementById("v-log").innerText = "2";
    document.getElementById("v-per").innerText = "2";
    document.getElementById("pool-display").innerText = "4";
    
    document.getElementById("prompt-output").value = "";

    window.setAppState("wizard");
};

window.exitToMainMenu = function() {
    if (window.state && window.state.campaignId) {
        window.saveCampaignToList(window.state);
    }
    
    localStorage.removeItem("linc_motors_save_slate");
    window.state = null;
    
    window.setAppState("welcome");
    window.triggerToast("🚪 RETURNED TO MENU", "Timeline session suspended safely.");
};

window.updateMergedPromptDisplay = function() {
    const manualPromptNode = document.getElementById("manual-prompt-node");
    if (!manualPromptNode) return;

    if (!window.state || !window.state.campaignId) {
        manualPromptNode.value = window.RULES_PROMPT || "";
        return;
    }

    const activePayload = JSON.stringify(window.state, null, 2);
    const isNewGame = window.state.week === 1 && window.state.protoProgress === 0;
    const executionInstruction = isNewGame
        ? `🏁 EXECUTE INITIAL ASSEMBLY LINE ENGAGEMENT (WEEK 1)\nEstablish the initial aged blueprint workshop setting. Introduce Companion Sarah & Companion Leo utilizing their defined companion stats, and issue the first week 1 strategic mechanical choice check array.`
        : `🔄 EXECUTE MID-GAME SYSTEM CONVERGENCE RESUMPTION\nRe-establish simulation timeline context natively directly on active Week ${window.state.week}. Reference previous historical ledger entries tracked in the 'chronicle' array to shape choices.`;

    const dynamicPrompt = window.getDynamicPrompt(activePayload, executionInstruction);
    const rules = window.RULES_PROMPT || "";
    
    manualPromptNode.value = `${rules}\n\n=========================================\n\n${dynamicPrompt}`;
};

window.copyManualPrompt = function() {
    const targetTextNode = document.getElementById("manual-prompt-node");
    if (targetTextNode) {
        targetTextNode.select();
        document.execCommand("copy");
        window.triggerToast("🎮 PROMPT EXPORTED", "AI RULES & DYNAMIC CONFIGURATION COPIED TO CLIPBOARD LAYER.");
    }
};

window.compileMasterPrompt = function() {
    if (window.pointPool > 0) {
        window.triggerToast("⚠️ STRUCTURAL FAULT", "ALLOCATE ALL REMAINING MATRIX ENERGY CAPACITY STACK CAPS.");
        return;
    }
    const powertrain = document.getElementById("p-powertrain").value;
    const segment = document.getElementById("p-segment").value;
    const funding = document.getElementById("p-funding").value;
    const perk = document.getElementById("p-perk").value;
    const flaw = document.getElementById("p-flaw").value;

    let classDesignation = "ENGINEER ARCHITECT";
    if (window.stats.cha >= 4) classDesignation = "PROJECT DIRECTOR";
    else if (window.stats.log >= 4) classDesignation = "OPERATIONS CHIEF";
    else if (window.stats.per >= 4) classDesignation = "PRODUCT STRATEGIST";

    const startCash = funding.includes("500k") ? 500000 : (funding.includes("250k") ? 250000 : 120000);

    window.state = {
        campaignId: Date.now().toString(),
        week: 1,
        cash: startCash,
        burn: 8000,
        protoProgress: 0,
        meta: {
            powertrain: powertrain.split(" ")[0],
            segment: segment.split(" ")[0],
            funding: funding.split(" ")[0],
            perk: perk.split(" ")[0],
        },
        network: {},
        facility_modifiers: {
            flaw: flaw.split(" ")[0],
            active_penalties: [],
        },
        personnel: {
            lucius: {
                role: classDesignation,
                tech: window.stats.tech,
                cha: window.stats.cha,
                log: window.stats.log,
                per: window.stats.per,
            },
            sarah: { morale: 100, tech: 4, cha: 1, log: 2, per: 4 },
            leo: { morale: 100, tech: 2, cha: 3, log: 3, per: 1 },
        },
        storybook_images: {},
        chronicle: [],
    };

    if (perk.includes("Academic")) {
        window.state.cash -= 10000;
    }

    window.state.campaignName = `Campaign: ${window.state.meta.powertrain} ${window.state.meta.segment} (W${window.state.week})`;

    window.saveState();

    window.renderStateToDashboard();
    window.renderStorybookView();
    window.renderConfigView();

    window.updateMergedPromptDisplay();
    
    // Copy merged prompt
    const manualPromptNode = document.getElementById("manual-prompt-node");
    if (manualPromptNode) {
        manualPromptNode.select();
        document.execCommand("copy");
    }

    window.setAppState("game");
    window.switchTab("master-manual-tab");

    window.triggerToast("📋 RULES & TIMELINE COMPILED", "Unified Game Master initial instructions copied to clipboard.");

    window.autosaveBackupToLocalDirectory();
};

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
        if (window.dirHandle) {
            folderOption.style.display = "block";
        } else {
            folderOption.style.display = "none";
        }
    }
};

window.setAppState = function(appState) {
    const welcomeTab = document.getElementById("welcome-tab");
    const navTabs = document.getElementById("main-navigation-tabs");
    const btnExit = document.getElementById("btn-exit-menu");
    
    const btnLive = document.getElementById("btn-live-dashboard");
    const btnStory = document.getElementById("btn-storybook-tab");
    const btnInit = document.getElementById("btn-init-matrix");
    const btnManual = document.getElementById("btn-master-manual");
    const btnConfig = document.getElementById("btn-config-tab");

    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    if (appState === "welcome") {
        if (welcomeTab) welcomeTab.classList.add("active");
        if (navTabs) navTabs.style.display = "none";
        if (btnExit) btnExit.style.display = "none";
        window.renderWelcomeScreen();
    } else if (appState === "wizard") {
        if (navTabs) {
            navTabs.style.display = "flex";
            if (btnLive) btnLive.style.display = "none";
            if (btnStory) btnStory.style.display = "none";
            if (btnInit) {
                btnInit.style.display = "inline-block";
                btnInit.innerText = "📊 CHARACTER CREATOR";
            }
            if (btnManual) btnManual.style.display = "none";
            if (btnConfig) btnConfig.style.display = "inline-block";
        }
        if (btnExit) btnExit.style.display = "inline-block";
        window.switchTab("init-matrix");
    } else if (appState === "game") {
        if (navTabs) {
            navTabs.style.display = "flex";
            if (btnLive) btnLive.style.display = "inline-block";
            if (btnStory) btnStory.style.display = "inline-block";
            if (btnInit) btnInit.style.display = "none";
            if (btnManual) {
                btnManual.style.display = "inline-block";
                btnManual.innerText = "🎮 AI SESSION INITIALIZER";
            }
            if (btnConfig) btnConfig.style.display = "inline-block";
        }
        if (btnExit) btnExit.style.display = "inline-block";
        
        window.updateMergedPromptDisplay();
        
        const activeTab = Array.from(document.querySelectorAll(".tab-content")).find(el => el.classList.contains("active"));
        if (!activeTab || activeTab.id === "init-matrix" || activeTab.id === "welcome-tab") {
            window.switchTab("live-dashboard");
        }
    }
};

window.selectLocalDirectory = async function() {
    if (!window.showDirectoryPicker) {
        window.directoryStatus = "Unsupported";
        window.renderConfigView();
        window.triggerToast("⚠️ NOT SUPPORTED", "Your browser does not support local directory access. Use Chrome/Edge/Opera.");
        return;
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        window.dirHandle = handle;
        window.directoryName = handle.name;
        window.directoryStatus = "Connected";
        
        await saveDirHandle(handle);
        await window.scanLocalDirectoryFiles();
        window.renderConfigView();
        window.renderStorybookView();
        window.triggerToast("⚡ DIRECTORY BOUND", `Connected to folder: ${handle.name}`);
    } catch (e) {
        console.error(e);
        window.triggerToast("🚨 CONNECTION FAILED", "Could not connect directory or access denied.");
    }
};

window.verifyDirectoryPermission = async function(writeRequired = false) {
    if (!window.dirHandle) return false;
    const opts = { mode: writeRequired ? 'readwrite' : 'read' };
    try {
        if ((await window.dirHandle.queryPermission(opts)) === 'granted') {
            window.directoryStatus = "Connected";
            return true;
        }
        if (await window.dirHandle.requestPermission(opts) === 'granted') {
            window.directoryStatus = "Connected";
            return true;
        }
    } catch (err) {
        console.warn("Permission request rejected:", err);
    }
    window.directoryStatus = "Re-auth Required";
    return false;
};

window.updateDashboardFolderStatus = function() {
    const statusDiv = document.getElementById("dashboard-folder-status");
    if (!statusDiv) return;

    if (window.directoryStatus === "Connected" && window.dirHandle) {
        statusDiv.innerHTML = `🟢 Bound to folder: <strong style="color: #fff;">${window.dirHandle.name}</strong>`;
    } else if (window.directoryStatus === "Re-auth Required") {
        statusDiv.innerHTML = `⚠️ Connection suspended. <a href="#" onclick="window.restoreDirectoryConnection(); return false;" style="color: var(--comic-amber); text-decoration: underline; font-weight: bold;">Click here to re-authorize</a>`;
    } else if (window.directoryStatus === "Unsupported") {
        statusDiv.innerHTML = `🔴 Directory Access not supported.`;
    } else {
        statusDiv.innerHTML = `🔴 Folder disconnected. Connect in <a href="#" onclick="window.switchTab('config-tab'); return false;" style="color: var(--comic-amber); text-decoration: underline; font-weight: bold;">CONFIG tab</a> to save scene artwork.`;
    }
};

window.scanLocalDirectoryFiles = async function() {
    if (!window.dirHandle) return;
    try {
        const permitted = await window.verifyDirectoryPermission(false);
        if (!permitted) return;

        const storybookDirHandle = await window.dirHandle.getDirectoryHandle("storybook", { create: true });
        const scannedMap = {};
        const maxWeeksToScan = Math.max(window.state.week + 5, 20);
        for (let w = 1; w <= maxWeeksToScan; w++) {
            const fileName = `storybook_week_${w}.png`;
            try {
                await storybookDirHandle.getFileHandle(fileName);
                scannedMap[w] = true;
            } catch (e) {
                scannedMap[w] = false;
            }
        }
        window.localFilesMap = scannedMap;
    } catch (e) {
        console.error("Error scanning storybook directory:", e);
    }
};

window.toggleDirectoryConnection = async function() {
    if (window.directoryStatus === "Connected" || window.directoryStatus === "Re-auth Required") {
        window.dirHandle = null;
        window.directoryName = "";
        window.directoryStatus = "Disconnected";
        window.localFilesMap = {};
        
        // Remove from IndexedDB
        const request = indexedDB.open("ApexBlueprintDB", 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("handles", "readwrite");
            const store = tx.objectStore("handles");
            store.delete("dirHandle");
        };
        
        window.renderConfigView();
        window.renderStorybookView();
        window.triggerToast("🔌 DIRECTORY DISCONNECTED", "Folder connection released.");
    } else {
        await window.selectLocalDirectory();
    }
};

window.bindAssetForWeek = async function(weekNum) {
    if (!window.dirHandle) {
        window.triggerToast("⚠️ DIRECTORY DISCONNECTED", "Connect a local folder in this CONFIG tab to bind storybook assets.");
        return;
    }
    
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const permitted = await window.verifyDirectoryPermission(true);
        if (permitted) {
            try {
                const storybookDirHandle = await window.dirHandle.getDirectoryHandle("storybook", { create: true });
                const fileName = `storybook_week_${weekNum}.png`;
                const fileHandle = await storybookDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file);
                await writable.close();

                if (!window.state.storybook_images) {
                    window.state.storybook_images = {};
                }
                window.state.storybook_images[weekNum] = fileName;
                
                window.saveState();
                await window.scanLocalDirectoryFiles();
                window.renderStateToDashboard();
                window.renderStorybookView();
                window.renderConfigView();
                window.triggerToast("⚡ IMAGE BOUND", `Successfully bound and saved ${fileName} for Week ${weekNum}.`);
                
                await window.autosaveBackupToLocalDirectory();
            } catch (err) {
                console.error("Binding failed:", err);
                window.triggerToast("🚨 BINDING FAILED", "Could not write image file to folder.");
            }
        } else {
            window.triggerToast("🚨 PERMISSION DENIED", "Write permission is required for directory.");
        }
    };
    input.click();
};

window.restoreDirectoryConnection = async function() {
    if (!window.dirHandle) return;
    try {
        const permitted = await window.verifyDirectoryPermission(true);
        if (permitted) {
            await window.scanLocalDirectoryFiles();
            
            // Auto-load campaign state from local directory backups
            try {
                const backupsDir = await window.dirHandle.getDirectoryHandle("backups", { create: false });
                const fileHandle = await backupsDir.getFileHandle("campaign_state.json", { create: false });
                const file = await fileHandle.getFile();
                const content = await file.text();
                const loadedState = JSON.parse(content);
                if (loadedState && loadedState.week !== undefined) {
                    window.state = loadedState;
                    localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
                    if (window.state.campaignId) {
                        window.saveCampaignToList(window.state);
                    }
                }
            } catch (backupErr) {
                if (backupErr instanceof SyntaxError) {
                    window.triggerToast("🚨 CORRUPT BACKUP", "The campaign_state.json file contains invalid JSON formatting/syntax errors.");
                    console.error("campaign_state.json JSON parse error:", backupErr);
                } else {
                    console.log("No backup file campaign_state.json found in backups/ folder.");
                }
            }

            window.renderStateToDashboard();
            window.renderStorybookView();
            window.renderConfigView();
            window.setAppState("game");
            
            const banner = document.getElementById("reauth-banner");
            if (banner) banner.style.display = "none";
            
            window.triggerToast("⚡ CONNECTION RESTORED", `Successfully re-authorized access and synchronized with folder: ${window.dirHandle.name}`);
        }
    } catch (e) {
        console.error("Re-authorization failed:", e);
    }
};

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
        statusNode.innerHTML = `<span style="color: var(--comic-green)">CONNECTED</span>`;
        folderNameNode.innerText = `📂 Folder: ${window.dirHandle.name}`;
        connectBtn.innerText = "🔌 DISCONNECT DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "inline-block";
    } else if (window.directoryStatus === "Re-auth Required") {
        statusNode.innerHTML = `<span style="color: var(--comic-amber)">RE-AUTHORIZATION REQUIRED</span>`;
        folderNameNode.innerText = `📂 Folder: ${window.dirHandle ? window.dirHandle.name : 'Unknown'} (Disconnected)`;
        connectBtn.innerText = "🔑 RE-AUTHORIZE DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    } else if (window.directoryStatus === "Unsupported") {
        statusNode.innerHTML = `<span style="color: var(--comic-red)">UNSUPPORTED BROWSER</span>`;
        folderNameNode.innerText = "Directory API not supported on this browser. Use Chrome, Edge, or Opera.";
        connectBtn.style.display = "none";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    } else {
        statusNode.innerHTML = `<span style="color: var(--text-muted)">DISCONNECTED</span>`;
        folderNameNode.innerText = "No directory connected. Backups and images disabled.";
        connectBtn.innerText = "📁 CONNECT LOCAL DIRECTORY";
        if (manualBackupBtn) manualBackupBtn.style.display = "none";
    }

    // Toggle the top reauth-banner visibility
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

    const trackerBody = document.getElementById("asset-tracker-body");
    if (!trackerBody) return;

    if (!window.state.chronicle || window.state.chronicle.length === 0) {
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

window.addEventListener("DOMContentLoaded", () => {
    // Add crop dragging/slider listeners
    const viewport = document.getElementById("crop-viewport-container");
    const imgNode = document.getElementById("crop-img-node");
    const slider = document.getElementById("crop-zoom-slider");

    if (viewport && imgNode && slider) {
        viewport.addEventListener("mousedown", (e) => {
            e.preventDefault();
            window.isDraggingCropImg = true;
            window.dragStartX = e.clientX - window.cropPanX;
            window.dragStartY = e.clientY - window.cropPanY;
            viewport.style.cursor = "grabbing";
        });
        
        window.addEventListener("mousemove", (e) => {
            if (!window.isDraggingCropImg) return;
            window.cropPanX = e.clientX - window.dragStartX;
            window.cropPanY = e.clientY - window.dragStartY;
            imgNode.style.transform = `translate(${window.cropPanX}px, ${window.cropPanY}px) scale(${window.cropZoom})`;
        });
        
        window.addEventListener("mouseup", () => {
            window.isDraggingCropImg = false;
            viewport.style.cursor = "move";
        });

        // Touch support for dragging
        viewport.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                window.isDraggingCropImg = true;
                window.dragStartX = e.touches[0].clientX - window.cropPanX;
                window.dragStartY = e.touches[0].clientY - window.cropPanY;
            }
        });
        viewport.addEventListener("touchmove", (e) => {
            if (!window.isDraggingCropImg || e.touches.length !== 1) return;
            window.cropPanX = e.touches[0].clientX - window.dragStartX;
            window.cropPanY = e.touches[0].clientY - window.dragStartY;
            imgNode.style.transform = `translate(${window.cropPanX}px, ${window.cropPanY}px) scale(${window.cropZoom})`;
        });
        viewport.addEventListener("touchend", () => {
            window.isDraggingCropImg = false;
        });
        
        slider.addEventListener("input", (e) => {
            window.cropZoom = parseFloat(e.target.value);
            imgNode.style.transform = `translate(${window.cropPanX}px, ${window.cropPanY}px) scale(${window.cropZoom})`;
        });
    }

    if (typeof window.loadPromptsFromFiles === "function") {
        window.loadPromptsFromFiles();
    }

    const localCache = localStorage.getItem("linc_motors_save_slate");
    if (localCache) {
        try {
            window.state = JSON.parse(localCache);
            if (!window.state.storybook_images) {
                window.state.storybook_images = {};
            }
        } catch (e) {
            console.error("Fault parsing cached local save state nodes.");
        }
    } else {
        window.state = null;
    }

    loadDirHandle().then(async (handle) => {
        if (handle) {
            window.dirHandle = handle;
            window.directoryName = handle.name;
            
            const options = { mode: 'read' };
            try {
                if (await handle.queryPermission(options) === 'granted') {
                    window.directoryStatus = "Connected";
                    await window.scanLocalDirectoryFiles();
                    
                    // Auto-load campaign state from local directory backups
                    try {
                        const backupsDir = await handle.getDirectoryHandle("backups", { create: false });
                        const fileHandle = await backupsDir.getFileHandle("campaign_state.json", { create: false });
                        const file = await fileHandle.getFile();
                        const content = await file.text();
                        const loadedState = JSON.parse(content);
                        if (loadedState && loadedState.week !== undefined) {
                            window.state = loadedState;
                            localStorage.setItem("linc_motors_save_slate", JSON.stringify(window.state));
                            if (window.state.campaignId) {
                                window.saveCampaignToList(window.state);
                            }
                        }
                    } catch (backupErr) {
                        if (backupErr instanceof SyntaxError) {
                            window.triggerToast("🚨 CORRUPT BACKUP", "The campaign_state.json file contains invalid JSON formatting/syntax errors.");
                            console.error("campaign_state.json JSON parse error:", backupErr);
                        } else {
                            console.log("No initial campaign_state.json backup found in backups/ folder.");
                        }
                    }
                } else {
                    window.directoryStatus = "Re-auth Required";
                }
            } catch (err) {
                window.directoryStatus = "Re-auth Required";
            }
        } else {
            window.directoryStatus = "Disconnected";
        }
        
        if (window.state && window.state.campaignId) {
            window.setAppState("game");
            window.renderStateToDashboard();
            window.renderStorybookView();
            window.renderConfigView();
        } else {
            window.setAppState("welcome");
        }
        
        if (window.dirHandle && window.directoryStatus === "Connected") {
            window.triggerToast(
                "🎰 AUTO-LOAD COMPLETE",
                `Restored campaign tracking slate & bound folder: ${window.dirHandle.name}`
            );
        } else {
            const currentWeek = window.state ? window.state.week : 1;
            window.triggerToast(
                "🎰 AUTO-LOAD COMPLETE",
                `Restored company tracking slate smoothly at Week ${currentWeek}.`
            );
        }
    }).catch(err => {
        console.error("IndexedDB handle retrieval error:", err);
        if (window.state && window.state.campaignId) {
            window.setAppState("game");
            window.renderStateToDashboard();
            window.renderStorybookView();
            window.renderConfigView();
        } else {
            window.setAppState("welcome");
        }
    });
});
