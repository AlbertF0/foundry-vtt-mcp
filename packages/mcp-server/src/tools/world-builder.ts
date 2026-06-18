import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';

export interface WorldBuilderToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}

/**
 * World Builder tools — campaign-building capabilities not covered by the
 * core bridge: scene creation from existing images, document folders, actor
 * portrait/token/folder assignment, and creature import through the
 * Plutonium module (full 5etools bestiary instead of SRD-only compendiums).
 */
export class WorldBuilderTools {
  private foundryClient: FoundryClient;
  private logger: Logger;

  constructor({ foundryClient, logger }: WorldBuilderToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'WorldBuilderTools' });
  }

  getToolDefinitions() {
    return [
      {
        name: 'create-scene',
        description:
          'Create a new scene from an existing image in the Foundry user data directory (e.g. a battle map placed under worlds/<world>/...). Scene dimensions are taken from the actual image size. Optionally place the scene in a scene folder (created if missing) and/or activate it.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Scene name' },
            imagePath: {
              type: 'string',
              description:
                'Background image path relative to the Foundry user data directory, e.g. "worlds/test/campania/mapas/01-tavern/map.webp"',
            },
            folderName: {
              type: 'string',
              description: 'Optional scene folder name; created automatically if it does not exist',
            },
            gridSize: {
              type: 'number',
              description: 'Grid size in pixels per square (default: 100)',
            },
            gridType: {
              type: 'number',
              description: 'Grid type: 0 gridless, 1 square (default), 2-5 hex variants',
            },
            gridDistance: {
              type: 'number',
              description: 'Distance each grid square represents (default: 5)',
            },
            gridUnits: { type: 'string', description: 'Distance units label (default: "ft")' },
            padding: { type: 'number', description: 'Canvas padding ratio 0-0.5 (default: 0.1)' },
            globalLight: {
              type: 'boolean',
              description:
                'Global illumination on (default: true). Set false for dark/night scenes.',
            },
            darkness: { type: 'number', description: 'Darkness level 0-1 (default: 0)' },
            tokenVision: { type: 'boolean', description: 'Token vision enabled (default: true)' },
            activate: {
              type: 'boolean',
              description: 'Activate the scene after creation (default: false)',
            },
          },
          required: ['name', 'imagePath'],
        },
      },
      {
        name: 'create-journal',
        description:
          'Create a plain multi-page journal entry with your own HTML content — NO quest template wrapper (unlike create-quest-journal, which injects English "Adventure Hook"/"Read-Aloud" boilerplate). Use this for clean, fully-controlled journals (e.g. a resources tracker, GM notes, handouts). All page content is inserted verbatim, so write it in the language you want.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Journal entry name' },
            folderName: {
              type: 'string',
              description: 'Journal folder (created if missing). Defaults to the journal name.',
            },
            pages: {
              type: 'array',
              description: 'Pages in order. Each has a name and HTML content (inserted verbatim).',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Page title' },
                  content: { type: 'string', description: 'HTML content for the page' },
                },
                required: ['name', 'content'],
              },
              minItems: 1,
            },
          },
          required: ['name', 'pages'],
        },
      },
      {
        name: 'create-folder',
        description:
          'Create a document folder in the Foundry sidebar (for Scenes, Actors, Items or Journal Entries). Idempotent: returns the existing folder if one with the same name and type exists. Supports nesting via parentName.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Folder name' },
            type: {
              type: 'string',
              enum: ['Scene', 'Actor', 'Item', 'JournalEntry'],
              description: 'Document type the folder holds',
            },
            parentName: {
              type: 'string',
              description: 'Optional parent folder name (must already exist, same type)',
            },
            color: { type: 'string', description: 'Optional folder color, e.g. "#4a90e2"' },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'update-actor',
        description:
          "Update an existing actor's portrait image, prototype token image, sidebar folder and/or name. Use this to assign user-provided artwork to actors and organize them into folders. Image paths are relative to the Foundry user data directory.",
        inputSchema: {
          type: 'object',
          properties: {
            actorIdentifier: { type: 'string', description: 'Actor name or ID' },
            img: { type: 'string', description: 'Portrait image path (relative to user data)' },
            tokenImg: {
              type: 'string',
              description: 'Prototype token image path (relative to user data)',
            },
            folderName: {
              type: 'string',
              description: 'Actor folder to move the actor into; created automatically if missing',
            },
            newName: { type: 'string', description: 'Rename the actor' },
          },
          required: ['actorIdentifier'],
        },
      },
      {
        name: 'delete-documents',
        description:
          'Delete world documents and/or folders by name or ID. Useful for cleanup or to make a populate run idempotent (delete before re-creating). Document kinds: actor, scene, item, journal, table. For folders, deleteContents=true also deletes the documents and subfolders inside (default false orphans them to the root).',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              description: 'Documents to delete',
              items: {
                type: 'object',
                properties: {
                  kind: {
                    type: 'string',
                    enum: ['actor', 'scene', 'item', 'journal', 'table'],
                    description: 'Document kind',
                  },
                  identifier: { type: 'string', description: 'Document name or ID' },
                },
                required: ['kind', 'identifier'],
              },
            },
            folders: {
              type: 'array',
              description: 'Folders to delete',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Folder name' },
                  type: {
                    type: 'string',
                    enum: ['Scene', 'Actor', 'Item', 'JournalEntry'],
                    description: 'Folder document type',
                  },
                  deleteContents: {
                    type: 'boolean',
                    description: 'Also delete documents and subfolders inside (default false)',
                  },
                },
                required: ['name', 'type'],
              },
            },
          },
        },
      },
      {
        name: 'apply-walls',
        description:
          "Apply walls, doors and (optionally) lights to an existing scene from Universal VTT data (a .uvtt/.dd2vtt/.df2vtt file — the format exported by Dungeondraft, Dungeon Alchemist, Auto-Wall, and bundled with many map packs). Coordinates are converted to the scene exactly using the map's pixels-per-grid and the scene padding offset. Walls block sight/movement/sound; portals become doors. Use this after create-scene when you have wall data for the map. (For plain image maps with no wall data, generate a .uvtt first with a tool like Auto-Wall.)",
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: { type: 'string', description: 'Target scene name or ID' },
            uvttPath: {
              type: 'string',
              description:
                'Path to a Universal VTT file relative to the Foundry user data directory, e.g. "worlds/test/campania/mapas/03-casa-arbol/map.uvtt"',
            },
            uvtt: {
              type: 'object',
              description:
                'Inline Universal VTT object (resolution, line_of_sight, portals, lights). Use instead of uvttPath when you already have the parsed data.',
            },
            includeWalls: { type: 'boolean', description: 'Create walls (default: true)' },
            includeDoors: {
              type: 'boolean',
              description: 'Create doors from portals (default: true)',
            },
            includeLights: {
              type: 'boolean',
              description: 'Create ambient lights from the UVTT lights (default: false)',
            },
            clearExisting: {
              type: 'boolean',
              description: 'Delete existing walls (and lights) on the scene first (default: false)',
            },
          },
          required: ['sceneIdentifier'],
        },
      },
      {
        name: 'plutonium-search-maps',
        description:
          'Check whether Plutonium has an official adventure/book map matching a name (e.g. "Cragmaw Hideout", "Death House"). Searches the bundled 5etools maps index (gendata-maps.json). Returns matching maps with their adventure, source, dimensions and grid size. Use this when populating scenes to offer the user Plutonium\'s official map as an alternative to their own image. Only finds maps from official content present in 5etools — community adventures will not match.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Map name or partial name, in English' },
            limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
            includePlayerMaps: {
              type: 'boolean',
              description: 'Also include player-facing map variants (default: false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'plutonium-search-adventure',
        description:
          "Check whether Plutonium can import a given adventure (by name), so you can tell the user to import its maps/journals from Plutonium's own importer instead of doing it programmatically. Searches the official adventures + books index (robust) and any loaded homebrew (best-effort; `homebrewLoaded` indicates if homebrew was readable this session). Returns matching adventures with source, level range and chapter count. Informational only — does not import anything.",
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Adventure name or partial name, in English' },
            limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'plutonium-import-map',
        description:
          "Import an official adventure map from Plutonium as a scene (with its correct grid and region pins), using Plutonium's own Map importer. Optionally rename it, place it in a scene folder, and/or replace the background image with the user's own map file (backgroundOverride) — useful to keep Plutonium's grid/setup but show a different image. Requires Plutonium to have a reachable image source configured. Use plutonium-search-maps first to get the exact name/source.",
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact map name in English' },
            source: {
              type: 'string',
              description: 'Adventure/source code (e.g. "LMoP", "CoS"). Optional but recommended.',
            },
            customName: { type: 'string', description: 'Rename the imported scene' },
            folderName: {
              type: 'string',
              description: 'Scene folder to place it in; created if missing',
            },
            backgroundOverride: {
              type: 'string',
              description:
                "Replace the scene background with this image (path relative to user data). Use for the 'Plutonium setup + my image' option.",
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'set-scene-background',
        description:
          "Replace an existing scene's background image (Foundry v14: stored on the scene's base level). Path is relative to the Foundry user data directory.",
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: { type: 'string', description: 'Scene name or ID' },
            imagePath: {
              type: 'string',
              description: 'New background image path (relative to user data)',
            },
          },
          required: ['sceneIdentifier', 'imagePath'],
        },
      },
      {
        name: 'plutonium-search',
        description:
          'Search the full 5etools content bundled with the Plutonium module by name (far more content than the SRD compendiums). Supports many categories: creatures, spells, items, feats, backgrounds, races, optional features (invocations, metamagic...), objects, vehicles, traps, hazards, rewards and roll tables. Returns matching names with source book codes, to be used with plutonium-import. Requires the Plutonium module to be active.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Name or partial name, in English' },
            category: {
              type: 'string',
              enum: [
                'creature',
                'spell',
                'item',
                'feat',
                'background',
                'race',
                'optionalfeature',
                'object',
                'vehicle',
                'trap',
                'hazard',
                'reward',
                'table',
              ],
              description: 'Content category to search (default: creature)',
            },
            limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'plutonium-import',
        description:
          'Import 5etools content into the world using the Plutonium module importer: creatures/objects/vehicles become fully statted actors; spells, items, feats, backgrounds, races, optional features and rewards become world items; traps/hazards become journals; tables become roll tables. Optionally rename the document and place it in a folder (created if missing). Use plutonium-search first to find the exact name/source. Requires the Plutonium module to be active.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Exact content name in English, e.g. "Wolf", "Fireball", "Bag of Holding"',
            },
            category: {
              type: 'string',
              enum: [
                'creature',
                'spell',
                'item',
                'feat',
                'background',
                'race',
                'optionalfeature',
                'object',
                'vehicle',
                'trap',
                'hazard',
                'reward',
                'table',
              ],
              description: 'Content category (default: creature)',
            },
            source: {
              type: 'string',
              description:
                'Source book code (e.g. "MM", "XMM", "PHB", "XPHB", "DMG"). If omitted, the first index match is used.',
            },
            customName: {
              type: 'string',
              description: 'Optional new name for the imported document (e.g. Spanish translation)',
            },
            folderName: {
              type: 'string',
              description:
                'Folder to place the imported document in (of the matching folder type); created automatically if missing',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'place-tokens',
        description:
          "Place actor tokens onto a scene (any scene by name/ID, not just the active one). Tokens are built from each actor's prototype token, so they inherit the actor's art and size and stay linked to the actor sheet. Position is given per token in canvas pixels (x/y) or in 0-based grid cells (gridX/gridY, top-left of the map = 0,0). Each entry can spawn several copies (count) laid out in a small block, and override the token name, disposition (hostile/neutral/friendly/secret), hidden flag and elevation. Use after the actors exist (e.g. imported from Plutonium) to populate encounters.",
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: { type: 'string', description: 'Target scene name or ID' },
            tokens: {
              type: 'array',
              description: 'One or more tokens to place',
              items: {
                type: 'object',
                properties: {
                  actorIdentifier: {
                    type: 'string',
                    description: 'Actor name or ID to spawn a token from',
                  },
                  x: { type: 'number', description: 'Canvas pixel X (top-left). Use with y.' },
                  y: { type: 'number', description: 'Canvas pixel Y (top-left). Use with x.' },
                  gridX: {
                    type: 'number',
                    description: '0-based grid column from the map top-left (alternative to x)',
                  },
                  gridY: {
                    type: 'number',
                    description: '0-based grid row from the map top-left (alternative to y)',
                  },
                  name: { type: 'string', description: 'Override the token name' },
                  disposition: {
                    type: 'string',
                    enum: ['hostile', 'neutral', 'friendly', 'secret'],
                    description: "Token disposition (defaults to the prototype token's)",
                  },
                  hidden: { type: 'boolean', description: 'Create the token hidden from players' },
                  count: {
                    type: 'number',
                    description: 'Place this many copies (1-50), laid out in a block (default: 1)',
                  },
                  elevation: { type: 'number', description: 'Token elevation in scene units' },
                },
                required: ['actorIdentifier'],
              },
            },
          },
          required: ['sceneIdentifier', 'tokens'],
        },
      },
      {
        name: 'get-scene-notes',
        description:
          "Read the map notes (journal pins) on a scene, with each note's linked journal entry and page resolved to names. Use to inspect what an adventure import placed (e.g. one pin per room) and to avoid creating duplicate notes. Defaults to the active scene when no identifier is given.",
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: {
              type: 'string',
              description: 'Scene name or ID (defaults to the active scene)',
            },
          },
        },
      },
      {
        name: 'place-scene-notes',
        description:
          'Place map notes (journal pins) on a scene so each room links to the part of the adventure that describes it. Each note can link to a journal entry (by name/ID) and optionally a specific page within it; clicking the pin opens that journal. Position is given per note in canvas pixels (x/y, the icon centre) or in 0-based grid cells (gridX/gridY = centre of that cell). The label defaults to the linked entry/page name. Use after the journal exists (e.g. imported from Plutonium) to wire rooms to their descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: { type: 'string', description: 'Target scene name or ID' },
            notes: {
              type: 'array',
              description: 'One or more notes to place',
              items: {
                type: 'object',
                properties: {
                  journalIdentifier: {
                    type: 'string',
                    description: 'Journal entry name or ID to link the pin to',
                  },
                  pageName: {
                    type: 'string',
                    description: 'Name of a page within that journal to open (optional)',
                  },
                  headerAnchor: {
                    type: 'string',
                    description:
                      'Header anchor slug within the page to scroll to on click (e.g. "2.-goblin-blind"), so the pin opens the exact room section. Must match the page\'s rendered header id. Stored as the plutonium.journalPageHeaderAnchor flag.',
                  },
                  text: {
                    type: 'string',
                    description: 'Label shown under the pin (defaults to the entry/page name)',
                  },
                  x: {
                    type: 'number',
                    description: 'Canvas pixel X of the icon centre. Use with y.',
                  },
                  y: {
                    type: 'number',
                    description: 'Canvas pixel Y of the icon centre. Use with x.',
                  },
                  gridX: {
                    type: 'number',
                    description: '0-based grid column (centre of that cell; alternative to x)',
                  },
                  gridY: {
                    type: 'number',
                    description: '0-based grid row (centre of that cell; alternative to y)',
                  },
                  icon: {
                    type: 'string',
                    description: 'Icon image path (default: icons/svg/book.svg)',
                  },
                  iconSize: { type: 'number', description: 'Icon size in pixels (default: 40)' },
                  fontSize: {
                    type: 'number',
                    description: 'Label font size in pixels (default: 32)',
                  },
                },
              },
            },
          },
          required: ['sceneIdentifier', 'notes'],
        },
      },
      {
        name: 'delete-scene-notes',
        description:
          'Delete map notes (journal pins) from a scene — by explicit note IDs, or all of them (clearAll). Use to re-run the notes workflow idempotently or to replace a note (e.g. resize the generic map pin). Get note IDs from get-scene-notes.',
        inputSchema: {
          type: 'object',
          properties: {
            sceneIdentifier: { type: 'string', description: 'Target scene name or ID' },
            noteIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of notes to delete (from get-scene-notes)',
            },
            clearAll: {
              type: 'boolean',
              description: 'Delete every note on the scene (ignores noteIds)',
            },
          },
          required: ['sceneIdentifier'],
        },
      },
      {
        name: 'update-journal-page',
        description:
          'Update (or optionally create) a text page inside a journal entry, replacing its HTML content. Use to keep the "Recursos — <campaign>" control-panel journal in sync as the campaign skills progress (set states ⬜🟦🟨🟩⬛ per row). Find the journal by name/ID and the page by name/ID.',
        inputSchema: {
          type: 'object',
          properties: {
            journalIdentifier: { type: 'string', description: 'Journal entry name or ID' },
            pageName: { type: 'string', description: 'Page name to update (or create)' },
            pageId: { type: 'string', description: 'Page ID to update (alternative to pageName)' },
            content: { type: 'string', description: 'New HTML content for the page' },
            newTitle: { type: 'string', description: 'Optional: rename the page' },
            createIfMissing: {
              type: 'boolean',
              description:
                'If the page does not exist, append it (requires pageName). Default false.',
            },
          },
          required: ['journalIdentifier', 'content'],
        },
      },
    ];
  }

  async handleCreateScene(args: any): Promise<any> {
    const schema = z.object({
      name: z.string(),
      imagePath: z.string(),
      folderName: z.string().optional(),
      gridSize: z.number().optional(),
      gridType: z.number().optional(),
      gridDistance: z.number().optional(),
      gridUnits: z.string().optional(),
      padding: z.number().min(0).max(0.5).optional(),
      globalLight: z.boolean().optional(),
      darkness: z.number().min(0).max(1).optional(),
      tokenVision: z.boolean().optional(),
      activate: z.boolean().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Creating scene', { name: params.name, imagePath: params.imagePath });
    return this.query('createScene', params);
  }

  async handleCreateJournal(args: any): Promise<any> {
    const schema = z.object({
      name: z.string(),
      folderName: z.string().optional(),
      pages: z.array(z.object({ name: z.string(), content: z.string() })).min(1),
    });
    const params = schema.parse(args);
    this.logger.info('Creating plain journal', { name: params.name, pages: params.pages.length });
    return this.query('createJournalEntry', {
      name: params.name,
      folderName: params.folderName,
      firstPageName: params.pages[0].name,
      content: params.pages[0].content,
      additionalPages: params.pages.slice(1),
    });
  }

  async handleCreateFolder(args: any): Promise<any> {
    const schema = z.object({
      name: z.string(),
      type: z.enum(['Scene', 'Actor', 'Item', 'JournalEntry']),
      parentName: z.string().optional(),
      color: z.string().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Creating folder', { name: params.name, type: params.type });
    return this.query('createFolder', params);
  }

  async handleUpdateActor(args: any): Promise<any> {
    const schema = z.object({
      actorIdentifier: z.string(),
      img: z.string().optional(),
      tokenImg: z.string().optional(),
      folderName: z.string().optional(),
      newName: z.string().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Updating actor assets', { actor: params.actorIdentifier });
    return this.query('updateActorAssets', params);
  }

  private static readonly PLUTONIUM_CATEGORIES = [
    'creature',
    'spell',
    'item',
    'feat',
    'background',
    'race',
    'optionalfeature',
    'object',
    'vehicle',
    'trap',
    'hazard',
    'reward',
    'table',
  ] as const;

  async handleDeleteDocuments(args: any): Promise<any> {
    const schema = z.object({
      documents: z
        .array(
          z.object({
            kind: z.enum(['actor', 'scene', 'item', 'journal', 'table']),
            identifier: z.string(),
          })
        )
        .optional(),
      folders: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum(['Scene', 'Actor', 'Item', 'JournalEntry']),
            deleteContents: z.boolean().optional(),
          })
        )
        .optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Deleting documents', {
      docs: params.documents?.length ?? 0,
      folders: params.folders?.length ?? 0,
    });
    return this.query('deleteDocuments', params);
  }

  async handleApplyWalls(args: any): Promise<any> {
    const schema = z
      .object({
        sceneIdentifier: z.string(),
        uvttPath: z.string().optional(),
        uvtt: z.any().optional(),
        includeWalls: z.boolean().optional(),
        includeDoors: z.boolean().optional(),
        includeLights: z.boolean().optional(),
        clearExisting: z.boolean().optional(),
      })
      .refine(v => v.uvttPath || v.uvtt, {
        message: 'Provide either uvttPath or uvtt',
      });
    const params = schema.parse(args);
    this.logger.info('Applying walls to scene', { scene: params.sceneIdentifier });
    return this.query('applyWalls', params);
  }

  async handlePlutoniumSearchMaps(args: any): Promise<any> {
    const schema = z.object({
      query: z.string(),
      limit: z.number().min(1).max(50).optional(),
      includePlayerMaps: z.boolean().optional(),
      refresh: z.boolean().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Searching Plutonium maps', { query: params.query });
    return this.query('plutoniumSearchMaps', params);
  }

  async handlePlutoniumSearchAdventure(args: any): Promise<any> {
    const schema = z.object({
      query: z.string(),
      limit: z.number().min(1).max(50).optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Searching Plutonium adventures', { query: params.query });
    return this.query('plutoniumSearchAdventure', params);
  }

  async handlePlutoniumImportMap(args: any): Promise<any> {
    const schema = z.object({
      name: z.string(),
      source: z.string().optional(),
      customName: z.string().optional(),
      folderName: z.string().optional(),
      backgroundOverride: z.string().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Importing Plutonium map', { name: params.name, source: params.source });
    return this.query('plutoniumImportMap', params);
  }

  async handleSetSceneBackground(args: any): Promise<any> {
    const schema = z.object({
      sceneIdentifier: z.string(),
      imagePath: z.string(),
    });
    const params = schema.parse(args);
    this.logger.info('Setting scene background', { scene: params.sceneIdentifier });
    return this.query('setSceneBackground', params);
  }

  async handlePlaceTokens(args: any): Promise<any> {
    const schema = z.object({
      sceneIdentifier: z.string(),
      tokens: z
        .array(
          z.object({
            actorIdentifier: z.string(),
            x: z.number().optional(),
            y: z.number().optional(),
            gridX: z.number().optional(),
            gridY: z.number().optional(),
            name: z.string().optional(),
            disposition: z.enum(['hostile', 'neutral', 'friendly', 'secret']).optional(),
            hidden: z.boolean().optional(),
            count: z.number().min(1).max(50).optional(),
            elevation: z.number().optional(),
          })
        )
        .min(1),
    });
    const params = schema.parse(args);
    this.logger.info('Placing tokens', {
      scene: params.sceneIdentifier,
      specs: params.tokens.length,
    });
    return this.query('placeTokens', params);
  }

  async handleGetSceneNotes(args: any): Promise<any> {
    const schema = z.object({
      sceneIdentifier: z.string().optional(),
      includeRaw: z.boolean().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Reading scene notes', { scene: params.sceneIdentifier ?? '(active)' });
    return this.query('getSceneNotes', params);
  }

  async handlePlaceSceneNotes(args: any): Promise<any> {
    const schema = z.object({
      sceneIdentifier: z.string(),
      notes: z
        .array(
          z.object({
            journalIdentifier: z.string().optional(),
            pageName: z.string().optional(),
            headerAnchor: z.string().optional(),
            text: z.string().optional(),
            x: z.number().optional(),
            y: z.number().optional(),
            gridX: z.number().optional(),
            gridY: z.number().optional(),
            icon: z.string().optional(),
            iconSize: z.number().optional(),
            fontSize: z.number().optional(),
          })
        )
        .min(1),
    });
    const params = schema.parse(args);
    this.logger.info('Placing scene notes', {
      scene: params.sceneIdentifier,
      notes: params.notes.length,
    });
    return this.query('placeSceneNotes', params);
  }

  async handleDeleteSceneNotes(args: any): Promise<any> {
    const schema = z.object({
      sceneIdentifier: z.string(),
      noteIds: z.array(z.string()).optional(),
      clearAll: z.boolean().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Deleting scene notes', {
      scene: params.sceneIdentifier,
      ids: params.noteIds?.length ?? 0,
      clearAll: !!params.clearAll,
    });
    return this.query('deleteSceneNotes', params);
  }

  async handleUpdateJournalPage(args: any): Promise<any> {
    const schema = z.object({
      journalIdentifier: z.string(),
      pageName: z.string().optional(),
      pageId: z.string().optional(),
      content: z.string(),
      newTitle: z.string().optional(),
      createIfMissing: z.boolean().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Updating journal page', {
      journal: params.journalIdentifier,
      page: params.pageName ?? params.pageId,
    });
    return this.query('updateJournalPage', params);
  }

  async handlePlutoniumSearch(args: any): Promise<any> {
    const schema = z.object({
      query: z.string(),
      category: z.enum(WorldBuilderTools.PLUTONIUM_CATEGORIES).optional(),
      limit: z.number().min(1).max(50).optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Searching Plutonium content', {
      query: params.query,
      category: params.category ?? 'creature',
    });
    return this.query('plutoniumSearch', params);
  }

  async handlePlutoniumImport(args: any): Promise<any> {
    const schema = z.object({
      name: z.string(),
      category: z.enum(WorldBuilderTools.PLUTONIUM_CATEGORIES).optional(),
      source: z.string().optional(),
      customName: z.string().optional(),
      folderName: z.string().optional(),
    });
    const params = schema.parse(args);
    this.logger.info('Importing content via Plutonium', {
      name: params.name,
      category: params.category ?? 'creature',
      source: params.source,
    });
    return this.query('plutoniumImport', params);
  }

  private async query(method: string, params: any): Promise<any> {
    try {
      return await this.foundryClient.query(`foundry-mcp-bridge.${method}`, params);
    } catch (error) {
      this.logger.error(`World builder query failed: ${method}`, error);
      throw new Error(
        `${method} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
