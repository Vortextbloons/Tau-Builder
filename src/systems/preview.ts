import { world, type Player, type Vector3 } from "@minecraft/server";
import { CONFIG, PARTICLES } from "../config/constants";
import { StateStore } from "../core/state";
import { getPlayerTargetBlock } from "../utils/block";
import { cuboidEdgePoints } from "../utils/vector";
import { BrushService } from "./brush";
import { ClipboardService } from "./clipboard";
import { SelectionService } from "./selection";

export class PreviewService {
  private ticks = 0;

  constructor(
    private readonly state: StateStore,
    private readonly selection: SelectionService,
    private readonly brush: BrushService,
    private readonly clipboard: ClipboardService,
  ) {}

  tick(): void {
    this.ticks++;
    if (this.ticks % CONFIG.previewInterval !== 0) {
      return;
    }

    for (const player of world.getPlayers()) {
      const session = this.state.get(player);
      if (!session.previewEnabled) {
        continue;
      }

      this.renderSelection(player);
      this.renderBrush(player);
      this.renderClipboard(player);
    }
  }

  toggle(player: Player): string {
    const session = this.state.get(player);
    session.previewEnabled = !session.previewEnabled;
    return `Preview ${session.previewEnabled ? "enabled" : "disabled"}.`;
  }

  private renderSelection(player: Player): void {
    const bounds = this.selection.getBounds(player);
    if (!bounds) return;
    for (const point of cuboidEdgePoints(bounds, bounds.volume > 4096 ? 4 : 2)) {
      this.safeParticle(player, PARTICLES.selection, point);
    }
  }

  private renderBrush(player: Player): void {
    const target = getPlayerTargetBlock(player);
    if (!target) return;
    const brush = this.brush.get(player);
    for (const point of this.brush.previewPoints(target.location, Math.min(brush.radius, 6))) {
      this.safeParticle(player, PARTICLES.brush, point);
    }
  }

  private renderClipboard(player: Player): void {
    const clipboard = this.clipboard.get(player);
    const target = getPlayerTargetBlock(player);
    if (!clipboard || !target) return;
    const placements = this.clipboard.transformedBlocks(player, target.location).slice(0, 48);
    for (const placement of placements) {
      this.safeParticle(player, PARTICLES.clipboard, placement.location);
    }
  }

  private safeParticle(player: Player, particleId: string, location: Vector3): void {
    try {
      player.dimension.spawnParticle(particleId, { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 });
    } catch {
      // Ignore invalid particles or unloaded chunks.
    }
  }
}
