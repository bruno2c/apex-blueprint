// System Prompts and Prompt Templates for APEX BLUEPRINT
window.RULES_PROMPT = `[SYSTEM_LAWS: APEX BLUEPRINT SIMULATION GAME MASTER]
⚠️ LOCAL RUNTIME DIRECTORY ACCESS BLOCK (CORS Policy Security Exception)
====================================================================
The core system rules cannot be loaded dynamically because index.html is being run locally via the direct file:// protocol.

To resolve this and load the full rules playbook:
1. Start a local HTTP server in this directory:
   python3 -m http.server 8000
   or
   npx serve
2. Open your browser and navigate to: http://localhost:8000
3. Alternatively, play the live canonical build at:
   https://bruno2c.github.io/apex-blueprint/`;

window.DYNAMIC_TEMPLATE = null;

window.getDynamicPrompt = function(activePayload, executionInstruction) {
    const template = window.DYNAMIC_TEMPLATE || `[SAVE_DATA_LOAD: RUNTIME DEEP MATRIX]
=========================================
💾 COMPLETE SNAPSHOT RUNTIME DATA (SOURCE OF TRUTH)
=========================================
{{activePayload}}

=========================================
⚙️ ENGINE ACTION COMMAND
=========================================
{{executionInstruction}}`;

    return template
        .replace("{{activePayload}}", activePayload)
        .replace("{{executionInstruction}}", executionInstruction);
};

window.loadPromptsFromFiles = async function() {
    try {
        const rulesResponse = await fetch('prompts/system_rules.md');
        if (rulesResponse.ok) {
            window.RULES_PROMPT = await rulesResponse.text();
            // Synchronize UI component if it's already rendered
            const manualPromptNode = document.getElementById("manual-prompt-node");
            if (manualPromptNode) {
                manualPromptNode.value = window.RULES_PROMPT;
            }
        }
    } catch (err) {
        console.warn("Could not fetch prompts/system_rules.md, using static fallback:", err);
    }

    try {
        const templateResponse = await fetch('prompts/dynamic_template.md');
        if (templateResponse.ok) {
            window.DYNAMIC_TEMPLATE = await templateResponse.text();
        }
    } catch (err) {
        console.warn("Could not fetch prompts/dynamic_template.md, using static fallback:", err);
    }
};
