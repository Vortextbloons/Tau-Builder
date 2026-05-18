import type { Player, Vector3 } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import { StateStore } from "../core/state";
import { PermissionService } from "../core/permissions";
import type { BrushConfig } from "../types";
import { cloneVector3, makeBoundsFromPoints, vectorKey } from "../utils/vector";

export class BrushService {
  constructor(
    private readonly state: StateStore,
    private readonly permissions: PermissionService,
  ) {}

  get(player: Player): BrushConfig {
    return this.state.get(player).brush;
  }

  setSphere(player: Player, material: string, radius: number): string {
    return this.set(player, { type: "sphere", material, radius });
  }

  setReplace(player: Player, target: string, material: string, radius: number): string {
    return this.set(player, { type: "replace", replaceTarget: target, material, radius });
  }

  clear(player: Player): string {
    this.state.get(player).brush = { type: "sphere", material: "minecraft:stone", radius: 3 };
    return "Brush reset to defaults.";
  }

  private set(player: Player, brush: BrushConfig): string {
    brush.radius = Math.max(1, Math.min(brush.radius, CONFIG.maxBrushRadius));
    this.state.get(player).brush = brush;
    return `Brush set to ${brush.type} radius ${brush.radius} material ${brush.material}`;
  }

  samplePoints(center: Vector3, radius: number): Vector3[] {
    const points: Vector3[] = [];
    const seen = new Set<string>();
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

  previewPoints(center: Vector3, radius: number): Vector3[] {
    const points: Vector3[] = [];
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

  describeBounds(player: Player, center: Vector3) {
    const brush = this.get(player);
    return makeBoundsFromPoints(player.dimension.id, this.samplePoints(cloneVector3(center), brush.radius));
  }
}
