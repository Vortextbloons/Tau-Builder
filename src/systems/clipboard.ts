import { StructureSaveMode, world, type Player, type Vector3 } from "@minecraft/server";
import { STRUCTURE_PREFIX } from "../config/constants";
import { StateStore } from "../core/state";
import type { ClipboardBlock, ClipboardChunk, ClipboardData } from "../types";
import { snapshotBlock } from "../utils/block";
import { addVector3, flipRelative, rotateRelative, splitBoundsIntoChunks, subVector3 } from "../utils/vector";
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

    const chunks: ClipboardChunk[] = [];
    let totalBlocks = 0;

    for (const chunkBounds of splitBoundsIntoChunks(bounds)) {
      const chunkBlocks: ClipboardBlock[] = [];
      for (let x = chunkBounds.min.x; x <= chunkBounds.max.x; x++) {
        for (let y = chunkBounds.min.y; y <= chunkBounds.max.y; y++) {
          for (let z = chunkBounds.min.z; z <= chunkBounds.max.z; z++) {
            const block = player.dimension.getBlock({ x, y, z });
            if (!block) continue;
            chunkBlocks.push({
              relative: subVector3(block.location, bounds.min),
              snapshot: snapshotBlock(block),
            });
            totalBlocks++;
          }
        }
      }
      chunks.push({ bounds: chunkBounds, blocks: chunkBlocks });
    }

    const clipboard: ClipboardData = {
      dimensionId: bounds.dimensionId,
      origin: bounds.min,
      size: {
        x: bounds.max.x - bounds.min.x + 1,
        y: bounds.max.y - bounds.min.y + 1,
        z: bounds.max.z - bounds.min.z + 1,
      },
      chunks,
      totalBlocks,
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

  describe(player: Player): string {
    const clipboard = this.get(player);
    if (!clipboard) {
      return "Clipboard empty.";
    }

    return `Clipboard: ${clipboard.totalBlocks} blocks in ${clipboard.chunks.length} chunk(s), rotation ${clipboard.rotation}, flipX=${clipboard.flipX}, flipZ=${clipboard.flipZ}`;
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

  transformedBlocks(player: Player, origin: Vector3, limit?: number): { location: Vector3; block: ClipboardBlock }[] {
    const clipboard = this.require(player);
    const placements: { location: Vector3; block: ClipboardBlock }[] = [];

    for (const chunk of clipboard.chunks) {
      for (const block of chunk.blocks) {
        const flipped = flipRelative(block.relative, clipboard.flipX, clipboard.flipZ);
        const rotated = rotateRelative(flipped, clipboard.rotation);
        placements.push({ location: addVector3(origin, rotated), block });
        if (limit !== undefined && placements.length >= limit) {
          return placements;
        }
      }
    }

    return placements;
  }

  saveSchematic(player: Player, rawName: string): string {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete.");
    }

    const baseId = this.toStructureBaseId(rawName);
    this.deleteStructureFamily(baseId);

    const chunkIds: string[] = [];
    for (const chunk of splitBoundsIntoChunks(bounds)) {
      const offset = subVector3(chunk.min, bounds.min);
      const id = this.toChunkStructureId(baseId, offset);
      world.structureManager.createFromWorld(id, player.dimension, chunk.min, chunk.max, { saveMode: StructureSaveMode.World });
      chunkIds.push(id);
    }

    return `Saved schematic ${rawName} as ${chunkIds.length} chunk(s).`;
  }

  placeSchematic(player: Player, rawName: string, origin: Vector3): string {
    const baseId = this.toStructureBaseId(rawName);
    const chunkIds = this.findStructureFamily(baseId);
    if (chunkIds.length === 0) {
      throw new Error(`Schematic ${rawName} was not found.`);
    }

    for (const id of chunkIds) {
      const offset = this.parseChunkOffset(id, baseId);
      world.structureManager.place(id, player.dimension, addVector3(origin, offset));
    }

    return `Placed schematic ${rawName} from ${chunkIds.length} chunk(s).`;
  }

  deleteSchematic(rawName: string): string {
    const baseId = this.toStructureBaseId(rawName);
    const deleted = this.deleteStructureFamily(baseId);
    return deleted ? `Deleted schematic ${rawName}.` : `Schematic ${rawName} was not found.`;
  }

  listSchematics(): string[] {
    return world.structureManager.getWorldStructureIds()
      .filter((id) => id.startsWith(STRUCTURE_PREFIX))
      .map((id) => id.slice(STRUCTURE_PREFIX.length).split("__")[0])
      .filter((value, index, list) => list.indexOf(value) === index)
      .sort();
  }

  private require(player: Player): ClipboardData {
    const clipboard = this.get(player);
    if (!clipboard) {
      throw new Error("Clipboard is empty.");
    }

    return clipboard;
  }

  private toStructureBaseId(rawName: string): string {
    const safe = rawName.toLowerCase().replace(/[^a-z0-9_\-]/g, "_");
    return `${STRUCTURE_PREFIX}${safe}`;
  }

  private toChunkStructureId(baseId: string, offset: Vector3): string {
    return `${baseId}__${offset.x}_${offset.y}_${offset.z}`;
  }

  private parseChunkOffset(id: string, baseId: string): Vector3 {
    const raw = id.slice(baseId.length + 2);
    const [x, y, z] = raw.split("_").map((value) => Number(value));
    return { x: x || 0, y: y || 0, z: z || 0 };
  }

  private findStructureFamily(baseId: string): string[] {
    return world.structureManager.getWorldStructureIds()
      .filter((id) => id === baseId || id.startsWith(`${baseId}__`))
      .sort();
  }

  private deleteStructureFamily(baseId: string): boolean {
    const ids = this.findStructureFamily(baseId);
    let deleted = false;
    for (const id of ids) {
      deleted = world.structureManager.delete(id) || deleted;
    }
    return deleted;
  }
}
