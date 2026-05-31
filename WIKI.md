# 🏭 APEX BLUEPRINT // GAMEPLAY WIKI

Welcome to the master manual and guidebook for **APEX BLUEPRINT**, a granular, text-based tabletop RPG simulation running your automotive workshop startup. This document outlines the core gameplay concepts, personnel dynamics, mechanics, and UI systems that guide your journey.

---

## 📂 TABLE OF CONTENTS
1. [Core Premise & Weekly Structure](#1-core-premise--weekly-structure)
2. [Campaign Setup & Setup Configurations](#2-campaign-setup--setup-configurations)
3. [The Crew & Character Stats](#3-the-crew--character-stats)
4. [Team Synergy & Friction Mechanics](#4-team-synergy--friction-mechanics)
5. [The Resolution Harness (PbtA Rules)](#5-the-resolution-harness-pbta-rules)
6. [The Team Rolodex (NPC Glossary)](#6-the-team-rolodex-npc-glossary)
7. [Data Slate Utilities & Chronicle Logs](#7-data-slate-utilities--chronicle-logs)
8. [Indie Cyberpunk Art Direction](#8-indie-cyberpunk-art-direction)

---

## 1. Core Premise & Weekly Structure
You play as the lead **Architect** operating a startup automotive garage. Your goal is to design, engineer, and build high-performance prototype vehicles (such as electric track weapons or hybrid racers) while keeping the garage solvent.

* **Turn-Based Pacing**: Time progresses week by week. Each weekly turn presents you with workshop events, logistics struggles, and mechanical dilemmas.
* **The Turn Cycle**:
  1. The Game Master (AI) describes the weekly environment and presents active dilemmas.
  2. You describe your crew's response and assign characters to tasks.
  3. The Game Master requests attribute rolls based on your description.
  4. You roll the dice, transmit the result, and resolve the week.

---

## 2. Campaign Setup & Setup Configurations
When initiating a new campaign timeline, you define the core constraints and attributes of your business:

* **Powertrain Focus**: What powers your machines? (e.g., pure **EV** battery stacks, complex **Hybrid** setups, or high-revving **ICE** motors).
* **Market Segment**: Your target audience and product class (e.g., a lightweight **Track Weapon**, or a **Hypercar**).
* **Funding Core**: Your starting capital level (e.g., lean **Bootstrapped** budgets with lower starting cash but high autonomy, or capital-heavy **Venture Capital**).
* **Facility Flaws**: Pre-existing penalties that strain your workshop (e.g., a **Drafty Roof** that risks component moisture, or **Cramped Quarters** that limit simultaneous projects).
* **Architect Class**: Based on your starting attribute points, you receive a title showing your administrative focus:
  * **Engineer Architect**: Balanced setup.
  * **Project Director**: High Charisma focus.
  * **Operations Chief**: High Logistics focus.
  * **Product Strategist**: High Perception focus.

---

## 3. The Crew & Character Stats
Your workshop is staffed by three key crew members, each with specific attributes:
* **Lucius (The Architect)**: The player persona. Attributes depend on your character configuration.
* **Sarah (Energy Storage Specialist)**: Brilliant and technical, but keeps to herself. (High *Technical* & *Perception*, low *Charisma*).
* **Cousin Leo (Heavy Tooling Mechanic)**: Warm, experienced with metalwork, and highly organized. (High *Charisma* & *Logistics*, low *Perception*).

### Attribute Nodes
* **TECH (Technical)**: Used for drafting schematics, welding, electrical tuning, and repairing equipment.
* **CHA (Charisma)**: Used for vendor negotiations, investor pitches, client relations, and keeping crew morale high.
* **LOG (Logistics)**: Used for parts sourcing, shipping schedules, budget auditing, and workshop organization.
* **PER (Perception)**: Used for identifying manufacturing flaws, safety hazards, driver telemetry analysis, and testing prototypes.

### Morale & Efficiency
* Companions track a **Morale** metric (0% to 100%).
* A crew member's active morale acts as their **Efficiency rating**. When morale falls, they become prone to mistakes, adding complications to their assignments.

---

## 4. Team Synergy & Friction Mechanics
The interpersonal relationships between your crew members directly impact the success of joint operations. The dashboard tracks the mutual synergy between all pairs of companion characters, excluding the Architect/player (e.g. `Sarah ✦ Cousin Leo`).

* **Synergy Metric Scale**: Ranges from `-3` (Active Hostility / Mutual Refusal to Cooperate) to `+3` (Seamless Cohesion / High Trust). The baseline is `0` (Professional Neutrality).
* **Joint Operations**: When you assign two characters to collaborate on a single task, their mutual synergy score is applied as a direct modifier to the action's success roll.
* **Interpersonal Consequences**:
  * A **Strong Success (10+)** on a joint task builds trust, increasing their synergy by `+1` (up to a maximum of `+3`).
  * A **Weak Success (7-9)** or **Operational Miss (6 or less)** frays their relationship, reducing their synergy by `-1` (down to a minimum of `-3`) as blame and communication strain set in.
* **Operational Strike**: If a pair's synergy hits `-3`, they refuse to collaborate on any combined tasks. You must dedicate a week to resolving their workplace grievance to unlock joint actions again.

---

## 5. The Resolution Harness (PbtA Rules)
APEX BLUEPRINT uses a Powered by the Apocalypse (PbtA) resolution system for risky actions:

* **The Check**: You roll **2d6** (two six-sided dice) and add the assigned character's attribute modifier, plus any synergy modifiers if it is a joint project.
* **Outcome Tiers**:
  * **[10+] Strong Success**: Complete victory. The task is completed cleanly with no structural downsides.
  * **[7-9] Weak Success**: Mixed outcome. The crew succeeds, but it introduces a complication, materials cost, or crew friction.
  * **[6 or Less] Operational Miss**: Failure. Things go critically wrong. Capital drops, morale breaks, components crack, or deadlines are missed.

---

## 6. The Team Rolodex (NPC Glossary)
As your startup grows, you will interact with external characters (investors, parts brokers, drivers, rivals). 

* **Faction Alignment**: The Rolodex displays each contact's faction standing (e.g., Ally, Hostile, Neutral).
* **Interactive Dossiers**: You can upload custom profile avatars for new characters. The dashboard includes a built-in zoom & pan crop tool to align uploaded images to graphic novel specifications.
* **Narrative Continuity**: NPC data is passed dynamically to the AI engine so that the narrative reflects their relationship status with your garage.

---

## 7. Data Slate Utilities & Chronicle Logs
To ensure continuity across play sessions, the dashboard uses localized data structures:

* **The Chronicle**: A week-by-week timeline of your workshop's history.
* **Smart Diff-Merging**: When you sync weekly updates, the system performs a smart merge:
  * Automatically filters out and skips range groupings (e.g., `W1-W11: Prior startup history tracked.`).
  * Skips logs for weeks that are already recorded in your history.
  * Appends new weekly logs to the bottom of the timeline.
* **Overwrite Option**: A checkbox utility allows you to bypass the merge and completely replace your history if you need to restore or restart a campaign timeline.
* **Data Slate Files**: You can export your entire campaign progress as a local `.json` save file or import one to resume play.

---

## 8. Indie Cyberpunk Art Direction
The visual identity of your dashboard and scenario updates reflects an **Indie Cyberpunk Graphic Novel aesthetic**:

* **Line Work**: Heavy, raw, ink-black lines with dramatic cross-hatching shadows and retro grid patterns.
* **Color Palette**: Vintage blueprint navy (`#1a365d`) and industrial mechanical amber (`#f6ad55`).
* **UI Themes**: Thick borders, flat boxes, and custom indicator status bars.
