/**
 * World Builder adapter layer.
 *
 * Extra capabilities not covered by the core bridge, kept isolated from
 * upstream files (adapter pattern, see CLAUDE.md):
 *  - createScene: create a scene from an existing image in user data
 *  - createFolder: create a document folder (Scene/Actor/Item/JournalEntry)
 *  - updateActorAssets: set portrait/prototype token image/folder/name on an actor
 *  - plutoniumSearch / plutoniumImport: search and import any supported 5etools
 *    content category (creatures, spells, items, feats, backgrounds, races...)
 *    through the Plutonium module's API and bundled data.
 */

declare const game: any;
declare const CONFIG: any;

const PREFIX = 'foundry-mcp-bridge';
const PLUTONIUM_ROUTE = 'modules/plutonium';

type FolderType = 'Scene' | 'Actor' | 'Item' | 'JournalEntry';

interface PlutoniumSearchEntry {
  c: number; // category id (5etools Parser.CAT_ID_*)
  n: string; // display name
  uu: string; // "name|source"
  m?: string; // token/media path
}

interface CategoryConfig {
  /** 5etools search-index category ids */
  catIds: number[];
  /** data files relative to the plutonium data route; %SOURCE% means per-source index lookup */
  indexDir?: string; // dir containing an index.json mapping SOURCE -> file
  files?: string[]; // flat data files
  /** properties inside the data files that hold entry arrays */
  props: string[];
  /** prop passed to Plutonium's ChooseImporter.getImporter */
  importerProp: string;
  /** world collection where imported documents land */
  collection: 'actors' | 'items' | 'journal' | 'tables';
  /** folder document type for that collection */
  folderType: FolderType | 'RollTable';
}

const CATEGORIES: Record<string, CategoryConfig> = {
  creature: {
    catIds: [1],
    indexDir: 'data/bestiary',
    props: ['monster'],
    importerProp: 'monster',
    collection: 'actors',
    folderType: 'Actor',
  },
  spell: {
    catIds: [2],
    indexDir: 'data/spells',
    props: ['spell'],
    importerProp: 'spell',
    collection: 'items',
    folderType: 'Item',
  },
  item: {
    catIds: [4],
    files: ['data/items.json', 'data/items-base.json'],
    props: ['item', 'baseitem', 'itemGroup'],
    importerProp: 'item',
    collection: 'items',
    folderType: 'Item',
  },
  feat: {
    catIds: [7],
    files: ['data/feats.json'],
    props: ['feat'],
    importerProp: 'feat',
    collection: 'items',
    folderType: 'Item',
  },
  background: {
    catIds: [3],
    files: ['data/backgrounds.json'],
    props: ['background'],
    importerProp: 'background',
    collection: 'items',
    folderType: 'Item',
  },
  race: {
    catIds: [10],
    files: ['data/races.json'],
    props: ['race'],
    importerProp: 'race',
    collection: 'items',
    folderType: 'Item',
  },
  optionalfeature: {
    catIds: [8, 22, 23, 26, 27, 28, 29, 32, 33, 34, 37, 38, 39, 54],
    files: ['data/optionalfeatures.json'],
    props: ['optionalfeature'],
    importerProp: 'optionalfeature',
    collection: 'items',
    folderType: 'Item',
  },
  object: {
    catIds: [15],
    files: ['data/objects.json'],
    props: ['object'],
    importerProp: 'object',
    collection: 'actors',
    folderType: 'Actor',
  },
  vehicle: {
    catIds: [31],
    files: ['data/vehicles.json'],
    props: ['vehicle'],
    importerProp: 'vehicle',
    collection: 'actors',
    folderType: 'Actor',
  },
  trap: {
    catIds: [16],
    files: ['data/trapshazards.json'],
    props: ['trap'],
    importerProp: 'trap',
    collection: 'journal',
    folderType: 'JournalEntry',
  },
  hazard: {
    catIds: [17],
    files: ['data/trapshazards.json'],
    props: ['hazard'],
    importerProp: 'hazard',
    collection: 'journal',
    folderType: 'JournalEntry',
  },
  reward: {
    catIds: [11],
    files: ['data/rewards.json'],
    props: ['reward'],
    importerProp: 'reward',
    collection: 'items',
    folderType: 'Item',
  },
  table: {
    catIds: [24, 25],
    files: ['data/tables.json'],
    props: ['table', 'tableGroup'],
    importerProp: 'table',
    collection: 'tables',
    folderType: 'RollTable',
  },
};

export class WorldBuilderHandlers {
  private plutoniumSearchIndex: PlutoniumSearchEntry[] | null = null;
  private dataFileCache: Map<string, any> = new Map();

  registerHandlers(): void {
    CONFIG.queries[`${PREFIX}.createScene`] = this.handleCreateScene.bind(this);
    CONFIG.queries[`${PREFIX}.createFolder`] = this.handleCreateFolder.bind(this);
    CONFIG.queries[`${PREFIX}.updateActorAssets`] = this.handleUpdateActorAssets.bind(this);
    CONFIG.queries[`${PREFIX}.plutoniumSearch`] = this.handlePlutoniumSearch.bind(this);
    CONFIG.queries[`${PREFIX}.plutoniumImport`] = this.handlePlutoniumImport.bind(this);
    CONFIG.queries[`${PREFIX}.deleteDocuments`] = this.handleDeleteDocuments.bind(this);
    CONFIG.queries[`${PREFIX}.applyWalls`] = this.handleApplyWalls.bind(this);
    CONFIG.queries[`${PREFIX}.plutoniumSearchMaps`] = this.handlePlutoniumSearchMaps.bind(this);
    CONFIG.queries[`${PREFIX}.plutoniumImportMap`] = this.handlePlutoniumImportMap.bind(this);
    CONFIG.queries[`${PREFIX}.setSceneBackground`] = this.handleSetSceneBackground.bind(this);
    CONFIG.queries[`${PREFIX}.manageSceneAssets`] = this.handleManageSceneAssets.bind(this);
    CONFIG.queries[`${PREFIX}.manageTables`] = this.handleManageTables.bind(this);
    CONFIG.queries[`${PREFIX}.manageActivities`] = this.handleManageActivities.bind(this);
    CONFIG.queries[`${PREFIX}.manageEffects`] = this.handleManageEffects.bind(this);
    CONFIG.queries[`${PREFIX}.plutoniumSearchAdventure`] =
      this.handlePlutoniumSearchAdventure.bind(this);
    CONFIG.queries[`${PREFIX}.placeTokens`] = this.handlePlaceTokens.bind(this);
    CONFIG.queries[`${PREFIX}.getSceneNotes`] = this.handleGetSceneNotes.bind(this);
    CONFIG.queries[`${PREFIX}.placeSceneNotes`] = this.handlePlaceSceneNotes.bind(this);
    CONFIG.queries[`${PREFIX}.deleteSceneNotes`] = this.handleDeleteSceneNotes.bind(this);
    CONFIG.queries[`${PREFIX}.updateJournalPage`] = this.handleUpdateJournalPage.bind(this);
  }

  private assertGM(): void {
    if (!game.user?.isGM) throw new Error('Access denied');
  }

  /* ------------------------------------------------------------------ */
  /* Folders                                                             */
  /* ------------------------------------------------------------------ */

  private async getOrCreateFolder(
    name: string,
    type: FolderType | 'RollTable',
    parentName?: string,
    color?: string
  ): Promise<any> {
    const folders = game.folders;
    let parentId: string | null = null;
    if (parentName) {
      const parent = folders.find((f: any) => f.type === type && f.name === parentName);
      if (!parent) throw new Error(`Parent folder not found: ${parentName} (${type})`);
      parentId = parent.id;
    }
    const existing = folders.find(
      (f: any) =>
        f.type === type && f.name === name && (parentId ? f.folder?.id === parentId : true)
    );
    if (existing) return existing;

    const FolderCls = (globalThis as any).Folder;
    return FolderCls.create({
      name,
      type,
      folder: parentId,
      color: color ?? null,
      sorting: 'a',
    });
  }

  async handleCreateFolder(data: {
    name: string;
    type: FolderType;
    parentName?: string;
    color?: string;
  }): Promise<any> {
    this.assertGM();
    if (!data?.name || !data?.type) throw new Error('name and type are required');
    const folder = await this.getOrCreateFolder(data.name, data.type, data.parentName, data.color);
    return { success: true, folderId: folder.id, name: folder.name, type: folder.type };
  }

  /* ------------------------------------------------------------------ */
  /* Deletion (cleanup / re-runs)                                         */
  /* ------------------------------------------------------------------ */

  private getWorldCollection(kind: string): any {
    switch (kind) {
      case 'actor':
        return game.actors;
      case 'scene':
        return game.scenes;
      case 'item':
        return game.items;
      case 'journal':
        return game.journal;
      case 'table':
        return game.tables;
      default:
        throw new Error(
          `Unknown document kind "${kind}". Use: actor, scene, item, journal, table.`
        );
    }
  }

  async handleDeleteDocuments(data: {
    documents?: Array<{ kind: string; identifier: string }>;
    folders?: Array<{ name: string; type: FolderType; deleteContents?: boolean }>;
  }): Promise<any> {
    this.assertGM();
    const deleted: any[] = [];
    const notFound: any[] = [];

    for (const d of data.documents ?? []) {
      const collection = this.getWorldCollection(d.kind);
      const doc =
        collection?.get(d.identifier) ??
        collection?.getName(d.identifier) ??
        collection?.find((x: any) => x.name?.toLowerCase() === d.identifier.toLowerCase());
      if (!doc) {
        notFound.push({ kind: d.kind, identifier: d.identifier });
        continue;
      }
      await doc.delete();
      deleted.push({ kind: d.kind, name: doc.name, id: doc.id });
    }

    for (const f of data.folders ?? []) {
      const folder = game.folders?.find((x: any) => x.type === f.type && x.name === f.name);
      if (!folder) {
        notFound.push({ kind: 'folder', identifier: `${f.name} (${f.type})` });
        continue;
      }
      // deleteContents: delete documents+subfolders; otherwise orphan them
      await folder.delete({
        deleteSubfolders: !!f.deleteContents,
        deleteContents: !!f.deleteContents,
      });
      deleted.push({ kind: 'folder', name: folder.name, type: f.type, id: folder.id });
    }

    return { success: true, deleted, notFound };
  }

  /* ------------------------------------------------------------------ */
  /* Scenes                                                              */
  /* ------------------------------------------------------------------ */

  private loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error(`Could not load image: ${src}`));
      img.src = src.split('/').map(encodeURIComponent).join('/');
    });
  }

  async handleCreateScene(data: {
    name: string;
    imagePath: string;
    folderName?: string;
    gridSize?: number;
    gridType?: number;
    gridDistance?: number;
    gridUnits?: string;
    padding?: number;
    globalLight?: boolean;
    darkness?: number;
    tokenVision?: boolean;
    activate?: boolean;
  }): Promise<any> {
    this.assertGM();
    if (!data?.name || !data?.imagePath) throw new Error('name and imagePath are required');

    const imagePath = data.imagePath.replace(/\\/g, '/');
    const { width, height } = await this.loadImageDimensions(imagePath);

    let folderId: string | null = null;
    if (data.folderName) {
      const folder = await this.getOrCreateFolder(data.folderName, 'Scene');
      folderId = folder.id;
    }

    const sceneData: any = {
      name: data.name,
      width,
      height,
      padding: data.padding ?? 0.1,
      grid: {
        type: data.gridType ?? 1,
        size: data.gridSize ?? 100,
        distance: data.gridDistance ?? 5,
        units: data.gridUnits ?? 'ft',
      },
      tokenVision: data.tokenVision ?? true,
      environment: {
        darknessLevel: data.darkness ?? 0,
        globalLight: { enabled: data.globalLight ?? true },
      },
      folder: folderId,
      // Foundry v14: the background image lives on a child Level document, not
      // on the scene itself (scene.background is only a back-compat getter that
      // reads from levels[0]). Create the base level carrying the background.
      levels: [
        {
          name: 'Base',
          elevation: { bottom: 0, top: 20 },
          background: { src: imagePath },
        },
      ],
    };

    const SceneCls = (globalThis as any).Scene;
    const scene = await SceneCls.create(sceneData);
    if (!scene) throw new Error('Scene.create returned no document');

    const persistedSrc =
      scene._source?.levels?.[0]?.background?.src ?? scene.background?.src ?? null;

    // Generate thumbnail so the scene shows a preview in the sidebar
    try {
      const thumb = await scene.createThumbnail();
      if (thumb?.thumb) await scene.update({ thumb: thumb.thumb });
    } catch {
      /* thumbnails are cosmetic — ignore failures */
    }

    if (data.activate) await scene.activate();

    return {
      success: true,
      sceneId: scene.id,
      name: scene.name,
      width,
      height,
      gridSize: sceneData.grid.size,
      folder: data.folderName ?? null,
      activated: !!data.activate,
      backgroundSrc: persistedSrc,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Walls / doors / lights                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Apply walls, doors and (optionally) lights to a scene from Universal VTT
   * data (.uvtt/.dd2vtt/.df2vtt — the same data dd-import consumes) or from an
   * inline payload. UVTT coordinates are in grid units; they are converted to
   * Foundry canvas pixels using the source pixels_per_grid and the scene's
   * computed sceneX/sceneY padding offset, so walls land exactly on the map.
   */
  async handleApplyWalls(data: {
    sceneIdentifier: string;
    uvttPath?: string;
    uvtt?: any;
    includeWalls?: boolean;
    includeDoors?: boolean;
    includeLights?: boolean;
    clearExisting?: boolean;
  }): Promise<any> {
    this.assertGM();
    if (!data?.sceneIdentifier) throw new Error('sceneIdentifier is required');

    const scene =
      game.scenes?.get(data.sceneIdentifier) ||
      game.scenes?.getName(data.sceneIdentifier) ||
      game.scenes?.find((s: any) => s.name?.toLowerCase() === data.sceneIdentifier.toLowerCase());
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);

    let uvtt = data.uvtt;
    if (!uvtt && data.uvttPath) {
      const path = data.uvttPath.replace(/\\/g, '/');
      const resp = await fetch(path.split('/').map(encodeURIComponent).join('/'));
      if (!resp.ok) throw new Error(`Could not read UVTT file: ${path} (HTTP ${resp.status})`);
      uvtt = await resp.json();
    }
    if (!uvtt) throw new Error('Provide either uvtt (inline) or uvttPath');

    const includeWalls = data.includeWalls ?? true;
    const includeDoors = data.includeDoors ?? true;
    const includeLights = data.includeLights ?? false;

    // Coordinate conversion: grid units -> canvas pixels.
    const dim = scene.dimensions; // computed SceneDimensions (sceneX, sceneY, size)
    const ppg = uvtt.resolution?.pixels_per_grid ?? scene.grid?.size ?? dim?.size ?? 100;
    const ox = dim?.sceneX ?? 0;
    const oy = dim?.sceneY ?? 0;
    const conv = (p: any): [number, number] => [
      Math.round(ox + (p.x ?? p[0]) * ppg),
      Math.round(oy + (p.y ?? p[1]) * ppg),
    ];

    const C = (globalThis as any).CONST;
    const N = C.WALL_SENSE_TYPES.NORMAL;
    const MOVE = C.WALL_MOVEMENT_TYPES.NORMAL;

    const wallDocs: any[] = [];

    // Walls: line_of_sight + objects_line_of_sight are arrays of polylines
    if (includeWalls) {
      const polylines = [...(uvtt.line_of_sight ?? []), ...(uvtt.objects_line_of_sight ?? [])];
      for (const line of polylines) {
        for (let i = 0; i < line.length - 1; i++) {
          const [x1, y1] = conv(line[i]);
          const [x2, y2] = conv(line[i + 1]);
          if (x1 === x2 && y1 === y2) continue;
          wallDocs.push({ c: [x1, y1, x2, y2], move: MOVE, sight: N, sound: N, light: N });
        }
      }
    }

    // Doors: portals (each has a bounds pair)
    let doorCount = 0;
    if (includeDoors) {
      for (const portal of uvtt.portals ?? []) {
        const b = portal.bounds;
        if (!b || b.length < 2) continue;
        const [x1, y1] = conv(b[0]);
        const [x2, y2] = conv(b[b.length - 1]);
        if (x1 === x2 && y1 === y2) continue;
        wallDocs.push({
          c: [x1, y1, x2, y2],
          move: MOVE,
          sight: N,
          sound: N,
          light: N,
          door: C.WALL_DOOR_TYPES.DOOR,
          ds: portal.closed === false ? C.WALL_DOOR_STATES.OPEN : C.WALL_DOOR_STATES.CLOSED,
        });
        doorCount++;
      }
    }

    // Lights
    const lightDocs: any[] = [];
    if (includeLights) {
      const distance = scene.grid?.distance ?? dim?.distance ?? 5;
      for (const l of uvtt.lights ?? []) {
        const [x, y] = conv(l.position ?? l);
        const rangeGrid = l.range ?? 0;
        const dimRadius = rangeGrid * distance;
        lightDocs.push({
          x,
          y,
          config: {
            dim: dimRadius,
            bright: dimRadius / 2,
            color: l.color ? `#${String(l.color).replace(/^#/, '').slice(0, 6)}` : null,
            alpha: Math.min(Math.max(l.intensity ?? 0.5, 0), 1),
          },
        });
      }
    }

    if (data.clearExisting) {
      const wallIds = scene.walls?.map((w: any) => w.id) ?? [];
      if (wallIds.length) await scene.deleteEmbeddedDocuments('Wall', wallIds);
      if (includeLights) {
        const lightIds = scene.lights?.map((l: any) => l.id) ?? [];
        if (lightIds.length) await scene.deleteEmbeddedDocuments('AmbientLight', lightIds);
      }
    }

    if (wallDocs.length) await scene.createEmbeddedDocuments('Wall', wallDocs);
    if (lightDocs.length) await scene.createEmbeddedDocuments('AmbientLight', lightDocs);

    return {
      success: true,
      scene: scene.name,
      walls: wallDocs.length - doorCount,
      doors: doorCount,
      lights: lightDocs.length,
      pixelsPerGrid: ppg,
      offset: { x: ox, y: oy },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Plutonium maps (official adventure scenes)                          */
  /* ------------------------------------------------------------------ */

  private plutoniumMapEntries: any[] | null = null;
  public lastMapsDebug: any = {};

  private pushMapEntry(
    out: any[],
    img: any,
    meta: { source: string; adventure: string; chapter: string; brew: boolean }
  ): void {
    if (!img || (img.imageType !== 'map' && img.imageType !== 'mapPlayer')) return;
    if (!img.href) return;
    out.push({
      name: img.title ?? '(untitled)',
      source: meta.source,
      adventure: meta.adventure,
      chapter: meta.chapter,
      imageType: img.imageType,
      href: img.href,
      path: img.href?.path ?? img.href?.url ?? null,
      width: img.width ?? null,
      height: img.height ?? null,
      grid: img.grid ?? null,
      mapRegions: img.mapRegions ?? null,
      id: img.id ?? null,
      brew: meta.brew,
    });
  }

  /** Recursively collect map image entries from arbitrary adventure/book content. */
  private collectMapsDeep(
    node: any,
    out: any[],
    meta: { source: string; adventure: string; brew: boolean },
    chapter: string
  ): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) this.collectMapsDeep(child, out, meta, chapter);
      return;
    }
    if (node.type === 'image' && (node.imageType === 'map' || node.imageType === 'mapPlayer')) {
      this.pushMapEntry(out, node, { ...meta, chapter });
    }
    const chap = typeof node.name === 'string' && Array.isArray(node.entries) ? node.name : chapter;
    for (const k of Object.keys(node)) {
      if (k === 'href') continue;
      this.collectMapsDeep(node[k], out, meta, chap);
    }
  }

  /** Official maps (gendata-maps.json) + brew maps (loaded homebrew adventures/books). */
  private async getPlutoniumMapEntries(): Promise<any[]> {
    if (this.plutoniumMapEntries) return this.plutoniumMapEntries;
    const entries: any[] = [];
    const debug: any = { official: 0, brew: 0 };

    // Official, pre-indexed
    try {
      const raw = await this.fetchJson(`${PLUTONIUM_ROUTE}/data/generated/gendata-maps.json`);
      for (const advKey of Object.keys(raw)) {
        const adv = raw[advKey];
        for (const chapter of adv.chapters ?? []) {
          for (const img of chapter.images ?? []) {
            this.pushMapEntry(entries, img, {
              source: adv.source ?? advKey,
              adventure: adv.name ?? advKey,
              chapter: chapter.name ?? '',
              brew: false,
            });
          }
        }
      }
      debug.official = entries.length;
    } catch (e) {
      debug.officialError = e instanceof Error ? e.message : String(e);
    }

    // Brew (homebrew loaded into Plutonium, lives in IndexedDB).
    // Maps can live under several keys depending on Plutonium/brew version, so
    // deep-walk the whole brew object for map image entries.
    try {
      // Homebrew lives in two channels: BrewUtil2 (user homebrew) and
      // PrereleaseUtil (prerelease). Both expose pGetBrew, which returns the
      // in-memory cache. The cache is warm once Plutonium's importer has loaded
      // it this session (we must NOT clear it — there is nothing to re-read from
      // local storage; Plutonium loads brew from its repo when the importer opens).
      const before = entries.length;
      const brews: any[] = [];
      for (const g of ['BrewUtil2', 'PrereleaseUtil']) {
        const B = (globalThis as any)[g];
        if (!B?.pGetBrew) continue;
        try {
          const got = await B.pGetBrew();
          if (Array.isArray(got)) brews.push(...got);
        } catch {
          /* best-effort */
        }
      }
      if (Array.isArray(brews) && brews.length) {
        debug.brewDocs = brews.length;
        for (const doc of brews) {
          const body = doc?.body ?? doc;
          if (!body || typeof body !== 'object') continue;
          // name lookup from adventure/book metadata in this brew
          const nameBySource: Record<string, string> = {};
          for (const metaKey of ['adventure', 'book']) {
            for (const m of body[metaKey] ?? []) {
              if (m?.source) nameBySource[String(m.source).toLowerCase()] = m.name ?? m.source;
            }
          }
          const out: any[] = [];
          this.collectMapsDeep(
            body,
            out,
            { source: 'HOMEBREW', adventure: '(homebrew)', brew: true },
            ''
          );
          for (const e of out) {
            const src = (e.source ?? '').toString().toLowerCase();
            if (src && nameBySource[src]) e.adventure = nameBySource[src];
            else if (Object.keys(nameBySource).length === 1) {
              e.adventure = Object.values(nameBySource)[0];
            }
          }
          entries.push(...out);
        }
      } else {
        debug.brewDocs = Array.isArray(brews) ? 0 : 'not-array';
      }
      debug.brew = entries.length - before;
    } catch (e) {
      debug.brewError = e instanceof Error ? e.message : String(e);
    }

    this.lastMapsDebug = debug;
    this.plutoniumMapEntries = entries;
    return entries;
  }

  async handlePlutoniumSearchMaps(data: {
    query: string;
    limit?: number;
    includePlayerMaps?: boolean;
    refresh?: boolean;
  }): Promise<any> {
    this.assertGM();
    this.getPlutoniumApi(); // fail early if Plutonium missing
    if (!data?.query) throw new Error('query is required');
    if (data.refresh) this.plutoniumMapEntries = null;
    const limit = Math.min(data.limit ?? 20, 50);
    const q = data.query.toLowerCase();
    const entries = await this.getPlutoniumMapEntries();
    const matches = entries
      .filter(e => (data.includePlayerMaps ? true : e.imageType === 'map'))
      .filter(e => e.name.toLowerCase().includes(q))
      .slice(0, limit)
      .map(e => ({
        name: e.name,
        source: e.source,
        adventure: e.adventure,
        chapter: e.chapter,
        imageType: e.imageType,
        width: e.width,
        height: e.height,
        gridSize: e.grid?.size ?? null,
        gridType: e.grid?.type ?? null,
      }));
    return {
      success: true,
      total: matches.length,
      results: matches,
      officialMapsIndexed: this.lastMapsDebug?.official ?? 0,
      homebrewLoaded: (this.lastMapsDebug?.brewDocs ?? 0) > 0,
    };
  }

  /**
   * Check whether Plutonium can import a given adventure (official, robust; plus
   * loaded homebrew, best-effort). Informational only — it does NOT import. The
   * user runs Plutonium's Adventure/Maps importer for the matched adventure,
   * which reliably brings in its maps (including homebrew) and journals.
   */
  async handlePlutoniumSearchAdventure(data: { query: string; limit?: number }): Promise<any> {
    this.assertGM();
    this.getPlutoniumApi();
    if (!data?.query) throw new Error('query is required');
    const q = data.query.toLowerCase();
    const limit = Math.min(data.limit ?? 20, 50);
    const results: any[] = [];

    // Official adventures + books
    for (const [file, prop] of [
      ['data/adventures.json', 'adventure'],
      ['data/books.json', 'book'],
    ] as const) {
      try {
        const raw = await this.fetchJson(`${PLUTONIUM_ROUTE}/${file}`);
        for (const a of raw[prop] ?? []) {
          if (!a.name || !a.name.toLowerCase().includes(q)) continue;
          results.push({
            name: a.name,
            source: a.source ?? a.id,
            type: prop,
            origin: 'official',
            storyline: a.storyline ?? null,
            level: a.level ? `${a.level.start ?? '?'}-${a.level.end ?? '?'}` : null,
            chapters: Array.isArray(a.contents) ? a.contents.length : null,
          });
        }
      } catch {
        /* ignore */
      }
    }

    // Loaded homebrew (best-effort; only present if the brew is warm this session)
    let homebrewLoaded = false;
    try {
      for (const g of ['BrewUtil2', 'PrereleaseUtil']) {
        const B = (globalThis as any)[g];
        if (!B?.pGetBrew) continue;
        const brews = await B.pGetBrew();
        if (Array.isArray(brews)) {
          for (const doc of brews) {
            const body = doc?.body ?? doc;
            for (const prop of ['adventure', 'book']) {
              for (const a of body?.[prop] ?? []) {
                homebrewLoaded = true;
                if (a.name?.toLowerCase().includes(q)) {
                  results.push({
                    name: a.name,
                    source: a.source ?? a.id,
                    type: prop,
                    origin: 'homebrew',
                    storyline: a.storyline ?? null,
                    level: null,
                    chapters: null,
                  });
                }
              }
            }
          }
        }
      }
    } catch {
      /* ignore */
    }

    return {
      success: true,
      total: results.length,
      results: results.slice(0, limit),
      homebrewLoaded,
    };
  }

  async handlePlutoniumImportMap(data: {
    name: string;
    source?: string;
    customName?: string;
    folderName?: string;
    backgroundOverride?: string;
  }): Promise<any> {
    this.assertGM();
    if (!data?.name) throw new Error('name is required');
    const api = this.getPlutoniumApi();

    const entries = await this.getPlutoniumMapEntries();
    const nameLc = data.name.toLowerCase();
    const srcLc = data.source?.toLowerCase();
    const isMap = (e: any) => e.imageType === 'map' || e.imageType === 'mapPlayer';
    const entry =
      entries.find(
        e =>
          e.name.toLowerCase() === nameLc &&
          isMap(e) &&
          (srcLc ? e.source.toLowerCase() === srcLc : true)
      ) ?? entries.find(e => e.name.toLowerCase() === nameLc && isMap(e));
    if (!entry) throw new Error(`Map not found in Plutonium: ${data.name}`);

    // Drive Plutonium's Map importer with a properly-shaped entry.
    const imp = await api.importer?.pGetImporter?.({ prop: 'map' });
    if (!imp?.pImportEntry) {
      throw new Error('Plutonium map importer not available (pGetImporter prop:map)');
    }
    const impEntry = {
      name: entry.name,
      source: entry.source,
      imageType: entry.imageType,
      href: entry.href,
      width: entry.width,
      height: entry.height,
      grid: entry.grid,
      mapRegions: entry.mapRegions,
      id: entry.id,
      corpusName: entry.adventure,
      _chapterName: entry.chapter,
    };

    const ImportOpts = api.importer.ImportOpts;
    let importMeta: any;
    try {
      importMeta = await imp.pImportEntry(impEntry, ImportOpts ? new ImportOpts({}) : undefined);
    } catch (e) {
      throw new Error(
        `Plutonium map import failed (likely the image source is not configured/reachable in Plutonium settings): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }

    const scene =
      importMeta?.imported?.[0]?.document ??
      game.scenes?.getName(entry.name) ??
      game.scenes?.find((s: any) => s.name === entry.name);
    if (!scene?.id) {
      return {
        success: true,
        warning: 'Import ran but the scene could not be located for post-processing',
        name: entry.name,
        source: entry.source,
      };
    }

    if (data.customName) await scene.update({ name: data.customName });
    if (data.folderName) {
      const folder = await this.getOrCreateFolder(data.folderName, 'Scene');
      await scene.update({ folder: folder.id });
    }
    let backgroundReplaced = false;
    if (data.backgroundOverride) {
      await this.setLevelBackground(scene, data.backgroundOverride.replace(/\\/g, '/'));
      backgroundReplaced = true;
    }

    return {
      success: true,
      sceneId: scene.id,
      name: scene.name,
      source: entry.source,
      adventure: entry.adventure,
      gridSize: entry.grid?.size ?? null,
      folder: data.folderName ?? null,
      backgroundReplaced,
    };
  }

  /** Set a scene's background image (v14: lives on the first Level document). */
  private async setLevelBackground(scene: any, imagePath: string): Promise<void> {
    // scene.levels is an EmbeddedCollection (Map-like), not an array — use
    // .contents[0] to get the first Level document (with a real `.id`).
    const level = scene.levels?.contents?.[0];
    if (level?.id) {
      await scene.updateEmbeddedDocuments('Level', [
        { _id: level.id, background: { src: imagePath } },
      ]);
    } else {
      // No level yet: create the base level carrying the background
      await scene.createEmbeddedDocuments('Level', [
        { name: 'Base', elevation: { bottom: 0, top: 20 }, background: { src: imagePath } },
      ]);
    }
  }

  async handleSetSceneBackground(data: {
    sceneIdentifier: string;
    imagePath: string;
  }): Promise<any> {
    this.assertGM();
    if (!data?.sceneIdentifier || !data?.imagePath) {
      throw new Error('sceneIdentifier and imagePath are required');
    }
    const scene =
      game.scenes?.get(data.sceneIdentifier) ||
      game.scenes?.getName(data.sceneIdentifier) ||
      game.scenes?.find((s: any) => s.name?.toLowerCase() === data.sceneIdentifier.toLowerCase());
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);
    await this.setLevelBackground(scene, data.imagePath.replace(/\\/g, '/'));
    return { success: true, scene: scene.name, imagePath: data.imagePath };
  }

  /* ------------------------------------------------------------------ */
  /* Scene assets (background / foreground / tiles)                       */
  /* ------------------------------------------------------------------ */

  /** Find a scene by id or name (case-insensitive). */
  private findScene(identifier: string): any {
    return (
      game.scenes?.get(identifier) ||
      game.scenes?.getName(identifier) ||
      game.scenes?.find((s: any) => s.name?.toLowerCase() === identifier.toLowerCase()) ||
      null
    );
  }

  /**
   * Where an asset path lives, which is what decides whether a world backup
   * would carry it along:
   *  - `world`    inside worlds/<this world>/ — travels with the world
   *  - `remote`   http(s) URL — depends on someone else's server staying up
   *  - `core`     Foundry/system built-in art — always present, leave alone
   *  - `external` anywhere else under Data (moulinette/, modules/, assets/…) — lost on backup
   */
  private classifyAssetPath(src: string): 'world' | 'remote' | 'core' | 'external' | 'empty' {
    if (!src) return 'empty';
    if (/^https?:\/\//i.test(src)) return 'remote';
    const decoded = this.decodePath(src);
    const worldPrefix = `worlds/${(game as any).world?.id}/`;
    if (decoded.startsWith(worldPrefix)) return 'world';
    if (/^(icons|ui|systems|cards|sounds)\//i.test(decoded)) return 'core';
    return 'external';
  }

  /** Foundry stores asset paths URL-encoded; the filesystem needs them decoded. */
  private decodePath(src: string): string {
    try {
      return decodeURIComponent(src);
    } catch {
      return src;
    }
  }

  /** Read the tile documents of a scene, whichever schema level holds them. */
  private getSceneTiles(scene: any): any[] {
    const collect = (container: any): any[] => {
      const tiles = container?.tiles;
      if (!tiles) return [];
      return typeof tiles.contents !== 'undefined' ? tiles.contents : Array.from(tiles);
    };

    const direct = collect(scene);
    if (direct.length > 0) return direct;

    // Fall back to per-level tiles if a future schema moves them there.
    const levels = scene.levels?.contents ?? [];
    return levels.flatMap((level: any) => collect(level));
  }

  /**
   * Inspect or rewrite the image assets a scene points at: base-level
   * background and foreground plus every tile texture.
   *
   * "list" is the audit pass — with onlyExternal it returns just the assets that
   * a world backup would leave behind. "update" rewrites the paths after the
   * caller has moved the files.
   */
  async handleManageSceneAssets(data: {
    action: 'list' | 'update';
    sceneIdentifier?: string;
    onlyExternal?: boolean;
    background?: string;
    foreground?: string;
    tiles?: Array<{ id: string; src: string }>;
  }): Promise<any> {
    this.assertGM();

    const action = data?.action;
    if (action !== 'list' && action !== 'update') {
      throw new Error('action must be "list" or "update"');
    }

    if (action === 'list') {
      const onlyExternal = data.onlyExternal === true;
      const scenes = data.sceneIdentifier
        ? [this.findScene(data.sceneIdentifier)].filter(Boolean)
        : Array.from((game.scenes as any) ?? []);
      if (data.sceneIdentifier && scenes.length === 0) {
        throw new Error(`Scene not found: ${data.sceneIdentifier}`);
      }

      const describe = (
        kind: string,
        src: string | null | undefined,
        extra: Record<string, any> = {}
      ): Record<string, any> | null => {
        const location = this.classifyAssetPath(src ?? '');
        if (location === 'empty') return null;
        if (onlyExternal && location !== 'external' && location !== 'remote') return null;
        return {
          kind,
          src,
          path: this.decodePath(src ?? ''),
          location,
          ...extra,
        };
      };

      const result: Array<Record<string, any>> = [];
      let scenesWithFindings = 0;

      for (const scene of scenes as any[]) {
        const source = scene._source?.levels?.[0] ?? {};
        const assets: Array<Record<string, any>> = [];

        const background = describe(
          'background',
          source.background?.src ?? scene.background?.src ?? null
        );
        if (background) assets.push(background);

        const foreground = describe('foreground', source.foreground?.src ?? null);
        if (foreground) assets.push(foreground);

        for (const tile of this.getSceneTiles(scene)) {
          const tileSrc = tile._source?.texture?.src ?? tile.texture?.src ?? null;
          const entry = describe('tile', tileSrc, { tileId: tile.id });
          if (entry) assets.push(entry);
        }

        if (assets.length === 0) continue;
        scenesWithFindings++;
        result.push({
          sceneId: scene.id,
          sceneName: scene.name,
          tileCount: this.getSceneTiles(scene).length,
          assets,
        });
      }

      return {
        world: (game as any).world?.id ?? null,
        scenesScanned: (scenes as any[]).length,
        scenesWithFindings,
        scenes: result,
      };
    }

    // ---- update -------------------------------------------------------------
    if (!data.sceneIdentifier) throw new Error('sceneIdentifier is required for "update"');
    const scene = this.findScene(data.sceneIdentifier);
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);

    const applied: Array<Record<string, any>> = [];

    if (data.background) {
      await this.setLevelBackground(scene, data.background.replace(/\\/g, '/'));
      applied.push({ kind: 'background', src: data.background });
    }

    if (data.foreground) {
      const level = scene.levels?.contents?.[0];
      if (!level?.id) throw new Error('Scene has no base level to hold a foreground');
      await scene.updateEmbeddedDocuments('Level', [
        { _id: level.id, foreground: { src: data.foreground.replace(/\\/g, '/') } },
      ]);
      applied.push({ kind: 'foreground', src: data.foreground });
    }

    if (Array.isArray(data.tiles) && data.tiles.length > 0) {
      const known = new Map<string, any>(
        this.getSceneTiles(scene).map((tile: any) => [tile.id, tile])
      );
      const patches: Array<Record<string, any>> = [];
      for (const entry of data.tiles) {
        if (!entry?.id || !entry?.src) {
          throw new Error('each tiles[] entry needs "id" and "src"');
        }
        if (!known.has(entry.id)) {
          throw new Error(`Tile "${entry.id}" not found on scene "${scene.name}"`);
        }
        patches.push({ _id: entry.id, texture: { src: entry.src.replace(/\\/g, '/') } });
        applied.push({ kind: 'tile', tileId: entry.id, src: entry.src });
      }
      await scene.updateEmbeddedDocuments('Tile', patches);
    }

    if (applied.length === 0) {
      throw new Error('nothing to update: pass background, foreground and/or tiles');
    }

    return { success: true, sceneId: scene.id, sceneName: scene.name, applied };
  }

  /* ------------------------------------------------------------------ */
  /* Tokens                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Place actor tokens onto a scene (any scene, not just the active one).
   * Position can be given in canvas pixels (x/y) or in 0-based grid cells
   * (gridX/gridY, converted with the scene's padding offset like apply-walls).
   * Each spec can spawn `count` copies (offset into a small grid block) and
   * override name/disposition/hidden/elevation. Tokens are built from the
   * actor's prototype token via getTokenDocument so they inherit art/size and
   * stay linked to the actor.
   */
  async handlePlaceTokens(data: {
    sceneIdentifier: string;
    tokens: Array<{
      actorIdentifier: string;
      x?: number;
      y?: number;
      gridX?: number;
      gridY?: number;
      name?: string;
      disposition?: 'hostile' | 'neutral' | 'friendly' | 'secret';
      hidden?: boolean;
      count?: number;
      elevation?: number;
    }>;
  }): Promise<any> {
    this.assertGM();
    if (!data?.sceneIdentifier) throw new Error('sceneIdentifier is required');
    if (!Array.isArray(data.tokens) || data.tokens.length === 0) {
      throw new Error('tokens must be a non-empty array');
    }

    const scene =
      game.scenes?.get(data.sceneIdentifier) ||
      game.scenes?.getName(data.sceneIdentifier) ||
      game.scenes?.find((s: any) => s.name?.toLowerCase() === data.sceneIdentifier.toLowerCase());
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);

    const dim = scene.dimensions; // computed SceneDimensions
    const gridSize = scene.grid?.size ?? dim?.size ?? 100;
    const ox = dim?.sceneX ?? 0;
    const oy = dim?.sceneY ?? 0;

    const C = (globalThis as any).CONST;
    const DISPOSITIONS: Record<string, number> = {
      hostile: C.TOKEN_DISPOSITIONS.HOSTILE,
      neutral: C.TOKEN_DISPOSITIONS.NEUTRAL,
      friendly: C.TOKEN_DISPOSITIONS.FRIENDLY,
      secret: C.TOKEN_DISPOSITIONS.SECRET,
    };

    const toCreate: any[] = [];
    const meta: Array<{ actor: string; x: number; y: number }> = [];
    const failures: Array<{ actorIdentifier: string; reason: string }> = [];

    for (const spec of data.tokens) {
      const actor =
        game.actors?.get(spec.actorIdentifier) ||
        game.actors?.getName(spec.actorIdentifier) ||
        game.actors?.find((a: any) => a.name?.toLowerCase() === spec.actorIdentifier.toLowerCase());
      if (!actor) {
        failures.push({ actorIdentifier: spec.actorIdentifier, reason: 'actor not found' });
        continue;
      }

      // Resolve base pixel position (top-left of the token on the canvas).
      let baseX: number;
      let baseY: number;
      if (typeof spec.x === 'number' && typeof spec.y === 'number') {
        baseX = spec.x;
        baseY = spec.y;
      } else if (typeof spec.gridX === 'number' && typeof spec.gridY === 'number') {
        baseX = ox + spec.gridX * gridSize;
        baseY = oy + spec.gridY * gridSize;
      } else {
        // Fallback: roughly the centre of the map, snapped to the grid.
        const w = dim?.sceneWidth ?? scene.width ?? gridSize;
        const h = dim?.sceneHeight ?? scene.height ?? gridSize;
        baseX = ox + Math.floor(w / 2 / gridSize) * gridSize;
        baseY = oy + Math.floor(h / 2 / gridSize) * gridSize;
      }

      const count = Math.max(1, Math.min(spec.count ?? 1, 50));
      for (let i = 0; i < count; i++) {
        // Lay multiple copies out in a small block so they don't stack.
        const dx = (i % 5) * gridSize;
        const dy = Math.floor(i / 5) * gridSize;
        const overrides: any = { x: baseX + dx, y: baseY + dy };
        if (spec.name) overrides.name = spec.name;
        if (spec.hidden !== undefined) overrides.hidden = spec.hidden;
        if (spec.elevation !== undefined) overrides.elevation = spec.elevation;
        if (spec.disposition && spec.disposition in DISPOSITIONS) {
          overrides.disposition = DISPOSITIONS[spec.disposition];
        }
        // getTokenDocument merges prototypeToken + overrides and links the actor.
        const tokenDoc = await actor.getTokenDocument(overrides);
        toCreate.push(tokenDoc.toObject());
        meta.push({ actor: actor.name, x: overrides.x, y: overrides.y });
      }
    }

    let created: any[] = [];
    if (toCreate.length) {
      created = await scene.createEmbeddedDocuments('Token', toCreate);
    }

    return {
      success: true,
      scene: scene.name,
      placed: created.length,
      tokens: created.map((t: any) => ({ id: t.id, name: t.name, x: t.x, y: t.y })),
      failures: failures.length ? failures : undefined,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Map notes (journal pins)                                            */
  /* ------------------------------------------------------------------ */

  private resolveScene(identifier?: string): any {
    if (!identifier) return game.scenes?.current ?? null;
    return (
      game.scenes?.get(identifier) ||
      game.scenes?.getName(identifier) ||
      game.scenes?.find((s: any) => s.name?.toLowerCase() === identifier.toLowerCase()) ||
      null
    );
  }

  /**
   * Read the map notes (journal pins) on a scene, with their linked journal
   * entry/page resolved to names. Useful to inspect what an adventure import
   * placed and to avoid creating duplicates.
   */
  async handleGetSceneNotes(data: {
    sceneIdentifier?: string;
    includeRaw?: boolean;
  }): Promise<any> {
    this.assertGM();
    const scene = this.resolveScene(data?.sceneIdentifier);
    if (!scene) throw new Error(`Scene not found: ${data?.sceneIdentifier ?? '(no active scene)'}`);

    const notes = scene.notes.contents ?? scene.notes;
    return {
      success: true,
      scene: scene.name,
      sceneId: scene.id,
      count: notes.length,
      notes: notes.map((n: any) => {
        const entry = n.entryId ? game.journal?.get(n.entryId) : null;
        const page = entry && n.pageId ? entry.pages?.get(n.pageId) : null;
        const base: any = {
          id: n.id,
          text: n.text || entry?.name || '',
          entryId: n.entryId ?? null,
          entryName: entry?.name ?? null,
          pageId: n.pageId ?? null,
          pageName: page?.name ?? null,
          // Foundry core anchor field: scrolls the opened page to this slug.
          pageAnchor: n.pageAnchor ?? null,
          // The room/section anchor: Plutonium stores it in a flag; fall back to
          // the core field. Lets a skill map a pin to its journal section.
          headerAnchor: n.flags?.plutonium?.journalPageHeaderAnchor ?? n.pageAnchor ?? null,
          x: n.x,
          y: n.y,
          icon: n.texture?.src ?? n.icon ?? null,
          iconSize: n.iconSize ?? null,
          global: n.global ?? false,
        };
        if (data?.includeRaw) base.raw = n.toObject();
        return base;
      }),
    };
  }

  /**
   * Place map notes (journal pins) on a scene. Each note can link to a journal
   * entry (by name/ID) and optionally a specific page within it, so clicking
   * the pin opens the part of the adventure that describes that room. Position
   * is given in canvas pixels (x/y, the icon centre) or in 0-based grid cells
   * (gridX/gridY → centre of that cell). Label text defaults to the linked
   * entry/page name. Cosmetic fields (font, colour, anchor) are left at their
   * defaults on purpose.
   */
  async handlePlaceSceneNotes(data: {
    sceneIdentifier: string;
    notes: Array<{
      journalIdentifier?: string;
      pageName?: string;
      headerAnchor?: string;
      text?: string;
      x?: number;
      y?: number;
      gridX?: number;
      gridY?: number;
      icon?: string;
      iconSize?: number;
      fontSize?: number;
    }>;
  }): Promise<any> {
    this.assertGM();
    if (!data?.sceneIdentifier) throw new Error('sceneIdentifier is required');
    if (!Array.isArray(data.notes) || data.notes.length === 0) {
      throw new Error('notes must be a non-empty array');
    }

    const scene = this.resolveScene(data.sceneIdentifier);
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);

    const dim = scene.dimensions;
    const gridSize = scene.grid?.size ?? dim?.size ?? 100;
    const ox = dim?.sceneX ?? 0;
    const oy = dim?.sceneY ?? 0;

    const toCreate: any[] = [];
    const meta: Array<{
      text: string;
      entry: string | null;
      page: string | null;
      x: number;
      y: number;
    }> = [];
    const failures: Array<{ note: string; reason: string }> = [];

    for (const spec of data.notes) {
      let entryId: string | null = null;
      let pageId: string | null = null;
      let entryName: string | null = null;
      let pageName: string | null = null;

      if (spec.journalIdentifier) {
        const entry =
          game.journal?.get(spec.journalIdentifier) ||
          game.journal?.getName(spec.journalIdentifier) ||
          game.journal?.find(
            (j: any) => j.name?.toLowerCase() === spec.journalIdentifier!.toLowerCase()
          );
        if (!entry) {
          failures.push({
            note: spec.text ?? spec.journalIdentifier,
            reason: `journal not found: ${spec.journalIdentifier}`,
          });
          continue;
        }
        entryId = entry.id;
        entryName = entry.name;
        if (spec.pageName) {
          const page =
            entry.pages?.get(spec.pageName) ||
            entry.pages?.getName?.(spec.pageName) ||
            entry.pages?.find((p: any) => p.name?.toLowerCase() === spec.pageName!.toLowerCase());
          if (page) {
            pageId = page.id;
            pageName = page.name;
          } else {
            failures.push({
              note: spec.text ?? entryName ?? '(unnamed)',
              reason: `page not found in "${entryName}": ${spec.pageName}`,
            });
            continue;
          }
        }
      }

      // Position: pixel (icon centre) or grid cell centre.
      let x: number;
      let y: number;
      if (typeof spec.x === 'number' && typeof spec.y === 'number') {
        x = spec.x;
        y = spec.y;
      } else if (typeof spec.gridX === 'number' && typeof spec.gridY === 'number') {
        x = Math.round(ox + (spec.gridX + 0.5) * gridSize);
        y = Math.round(oy + (spec.gridY + 0.5) * gridSize);
      } else {
        failures.push({
          note: spec.text ?? entryName ?? '(unnamed)',
          reason: 'provide x/y or gridX/gridY',
        });
        continue;
      }

      const noteData: any = {
        entryId,
        pageId,
        x,
        y,
        iconSize: spec.iconSize ?? 40,
      };
      if (typeof spec.fontSize === 'number') noteData.fontSize = spec.fontSize;
      if (spec.text) noteData.text = spec.text;
      // Default to the book icon when none provided so the pin is visible even
      // if the linked entry has no journal icon configured.
      noteData.texture = { src: spec.icon || 'icons/svg/book.svg' };
      // Scroll-to-header on click: Plutonium stores the page's header anchor
      // slug in this flag (e.g. "2.-goblin-blind"). Replicate it so the pin
      // opens the exact room section, not just the top of the page.
      if (spec.headerAnchor) {
        noteData.flags = { plutonium: { journalPageHeaderAnchor: spec.headerAnchor } };
      }

      toCreate.push(noteData);
      meta.push({ text: spec.text ?? entryName ?? '', entry: entryName, page: pageName, x, y });
    }

    let created: any[] = [];
    if (toCreate.length) {
      created = await scene.createEmbeddedDocuments('Note', toCreate);
    }

    // Report from `meta` (intent order), not from `created`: Foundry may return
    // the created documents in a different order than the input array.
    return {
      success: true,
      scene: scene.name,
      placed: created.length,
      notes: meta.map(m => ({
        text: m.text || '',
        entry: m.entry,
        page: m.page,
        x: m.x,
        y: m.y,
      })),
      failures: failures.length ? failures : undefined,
    };
  }

  /**
   * Delete map notes from a scene: by explicit ids, or all of them (clearAll).
   * Useful for re-running the notes skill idempotently or replacing a note.
   */
  async handleDeleteSceneNotes(data: {
    sceneIdentifier: string;
    noteIds?: string[];
    clearAll?: boolean;
  }): Promise<any> {
    this.assertGM();
    if (!data?.sceneIdentifier) throw new Error('sceneIdentifier is required');
    const scene = this.resolveScene(data.sceneIdentifier);
    if (!scene) throw new Error(`Scene not found: ${data.sceneIdentifier}`);

    let ids: string[] = [];
    if (data.clearAll) {
      ids = (scene.notes.contents ?? scene.notes).map((n: any) => n.id);
    } else if (Array.isArray(data.noteIds)) {
      ids = data.noteIds;
    } else {
      throw new Error('Provide noteIds[] or clearAll:true');
    }

    if (ids.length) await scene.deleteEmbeddedDocuments('Note', ids);
    return { success: true, scene: scene.name, deleted: ids.length };
  }

  /**
   * Update (or create) a text page inside a journal entry. Used to keep the
   * "Recursos" control-panel journal in sync as the campaign skills progress.
   * Find the journal by name/ID and the page by name/ID; replace its HTML
   * content (and optionally rename it). With createIfMissing, a page that does
   * not exist yet is appended.
   */
  async handleUpdateJournalPage(data: {
    journalIdentifier: string;
    pageName?: string;
    pageId?: string;
    content: string;
    newTitle?: string;
    createIfMissing?: boolean;
  }): Promise<any> {
    this.assertGM();
    if (!data?.journalIdentifier) throw new Error('journalIdentifier is required');
    if (typeof data.content !== 'string') throw new Error('content is required');

    const entry =
      game.journal?.get(data.journalIdentifier) ||
      game.journal?.getName(data.journalIdentifier) ||
      game.journal?.find(
        (j: any) => j.name?.toLowerCase() === data.journalIdentifier.toLowerCase()
      );
    if (!entry) throw new Error(`Journal not found: ${data.journalIdentifier}`);

    let page = null;
    if (data.pageId) page = entry.pages?.get(data.pageId);
    else if (data.pageName) {
      page =
        entry.pages?.getName?.(data.pageName) ||
        entry.pages?.find((p: any) => p.name?.toLowerCase() === data.pageName!.toLowerCase());
    }

    if (!page) {
      if (data.createIfMissing && data.pageName) {
        const [created] = await entry.createEmbeddedDocuments('JournalEntryPage', [
          { name: data.pageName, type: 'text', text: { content: data.content, format: 1 } },
        ]);
        return { success: true, journal: entry.name, page: created.name, created: true };
      }
      throw new Error(`Page not found: ${data.pageName ?? data.pageId}`);
    }

    const update: any = { 'text.content': data.content };
    if (data.newTitle) update.name = data.newTitle;
    await page.update(update);
    return { success: true, journal: entry.name, page: page.name, created: false };
  }

  /* ------------------------------------------------------------------ */
  /* Item Active Effects                                                  */
  /* ------------------------------------------------------------------ */

  private summarizeEffect(effect: any): Record<string, any> {
    // Read from system.changes (the raw stored data) rather than the
    // derived `effect.changes` getter dnd5e v4 exposes for back-compat —
    // the getter can normalise/drop fields during data preparation, which
    // would make a real value look wrong here when it isn't.
    const rawChanges = effect.system?.changes ?? effect.changes ?? [];
    return {
      id: effect.id,
      name: effect.name,
      disabled: effect.disabled,
      transfer: effect.transfer,
      changes: rawChanges.map((c: any) => `${c.key} ${c.value} (mode ${c.mode})`),
      changesRaw: rawChanges,
    };
  }

  /**
   * Create/list/update/delete ActiveEffect documents on an Item (world item,
   * or one embedded on an actor). Unlike Activities, ActiveEffect is a real
   * Foundry embedded collection, so the plain createEmbeddedDocuments /
   * updateEmbeddedDocuments / deleteEmbeddedDocuments API applies directly —
   * no special lifecycle method needed. Still routed through its own tool
   * (rather than folded into update-actor-items) because effects live at
   * the top level of the Item document, not inside `system`, and because
   * automation modules (Midi-QOL/DAE) key off specific flags
   * (flags.dae.transfer, flags.dae.stackable...) that are easy to get wrong
   * by hand — callers should copy a known-good example's flags rather than
   * invent them.
   */
  async handleManageEffects(data: {
    action: 'create' | 'list' | 'update' | 'delete';
    actorIdentifier?: string;
    itemIdentifier: string;
    effectId?: string;
    effectData?: Record<string, any>;
  }): Promise<any> {
    this.assertGM();
    const action = data?.action;
    if (!data?.itemIdentifier) throw new Error('itemIdentifier is required');

    const item = this.findItemForActivities(data.actorIdentifier, data.itemIdentifier);

    if (action === 'list') {
      const effects = Array.from(item.effects ?? []).map((e: any) => this.summarizeEffect(e));
      return { itemId: item.id, itemName: item.name, effects };
    }

    if (action === 'create') {
      if (!data.effectData) throw new Error('effectData is required for "create"');
      const [created] = await item.createEmbeddedDocuments('ActiveEffect', [data.effectData]);
      if (!created) throw new Error('ActiveEffect was not created');
      return {
        success: true,
        itemId: item.id,
        itemName: item.name,
        effect: this.summarizeEffect(created),
      };
    }

    if (action === 'update') {
      if (!data.effectId) throw new Error('effectId is required for "update"');
      if (!item.effects?.get(data.effectId)) {
        throw new Error(`Effect "${data.effectId}" not found on "${item.name}"`);
      }
      await item.updateEmbeddedDocuments('ActiveEffect', [
        { _id: data.effectId, ...(data.effectData ?? {}) },
      ]);
      const updated = item.effects?.get(data.effectId);
      return {
        success: true,
        itemId: item.id,
        itemName: item.name,
        effect: this.summarizeEffect(updated),
      };
    }

    if (action === 'delete') {
      if (!data.effectId) throw new Error('effectId is required for "delete"');
      if (!item.effects?.get(data.effectId)) {
        return { success: true, itemId: item.id, itemName: item.name, deleted: false };
      }
      await item.deleteEmbeddedDocuments('ActiveEffect', [data.effectId]);
      return { success: true, itemId: item.id, itemName: item.name, deleted: true };
    }

    throw new Error(`Unknown action "${action}". Use: create, list, update, delete.`);
  }

  /* ------------------------------------------------------------------ */
  /* Item activities (dnd5e v4)                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Find an Item, either embedded on an actor (actorIdentifier given) or a
   * world-level Item (actorIdentifier omitted).
   */
  private findItemForActivities(actorIdentifier: string | undefined, itemIdentifier: string): any {
    if (actorIdentifier) {
      const actor =
        game.actors?.get(actorIdentifier) ||
        game.actors?.getName(actorIdentifier) ||
        game.actors?.find((a: any) => a.name?.toLowerCase() === actorIdentifier.toLowerCase());
      if (!actor) throw new Error(`Actor not found: ${actorIdentifier}`);
      const item = actor.items?.get(itemIdentifier) || actor.items?.getName(itemIdentifier);
      if (!item) throw new Error(`Item "${itemIdentifier}" not found on actor "${actor.name}"`);
      return item;
    }
    const item =
      game.items?.get(itemIdentifier) ||
      game.items?.getName(itemIdentifier) ||
      game.items?.find((i: any) => i.name?.toLowerCase() === itemIdentifier.toLowerCase());
    if (!item) throw new Error(`World item not found: ${itemIdentifier}`);
    return item;
  }

  private summarizeActivity(activity: any): Record<string, any> {
    // dnd5e normalises "multi-select" fields (damage part types, save
    // ability list...) to a Set, not an Array — Array.from() handles both.
    const damageParts = Array.from(activity.damage?.parts ?? []).map((p: any) => {
      const types = Array.from(p.types ?? []).join('/');
      return `${p.number}d${p.denomination}${p.bonus ? `+${p.bonus}` : ''}${types ? `[${types}]` : ''}`;
    });
    return {
      id: activity.id,
      type: activity.type,
      name: activity.name || null,
      activation: activity.activation?.type ?? null,
      damageParts,
      saveAbility: activity.save?.ability ? Array.from(activity.save.ability).join('/') : null,
      attackAbility: activity.attack?.ability ?? null,
      healing: activity.healing
        ? `${activity.healing.number}d${activity.healing.denomination}${activity.healing.bonus ? `+${activity.healing.bonus}` : ''}`
        : null,
      // Raw, unfiltered — Midi-QOL-specific fields (triggeredActivityId,
      // automationOnly, regionBehavior...) live here and aren't worth
      // hand-picking one at a time; expose them verbatim so a caller can
      // verify what actually got written instead of guessing.
      midiProperties: activity.midiProperties ?? null,
      regionBehavior: activity.regionBehavior ?? null,
      duration: activity.duration ?? null,
    };
  }

  /**
   * Create/list/update/delete dnd5e v4 Activities on an Item (world item or
   * one embedded on an actor). Activities are NOT a plain embedded
   * collection — dnd5e stores them in a MappingField on the item's
   * DataModel with their own lifecycle. Patching system.activities directly
   * via updateEmbeddedDocuments bypasses that lifecycle: on a world with
   * Midi-QOL (or similar) active, its hooks assume an activity went through
   * Item#createActivity and throw on one that didn't. This goes through the
   * real API instead: item.createActivity() / activity.update() /
   * activity.delete().
   */
  async handleManageActivities(data: {
    action: 'create' | 'list' | 'update' | 'delete';
    actorIdentifier?: string;
    itemIdentifier: string;
    activityId?: string;
    activityType?: string;
    activityData?: Record<string, any>;
  }): Promise<any> {
    this.assertGM();
    const action = data?.action;
    if (!data?.itemIdentifier) throw new Error('itemIdentifier is required');

    const item = this.findItemForActivities(data.actorIdentifier, data.itemIdentifier);

    if (action === 'list') {
      const activities = Array.from(item.system?.activities ?? []).map((a: any) =>
        this.summarizeActivity(a)
      );
      return { itemId: item.id, itemName: item.name, activities };
    }

    if (action === 'create') {
      if (!data.activityType) throw new Error('activityType is required for "create"');
      // Item#createActivity only returns the ActivitySheet when renderSheet is
      // true (dnd5e.mjs: `if (renderSheet) return created.sheet?.render(...)`,
      // implicit undefined otherwise) — so with renderSheet:false there is
      // nothing to read the new id from. Diff the activity ids before/after
      // instead.
      const before = new Set(Array.from(item.system?.activities ?? []).map((a: any) => a.id));
      await item.createActivity(data.activityType, data.activityData ?? {}, { renderSheet: false });
      const created = Array.from(item.system?.activities ?? []).find((a: any) => !before.has(a.id));
      if (!created)
        throw new Error('Activity was not created (Foundry returned no new activity id)');
      return {
        success: true,
        itemId: item.id,
        itemName: item.name,
        activity: this.summarizeActivity(created),
      };
    }

    if (action === 'update') {
      if (!data.activityId) throw new Error('activityId is required for "update"');
      if (!item.system?.activities?.has(data.activityId)) {
        throw new Error(`Activity "${data.activityId}" not found on "${item.name}"`);
      }
      // updateActivity/deleteActivity live on the Item, not the Activity
      // instance (dnd5e.mjs), and both are just `this.update({...})` wrappers.
      await item.updateActivity(data.activityId, data.activityData ?? {});
      const updated = item.system?.activities?.get(data.activityId);
      return {
        success: true,
        itemId: item.id,
        itemName: item.name,
        activity: this.summarizeActivity(updated),
      };
    }

    if (action === 'delete') {
      if (!data.activityId) throw new Error('activityId is required for "delete"');
      if (!item.system?.activities?.has(data.activityId)) {
        return { success: true, itemId: item.id, itemName: item.name, deleted: false };
      }
      await item.deleteActivity(data.activityId);
      return { success: true, itemId: item.id, itemName: item.name, deleted: true };
    }

    throw new Error(`Unknown action "${action}". Use: create, list, update, delete.`);
  }

  /* ------------------------------------------------------------------ */
  /* Roll tables                                                          */
  /* ------------------------------------------------------------------ */

  private findRollTable(identifier: string): any {
    return (
      game.tables?.get(identifier) ||
      game.tables?.getName(identifier) ||
      game.tables?.find((t: any) => t.name?.toLowerCase() === identifier.toLowerCase()) ||
      null
    );
  }

  /**
   * Turn a flat list of {text, weight} entries into TableResult creation data
   * with consecutive numeric ranges, the way Foundry's own "Normalize Results"
   * button does. `startAt` lets addResults() extend an existing table instead
   * of restarting from 1.
   */
  private buildResultRanges(
    entries: Array<{ text: string; weight?: number; img?: string }>,
    startAt = 1
  ): { docs: Array<Record<string, any>>; total: number } {
    let cursor = startAt;
    const docs = entries.map(entry => {
      const weight = entry.weight && entry.weight > 0 ? Math.floor(entry.weight) : 1;
      const range = [cursor, cursor + weight - 1];
      cursor += weight;
      return {
        type: 'text',
        text: entry.text,
        range,
        weight,
        ...(entry.img ? { img: entry.img } : {}),
      };
    });
    return { docs, total: cursor - 1 };
  }

  /**
   * Create, list, fetch or update homebrew RollTable documents — the write
   * path plutonium-import doesn't cover, for tables the DM writes by hand
   * (loot, rumors, random encounters...) instead of pulling from 5etools.
   */
  async handleManageTables(data: {
    action: 'create' | 'list' | 'get' | 'update';
    tableIdentifier?: string;
    name?: string;
    description?: string;
    img?: string;
    folder?: string;
    nameFilter?: string;
    replacement?: boolean;
    displayRoll?: boolean;
    results?: Array<{ text: string; weight?: number; img?: string }>;
    addResults?: Array<{ text: string; weight?: number; img?: string }>;
  }): Promise<any> {
    this.assertGM();
    const action = data?.action;

    if (action === 'create') {
      if (!data.name) throw new Error('name is required for "create"');
      if (!Array.isArray(data.results) || data.results.length === 0) {
        throw new Error('results is required for "create" and must contain at least one entry');
      }

      const folderId = data.folder
        ? (await this.getOrCreateFolder(data.folder, 'RollTable')).id
        : null;

      const { docs, total } = this.buildResultRanges(data.results);
      const RollTableCls = (globalThis as any).RollTable;
      const table = await RollTableCls.create({
        name: data.name,
        description: data.description ?? '',
        img: data.img,
        folder: folderId,
        formula: `1d${total}`,
        replacement: data.replacement !== false,
        displayRoll: data.displayRoll !== false,
      });
      await table.createEmbeddedDocuments('TableResult', docs);

      return {
        success: true,
        id: table.id,
        name: table.name,
        formula: table.formula,
        resultsCreated: docs.length,
      };
    }

    if (action === 'list') {
      const nameLower = data.nameFilter?.toLowerCase();
      const folderName = data.folder?.trim();
      let folderId: string | null = null;
      if (folderName) {
        const folderDoc = game.folders?.find(
          (f: any) => f.type === 'RollTable' && (f.name === folderName || f.id === folderName)
        );
        if (!folderDoc) return { tables: [], total: 0 };
        folderId = folderDoc.id;
      }

      const tables = Array.from(game.tables ?? [])
        .filter((t: any) => (folderId ? t.folder?.id === folderId : true))
        .filter((t: any) => (nameLower ? t.name?.toLowerCase().includes(nameLower) : true))
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          formula: t.formula,
          resultCount: t.results?.size ?? t.results?.length ?? 0,
          replacement: t.replacement,
          folderId: t.folder?.id ?? null,
          folderName: t.folder?.name ?? null,
        }));

      return { tables, total: tables.length };
    }

    if (action === 'get') {
      if (!data.tableIdentifier) throw new Error('tableIdentifier is required for "get"');
      const table = this.findRollTable(data.tableIdentifier);
      if (!table) throw new Error(`Table not found: ${data.tableIdentifier}`);

      const results = Array.from(table.results ?? [])
        .map((r: any) => ({
          id: r.id,
          text: r.text,
          range: r.range,
          weight: r.weight,
          img: r.img,
        }))
        .sort((a: any, b: any) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));

      return {
        id: table.id,
        name: table.name,
        description: table.description,
        img: table.img,
        formula: table.formula,
        replacement: table.replacement,
        displayRoll: table.displayRoll,
        folderId: table.folder?.id ?? null,
        folderName: table.folder?.name ?? null,
        results,
      };
    }

    if (action === 'update') {
      if (!data.tableIdentifier) throw new Error('tableIdentifier is required for "update"');
      const table = this.findRollTable(data.tableIdentifier);
      if (!table) throw new Error(`Table not found: ${data.tableIdentifier}`);

      if (data.results && data.addResults) {
        throw new Error('pass either "results" (replace all) or "addResults" (append), not both');
      }

      const patch: Record<string, any> = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.description !== undefined) patch.description = data.description;
      if (data.img !== undefined) patch.img = data.img;
      if (data.replacement !== undefined) patch.replacement = data.replacement;
      if (data.displayRoll !== undefined) patch.displayRoll = data.displayRoll;
      if (data.folder !== undefined) {
        patch.folder = data.folder
          ? (await this.getOrCreateFolder(data.folder, 'RollTable')).id
          : null;
      }

      let resultsChanged = 0;

      if (data.results) {
        const existingIds = Array.from(table.results ?? []).map((r: any) => r.id);
        if (existingIds.length) await table.deleteEmbeddedDocuments('TableResult', existingIds);
        const { docs, total } = this.buildResultRanges(data.results);
        await table.createEmbeddedDocuments('TableResult', docs);
        patch.formula = `1d${total}`;
        resultsChanged = docs.length;
      } else if (data.addResults) {
        const currentMax = Array.from(table.results ?? []).reduce(
          (max: number, r: any) => Math.max(max, r.range?.[1] ?? 0),
          0
        );
        const { docs, total } = this.buildResultRanges(data.addResults, currentMax + 1);
        await table.createEmbeddedDocuments('TableResult', docs);
        patch.formula = `1d${total}`;
        resultsChanged = docs.length;
      }

      if (Object.keys(patch).length > 0) await table.update(patch);

      return {
        success: true,
        id: table.id,
        name: table.name,
        formula: table.formula,
        resultsChanged,
      };
    }

    throw new Error(`Unknown action "${action}". Use: create, list, get, update.`);
  }

  /* ------------------------------------------------------------------ */
  /* Actor assets                                                        */
  /* ------------------------------------------------------------------ */

  async handleUpdateActorAssets(data: {
    actorIdentifier: string;
    img?: string;
    tokenImg?: string;
    folderName?: string;
    newName?: string;
    biography?: string;
  }): Promise<any> {
    this.assertGM();
    if (!data?.actorIdentifier) throw new Error('actorIdentifier is required');

    const actor =
      game.actors?.get(data.actorIdentifier) ||
      game.actors?.getName(data.actorIdentifier) ||
      game.actors?.find((a: any) => a.name.toLowerCase() === data.actorIdentifier.toLowerCase());
    if (!actor) throw new Error(`Actor not found: ${data.actorIdentifier}`);

    const update: any = {};
    if (data.img) update.img = data.img.replace(/\\/g, '/');
    if (data.tokenImg) update['prototypeToken.texture.src'] = data.tokenImg.replace(/\\/g, '/');
    if (data.newName) {
      update.name = data.newName;
      update['prototypeToken.name'] = data.newName;
    }
    if (data.folderName) {
      const folder = await this.getOrCreateFolder(data.folderName, 'Actor');
      update.folder = folder.id;
    }
    if (data.biography !== undefined) {
      // dnd5e / pf2e both keep prose biography at this path. Systems without it
      // (e.g. dsa5) simply ignore the extra key — Foundry stores it inert.
      update['system.details.biography.value'] = data.biography;
    }
    if (Object.keys(update).length === 0) throw new Error('Nothing to update');

    await actor.update(update);
    return {
      success: true,
      actorId: actor.id,
      name: actor.name,
      img: actor.img,
      tokenImg: actor.prototypeToken?.texture?.src ?? null,
      folder: actor.folder?.name ?? null,
      biography: actor.system?.details?.biography?.value ?? null,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Plutonium integration                                               */
  /* ------------------------------------------------------------------ */

  private getPlutoniumApi(): any {
    const api = game.modules?.get('plutonium')?.api ?? (globalThis as any).plutonium;
    if (!api) throw new Error('Plutonium module is not installed/active');
    return api;
  }

  private getCategoryConfig(category: string): CategoryConfig {
    const cfg = CATEGORIES[category];
    if (!cfg) {
      throw new Error(
        `Unknown category "${category}". Supported: ${Object.keys(CATEGORIES).join(', ')}`
      );
    }
    return cfg;
  }

  private async fetchJson(path: string): Promise<any> {
    const cached = this.dataFileCache.get(path);
    if (cached) return cached;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: HTTP ${response.status}`);
    const json = await response.json();
    this.dataFileCache.set(path, json);
    return json;
  }

  private async getPlutoniumSearchIndex(): Promise<PlutoniumSearchEntry[]> {
    if (!this.plutoniumSearchIndex) {
      const raw = await this.fetchJson(`${PLUTONIUM_ROUTE}/search/index-foundry.json`);
      this.plutoniumSearchIndex = raw.x ?? [];
    }
    return this.plutoniumSearchIndex!;
  }

  async handlePlutoniumSearch(data: {
    query: string;
    category?: string;
    limit?: number;
  }): Promise<any> {
    this.assertGM();
    this.getPlutoniumApi(); // fail early if Plutonium missing
    if (!data?.query) throw new Error('query is required');

    const category = data.category ?? 'creature';
    const cfg = this.getCategoryConfig(category);
    const limit = Math.min(data.limit ?? 20, 50);
    const q = data.query.toLowerCase();
    const index = await this.getPlutoniumSearchIndex();
    const catIds = new Set(cfg.catIds);

    const matches = index
      .filter(e => catIds.has(e.c) && e.n && e.n.toLowerCase().includes(q))
      .slice(0, limit)
      .map(e => {
        const [, source] = e.uu.split('|');
        return { name: e.n, source: (source ?? '').toUpperCase(), category };
      });

    return { success: true, category, total: matches.length, results: matches };
  }

  /**
   * Find a raw 5etools entry by name (and optionally source) for a category.
   */
  private async findEntry(
    category: string,
    name: string,
    source?: string
  ): Promise<{ entry: any; list: any[] }> {
    const cfg = this.getCategoryConfig(category);
    const nameLc = name.toLowerCase();
    const sourceLc = source?.toLowerCase();

    // Per-source indexed directories (bestiary, spells)
    if (cfg.indexDir) {
      const index = await this.fetchJson(`${PLUTONIUM_ROUTE}/${cfg.indexDir}/index.json`);
      let keys: string[];
      if (sourceLc) {
        const key = Object.keys(index).find(k => k.toLowerCase() === sourceLc);
        if (!key) throw new Error(`Unknown ${category} source: ${source}`);
        keys = [key];
      } else {
        const searchIndex = await this.getPlutoniumSearchIndex();
        const catIds = new Set(cfg.catIds);
        const hit = searchIndex.find(e => catIds.has(e.c) && e.n?.toLowerCase() === nameLc);
        if (!hit) throw new Error(`${category} not found in Plutonium index: ${name}`);
        const [, src] = hit.uu.split('|');
        const key = Object.keys(index).find(k => k.toLowerCase() === src.toLowerCase());
        if (!key) throw new Error(`Data file not found for source: ${src}`);
        keys = [key];
      }
      for (const key of keys) {
        const fileData = await this.fetchJson(`${PLUTONIUM_ROUTE}/${cfg.indexDir}/${index[key]}`);
        for (const prop of cfg.props) {
          const list = fileData[prop] ?? [];
          const entry = list.find((m: any) => m.name?.toLowerCase() === nameLc);
          if (entry) return { entry, list };
        }
      }
      throw new Error(`${category} "${name}" not found${source ? ` in source ${source}` : ''}`);
    }

    // Flat data files (items, feats, backgrounds, races...)
    for (const file of cfg.files ?? []) {
      const fileData = await this.fetchJson(`${PLUTONIUM_ROUTE}/${file}`);
      for (const prop of cfg.props) {
        const list = fileData[prop] ?? [];
        const candidates = list.filter((m: any) => m.name?.toLowerCase() === nameLc);
        const entry = sourceLc
          ? candidates.find((m: any) => m.source?.toLowerCase() === sourceLc)
          : candidates[0];
        if (entry) return { entry, list };
      }
    }
    throw new Error(`${category} "${name}" not found${source ? ` in source ${source}` : ''}`);
  }

  async handlePlutoniumImport(data: {
    name: string;
    category?: string;
    source?: string;
    customName?: string;
    folderName?: string;
  }): Promise<any> {
    this.assertGM();
    if (!data?.name) throw new Error('name is required');

    const category = data.category ?? 'creature';
    const cfg = this.getCategoryConfig(category);
    const api = this.getPlutoniumApi();

    let { entry, list } = await this.findEntry(category, data.name, data.source);

    // Resolve 5etools "_copy" inheritance when possible
    if (entry._copy) {
      const DataUtil = (globalThis as any).DataUtil;
      const mergeFn = DataUtil?.[cfg.props[0]]?.pMergeCopy ?? DataUtil?.generic?.pMergeCopy;
      if (mergeFn) {
        try {
          entry =
            (await mergeFn.call(DataUtil[cfg.props[0]] ?? DataUtil.generic, list, entry)) ?? entry;
        } catch {
          /* fall through — the importer may still handle it */
        }
      }
    }

    // Snapshot the collection before importing. Plutonium's importers don't
    // reliably hand back the document they created, and looking it up by name
    // afterwards is unsafe: getName() returns the FIRST match, which is a
    // pre-existing world document whenever the world already holds something
    // named like the compendium entry (importing "Guard" into a world that
    // already has a "Guard"). Post-processing then renamed/moved the wrong
    // document. Diffing IDs tells us exactly what this import created.
    const collection = (game as any)[cfg.collection];
    const idsBefore = new Set<string>(collection?.map((d: any) => d.id) ?? []);

    // Import: prefer the category-specific public API, fall back to the generic importer
    let importMeta: any;
    if (category === 'creature' && api.importer?.creature?.pImportEntry) {
      importMeta = await api.importer.creature.pImportEntry(entry);
    } else if (category === 'spell' && api.importer?.spell?.pImportEntry) {
      importMeta = await api.importer.spell.pImportEntry(entry);
    } else {
      if (!api.importer?.pGetImporter) throw new Error('Plutonium importer API not available');
      const importer = await api.importer.pGetImporter({ prop: cfg.importerProp });
      if (!importer?.pImportEntry) {
        throw new Error(`Plutonium has no importer for category "${category}"`);
      }
      const ImportOpts = api.importer.ImportOpts;
      importMeta = await importer.pImportEntry(entry, ImportOpts ? new ImportOpts({}) : undefined);
    }

    // Locate the imported document for post-processing. Only ever consider
    // documents that did not exist before this call, so a pre-existing one can
    // never be renamed or moved.
    const created: any[] = collection?.filter((d: any) => !idsBefore.has(d.id)) ?? [];
    const metaDoc = importMeta?.imported?.[0]?.document;
    const doc =
      created.find((d: any) => d.name === entry.name) ??
      created.find((d: any) => d.name === data.name) ??
      (created.length === 1 ? created[0] : undefined) ??
      (metaDoc?.id && !idsBefore.has(metaDoc.id) ? metaDoc : undefined);

    if (!doc?.id) {
      // Nothing new landed in the collection — most likely Plutonium skipped the
      // import because a document with that name is already there. Leave it
      // alone instead of renaming/moving a document we did not create.
      const existing = collection?.getName(data.name) ?? collection?.getName(entry.name);
      return {
        success: true,
        warning: existing
          ? `Import created no new document; "${existing.name}" already exists and was left untouched (customName/folderName not applied).`
          : 'Import ran but the created document could not be located for post-processing',
        existingId: existing?.id ?? null,
        name: entry.name,
        source: entry.source,
        category,
      };
    }

    const postUpdate: any = {};
    if (data.customName) postUpdate.name = data.customName;
    if (data.folderName) {
      const folder = await this.getOrCreateFolder(data.folderName, cfg.folderType);
      postUpdate.folder = folder.id;
    }
    if (Object.keys(postUpdate).length > 0) await doc.update(postUpdate);

    return {
      success: true,
      documentId: doc.id,
      name: doc.name,
      source: entry.source ?? null,
      cr: entry.cr ?? null,
      category,
      collection: cfg.collection,
      folder: data.folderName ?? null,
    };
  }
}
