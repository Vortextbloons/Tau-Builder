import { StructureSaveMode, world, type Player, type Vector3 } from "@minecraft/server";
import { STRUCTURE_PREFIX } from "../config/constants";
import { StateStore } from "../core/state";
import type { ClipboardBlock, ClipboardData } from "../types";
import { snapshotBlock } from "../utils/block";
import { addVector3, flipRelative, rotateRelative, subVector3 } from "../utils/vector";
import { SelectionService } from "./selection";

export class ClipboardService {
  constructor(
    private readonly state: StateStore,
    private readonly selection: SelectionService,
  ) {}

  copy(player: Player): ClipboardData {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete.");
    }

    const blocks: ClipboardBlock[] = [];
    for (let x = bounds.min.x; x <= bounds.max.x; x++) {
      for (let y = bounds.min.y; y <= bounds.max.y; y++) {
        for (let z = bounds.min.z; z <= bounds.max.z; z++) {
          const block = player.dimension.getBlock({ x, y, z });
          if (!block) continue;
          blocks.push({
            relative: subVector3(block.location, bounds.min),
            snapshot: snapshotBlock(block),
          });
        }
      }
    }

    const clipboard: ClipboardData = {
      dimensionId: bounds.dimensionId,
      origin: bounds.min,
      size: {
        x: bounds.max.x - bounds.min.x + 1,
        y: bounds.max.y - bounds.min.y + 1,
        z: bounds.max.z - bounds.min.z + 1,
      },
      blocks,
      rotation: 0,
      flipX: false,
      flipZ: false,
    };

    this.state.get(player).clipboard = clipboard;
    return clipboard;
  }

  get(player: Player): ClipboardData | undefined {
    return this.state.get(player).clipboard;
  }

  rotate(player: Player, rotation: 90 | 180 | 270): string {
    const clipboard = this.require(player);
    clipboard.rotation = (((clipboard.rotation + rotation) % 360) as 0 | 90 | 180 | 270);
    return `Clipboard rotation set to ${clipboard.rotation}.`;
  }

  flip(player: Player, axis: "x" | "z"): string {
    const clipboard = this.require(player);
    if (axis === "x") clipboard.flipX = !clipboard.flipX;
    if (axis === "z") clipboard.flipZ = !clipboard.flipZ;
    return `Clipboard flip updated: X=${clipboard.flipX} Z=${clipboard.flipZ}`;
  }

  transformedBlocks(player: Player, origin: Vector3): { location: Vector3; block: ClipboardBlock }[] {
    const clipboard = this.require(player);
    return clipboard.blocks.map((block) => {
      const flipped = flipRelative(block.relative, clipboard.flipX, clipboard.flipZ);
      const rotated = rotateRelative(flipped, clipboard.rotation);
      return { location: addVector3(origin, rotated), block };
    });
  }

  saveSchematic(player: Player, rawName: string): string {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete.");
    }

    const id = this.toStructureId(rawName);
    const existing = world.structureManager.get(id);
    if (existing) {
      world.structureManager.delete(existing);
    }
    world.structureManager.createFromWorld(id, player.dimension, bounds.min, bounds.max, { saveMode: StructureSaveMode.World });
    return `Saved schematic ${rawName} as ${id}.`;
  }

  placeSchematic(player: Player, rawName: string, origin: Vector3): string {
    const id = this.toStructureId(rawName);
    world.structureManager.place(id, player.dimension, origin);
    return `Placed schematic ${rawName}.`;
  }

  deleteSchematic(rawName: string): string {
    const id = this.toStructureId(rawName);
    const deleted = world.structureManager.delete(id);
    return deleted ? `Deleted schematic ${rawName}.` : `Schematic ${rawName} was not found.`;
  }

  listSchematics(): string[] {
    return world.structureManager.getWorldStructureIds()
      .filter((id) => id.startsWith(STRUCTURE_PREFIX))
      .map((id) => id.slice(STRUCTURE_PREFIX.length));
  }

  private require(player: Player): ClipboardData {
    const clipboard = this.get(player);
    if (!clipboard) {
      throw new Error("Clipboard is empty.");
    }

    return clipboard;
  }

  private toStructureId(rawName: string): string {
    const safe = rawName.toLowerCase().replace(/[^a-z0-9_\-]/g, "_");
    return `${STRUCTURE_PREFIX}${safe}`;
  }
}
