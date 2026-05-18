import { world, type Player, type StartupEvent, type Vector3 } from "@minecraft/server";
import { CONFIG } from "./config/constants";
import { registerCommands } from "./commands/register";
import { OperationLogger } from "./core/logger";
import { PermissionService } from "./core/permissions";
import { OperationQueue } from "./core/queue";
import { StateStore } from "./core/state";
import { registerItemComponents } from "./items/register";
import { BrushService } from "./systems/brush";
import { ClipboardService } from "./systems/clipboard";
import { MaskService } from "./systems/masks";
import { PreviewService } from "./systems/preview";
import { SelectionService } from "./systems/selection";
import { UiService } from "./systems/ui";
import { getPlayerAnchorLocation, getPlayerTargetBlock } from "./utils/block";

export class TauBuilder {
  readonly state = new StateStore();
  readonly permissions = new PermissionService();
  readonly logger = new OperationLogger();
  readonly selection = new SelectionService(this.state);
  readonly masks = new MaskService();
  readonly brush = new BrushService(this.state, this.permissions);
  readonly clipboard = new ClipboardService(this.state, this.selection);
  readonly queue = new OperationQueue(this.state, this.permissions, this.logger);
  readonly preview = new PreviewService(this.state, this.selection, this.brush, this.clipboard);
  readonly ui = new UiService(this);

  startup(event: StartupEvent): void {
    registerCommands(event.customCommandRegistry, this);
    registerItemComponents(event.itemComponentRegistry, this);
  }

  tick(): void {
    this.queue.tick();
    this.preview.tick();
  }

  onPlayerLeave(playerId: string): void {
    this.state.remove(playerId);
  }

  tell(player: Player, message: string): void {
    player.sendMessage(message);
  }

  requireBuildAccess(player: Player): void {
    if (!this.permissions.isOperator(player)) {
      throw new Error("Operator permissions required.");
    }
  }

  setSelectionPos(player: Player, which: 1 | 2): string {
    this.requireBuildAccess(player);
    const anchor = getPlayerAnchorLocation(player);
    return which === 1 ? this.selection.setPos1(player, anchor) : this.selection.setPos2(player, anchor);
  }

  setMask(player: Player, raw: string): string {
    this.requireBuildAccess(player);
    this.state.get(player).mask = this.masks.parse(raw);
    return `Mask set to ${raw}.`;
  }

  clearMask(player: Player): string {
    this.requireBuildAccess(player);
    this.state.get(player).mask = undefined;
    return "Mask cleared.";
  }

  queueSet(player: Player, blockId: string): string {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertSelectionWithinLimit(player, bounds.volume);
    return this.queue.enqueueSet(player, bounds, blockId, this.state.get(player).mask);
  }

  queueReplace(player: Player, from: string, to: string): string {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertSelectionWithinLimit(player, bounds.volume);
    return this.queue.enqueueReplace(player, bounds, from, to, this.state.get(player).mask);
  }

  copy(player: Player, cut: boolean): string {
    this.requireBuildAccess(player);
    const bounds = this.requireSelection(player);
    this.assertClipboardWithinLimit(player, bounds.volume);
    const clipboard = this.clipboard.copy(player);
    if (cut) {
      this.queue.enqueueSet(player, bounds, "minecraft:air", undefined);
    }
    return `${cut ? "Cut" : "Copied"} ${clipboard.blocks.length} blocks.`;
  }

  paste(player: Player, origin?: Vector3): string {
    this.requireBuildAccess(player);
    const clipboard = this.clipboard.get(player);
    if (!clipboard) {
      throw new Error("Clipboard is empty.");
    }
    const target = origin ?? getPlayerAnchorLocation(player);
    const placements = this.clipboard.transformedBlocks(player, target);
    return this.queue.enqueueClipboardPaste(player, clipboard, placements);
  }

  rotateClipboard(player: Player, degrees: number): string {
    this.requireBuildAccess(player);
    if (degrees !== 90 && degrees !== 180 && degrees !== 270) {
      throw new Error("Rotation must be 90, 180, or 270.");
    }
    return this.clipboard.rotate(player, degrees);
  }

  flipClipboard(player: Player, axis: string): string {
    this.requireBuildAccess(player);
    if (axis !== "x" && axis !== "z") {
      throw new Error("Axis must be x or z.");
    }
    return this.clipboard.flip(player, axis);
  }

  applyBrush(player: Player): string {
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

  placeSchematic(player: Player, name: string): string {
    this.requireBuildAccess(player);
    return this.clipboard.placeSchematic(player, name, getPlayerAnchorLocation(player));
  }

  rollbackPlayer(player: Player, name: string, minutes: number): string {
    this.requireBuildAccess(player);
    if (minutes < 1) {
      throw new Error("Minutes must be at least 1.");
    }
    const entries = this.logger.recentByPlayerWithin(name, minutes).map((log) => log.historyEntry);
    return this.queue.rollbackLogs(player, entries);
  }

  rollbackArea(player: Player, radius: number, minutes: number): string {
    this.requireBuildAccess(player);
    if (radius < 1 || minutes < 1) {
      throw new Error("Radius and minutes must be at least 1.");
    }
    const anchor = getPlayerAnchorLocation(player);
    const entries = this.logger.recentByAreaWithin(player.dimension.id, anchor, radius, minutes).map((log) => log.historyEntry);
    return this.queue.rollbackLogs(player, entries);
  }

  inspect(player: Player, location?: Vector3): string {
    const target = location ?? getPlayerAnchorLocation(player);
    const logs = this.logger.inspectBlock(player.dimension.id, target).slice(0, CONFIG.maxChangesPerLogPreview);
    if (logs.length === 0) {
      return `No Tau Builder edits recorded at ${target.x}, ${target.y}, ${target.z}.`;
    }

    return logs.map((log) => `${log.playerName}: ${log.type} (${log.affectedBlocks} blocks)`).join(" | ");
  }

  private requireSelection(player: Player) {
    const bounds = this.selection.getBounds(player);
    if (!bounds) {
      throw new Error("Selection incomplete. Use taubuilder:pos1 and taubuilder:pos2 first.");
    }
    return bounds;
  }

  private assertSelectionWithinLimit(player: Player, volume: number): void {
    if (volume > CONFIG.maxSelectionBlocks) {
      throw new Error(`Selection too large: ${volume}. Limit is ${CONFIG.maxSelectionBlocks}.`);
    }
  }

  private assertClipboardWithinLimit(player: Player, blocks: number): void {
    if (blocks > CONFIG.maxClipboardBlocks) {
      throw new Error(`Clipboard too large: ${blocks}. Limit is ${CONFIG.maxClipboardBlocks}.`);
    }
  }
}
