import { world, type Block, type Dimension, type Player, type Vector3 } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import type { BlockChange, BlockSnapshot, Bounds, ClipboardData, HistoryEntry, MaskRule } from "../types";
import { applySnapshot, parseBlockInput, snapshotBlock, snapshotsEqual, tryGetDimension } from "../utils/block";
import { makeBoundsFromPoints, splitBoundsIntoChunks } from "../utils/vector";
import { OperationLogger } from "./logger";
import { PermissionService } from "./permissions";
import { StateStore } from "./state";

interface QueueJob {
  id: string;
  playerId: string;
  playerName: string;
  dimensionId: string;
  type: string;
  estimated: number;
  processed: number;
  changes: BlockChange[];
  process: (budget: number) => number;
  isDone: () => boolean;
  bounds: () => Bounds;
  canStoreHistory: () => boolean;
  onComplete?: (entry: HistoryEntry) => void;
}

interface ChunkCursor {
  bounds: Bounds;
  x: number;
  y: number;
  z: number;
  done: boolean;
}

interface ChunkJobState {
  cursors: ChunkCursor[];
  nextScanIndex: number;
  remaining: number;
}

export class OperationQueue {
  private readonly jobs: QueueJob[] = [];
  private sequence = 0;

  constructor(
    private readonly state: StateStore,
    private readonly permissions: PermissionService,
    private readonly logger: OperationLogger,
  ) {}

  getStatus(): string {
    if (this.jobs.length === 0) {
      return "Queue idle.";
    }

    const current = this.jobs[0];
    return `${this.jobs.length} job(s). Active: ${current.type} ${current.processed}/${current.estimated}`;
  }

  cancelForPlayer(player: Player): string {
    const before = this.jobs.length;
    for (let index = this.jobs.length - 1; index >= 0; index--) {
      if (this.jobs[index].playerId === player.id) {
        this.jobs.splice(index, 1);
      }
    }
    return before === this.jobs.length ? "No queued jobs to cancel." : "Cancelled your queued jobs.";
  }

  clear(): void {
    this.jobs.length = 0;
  }

  tick(players: Player[] = world.getPlayers()): void {
    const job = this.jobs[0];
    if (!job) {
      return;
    }

    const player = players.find((candidate) => candidate.id === job.playerId);
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
    const entry: HistoryEntry = {
      id: job.id,
      playerId: player.id,
      playerName: player.name,
      operationType: job.type,
      dimensionId: job.dimensionId,
      bounds: job.bounds(),
      affectedBlocks: job.changes.length,
      timestamp: Date.now(),
      changes: job.changes,
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

  enqueueSet(player: Player, bounds: Bounds, target: string, mask?: MaskRule): string {
    const snapshot = parseBlockInput(target);
    const job = this.createChunkedRegionJob(player, bounds, `set ${target}`, bounds.volume, (block) => {
      if (mask && !mask.test({ blockTypeId: block.typeId, y: block.y, isAir: block.isAir })) return undefined;
      return snapshot;
    });
    this.push(job);
    return `Queued ${bounds.volume >= CONFIG.chunkedOperationThreshold ? "chunked set" : "set"} over ${bounds.volume} blocks.`;
  }

  enqueueReplace(player: Player, bounds: Bounds, from: string, to: string, mask?: MaskRule): string {
    const target = parseBlockInput(to);
    const job = this.createChunkedRegionJob(player, bounds, `replace ${from} ${to}`, bounds.volume, (block) => {
      if (block.typeId !== from) return undefined;
      if (mask && !mask.test({ blockTypeId: block.typeId, y: block.y, isAir: block.isAir })) return undefined;
      return target;
    });
    this.push(job);
    return `Queued ${bounds.volume >= CONFIG.chunkedOperationThreshold ? "chunked replace" : "replace"} ${from} -> ${to}.`;
  }

  enqueueClipboardPaste(player: Player, clipboard: ClipboardData, placements: { location: Vector3; block: { snapshot: BlockSnapshot } }[]): string {
    const done = { index: 0 };
    const job: QueueJob = {
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
          if (!snapshotsEqual(before, after)) {
            applySnapshot(block, after);
            job.changes.push({ location: placement.location, before, after: snapshotBlock(block) });
          }
          count++;
        }
        return count;
      },
      isDone: () => done.index >= placements.length,
      bounds: () => makeBoundsFromPoints(player.dimension.id, placements.map((placement) => placement.location)),
      canStoreHistory: () => clipboard.totalBlocks <= CONFIG.maxUndoBlocks,
    };
    this.push(job);
    return `Queued paste for ${placements.length} blocks.`;
  }

  enqueuePoints(player: Player, type: string, points: Vector3[], target: BlockSnapshot, replaceTarget?: string, mask?: MaskRule): string {
    const done = { index: 0 };
    const job: QueueJob = {
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
          if (!snapshotsEqual(before, target)) {
            applySnapshot(block, target);
            job.changes.push({ location: point, before, after: snapshotBlock(block) });
          }
          count++;
        }
        return count;
      },
      isDone: () => done.index >= points.length,
      bounds: () => makeBoundsFromPoints(player.dimension.id, points),
      canStoreHistory: () => points.length <= CONFIG.maxUndoBlocks,
    };
    this.push(job);
    return `Queued ${type} affecting ${points.length} blocks.`;
  }

  undo(player: Player): string {
    const session = this.state.get(player);
    const entry = session.undoStack.pop();
    if (!entry) {
      return "Nothing to undo.";
    }

    session.redoStack.push(entry);
    this.enqueueHistoryReplay(player, entry, true);
    return `Queued undo for ${entry.operationType}.`;
  }

  redo(player: Player): string {
    const session = this.state.get(player);
    const entry = session.redoStack.pop();
    if (!entry) {
      return "Nothing to redo.";
    }

    session.undoStack.push(entry);
    this.enqueueHistoryReplay(player, entry, false);
    return `Queued redo for ${entry.operationType}.`;
  }

  rollbackLogs(player: Player, entries: HistoryEntry[]): string {
    if (entries.length === 0) {
      return "No matching logged operations found.";
    }

    for (const entry of entries) {
      this.enqueueHistoryReplay(player, entry, true, false);
    }

    return `Queued rollback for ${entries.length} logged operation(s).`;
  }

  private enqueueHistoryReplay(player: Player, entry: HistoryEntry, useBefore: boolean, storeHistory = false): void {
    const done = { index: 0 };
    const changes = [...entry.changes];
    const job: QueueJob = {
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
      canStoreHistory: () => storeHistory,
    };
    this.push(job);
  }

  private createChunkedRegionJob(
    player: Player,
    bounds: Bounds,
    type: string,
    estimated: number,
    resolveTarget: (block: Block) => BlockSnapshot | undefined,
  ): QueueJob {
    const chunkBounds = splitBoundsIntoChunks(bounds);
    const state: ChunkJobState = {
      cursors: (chunkBounds.length > 0 ? chunkBounds : [bounds]).map((chunk) => this.createCursor(chunk)),
      nextScanIndex: 0,
      remaining: chunkBounds.length > 0 ? chunkBounds.length : 1,
    };
    const job: QueueJob = {
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
        let loadChecks = 0;
        const dimension = tryGetDimension(bounds.dimensionId);
        if (!dimension) {
          state.remaining = 0;
          return 0;
        }

        while (state.remaining > 0 && count < budget && loadChecks < CONFIG.maxChunkLoadChecksPerTick) {
          const cursor = state.cursors[state.nextScanIndex];
          state.nextScanIndex = (state.nextScanIndex + 1) % state.cursors.length;
          if (cursor.done) continue;

          loadChecks++;
          if (!this.isChunkLoaded(dimension, cursor.bounds)) continue;

          while (!cursor.done && count < budget) {
            const block = dimension.getBlock({ x: cursor.x, y: cursor.y, z: cursor.z });
            if (!block) {
              return count;
            }

            const target = resolveTarget(block);
            if (target) {
              const before = snapshotBlock(block);
              if (!snapshotsEqual(before, target)) {
                applySnapshot(block, target);
                job.changes.push({ location: block.location, before, after: snapshotBlock(block) });
              }
            }
            count++;
            this.advanceCursor(cursor);
          }

          if (cursor.done) {
            state.remaining--;
          }
        }
        return count;
      },
      isDone: () => state.remaining <= 0,
      bounds: () => bounds,
      canStoreHistory: () => bounds.volume <= CONFIG.maxUndoBlocks,
    };
    return job;
  }

  private isChunkLoaded(dimension: Dimension, bounds: Bounds): boolean {
    const probe = {
      x: Math.floor((bounds.min.x + bounds.max.x) / 2),
      y: Math.floor((bounds.min.y + bounds.max.y) / 2),
      z: Math.floor((bounds.min.z + bounds.max.z) / 2),
    };

    return !!dimension.getBlock(probe);
  }

  private createCursor(bounds: Bounds): ChunkCursor {
    return { bounds, x: bounds.min.x, y: bounds.min.y, z: bounds.min.z, done: false };
  }

  private advanceCursor(cursor: ChunkCursor): void {
    cursor.x++;
    if (cursor.x <= cursor.bounds.max.x) return;
    cursor.x = cursor.bounds.min.x;
    cursor.z++;
    if (cursor.z <= cursor.bounds.max.z) return;
    cursor.z = cursor.bounds.min.z;
    cursor.y++;
    if (cursor.y <= cursor.bounds.max.y) return;
    cursor.done = true;
  }

  private push(job: QueueJob): void {
    if (this.jobs.length >= CONFIG.maxQueueLength) {
      throw new Error("Queue is full.");
    }
    this.jobs.push(job);
  }

  private nextId(): string {
    this.sequence += 1;
    return `tb-${Date.now()}-${this.sequence}`;
  }
}
