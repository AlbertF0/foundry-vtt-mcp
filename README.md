# Foundry VTT MCP Bridge — D&D 5e NPC Creation Suite (Fork)

> **This is a fork of [adambdooley/foundry-vtt-mcp](https://github.com/adambdooley/foundry-vtt-mcp).**
> It extends the original project with **3 new MCP tools** for building complete D&D 5e NPCs directly from Claude Desktop — no manual Foundry UI required.
> See the [What's New in This Fork](#whats-new-in-this-fork) section below.

---

## What's New in This Fork

Instead of manually editing actor sheets in Foundry, you can describe the NPC in natural language and have Claude build it piece by piece.

### New Tools

| Tool | Description |
|------|-------------|
| `dnd5e-create-npc` | Create an NPC actor from scratch with a full stat block (HP, AC, abilities, CR) |
| `dnd5e-add-feature` | Add any feature type via `featureType` selector: `passive`, `save`, `attack`, `attack-with-save`, `aura`, `spellcasting`, `spells` |
| `dnd5e-add-features-from-compendium` | Import official compendium features by name onto any actor |

### Example Workflow

Build a complete NPC in a single conversation:

```
1. "Create Frater Velreth, a corrupted monk, CR 8, 110 HP, AC 16"
   → dnd5e-create-npc

2. "Add Multiattack: two Corrupting Touch attacks"
   → dnd5e-add-feature (featureType: passive)

3. "Add Corrupting Touch: melee 5ft, +7 to hit, 2d8 psychic,
    secondary WIS save DC 14 or 3d6 extra"
   → dnd5e-add-feature (featureType: attack-with-save)

4. "Add Signal Aura: 10ft radius, 1d6 psychic automatic each turn"
   → dnd5e-add-feature (featureType: aura)

5. "Make him a CHA-based caster, 5th level"
   → dnd5e-add-feature (featureType: spellcasting)

6. "Give him Disguise Self, Mirror Image, Hypnotic Pattern"
   → dnd5e-add-feature (featureType: spells)
```

### Architecture

Each tool follows the existing 4-layer pattern of the project:
- `mcp-server/src/tools/dnd5e/` — Zod schema + JSON Schema + tool description
- `mcp-server/src/backend.ts` — registration and handler routing
- `foundry-module/src/queries.ts` — query handler + registration
- `foundry-module/src/data-access.ts` — Foundry data layer

Tool descriptions use explicit **negative routing** (USE THIS WHEN / DO NOT USE THIS FOR) to help Claude choose the correct tool in ambiguous cases.

### Known Limitations

End-to-end testing via Claude Desktop + Foundry VTT is pending. Both packages build green on v0.8.1.

### Manual Installation (required for this fork)

```bash
# Clone this fork
git clone https://github.com/LManfre/foundry-vtt-mcp.git
cd foundry-vtt-mcp

# Install dependencies and build
npm install
npm run build
```

Then copy `packages/foundry-module/dist/` to your Foundry modules directory and follow the Configure Claude Desktop step below.

Developed with the assistance of Claude Code.

---

# Foundry VTT MCP Bridge

Connect Foundry VTT to Claude Desktop for AI-powered campaign management through the Model Context Protocol (MCP). It currently supports Dungeons and Dragons Fifth Edition and Pathfinder Second Edition. The majority of MCP tools are system agnostic but character creation and compendium tools are only able to work with D&D5e and PF2E.

## Overview

The Foundry MCP Bridge enables natural AI conversations with your Foundry VTT game data:

- **Quest Creation**: [Create quests from prompts that incorporate what exists in your world and journals](https://www.youtube.com/watch?v=NqyB_z2AKME)
- **Character Management**: Query character stats, abilities, and information
- **Compendium Search**: Find items, spells, and creatures using natural language
- **Content Creation**: Generate actors, NPCs, and quest journals from simple prompts
- **Scene Information**: Access current scene data and world details
- **Dice Coordination**: Interactive roll requests with player targeting
- **Campaign Management**: Multi-part quest and campaign tracking
- **Map Generation**: Create maps from prompts and automatically upload them into scenes in Foundry VTT using the optional ComfyUI component

This project was built with the assistance of Claude Code. If you like this project, consider [supporting it on Patreon](https://www.patreon.com/c/Adambdooley).

## Installation

### Prerequisites

- **Foundry VTT v13 or v14**
- **Claude Desktop** with MCP support
- **Windows** (for automated installer) or **Node.js 18+** for manual installation

### Option 1: Windows Installer

[Video guide for Windows Installer](https://youtu.be/Se04A21wrbE)

1. Download the latest `FoundryMCPServer-Setup-vx.x.x.exe` from [Releases](https://github.com/adambdooley/foundry-vtt-mcp/releases)
2. Run the installer - it will:
   - Install the MCP server with bundled Node.js runtime
   - Configure the Claude Desktop MCP server settings
   - Optionally install the Foundry module and ComfyUI Map Generation to your VTT installation
   - Choose Cuda version for your GPU type during install
3. Restart Claude Desktop
4. Enable "Foundry MCP Bridge" in your Foundry Module Management

### Option 2: Mac Installer

1. Download the latest `FoundryMCPServer-vx.x.x.dmg` from [Releases](https://github.com/adambdooley/foundry-vtt-mcp/releases)
2. Run the package installer inside the dmg - it will:
   - Open DMG and double-click the PKG installer
   - Configure the Claude Desktop MCP server settings
   - Optionally install the Foundry module and ComfyUI Map Generation to your Foundry VTT installation
3. Restart Claude Desktop
4. Enable "Foundry MCP Bridge" in your Foundry Module Management

### Option 3: Manual Installation

#### Install the Foundry Module

1. Open Foundry VTT (v13 or v14)
2. Select install module in the Foundry Add-ons menu
3. At the bottom of the window, add the Manifest URL as: https://github.com/adambdooley/foundry-vtt-mcp/blob/master/packages/foundry-module/module.json and click install
4. Enable "Foundry MCP Bridge" in Module Management
   - **Do not change the module ID or folder name.** The MCP backend and the Claude integration both expect the module to live in a directory called `foundry-mcp-bridge`. Renaming the ID in `module.json` breaks socket routing and stops Claude from seeing the backend.

#### Install the MCP Server

```bash
# Clone repository
git clone https://github.com/adambdooley/foundry-vtt-mcp.git
cd foundry-vtt-mcp

# Install dependencies and build
npm install
npm run build
```

#### Configure Claude Desktop

Add this to your Claude Desktop configuration (claude_desktop_config.json) file:

```json
{
  "mcpServers": {
    "foundry-mcp": {
      "command": "node",
      "args": ["path/to/foundry-vtt-mcp/packages/mcp-server/dist/index.js"],
      "env": {
        "FOUNDRY_HOST": "localhost",
        "FOUNDRY_PORT": "31415"
      }
    }
  }
}
```

Starting Claude Desktop will start the MCP Server.

### Getting Started

1. Start Foundry VTT and load your world
2. Open Claude Desktop
3. Chat with Claude about your currently loaded Foundry World

## Example Usage

Once connected, ask Claude Desktop:

- *"Show me my character Clark's stats"*
- *"Find all CR 12 humanoid creatures for an encounter"*
- *"Create a quest about investigating missing villagers"*
- *"Roll a stealth check for Tulkas"*
- *"What's in the current Foundry scene?"*
- *"Create me a small map of a Riverside Cottage in Foundry"*
- *"Create a CR 8 corrupted monk NPC with an aura and spellcasting"* *(this fork)*

## Features

- **40 MCP Tools** (37 original + 3 new D&D 5e NPC tools in this fork)
- **D&D 5e NPC Creation Suite**: Build complete NPCs from prompts — stat block, attacks, saves, auras, spellcasting *(this fork)*
- **Character Management**: Access stats, abilities, inventory, and detailed entity information
- **Token Manipulation**: Move, update, delete tokens and manage status conditions
- **Enhanced Compendium Search**: Instant filtering by CR, type, abilities, and more
- **Content Creation**: Generate actors, NPCs, and quest journals
- **Campaign Management**: Multi-part quest tracking with progress dashboards
- **Interactive Dice System**: Send different dice roll requests to players from Claude
- **Actor Ownership**: Manage player permissions for characters and tokens
- **GM-Only**: MCP Bridge only connects to Game Master users
- **Map Generation**: A portable ComfyUI backend that generates battlemaps from prompts
- **Remote Connections**: WebRTC connections initiated through browser (Tested with Google Chrome) to MCP server and ComfyUI
- **Windows and Mac Installers**: Automated installation of Foundry MCP Server for Claude Desktop, Foundry MCP Bridge Foundry VTT Module, and ComfyUI backend with dependencies

## MCP Tools

- **1** get-world-info
- **2** list-scenes
- **3** get-current-scene
- **4** get-available-conditions
- **5** list-compendium-packs
- **6** list-characters
- **7** get-character
- **8** search-character-items
- **9** get-character-entity
- **10** get-token-details
- **11** toggle-token-condition (add)
- **12** toggle-token-condition (remove)
- **13** update-token
- **14** search-compendium
- **15** get-compendium-item
- **16** get-compendium-entry-full
- **17** list-creatures-by-criteria
- **18** list-journals
- **19** create-quest-journal
- **20** update-quest-journal
- **21** search-journals
- **22** link-quest-to-npc
- **23** list-actor-ownership
- **24** assign-actor-ownership
- **25** remove-actor-ownership
- **26** move-token
- **27** use-item
- **28** request-player-rolls
- **29** generate-map
- **30** check-map-status
- **31** cancel-map-job
- **32** switch-scene
- **33** create-actor-from-compendium
- **34** list-dsa5-archetypes (DSA5 Only)
- **35** create-dsa5-character-from-archetype (DSA5 Only)
- **36** create-campaign-dashboard
- **37** manage-world-items
- **38** dnd5e-create-npc *(this fork)*
- **39** dnd5e-add-feature *(this fork)*
- **40** dnd5e-add-features-from-compendium *(this fork)*

## Settings

- **Enhanced Creature Index** Configure Enhanced Index button leads to Enhanced Creature Index sub-menu (Details below)
- **Map Generation Service Configuration** Configure Map Generation button leads to Map Generation Service sub-menu (Details below)
- **Enable MCP Bridge** This should be checked by default and the status should show as connected. It can be used to turn off the MCP Bridge connection within the game without the need to disable the add-on itself.
- **Connection Type** Can be set to Auto for automatic detection of connection type. Can also be set to force either WebRTC for Internet connections or Websocket for Local connections.
- **Websocket Server Host** IP Address of Claude Desktop MCP Server location. Only used for local network websocket connections. Remote Servers use WebRTC. Defaults to localhost.
- **Allow Write Operations** This will prevent Claude from making any changes to world content and restrict it to reading only
- **Max Actors Per Request** This is a failsafe to stop a massive amount of actors being created from one single request. It does not limit the amount of characters being created by multiple requests
- **Show Connection Messages** This can turn off the banner messages for connections for Foundry MCP Bridge
- **Auto-Reconnect on Disconnect** Will automatically attempt to reconnect if the connection is lost
- **Connection Check Frequency** How often it will check connection status

### Enhanced Creature Index Sub-menu

- **Rebuild Creature Index** This button will rebuild the creature index if there is an issue or it is out of sync with changes in your compendiums
- **Enable Enhanced Creature Index** This should be left on as Claude builds additional metadata in the world files to give it better searches
- **Auto-Rebuild Index on Pack Changes** Experimental feature that hasn't been fully tested yet

### Map Generation Service Sub-menu

- **Service Status** There are three buttons for Check Status, Start Service, and Stop Service. These buttons help monitor and control the connection from the Foundry MCP Bridge to the ComfyUI backend which is started by the Claude Desktop application.
- **Auto-start Map Generation Service** Controls whether ComfyUI service connection is automatically connected at startup of the Foundry world.
- **Generation Quality** Controls the quality of the maps generated by the SDXL checkpoints with ComfyUI. Low uses 8 steps of generation, Medium uses 20 steps of generation, and High uses 35 steps. The D&D Battlemaps SDXL Upscale v1.0 Checkpoint used in this image generation recommends using 35 steps but on low end GPUs or GPUs without CUDA, this generation will take several minutes.

## Architecture

```
Claude Desktop ↔ MCP Protocol ↔ MCP Server ↔ WebSocket ↔ Foundry Module ↔ Foundry VTT
                                     ↓
                              ComfyUI Service
                              (AI Map Generation)
```

- **Foundry Module**: Provides secure data access within Foundry VTT
- **MCP Server**: External Node.js server handling Claude Desktop communication
- **Map Generation Service**: A headless ComfyUI backend that is spawned by Claude Desktop
- **No API Keys Required**: Uses your existing Claude Desktop subscription

## Security & Permissions

- **GM-Only Access**: All functionality restricted to Game Master users
- **Configurable Permissions**: Control what data Claude can access and modify
- **Session-Based Authentication**: Uses Foundry's built-in authentication system

## System Requirements

- **Foundry VTT**: Version 13 or 14
- **Claude Desktop**: Latest version with MCP support
- **Claude Pro/Max Plan**: Required to connect to MCP servers
- **Operating System**: Windows 10/11 (installer), or other OSes with Node.js 18+ (manual)
- **GPU Requirements**: A GPU with at least 8GB of VRAM (for map generation)

## Schema Smoke Test

The MCP schema smoke test verifies that tool schemas load correctly and do not enforce overly strict `additionalProperties` defaults.

```bash
npm -w @foundry-mcp/server run build
npm run test:mcp:schema
```

## Support & Development

- **Original project issues**: [GitHub Issues (upstream)](https://github.com/adambdooley/foundry-vtt-mcp/issues)
- **Fork-specific issues**: Open an issue on this repository
- **YouTube Channel**: [Subscribe for updates and tutorials](https://www.youtube.com/channel/UCVrSC-FzuAk5AgvfboJj0WA)
- **License**: MIT
