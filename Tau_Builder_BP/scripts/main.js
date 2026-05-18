var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
import { system, world as world5 } from "@minecraft/server";

// src/config/constants.ts
var PREFIX = "taubuilder";
var ITEM_IDS = {
  selectionWand: `${PREFIX}:selection_wand`,
  menuTool: `${PREFIX}:menu_tool`,
  brushTool: `${PREFIX}:brush_tool`,
  clipboardTool: `${PREFIX}:clipboard_tool`,
  inspectorTool: `${PREFIX}:inspector_tool`
};
var COMPONENT_IDS = {
  selectionTool: `${PREFIX}:selection_tool`,
  menuTool: `${PREFIX}:menu_tool_component`,
  brushTool: `${PREFIX}:brush_tool_component`,
  clipboardTool: `${PREFIX}:clipboard_tool_component`,
  inspectorTool: `${PREFIX}:inspector_tool_component`
};
var PARTICLES = {
  selection: "minecraft:colored_flame_particle",
  clipboard: "minecraft:colored_flame_particle",
  brush: "minecraft:colored_flame_particle"
};
var CONFIG = {
  maxQueueLength: 12,
  previewInterval: 8,
  globalBlocksPerTick: 1200,
  maxClipboardBlocks: 18e4,
  maxUndoEntries: 12,
  maxLogs: 96,
  maxChangesPerLogPreview: 8,
  maxBrushRadius: 32,
  maxSelectionBlocks: 25e4
};
var STRUCTURE_PREFIX = `${PREFIX}:schem_`;

// src/commands/register.ts
import {
  CustomCommandStatus
} from "@minecraft/server";
function getPlayer(origin) {
  const source = origin.sourceEntity;
  if (!source || source.typeId !== "minecraft:player") {
    return void 0;
  }
  return source;
}
function registerCommands(registry, app2) {
  registry.registerCommand(
    {
      name: "taubuilder:menu",
      description: "Open Tau Builder menu",
      permissionLevel: 2
    },
    (origin) => {
      const player = getPlayer(origin);
      if (!player) {
        return { status: CustomCommandStatus.Failure, message: "Player source required." };
      }
      void app2.ui.showMain(player);
      return { status: CustomCommandStatus.Success, message: "Opened Tau Builder menu." };
    }
  );
}

// src/utils/vector.ts
function cloneVector3(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}
function floorVector3(vector) {
  return { x: Math.floor(vector.x), y: Math.floor(vector.y), z: Math.floor(vector.z) };
}
function vectorKey(vector) {
  return `${vector.x},${vector.y},${vector.z}`;
}
function addVector3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function subVector3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function boundsFromPositions(dimensionId, a, b) {
  const min = {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z)
  };
  const max = {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z)
  };
  const volume = (max.x - min.x + 1) * (max.y - min.y + 1) * (max.z - min.z + 1);
  return { dimensionId, min, max, volume };
}
function boundsContains(bounds, location) {
  return location.x >= bounds.min.x && location.x <= bounds.max.x && location.y >= bounds.min.y && location.y <= bounds.max.y && location.z >= bounds.min.z && location.z <= bounds.max.z;
}
function makeBoundsFromPoints(dimensionId, points) {
  if (points.length === 0) {
    return { dimensionId, min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, volume: 0 };
  }
  let minX = points[0].x;
  let minY = points[0].y;
  let minZ = points[0].z;
  let maxX = points[0].x;
  let maxY = points[0].y;
  let maxZ = points[0].z;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }
  return {
    dimensionId,
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    volume: points.length
  };
}
function rotateRelative(vector, rotation) {
  switch (rotation) {
    case 90:
      return { x: -vector.z, y: vector.y, z: vector.x };
    case 180:
      return { x: -vector.x, y: vector.y, z: -vector.z };
    case 270:
      return { x: vector.z, y: vector.y, z: -vector.x };
    default:
      return cloneVector3(vector);
  }
}
function flipRelative(vector, flipX, flipZ) {
  return {
    x: flipX ? -vector.x : vector.x,
    y: vector.y,
    z: flipZ ? -vector.z : vector.z
  };
}
function* cuboidEdgePoints(bounds, step = 2) {
  const pushed = /* @__PURE__ */ new Set();
  const maybePush = (point) => {
    const key = vectorKey(point);
    if (!pushed.has(key)) {
      pushed.add(key);
      return point;
    }
    return void 0;
  };
  for (let x = bounds.min.x; x <= bounds.max.x; x += step) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }
  for (let y = bounds.min.y; y <= bounds.max.y; y += step) {
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }
  for (let z = bounds.min.z; z <= bounds.max.z; z += step) {
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        const point = maybePush({ x, y, z });
        if (point) yield point;
      }
    }
  }
}

// src/core/logger.ts
var OperationLogger = class {
  constructor() {
    __publicField(this, "logs", []);
  }
  record(player, entry) {
    const log = {
      id: entry.id,
      playerId: player.id,
      playerName: player.name,
      type: entry.operationType,
      dimensionId: entry.dimensionId,
      bounds: entry.bounds,
      affectedBlocks: entry.affectedBlocks,
      timestamp: entry.timestamp,
      historyEntry: entry
    };
    this.logs.push(log);
    while (this.logs.length > CONFIG.maxLogs) {
      this.logs.shift();
    }
    return log;
  }
  recent() {
    return [...this.logs].reverse();
  }
  recentByPlayerWithin(playerName, minutes) {
    const cutoff = Date.now() - minutes * 6e4;
    return this.logs.filter((log) => log.playerName === playerName && log.timestamp >= cutoff).reverse();
  }
  recentByAreaWithin(dimensionId, location, radius, minutes) {
    const cutoff = Date.now() - minutes * 6e4;
    return this.logs.filter((log) => {
      if (log.dimensionId !== dimensionId || log.timestamp < cutoff) {
        return false;
      }
      return location.x >= log.bounds.min.x - radius && location.x <= log.bounds.max.x + radius && location.y >= log.bounds.min.y - radius && location.y <= log.bounds.max.y + radius && location.z >= log.bounds.min.z - radius && location.z <= log.bounds.max.z + radius;
    }).reverse();
  }
  inspectBlock(dimensionId, location) {
    return this.logs.filter((log) => log.dimensionId === dimensionId && boundsContains(log.bounds, location)).reverse();
  }
};

// src/core/permissions.ts
import { PlayerPermissionLevel } from "@minecraft/server";
var PermissionService = class {
  isOperator(player) {
    return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  }
};

// src/core/queue.ts
import { world as world2 } from "@minecraft/server";

// src/utils/block.ts
import { BlockPermutation, world } from "@minecraft/server";
function getPlayerTargetBlock(player) {
  try {
    return player.getBlockFromViewDirection({ includeLiquidBlocks: true, maxDistance: 64 })?.block;
  } catch {
    return void 0;
  }
}
function getPlayerAnchorLocation(player) {
  const target = getPlayerTargetBlock(player);
  if (target) {
    return floorVector3(target.location);
  }
  try {
    return floorVector3(player.location);
  } catch {
    return { x: 0, y: 0, z: 0 };
  }
}
function snapshotBlock(block) {
  return {
    typeId: block.typeId,
    states: block.permutation.getAllStates(),
    waterlogged: block.isWaterlogged
  };
}
function resolveSnapshot(snapshot) {
  return BlockPermutation.resolve(snapshot.typeId, snapshot.states);
}
function applySnapshot(block, snapshot) {
  block.setPermutation(resolveSnapshot(snapshot));
  try {
    block.setWaterlogged(snapshot.waterlogged);
  } catch {
  }
}
function parseBlockInput(raw) {
  const trimmed = raw.trim();
  const bracketIndex = trimmed.indexOf("[");
  if (bracketIndex === -1 || !trimmed.endsWith("]")) {
    return { typeId: trimmed, states: {}, waterlogged: false };
  }
  const typeId = trimmed.slice(0, bracketIndex).trim();
  const inside = trimmed.slice(bracketIndex + 1, -1).trim();
  const states = {};
  for (const entry of inside.split(",")) {
    const [rawKey, rawValue] = entry.split("=");
    if (!rawKey || rawValue === void 0) {
      continue;
    }
    const key = rawKey.trim();
    const valueText = rawValue.trim();
    if (valueText === "true" || valueText === "false") {
      states[key] = valueText === "true";
    } else if (/^-?\d+$/.test(valueText)) {
      states[key] = Number(valueText);
    } else {
      states[key] = valueText;
    }
  }
  return { typeId, states, waterlogged: false };
}
function tryGetDimension(dimensionId) {
  try {
    return world.getDimension(dimensionId);
  } catch {
    return void 0;
  }
}

// src/core/queue.ts
var OperationQueue = class {
  constructor(state, permissions, logger) {
    this.state = state;
    this.permissions = permissions;
    this.logger = logger;
    __publicField(this, "jobs", []);
    __publicField(this, "sequence", 0);
  }
  getStatus() {
    if (this.jobs.length === 0) {
      return "Queue idle.";
    }
    const current = this.jobs[0];
    return `${this.jobs.length} job(s). Active: ${current.type} ${current.processed}/${current.estimated}`;
  }
  cancelForPlayer(player) {
    const before = this.jobs.length;
    for (let index = this.jobs.length - 1; index >= 0; index--) {
      if (this.jobs[index].playerId === player.id) {
        this.jobs.splice(index, 1);
      }
    }
    return before === this.jobs.length ? "No queued jobs to cancel." : "Cancelled your queued jobs.";
  }
  tick() {
    const job = this.jobs[0];
    if (!job) {
      return;
    }
    const player = world2.getPlayers().find((candidate) => candidate.id === job.playerId);
    if (!player) {
      this.jobs.shift();
      return;
    }
    const budget = CONFIG.globalBlocksPerTick;
    const processed = job.process(budget);
    job.processed += processed;
    player.onScreenDisplay.setActionBar(`Tau Builder: ${job.type} ${job.processed}/${job.estimated}`);
    if (!job.isDone()) {
      return;
    }
    this.jobs.shift();
    const entry = {
      id: job.id,
      playerId: player.id,
      playerName: player.name,
      operationType: job.type,
      dimensionId: job.dimensionId,
      bounds: job.bounds(),
      affectedBlocks: job.changes.length,
      timestamp: Date.now(),
      changes: job.changes
    };
    if (job.canStoreHistory() && entry.affectedBlocks > 0) {
      const session = this.state.get(player);
      session.undoStack.push(entry);
      while (session.undoStack.length > CONFIG.maxUndoEntries) {
        session.undoStack.shift();
      }
      session.redoStack.length = 0;
      this.logger.record(player, entry);
    }
    job.onComplete?.(entry);
    player.sendMessage(`Tau Builder finished ${job.type} with ${entry.affectedBlocks} block changes.`);
  }
  enqueueSet(player, bounds, target, mask) {
    const snapshot = parseBlockInput(target);
    const job = this.createRegionJob(player, bounds, `set ${target}`, bounds.volume, (block) => {
      if (mask && !mask.test({ blockTypeId: block.typeId, y: block.y, isAir: block.isAir })) return void 0;
      return snapshot;
    });
    this.push(job);
    return `Queued set over ${bounds.volume} blocks.`;
  }
  enqueueReplace(player, bounds, from, to, mask) {
    const target = parseBlockInput(to);
    const job = this.createRegionJob(player, bounds, `replace ${from} ${to}`, bounds.volume, (block) => {
      if (block.typeId !== from) return void 0;
      if (mask && !mask.test({ blockTypeId: block.typeId, y: block.y, isAir: block.isAir })) return void 0;
      return target;
    });
    this.push(job);
    return `Queued replace ${from} -> ${to}.`;
  }
  enqueueClipboardPaste(player, clipboard, placements) {
    const done = { index: 0 };
    const job = {
      id: this.nextId(),
      playerId: player.id,
      playerName: player.name,
      dimensionId: player.dimension.id,
      type: "paste",
      estimated: placements.length,
      processed: 0,
      changes: [],
      process: (budget) => {
        let count = 0;
        while (done.index < placements.length && count < budget) {
          const placement = placements[done.index++];
          const block = player.dimension.getBlock(placement.location);
          if (!block) continue;
          const before = snapshotBlock(block);
          const after = placement.block.snapshot;
          if (before.typeId !== after.typeId || JSON.stringify(before.states) !== JSON.stringify(after.states)) {
            applySnapshot(block, after);
            job.changes.push({ location: placement.location, before, after: snapshotBlock(block) });
          }
          count++;
        }
        return count;
      },
      isDone: () => done.index >= placements.length,
      bounds: () => makeBoundsFromPoints(player.dimension.id, placements.map((placement) => placement.location)),
      canStoreHistory: () => clipboard.blocks.length <= CONFIG.maxClipboardBlocks
    };
    this.push(job);
    return `Queued paste for ${placements.length} blocks.`;
  }
  enqueuePoints(player, type, points, target, replaceTarget, mask) {
    const done = { index: 0 };
    const job = {
      id: this.nextId(),
      playerId: player.id,
      playerName: player.name,
      dimensionId: player.dimension.id,
      type,
      estimated: points.length,
      processed: 0,
      changes: [],
      process: (budget) => {
        let count = 0;
        while (done.index < points.length && count < budget) {
          const point = points[done.index++];
          const block = player.dimension.getBlock(point);
          if (!block) continue;
          if (replaceTarget && block.typeId !== replaceTarget) continue;
          if (mask && !mask.test({ blockTypeId: block.typeId, y: block.y, isAir: block.isAir })) continue;
          const before = snapshotBlock(block);
          if (before.typeId !== target.typeId || JSON.stringify(before.states) !== JSON.stringify(target.states)) {
            applySnapshot(block, target);
            job.changes.push({ location: point, before, after: snapshotBlock(block) });
          }
          count++;
        }
        return count;
      },
      isDone: () => done.index >= points.length,
      bounds: () => makeBoundsFromPoints(player.dimension.id, points),
      canStoreHistory: () => points.length <= CONFIG.maxSelectionBlocks
    };
    this.push(job);
    return `Queued ${type} affecting ${points.length} blocks.`;
  }
  undo(player) {
    const session = this.state.get(player);
    const entry = session.undoStack.pop();
    if (!entry) {
      return "Nothing to undo.";
    }
    session.redoStack.push(entry);
    this.enqueueHistoryReplay(player, entry, true);
    return `Queued undo for ${entry.operationType}.`;
  }
  redo(player) {
    const session = this.state.get(player);
    const entry = session.redoStack.pop();
    if (!entry) {
      return "Nothing to redo.";
    }
    session.undoStack.push(entry);
    this.enqueueHistoryReplay(player, entry, false);
    return `Queued redo for ${entry.operationType}.`;
  }
  rollbackLogs(player, entries) {
    if (entries.length === 0) {
      return "No matching logged operations found.";
    }
    for (const entry of entries) {
      this.enqueueHistoryReplay(player, entry, true, false);
    }
    return `Queued rollback for ${entries.length} logged operation(s).`;
  }
  enqueueHistoryReplay(player, entry, useBefore, storeHistory = false) {
    const done = { index: 0 };
    const changes = [...entry.changes];
    const job = {
      id: this.nextId(),
      playerId: player.id,
      playerName: player.name,
      dimensionId: entry.dimensionId,
      type: useBefore ? `undo ${entry.operationType}` : `redo ${entry.operationType}`,
      estimated: changes.length,
      processed: 0,
      changes: [],
      process: (budget) => {
        let count = 0;
        const dimension = tryGetDimension(entry.dimensionId);
        if (!dimension) {
          done.index = changes.length;
          return 0;
        }
        while (done.index < changes.length && count < budget) {
          const change = changes[done.index++];
          const block = dimension.getBlock(change.location);
          if (!block) continue;
          const before = snapshotBlock(block);
          applySnapshot(block, useBefore ? change.before : change.after);
          job.changes.push({ location: change.location, before, after: snapshotBlock(block) });
          count++;
        }
        return count;
      },
      isDone: () => done.index >= changes.length,
      bounds: () => entry.bounds,
      canStoreHistory: () => storeHistory
    };
    this.push(job);
  }
  createRegionJob(player, bounds, type, estimated, resolveTarget) {
    const cursor = { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z, done: false };
    const job = {
      id: this.nextId(),
      playerId: player.id,
      playerName: player.name,
      dimensionId: bounds.dimensionId,
      type,
      estimated,
      processed: 0,
      changes: [],
      process: (budget) => {
        let count = 0;
        while (!cursor.done && count < budget) {
          const block = player.dimension.getBlock({ x: cursor.x, y: cursor.y, z: cursor.z });
          if (block) {
            const target = resolveTarget(block);
            if (target) {
              const before = snapshotBlock(block);
              if (before.typeId !== target.typeId || JSON.stringify(before.states) !== JSON.stringify(target.states)) {
                block.setPermutation(resolveSnapshot(target));
                try {
                  block.setWaterlogged(target.waterlogged);
                } catch {
                }
                job.changes.push({ location: block.location, before, after: snapshotBlock(block) });
              }
            }
          }
          count++;
          this.advanceCursor(cursor, bounds);
        }
        return count;
      },
      isDone: () => cursor.done,
      bounds: () => bounds,
      canStoreHistory: () => bounds.volume <= CONFIG.maxSelectionBlocks
    };
    return job;
  }
  advanceCursor(cursor, bounds) {
    cursor.x++;
    if (cursor.x <= bounds.max.x) return;
    cursor.x = bounds.min.x;
    cursor.z++;
    if (cursor.z <= bounds.max.z) return;
    cursor.z = bounds.min.z;
    cursor.y++;
    if (cursor.y <= bounds.max.y) return;
    cursor.done = true;
  }
  push(job) {
    if (this.jobs.length >= CONFIG.maxQueueLength) {
      throw new Error("Queue is full.");
    }
    this.jobs.push(job);
  }
  nextId() {
    this.sequence += 1;
    return `tb-${Date.now()}-${this.sequence}`;
  }
};

// src/core/state.ts
var DEFAULT_BRUSH = {
  type: "sphere",
  radius: 3,
  material: "minecraft:stone"
};
var StateStore = class {
  constructor() {
    __publicField(this, "sessions", /* @__PURE__ */ new Map());
  }
  get(player) {
    let session = this.sessions.get(player.id);
    if (!session) {
      session = {
        selection: {},
        brush: { ...DEFAULT_BRUSH },
        previewEnabled: true,
        undoStack: [],
        redoStack: []
      };
      this.sessions.set(player.id, session);
    }
    return session;
  }
  remove(playerId) {
    this.sessions.delete(playerId);
  }
  pushUndo(player, entry) {
    const session = this.get(player);
    session.undoStack.push(entry);
    while (session.undoStack.length > CONFIG.maxUndoEntries) {
      session.undoStack.shift();
    }
    session.redoStack.length = 0;
  }
  pushRedo(player, entry) {
    const session = this.get(player);
    session.redoStack.push(entry);
  }
};

// src/items/register.ts
function registerItemComponents(registry, app2) {
  const isPlayer = (entity) => {
    return typeof entity === "object" && entity !== null && entity.typeId === "minecraft:player";
  };
  registry.registerCustomComponent(COMPONENT_IDS.selectionTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app2.ui.showSelection(event.source);
    },
    onUseOn: (event) => {
      if (!isPlayer(event.source)) return;
      const player = event.source;
      const message = player.isSneaking ? app2.selection.setPos2(player, event.block.location) : app2.selection.setPos1(player, event.block.location);
      app2.tell(player, message);
    }
  });
  registry.registerCustomComponent(COMPONENT_IDS.menuTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app2.ui.showMain(event.source);
    }
  });
  registry.registerCustomComponent(COMPONENT_IDS.brushTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app2.ui.showBrush(event.source);
    }
  });
  registry.registerCustomComponent(COMPONENT_IDS.clipboardTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app2.ui.showClipboard(event.source);
    }
  });
  registry.registerCustomComponent(COMPONENT_IDS.inspectorTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app2.ui.showLogs(event.source);
    }
  });
}

// src/systems/brush.ts
var BrushService = class {
  constructor(state, permissions) {
    this.state = state;
    this.permissions = permissions;
  }
  get(player) {
    return this.state.get(player).brush;
  }
  setSphere(player, material, radius) {
    return this.set(player, { type: "sphere", material, radius });
  }
  setReplace(player, target, material, radius) {
    return this.set(player, { type: "replace", replaceTarget: target, material, radius });
  }
  clear(player) {
    this.state.get(player).brush = { type: "sphere", material: "minecraft:stone", radius: 3 };
    return "Brush reset to defaults.";
  }
  set(player, brush) {
    brush.radius = Math.max(1, Math.min(brush.radius, CONFIG.maxBrushRadius));
    this.state.get(player).brush = brush;
    return `Brush set to ${brush.type} radius ${brush.radius} material ${brush.material}`;
  }
  samplePoints(center, radius) {
    const points = [];
    const seen = /* @__PURE__ */ new Set();
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const distanceSq = x * x + y * y + z * z;
          if (distanceSq > radius * radius) continue;
          const point = { x: center.x + x, y: center.y + y, z: center.z + z };
          const key = vectorKey(point);
          if (seen.has(key)) continue;
          seen.add(key);
          points.push(point);
        }
      }
    }
    return points;
  }
  previewPoints(center, radius) {
    const points = [];
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const distanceSq = x * x + y * y + z * z;
          if (distanceSq > radius * radius || distanceSq < Math.max(0, radius * radius - radius)) continue;
          if ((x + y + z) % 2 !== 0) continue;
          points.push({ x: center.x + x, y: center.y + y, z: center.z + z });
        }
      }
    }
    return points;
  }
  describeBounds(player, center) {
    const brush = this.get(player);
    return makeBoundsFromPoints(player.dimension.id, this.samplePoints(cloneVector3(center), brush.radius));
  }
};

// src/systems/clipboard.ts
import { StructureSaveMode, world as world3 } from "@minecraft/server";
var ClipboardService = class {
  constructor(state, selection) {
    this.state = state;
    this.selection = selection;
  }
  copy(player) {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete.");
    }
    const blocks = [];
    for (let x = bounds.min.x; x <= bounds.max.x; x++) {
      for (let y = bounds.min.y; y <= bounds.max.y; y++) {
        for (let z = bounds.min.z; z <= bounds.max.z; z++) {
          const block = player.dimension.getBlock({ x, y, z });
          if (!block) continue;
          blocks.push({
            relative: subVector3(block.location, bounds.min),
            snapshot: snapshotBlock(block)
          });
        }
      }
    }
    const clipboard = {
      dimensionId: bounds.dimensionId,
      origin: bounds.min,
      size: {
        x: bounds.max.x - bounds.min.x + 1,
        y: bounds.max.y - bounds.min.y + 1,
        z: bounds.max.z - bounds.min.z + 1
      },
      blocks,
      rotation: 0,
      flipX: false,
      flipZ: false
    };
    this.state.get(player).clipboard = clipboard;
    return clipboard;
  }
  get(player) {
    return this.state.get(player).clipboard;
  }
  rotate(player, rotation) {
    const clipboard = this.require(player);
    clipboard.rotation = (clipboard.rotation + rotation) % 360;
    return `Clipboard rotation set to ${clipboard.rotation}.`;
  }
  flip(player, axis) {
    const clipboard = this.require(player);
    if (axis === "x") clipboard.flipX = !clipboard.flipX;
    if (axis === "z") clipboard.flipZ = !clipboard.flipZ;
    return `Clipboard flip updated: X=${clipboard.flipX} Z=${clipboard.flipZ}`;
  }
  transformedBlocks(player, origin) {
    const clipboard = this.require(player);
    return clipboard.blocks.map((block) => {
      const flipped = flipRelative(block.relative, clipboard.flipX, clipboard.flipZ);
      const rotated = rotateRelative(flipped, clipboard.rotation);
      return { location: addVector3(origin, rotated), block };
    });
  }
  saveSchematic(player, rawName) {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete.");
    }
    const id = this.toStructureId(rawName);
    const existing = world3.structureManager.get(id);
    if (existing) {
      world3.structureManager.delete(existing);
    }
    world3.structureManager.createFromWorld(id, player.dimension, bounds.min, bounds.max, { saveMode: StructureSaveMode.World });
    return `Saved schematic ${rawName} as ${id}.`;
  }
  placeSchematic(player, rawName, origin) {
    const id = this.toStructureId(rawName);
    world3.structureManager.place(id, player.dimension, origin);
    return `Placed schematic ${rawName}.`;
  }
  deleteSchematic(rawName) {
    const id = this.toStructureId(rawName);
    const deleted = world3.structureManager.delete(id);
    return deleted ? `Deleted schematic ${rawName}.` : `Schematic ${rawName} was not found.`;
  }
  listSchematics() {
    return world3.structureManager.getWorldStructureIds().filter((id) => id.startsWith(STRUCTURE_PREFIX)).map((id) => id.slice(STRUCTURE_PREFIX.length));
  }
  require(player) {
    const clipboard = this.get(player);
    if (!clipboard) {
      throw new Error("Clipboard is empty.");
    }
    return clipboard;
  }
  toStructureId(rawName) {
    const safe = rawName.toLowerCase().replace(/[^a-z0-9_\-]/g, "_");
    return `${STRUCTURE_PREFIX}${safe}`;
  }
};

// src/systems/masks.ts
var MaskService = class {
  parse(raw) {
    const text = raw.trim();
    const tokens = text.split(",").map((token) => token.trim()).filter(Boolean);
    return {
      raw: text,
      description: tokens.length > 0 ? tokens.join(", ") : "none",
      test: ({ blockTypeId, y, isAir }) => {
        if (tokens.length === 0) {
          return true;
        }
        for (const token of tokens) {
          if (token === "air" && isAir) return true;
          if (token === "!air" && !isAir) return true;
          if (token.startsWith("y<") && y < Number(token.slice(2))) return true;
          if (token.startsWith("y>") && y > Number(token.slice(2))) return true;
          if (token.startsWith("y=") && y === Number(token.slice(2))) return true;
          if (token.startsWith("!minecraft:") && blockTypeId !== token.slice(1)) return true;
          if (token.startsWith("minecraft:") && blockTypeId === token) return true;
        }
        return false;
      }
    };
  }
};

// src/systems/preview.ts
import { world as world4 } from "@minecraft/server";
var PreviewService = class {
  constructor(state, selection, brush, clipboard) {
    this.state = state;
    this.selection = selection;
    this.brush = brush;
    this.clipboard = clipboard;
    __publicField(this, "ticks", 0);
  }
  tick() {
    this.ticks++;
    if (this.ticks % CONFIG.previewInterval !== 0) {
      return;
    }
    for (const player of world4.getPlayers()) {
      const session = this.state.get(player);
      if (!session.previewEnabled) {
        continue;
      }
      this.renderSelection(player);
      this.renderBrush(player);
      this.renderClipboard(player);
    }
  }
  toggle(player) {
    const session = this.state.get(player);
    session.previewEnabled = !session.previewEnabled;
    return `Preview ${session.previewEnabled ? "enabled" : "disabled"}.`;
  }
  renderSelection(player) {
    const bounds = this.selection.getBounds(player);
    if (!bounds) return;
    for (const point of cuboidEdgePoints(bounds, bounds.volume > 4096 ? 4 : 2)) {
      this.safeParticle(player, PARTICLES.selection, point);
    }
  }
  renderBrush(player) {
    const target = getPlayerTargetBlock(player);
    if (!target) return;
    const brush = this.brush.get(player);
    for (const point of this.brush.previewPoints(target.location, Math.min(brush.radius, 6))) {
      this.safeParticle(player, PARTICLES.brush, point);
    }
  }
  renderClipboard(player) {
    const clipboard = this.clipboard.get(player);
    const target = getPlayerTargetBlock(player);
    if (!clipboard || !target) return;
    const placements = this.clipboard.transformedBlocks(player, target.location).slice(0, 48);
    for (const placement of placements) {
      this.safeParticle(player, PARTICLES.clipboard, placement.location);
    }
  }
  safeParticle(player, particleId, location) {
    try {
      player.dimension.spawnParticle(particleId, { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 });
    } catch {
    }
  }
};

// src/systems/selection.ts
var SelectionService = class {
  constructor(state) {
    this.state = state;
  }
  setPos1(player, position) {
    const session = this.state.get(player);
    session.selection.dimensionId = player.dimension.id;
    session.selection.pos1 = cloneVector3(position);
    return `Pos1 set to ${position.x}, ${position.y}, ${position.z}`;
  }
  setPos2(player, position) {
    const session = this.state.get(player);
    session.selection.dimensionId = player.dimension.id;
    session.selection.pos2 = cloneVector3(position);
    return `Pos2 set to ${position.x}, ${position.y}, ${position.z}`;
  }
  clear(player) {
    const session = this.state.get(player);
    session.selection = {};
    return "Selection cleared.";
  }
  getBounds(player) {
    const session = this.state.get(player);
    const { dimensionId, pos1, pos2 } = session.selection;
    if (!dimensionId || !pos1 || !pos2) {
      return void 0;
    }
    return boundsFromPositions(dimensionId, pos1, pos2);
  }
  describe(player) {
    const bounds = this.getBounds(player);
    if (!bounds) {
      return "Selection incomplete. Set both positions first.";
    }
    return `Selection ${bounds.min.x},${bounds.min.y},${bounds.min.z} -> ${bounds.max.x},${bounds.max.y},${bounds.max.z} (${bounds.volume} blocks)`;
  }
};

// src/systems/ui.ts
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
var UiService = class {
  constructor(app2) {
    this.app = app2;
  }
  async showMain(player) {
    if (!this.app.permissions.isOperator(player)) {
      this.app.tell(player, "Operator permissions required.");
      return;
    }
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("Tau Builder").body(this.app.selection.describe(player)).button("Selection").button("Edit").button("Clipboard").button("Brush").button("History").button("Logs").button("Preview").button("Close"),
        player
      );
      if (!response) return;
      if (response.selection === 0) await this.showSelection(player);
      else if (response.selection === 1) await this.showEdit(player);
      else if (response.selection === 2) await this.showClipboard(player);
      else if (response.selection === 3) await this.showBrush(player);
      else if (response.selection === 4) await this.showHistory(player);
      else if (response.selection === 5) await this.showLogs(player);
      else if (response.selection === 6) this.app.tell(player, this.app.preview.toggle(player));
      else return;
    }
  }
  async showSelection(player) {
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("Selection").body(this.app.selection.describe(player)).button("Set Pos1").button("Set Pos2").button("Clear").button("Back"),
        player
      );
      if (!response) return;
      const anchor = getPlayerAnchorLocation(player);
      if (response.selection === 0) this.app.tell(player, this.app.selection.setPos1(player, anchor));
      else if (response.selection === 1) this.app.tell(player, this.app.selection.setPos2(player, anchor));
      else if (response.selection === 2) this.app.tell(player, this.app.selection.clear(player));
      else return;
    }
  }
  async showEdit(player) {
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("Edit").body(this.currentMaskText(player)).button("Set Stone").button("Set Air").button("Replace Dirt -> Grass").button("Custom Set").button("Custom Replace").button("Mask").button("Clear Mask").button("Back"),
        player
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.app.queueSet(player, "minecraft:stone"));
      else if (response.selection === 1) this.app.tell(player, this.app.queueSet(player, "minecraft:air"));
      else if (response.selection === 2) this.app.tell(player, this.app.queueReplace(player, "minecraft:dirt", "minecraft:grass_block"));
      else if (response.selection === 3) this.app.tell(player, await this.promptSetBlock(player));
      else if (response.selection === 4) this.app.tell(player, await this.promptReplace(player));
      else if (response.selection === 5) this.app.tell(player, await this.promptMask(player));
      else if (response.selection === 6) this.app.tell(player, this.app.clearMask(player));
      else return;
    }
  }
  async showClipboard(player) {
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("Clipboard").body("Copy, paste, transform, save, and load.").button("Copy").button("Cut").button("Paste").button("Rotate 90").button("Flip X").button("Save Schematic").button("Load Schematic").button("Delete Schematic").button("List Schematics").button("Back"),
        player
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.app.copy(player, false));
      else if (response.selection === 1) this.app.tell(player, this.app.copy(player, true));
      else if (response.selection === 2) this.app.tell(player, this.app.paste(player));
      else if (response.selection === 3) this.app.tell(player, this.app.rotateClipboard(player, 90));
      else if (response.selection === 4) this.app.tell(player, this.app.flipClipboard(player, "x"));
      else if (response.selection === 5) this.app.tell(player, await this.promptSchematicAction(player, "save"));
      else if (response.selection === 6) this.app.tell(player, await this.promptSchematicAction(player, "load"));
      else if (response.selection === 7) this.app.tell(player, await this.promptSchematicAction(player, "delete"));
      else if (response.selection === 8) this.app.tell(player, this.app.clipboard.listSchematics().join(", ") || "No schematics saved.");
      else return;
    }
  }
  async showBrush(player) {
    while (true) {
      const brush = this.app.brush.get(player);
      const response = await this.showAction(
        new ActionFormData().title("Brush").body(`Type: ${brush.type}
Material: ${brush.material}
Radius: ${brush.radius}`).button("Sphere Brush").button("Replace Brush").button("Apply Brush").button("Set Radius").button("Clear Brush").button("Back"),
        player
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, await this.promptBrushSphere(player));
      else if (response.selection === 1) this.app.tell(player, await this.promptBrushReplace(player));
      else if (response.selection === 2) this.app.tell(player, this.app.applyBrush(player));
      else if (response.selection === 3) this.app.tell(player, await this.promptBrushRadius(player));
      else if (response.selection === 4) this.app.tell(player, this.app.brush.clear(player));
      else return;
    }
  }
  async showHistory(player) {
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("History").body(`Undo: ${this.app.state.get(player).undoStack.length}
Redo: ${this.app.state.get(player).redoStack.length}
Queue: ${this.app.queue.getStatus()}`).button("Undo").button("Redo").button("Queue Status").button("Toggle Preview").button("Back"),
        player
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.app.queue.undo(player));
      else if (response.selection === 1) this.app.tell(player, this.app.queue.redo(player));
      else if (response.selection === 2) this.app.tell(player, this.app.queue.getStatus());
      else if (response.selection === 3) this.app.tell(player, this.app.preview.toggle(player));
      else return;
    }
  }
  async showLogs(player) {
    while (true) {
      const response = await this.showAction(
        new ActionFormData().title("Logs").body(this.app.inspect(player)).button("Inspect Target").button("Rollback Player").button("Rollback Area").button("Back"),
        player
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.app.inspect(player));
      else if (response.selection === 1) this.app.tell(player, await this.promptRollbackPlayer(player));
      else if (response.selection === 2) this.app.tell(player, await this.promptRollbackArea(player));
      else return;
    }
  }
  currentMaskText(player) {
    const mask = this.app.state.get(player).mask;
    return mask ? `Mask: ${mask.raw}` : "Mask: none";
  }
  async promptSetBlock(player) {
    const response = await this.showModal(
      new ModalFormData().title("Custom Set").textField("Block id", "minecraft:stone", { defaultValue: "minecraft:stone" }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [blockId] = response.formValues;
    return blockId?.trim() ? this.app.queueSet(player, blockId.trim()) : "No block selected.";
  }
  async promptReplace(player) {
    const response = await this.showModal(
      new ModalFormData().title("Custom Replace").textField("From", "minecraft:dirt", { defaultValue: "minecraft:dirt" }).textField("To", "minecraft:grass_block", { defaultValue: "minecraft:grass_block" }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [from, to] = response.formValues;
    return from?.trim() && to?.trim() ? this.app.queueReplace(player, from.trim(), to.trim()) : "Invalid replace inputs.";
  }
  async promptMask(player) {
    const response = await this.showModal(
      new ModalFormData().title("Mask").textField("Mask expression", "!air", { defaultValue: this.app.state.get(player).mask?.raw ?? "!air" }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [mask] = response.formValues;
    return mask?.trim() ? this.app.setMask(player, mask.trim()) : this.app.clearMask(player);
  }
  async promptSchematicAction(player, action) {
    const response = await this.showModal(
      new ModalFormData().title(`Schematic ${action}`).textField("Name", "house", { defaultValue: "house" }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [name] = response.formValues;
    if (!name?.trim()) return "No schematic name entered.";
    if (action === "save") return this.app.clipboard.saveSchematic(player, name.trim());
    if (action === "load") return this.app.placeSchematic(player, name.trim());
    return this.app.clipboard.deleteSchematic(name.trim());
  }
  async promptBrushSphere(player) {
    const response = await this.showModal(
      new ModalFormData().title("Sphere Brush").textField("Material", "minecraft:stone", { defaultValue: this.app.brush.get(player).material }).slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: this.app.brush.get(player).radius, valueStep: 1 }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [material, radius] = response.formValues;
    return material?.trim() ? this.app.brush.setSphere(player, material.trim(), radius) : "Invalid material.";
  }
  async promptBrushReplace(player) {
    const brush = this.app.brush.get(player);
    const response = await this.showModal(
      new ModalFormData().title("Replace Brush").textField("Target block", "minecraft:dirt", { defaultValue: brush.replaceTarget ?? "minecraft:dirt" }).textField("Material", "minecraft:grass_block", { defaultValue: brush.material }).slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: brush.radius, valueStep: 1 }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [target, material, radius] = response.formValues;
    return target?.trim() && material?.trim() ? this.app.brush.setReplace(player, target.trim(), material.trim(), radius) : "Invalid brush inputs.";
  }
  async promptBrushRadius(player) {
    const brush = this.app.brush.get(player);
    const response = await this.showModal(
      new ModalFormData().title("Brush Radius").slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: brush.radius, valueStep: 1 }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [radius] = response.formValues;
    this.app.brush.setSphere(player, brush.material, radius);
    return `Brush radius set to ${radius}.`;
  }
  async promptRollbackPlayer(player) {
    const response = await this.showModal(
      new ModalFormData().title("Rollback Player").textField("Player name", player.name, { defaultValue: player.name }).slider("Minutes", 1, 120, { defaultValue: 10, valueStep: 1 }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [name, minutes] = response.formValues;
    return name?.trim() ? this.app.rollbackPlayer(player, name.trim(), minutes) : "No player name entered.";
  }
  async promptRollbackArea(player) {
    const response = await this.showModal(
      new ModalFormData().title("Rollback Area").slider("Radius", 1, 64, { defaultValue: 8, valueStep: 1 }).slider("Minutes", 1, 120, { defaultValue: 10, valueStep: 1 }),
      player
    );
    if (!response || response.canceled) return "Cancelled.";
    const [radius, minutes] = response.formValues;
    return this.app.rollbackArea(player, radius, minutes);
  }
  async showAction(form, player) {
    try {
      const response = await form.show(player);
      return response;
    } catch {
      return void 0;
    }
  }
  async showModal(form, player) {
    try {
      const response = await form.show(player);
      return response;
    } catch {
      return void 0;
    }
  }
};

// src/taubuilder.ts
var TauBuilder = class {
  constructor() {
    __publicField(this, "state", new StateStore());
    __publicField(this, "permissions", new PermissionService());
    __publicField(this, "logger", new OperationLogger());
    __publicField(this, "selection", new SelectionService(this.state));
    __publicField(this, "masks", new MaskService());
    __publicField(this, "brush", new BrushService(this.state, this.permissions));
    __publicField(this, "clipboard", new ClipboardService(this.state, this.selection));
    __publicField(this, "queue", new OperationQueue(this.state, this.permissions, this.logger));
    __publicField(this, "preview", new PreviewService(this.state, this.selection, this.brush, this.clipboard));
    __publicField(this, "ui", new UiService(this));
  }
  startup(event) {
    registerCommands(event.customCommandRegistry, this);
    registerItemComponents(event.itemComponentRegistry, this);
  }
  tick() {
    this.queue.tick();
    this.preview.tick();
  }
  onPlayerLeave(playerId) {
    this.state.remove(playerId);
  }
  tell(player, message) {
    player.sendMessage(message);
  }
  requireBuildAccess(player) {
    if (!this.permissions.isOperator(player)) {
      throw new Error("Operator permissions required.");
    }
  }
  setSelectionPos(player, which) {
    this.requireBuildAccess(player);
    const anchor = getPlayerAnchorLocation(player);
    return which === 1 ? this.selection.setPos1(player, anchor) : this.selection.setPos2(player, anchor);
  }
  setMask(player, raw) {
    this.requireBuildAccess(player);
    this.state.get(player).mask = this.masks.parse(raw);
    return `Mask set to ${raw}.`;
  }
  clearMask(player) {
    this.requireBuildAccess(player);
    this.state.get(player).mask = void 0;
    return "Mask cleared.";
  }
  queueSet(player, blockId) {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertSelectionWithinLimit(player, bounds.volume);
    return this.queue.enqueueSet(player, bounds, blockId, this.state.get(player).mask);
  }
  queueReplace(player, from, to) {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertSelectionWithinLimit(player, bounds.volume);
    return this.queue.enqueueReplace(player, bounds, from, to, this.state.get(player).mask);
  }
  copy(player, cut) {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertClipboardWithinLimit(player, bounds.volume);
    const clipboard = this.clipboard.copy(player);
    if (cut) {
      this.queue.enqueueSet(player, bounds, "minecraft:air", void 0);
    }
    return `${cut ? "Cut" : "Copied"} ${clipboard.blocks.length} blocks.`;
  }
  paste(player, origin) {
    this.requireBuildAccess(player);
    const clipboard = this.clipboard.get(player);
    if (!clipboard) {
      throw new Error("Clipboard is empty.");
    }
    const target = origin ?? getPlayerAnchorLocation(player);
    const placements = this.clipboard.transformedBlocks(player, target);
    return this.queue.enqueueClipboardPaste(player, clipboard, placements);
  }
  rotateClipboard(player, degrees) {
    this.requireBuildAccess(player);
    if (degrees !== 90 && degrees !== 180 && degrees !== 270) {
      throw new Error("Rotation must be 90, 180, or 270.");
    }
    return this.clipboard.rotate(player, degrees);
  }
  flipClipboard(player, axis) {
    this.requireBuildAccess(player);
    if (axis !== "x" && axis !== "z") {
      throw new Error("Axis must be x or z.");
    }
    return this.clipboard.flip(player, axis);
  }
  applyBrush(player) {
    this.requireBuildAccess(player);
    const targetBlock = getPlayerTargetBlock(player);
    if (!targetBlock) {
      throw new Error("Look at a block first.");
    }
    const brush = this.brush.get(player);
    const points = this.brush.samplePoints(targetBlock.location, brush.radius);
    if (points.length > CONFIG.maxSelectionBlocks) {
      throw new Error(`Brush would affect ${points.length} blocks. Limit is ${CONFIG.maxSelectionBlocks}.`);
    }
    return this.queue.enqueuePoints(player, `brush ${brush.type}`, points, { typeId: brush.material, states: {}, waterlogged: false }, brush.replaceTarget, this.state.get(player).mask);
  }
  placeSchematic(player, name) {
    this.requireBuildAccess(player);
    return this.clipboard.placeSchematic(player, name, getPlayerAnchorLocation(player));
  }
  rollbackPlayer(player, name, minutes) {
    this.requireBuildAccess(player);
    if (minutes < 1) {
      throw new Error("Minutes must be at least 1.");
    }
    const entries = this.logger.recentByPlayerWithin(name, minutes).map((log) => log.historyEntry);
    return this.queue.rollbackLogs(player, entries);
  }
  rollbackArea(player, radius, minutes) {
    this.requireBuildAccess(player);
    if (radius < 1 || minutes < 1) {
      throw new Error("Radius and minutes must be at least 1.");
    }
    const anchor = getPlayerAnchorLocation(player);
    const entries = this.logger.recentByAreaWithin(player.dimension.id, anchor, radius, minutes).map((log) => log.historyEntry);
    return this.queue.rollbackLogs(player, entries);
  }
  inspect(player, location) {
    const target = location ?? getPlayerAnchorLocation(player);
    const logs = this.logger.inspectBlock(player.dimension.id, target).slice(0, CONFIG.maxChangesPerLogPreview);
    if (logs.length === 0) {
      return `No Tau Builder edits recorded at ${target.x}, ${target.y}, ${target.z}.`;
    }
    return logs.map((log) => `${log.playerName}: ${log.type} (${log.affectedBlocks} blocks)`).join(" | ");
  }
  requireSelection(player) {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete. Use taubuilder:pos1 and taubuilder:pos2 first.");
    }
    return bounds;
  }
  assertSelectionWithinLimit(player, volume) {
    if (volume > CONFIG.maxSelectionBlocks) {
      throw new Error(`Selection too large: ${volume}. Limit is ${CONFIG.maxSelectionBlocks}.`);
    }
  }
  assertClipboardWithinLimit(player, blocks) {
    if (blocks > CONFIG.maxClipboardBlocks) {
      throw new Error(`Clipboard too large: ${blocks}. Limit is ${CONFIG.maxClipboardBlocks}.`);
    }
  }
};

// src/main.ts
var app = new TauBuilder();
system.beforeEvents.startup.subscribe((event) => {
  app.startup(event);
});
system.runInterval(() => {
  app.tick();
}, 1);
world5.afterEvents.playerLeave.subscribe((event) => {
  app.onPlayerLeave(event.playerId);
});
console.warn("Tau Builder beta systems loaded for 1.26.20+");
