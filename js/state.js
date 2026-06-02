// =============================================================================
// state.js — Game State, Persistence & Data Integrity
// =============================================================================
// Single source of truth for all campaign data. Handles localStorage campaign
// slot management, state sanity/migration, and chronicle utilities.
// =============================================================================

// ---------------------------------------------------------------------------
// Default state shape — authoritative definition, used everywhere a fresh
// state is needed. Spread/clone this instead of re-declaring inline.
// ---------------------------------------------------------------------------
window.DEFAULT_STATE = {
    campaignId: null,
    campaignName: null,
    week: 1,
    cash: 120000,
    burn: 8000,
    protoProgress: 0,
    active_campaign_phase: "",
    global_objectives: [],
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
        lucius: { role: "ARCHITECT", tech: 0, cha: 0, log: 0, per: 0 },
        sarah: { morale: 100, tech: 2, cha: -1, log: 0, per: 2 },
        leo: { morale: 100, tech: 1, cha: 1, log: 1, per: -1 },
        synergy: { sarah_and_leo: 0 }
    },
    storybook_images: {},
    chronicle: [],
    history: []
};

// ---------------------------------------------------------------------------
// Active runtime state — initialized to null (no active campaign on load).
// Populated by compileMasterPrompt(), loadCampaignFromSlot(), or importDataSlateJson().
// ---------------------------------------------------------------------------
window.state = null;

// Character creation transient stats (not persisted to campaign state)
window.stats = { tech: 0, cha: 0, log: 0, per: 0 };
window.pointPool = 2;

// ---------------------------------------------------------------------------
// localStorage key — canonical app key (migrated from legacy "linc_motors_save_slate")
// ---------------------------------------------------------------------------
window.SAVE_KEY = "apex_blueprint_save_slate";
window.CAMPAIGN_LIST_KEY = "apex_blueprint_campaign_list";

// ---------------------------------------------------------------------------
// localStorage migration shim — runs once on first load. If an old
// "linc_motors_save_slate" entry exists and no new key exists yet, migrate it.
// ---------------------------------------------------------------------------
(function migrateLocalStorageKey() {
    const LEGACY_KEY = "linc_motors_save_slate";
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (legacyData && !localStorage.getItem(window.SAVE_KEY)) {
        localStorage.setItem(window.SAVE_KEY, legacyData);
        localStorage.removeItem(LEGACY_KEY);
        console.log("[state.js] Migrated save data from legacy key to apex_blueprint_save_slate.");
    }
})();

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------
window.saveState = function() {
    if (!window.state) return;
    localStorage.setItem(window.SAVE_KEY, JSON.stringify(window.state));
    if (window.state.campaignId) {
        window.saveCampaignToList(window.state);
    }
};

// ---------------------------------------------------------------------------
// Campaign slot management (multi-campaign localStorage list)
// ---------------------------------------------------------------------------
window.getCampaignsList = function() {
    const listJson = localStorage.getItem(window.CAMPAIGN_LIST_KEY);
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

    localStorage.setItem(window.CAMPAIGN_LIST_KEY, JSON.stringify(list));
};

window.deleteCampaignFromList = function(campaignId) {
    let list = window.getCampaignsList();
    list = list.filter(c => c.id !== campaignId);
    localStorage.setItem(window.CAMPAIGN_LIST_KEY, JSON.stringify(list));

    if (window.state && window.state.campaignId === campaignId) {
        window.state = null;
        localStorage.removeItem(window.SAVE_KEY);
    }

    window.renderWelcomeScreen();
};

// ---------------------------------------------------------------------------
// State sanity / data migration
// Normalises synergy keys, removes lucius from synergy, seeds history array.
// Safe to call on any state object — no-ops if already clean.
// ---------------------------------------------------------------------------
window.ensureStateSanity = function() {
    if (!window.state) return;
    if (!window.state.global_objectives) {
        window.state.global_objectives = [];
    }
    if (window.state.active_campaign_phase === undefined) {
        window.state.active_campaign_phase = "";
    }
    if (!window.state.personnel) window.state.personnel = {};
    if (!window.state.personnel.synergy) {
        window.state.personnel.synergy = {};
    }

    // Remove any legacy synergy keys that involve Lucius
    for (const synKey of Object.keys(window.state.personnel.synergy)) {
        if (synKey.includes("lucius")) {
            delete window.state.personnel.synergy[synKey];
        }
    }

    // Ensure every companion pair has a canonical sorted synergy key
    const characters = Object.keys(window.state.personnel).filter(
        k => k !== "synergy" && k !== "lucius"
    );

    for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
            const charA = characters[i];
            const charB = characters[j];

            const key1 = `${charA}_and_${charB}`;
            const key2 = `${charB}_and_${charA}`;

            const existingVal1 = window.state.personnel.synergy[key1];
            const existingVal2 = window.state.personnel.synergy[key2];

            const finalVal = existingVal1 !== undefined
                ? existingVal1
                : (existingVal2 !== undefined ? existingVal2 : 0);

            const sortedKey = [charA, charB].sort().join("_and_");
            window.state.personnel.synergy[sortedKey] = Math.min(
                Math.max(parseInt(finalVal, 10) || 0, -3), 3
            );

            if (sortedKey !== key1 && window.state.personnel.synergy[key1] !== undefined) {
                delete window.state.personnel.synergy[key1];
            }
            if (sortedKey !== key2 && window.state.personnel.synergy[key2] !== undefined) {
                delete window.state.personnel.synergy[key2];
            }
        }
    }

    // Upgrade legacy slates: seed history if missing
    if (!window.state.history || window.state.history.length === 0) {
        window.state.history = [
            {
                week: window.state.week !== undefined ? window.state.week : 1,
                cash: window.state.cash !== undefined ? window.state.cash : 0,
                burn: window.state.burn !== undefined ? window.state.burn : 0,
                protoProgress: window.state.protoProgress !== undefined ? window.state.protoProgress : 0
            }
        ];
    }
};

// ---------------------------------------------------------------------------
// Chronicle range expansion
// Expands "W1-W11: summary text" entries into individual week entries.
// ---------------------------------------------------------------------------
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
