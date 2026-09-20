import { BlockPermutation, world, type Block, type Dimension, type Player, type Vector3 } from "@minecraft/server";
import type { BlockSnapshot, BlockStates } from "../types";
import { floorVector3 } from "./vector";

export function getPlayerTargetBlock(player: Player): Block | undefined {
  try {
    return player.getBlockFromViewDirection({ includeLiquidBlocks: true, maxDistance: 64 })?.block;
  } catch {
    return undefined;
  }
}

export function getPlayerAnchorLocation(player: Player): Vector3 {
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

export function snapshotBlock(block: Block): BlockSnapshot {
  return {
    typeId: block.typeId,
    states: block.permutation.getAllStates(),
    waterlogged: block.isWaterlogged,
  };
}

export function snapshotsEqual(a: BlockSnapshot, b: BlockSnapshot): boolean {
  if (a.typeId !== b.typeId || a.waterlogged !== b.waterlogged) {
    return false;
  }

  const aKeys = Object.keys(a.states);
  const bKeys = Object.keys(b.states);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (!(key in b.states) || a.states[key] !== b.states[key]) {
      return false;
    }
  }

  return true;
}

export function resolveSnapshot(snapshot: BlockSnapshot): BlockPermutation {
  return BlockPermutation.resolve(snapshot.typeId, snapshot.states as BlockStates as never);
}

export function applySnapshot(block: Block, snapshot: BlockSnapshot): void {
  block.setPermutation(resolveSnapshot(snapshot));
  try {
    block.setWaterlogged(snapshot.waterlogged);
  } catch {
    // Waterlogging is best-effort only.
  }
}

export function parseBlockInput(raw: string): BlockSnapshot {
  const trimmed = raw.trim();
  const bracketIndex = trimmed.indexOf("[");

  if (bracketIndex === -1 || !trimmed.endsWith("]")) {
    return { typeId: trimmed, states: {}, waterlogged: false };
  }

  const typeId = trimmed.slice(0, bracketIndex).trim();
  const inside = trimmed.slice(bracketIndex + 1, -1).trim();
  const states: BlockStates = {};

  for (const entry of inside.split(",")) {
    const [rawKey, rawValue] = entry.split("=");
    if (!rawKey || rawValue === undefined) {
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

export function tryGetDimension(dimensionId: string): Dimension | undefined {
  try {
    return world.getDimension(dimensionId);
  } catch {
    return undefined;
  }
}
