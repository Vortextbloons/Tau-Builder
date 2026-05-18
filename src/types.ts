import type { Vector3 } from "@minecraft/server";

export type BlockStates = Record<string, boolean | number | string>;

export interface Bounds {
  dimensionId: string;
  min: Vector3;
  max: Vector3;
  volume: number;
}

export interface BlockSnapshot {
  typeId: string;
  states: BlockStates;
  waterlogged: boolean;
}

export interface BlockChange {
  location: Vector3;
  before: BlockSnapshot;
  after: BlockSnapshot;
}

export interface HistoryEntry {
  id: string;
  playerId: string;
  playerName: string;
  operationType: string;
  dimensionId: string;
  bounds: Bounds;
  affectedBlocks: number;
  timestamp: number;
  changes: BlockChange[];
}

export interface SelectionState {
  dimensionId?: string;
  pos1?: Vector3;
  pos2?: Vector3;
}

export interface ClipboardBlock {
  relative: Vector3;
  snapshot: BlockSnapshot;
}

export interface ClipboardData {
  dimensionId: string;
  origin: Vector3;
  size: Vector3;
  blocks: ClipboardBlock[];
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipZ: boolean;
}

export interface MaskRule {
  raw: string;
  description: string;
  test: (args: { blockTypeId: string; y: number; isAir: boolean }) => boolean;
}

export interface BrushConfig {
  type: "sphere" | "replace";
  radius: number;
  material: string;
  replaceTarget?: string;
}

export interface OperationLogEntry {
  id: string;
  playerId: string;
  playerName: string;
  type: string;
  dimensionId: string;
  bounds: Bounds;
  affectedBlocks: number;
  timestamp: number;
  historyEntry: HistoryEntry;
}

export interface PlayerSession {
  selection: SelectionState;
  mask?: MaskRule;
  brush: BrushConfig;
  clipboard?: ClipboardData;
  previewEnabled: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}
