import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import type { Player } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import { getPlayerAnchorLocation } from "../utils/block";
import { TauBuilder } from "../taubuilder";

export class UiService {
  constructor(private readonly app: TauBuilder) {}

  async showMain(player: Player): Promise<void> {
    if (!this.app.permissions.isOperator(player)) {
      this.app.tell(player, "Operator permissions required.");
      return;
    }

    while (true) {
      const response = await this.showAction(
        new ActionFormData()
          .title("Tau Builder")
          .body(this.app.selection.describe(player))
          .button("Selection")
          .button("Edit")
          .button("Clipboard")
          .button("Brush")
          .button("History")
          .button("Logs")
          .button("Preview")
          .button("Close"),
        player,
      );
      if (!response) return;
      if (response.selection === 0) await this.showSelection(player);
      else if (response.selection === 1) await this.showEdit(player);
      else if (response.selection === 2) await this.showClipboard(player);
      else if (response.selection === 3) await this.showBrush(player);
      else if (response.selection === 4) await this.showHistory(player);
      else if (response.selection === 5) await this.showLogs(player);
      else if (response.selection === 6) this.app.tell(player, this.safeRun(() => this.app.preview.toggle(player)));
      else return;
    }
  }

  async showSelection(player: Player): Promise<void> {
    if (!this.app.permissions.isOperator(player)) {
      this.app.tell(player, "Operator permissions required.");
      return;
    }

    while (true) {
      const response = await this.showAction(
        new ActionFormData()
          .title("Selection")
          .body(this.app.selection.describe(player))
          .button("Set Pos1")
          .button("Set Pos2")
          .button("Set Stone")
          .button("Set Air")
          .button("Custom Set")
          .button("Clear")
          .button("Back"),
        player,
      );
      if (!response) return;
      const anchor = getPlayerAnchorLocation(player);
      if (response.selection === 0) this.app.tell(player, this.safeRun(() => this.app.selection.setPos1(player, anchor)));
      else if (response.selection === 1) this.app.tell(player, this.safeRun(() => this.app.selection.setPos2(player, anchor)));
      else if (response.selection === 2) this.app.tell(player, await this.safeRunAsync(() => this.app.queueSet(player, "minecraft:stone")));
      else if (response.selection === 3) this.app.tell(player, await this.safeRunAsync(() => this.app.queueSet(player, "minecraft:air")));
      else if (response.selection === 4) this.app.tell(player, await this.safeRunAsync(() => this.promptSetBlock(player)));
      else if (response.selection === 5) this.app.tell(player, this.safeRun(() => this.app.selection.clear(player)));
      else return;
    }
  }

  async showEdit(player: Player): Promise<void> {
    while (true) {
      const hasSelection = !!this.app.selection.getBounds(player);
      const response = await this.showAction(
        new ActionFormData()
          .title("Edit")
          .body(`${this.currentMaskText(player)}\n${hasSelection ? "Selection ready." : "Selection incomplete."}`)
          .button("Set Stone")
          .button("Set Air")
          .button("Replace Dirt -> Grass")
          .button("Custom Set")
          .button("Custom Replace")
          .button("Mask")
          .button("Clear Mask")
          .button("Back"),
        player,
      );
      if (!response) return;
      if (!hasSelection && response.selection <= 4) {
        this.app.tell(player, "Selection incomplete. Use Selection first.");
        continue;
      }
      if (response.selection === 0) this.app.tell(player, await this.safeRunAsync(() => this.app.queueSet(player, "minecraft:stone")));
      else if (response.selection === 1) this.app.tell(player, await this.safeRunAsync(() => this.app.queueSet(player, "minecraft:air")));
      else if (response.selection === 2) this.app.tell(player, await this.safeRunAsync(() => this.app.queueReplace(player, "minecraft:dirt", "minecraft:grass_block")));
      else if (response.selection === 3) this.app.tell(player, await this.safeRunAsync(() => this.promptSetBlock(player)));
      else if (response.selection === 4) this.app.tell(player, await this.safeRunAsync(() => this.promptReplace(player)));
      else if (response.selection === 5) this.app.tell(player, await this.safeRunAsync(() => this.promptMask(player)));
      else if (response.selection === 6) this.app.tell(player, await this.safeRunAsync(() => this.app.clearMask(player)));
      else return;
    }
  }

  async showClipboard(player: Player): Promise<void> {
    while (true) {
      const response = await this.showAction(
        new ActionFormData()
          .title("Clipboard")
          .body(this.app.clipboard.describe(player))
          .button("Copy")
          .button("Cut")
          .button("Paste")
          .button("Rotate 90")
          .button("Flip X")
          .button("Save Schematic")
          .button("Load Schematic")
          .button("Delete Schematic")
          .button("List Schematics")
          .button("Back"),
        player,
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, await this.safeRunAsync(() => this.app.copy(player, false)));
      else if (response.selection === 1) this.app.tell(player, await this.safeRunAsync(() => this.app.copy(player, true)));
      else if (response.selection === 2) this.app.tell(player, await this.safeRunAsync(() => this.app.paste(player)));
      else if (response.selection === 3) this.app.tell(player, await this.safeRunAsync(() => this.app.rotateClipboard(player, 90)));
      else if (response.selection === 4) this.app.tell(player, await this.safeRunAsync(() => this.app.flipClipboard(player, "x")));
      else if (response.selection === 5) this.app.tell(player, await this.safeRunAsync(() => this.promptSchematicAction(player, "save")));
      else if (response.selection === 6) this.app.tell(player, await this.safeRunAsync(() => this.promptSchematicAction(player, "load")));
      else if (response.selection === 7) this.app.tell(player, await this.safeRunAsync(() => this.promptSchematicAction(player, "delete")));
      else if (response.selection === 8) this.app.tell(player, this.safeRun(() => this.app.clipboard.listSchematics().join(", ") || "No schematics saved."));
      else return;
    }
  }

  async showBrush(player: Player): Promise<void> {
    while (true) {
      const brush = this.app.brush.get(player);
      const response = await this.showAction(
        new ActionFormData()
          .title("Brush")
          .body(`Type: ${brush.type}\nMaterial: ${brush.material}\nRadius: ${brush.radius}`)
          .button("Sphere Brush")
          .button("Replace Brush")
          .button("Apply Brush")
          .button("Set Radius")
          .button("Clear Brush")
          .button("Back"),
        player,
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, await this.safeRunAsync(() => this.promptBrushSphere(player)));
      else if (response.selection === 1) this.app.tell(player, await this.safeRunAsync(() => this.promptBrushReplace(player)));
      else if (response.selection === 2) this.app.tell(player, await this.safeRunAsync(() => this.app.applyBrush(player)));
      else if (response.selection === 3) this.app.tell(player, await this.safeRunAsync(() => this.promptBrushRadius(player)));
      else if (response.selection === 4) this.app.tell(player, await this.safeRunAsync(() => this.app.brush.clear(player)));
      else return;
    }
  }

  async showHistory(player: Player): Promise<void> {
    while (true) {
      const response = await this.showAction(
        new ActionFormData()
          .title("History")
          .body(`Undo: ${this.app.state.get(player).undoStack.length}\nRedo: ${this.app.state.get(player).redoStack.length}\nQueue: ${this.app.queue.getStatus()}`)
          .button("Undo")
          .button("Redo")
          .button("Queue Status")
          .button("Toggle Preview")
          .button("Back"),
        player,
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.safeRun(() => this.app.queue.undo(player)));
      else if (response.selection === 1) this.app.tell(player, this.safeRun(() => this.app.queue.redo(player)));
      else if (response.selection === 2) this.app.tell(player, this.safeRun(() => this.app.queue.getStatus()));
      else if (response.selection === 3) this.app.tell(player, this.safeRun(() => this.app.preview.toggle(player)));
      else return;
    }
  }

  async showLogs(player: Player): Promise<void> {
    while (true) {
      const response = await this.showAction(
        new ActionFormData()
          .title("Logs")
          .body(this.app.inspect(player))
          .button("Inspect Target")
          .button("Rollback Player")
          .button("Rollback Area")
          .button("Back"),
        player,
      );
      if (!response) return;
      if (response.selection === 0) this.app.tell(player, this.safeRun(() => this.app.inspect(player)));
      else if (response.selection === 1) this.app.tell(player, await this.safeRunAsync(() => this.promptRollbackPlayer(player)));
      else if (response.selection === 2) this.app.tell(player, await this.safeRunAsync(() => this.promptRollbackArea(player)));
      else return;
    }
  }

  private currentMaskText(player: Player): string {
    const mask = this.app.state.get(player).mask;
    return mask ? `Mask: ${mask.raw}` : "Mask: none";
  }

  private async promptSetBlock(player: Player): Promise<string> {
    if (!this.app.selection.getBounds(player)) {
      return "Selection incomplete. Use Selection first.";
    }
    const session = this.app.state.get(player);
    const response = await this.showModal(
      new ModalFormData()
        .title("Custom Set")
        .textField("Block id", session.lastSetBlock, { defaultValue: session.lastSetBlock }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [blockId] = response.formValues as [string];
    const trimmed = blockId?.trim();
    if (!trimmed) return "No block selected.";
    session.lastSetBlock = trimmed;
    return this.safeRun(() => this.app.queueSet(player, trimmed));
  }

  private async promptReplace(player: Player): Promise<string> {
    if (!this.app.selection.getBounds(player)) {
      return "Selection incomplete. Use Selection first.";
    }
    const response = await this.showModal(
      new ModalFormData()
        .title("Custom Replace")
        .textField("From", "minecraft:dirt", { defaultValue: "minecraft:dirt" })
        .textField("To", "minecraft:grass_block", { defaultValue: "minecraft:grass_block" }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [from, to] = response.formValues as [string, string];
    return from?.trim() && to?.trim() ? this.safeRun(() => this.app.queueReplace(player, from.trim(), to.trim())) : "Invalid replace inputs.";
  }

  private async promptMask(player: Player): Promise<string> {
    const response = await this.showModal(
      new ModalFormData().title("Mask").textField("Mask expression", "!air", { defaultValue: this.app.state.get(player).mask?.raw ?? "!air" }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [mask] = response.formValues as [string];
    return mask?.trim() ? this.app.setMask(player, mask.trim()) : this.app.clearMask(player);
  }

  private async promptSchematicAction(player: Player, action: "save" | "load" | "delete"): Promise<string> {
    if (!this.app.selection.getBounds(player)) {
      return "Selection incomplete. Use Selection first.";
    }
    const response = await this.showModal(
      new ModalFormData().title(`Schematic ${action}`).textField("Name", "house", { defaultValue: "house" }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [name] = response.formValues as [string];
    if (!name?.trim()) return "No schematic name entered.";
    if (action === "save") return this.safeRun(() => this.app.clipboard.saveSchematic(player, name.trim()));
    if (action === "load") return this.safeRun(() => this.app.placeSchematic(player, name.trim()));
    return this.safeRun(() => this.app.clipboard.deleteSchematic(name.trim()));
  }

  private async promptBrushSphere(player: Player): Promise<string> {
    const response = await this.showModal(
      new ModalFormData()
        .title("Sphere Brush")
        .textField("Material", "minecraft:stone", { defaultValue: this.app.brush.get(player).material })
        .slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: this.app.brush.get(player).radius, valueStep: 1 }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [material, radius] = response.formValues as [string, number];
    return material?.trim() ? this.app.brush.setSphere(player, material.trim(), radius) : "Invalid material.";
  }

  private async promptBrushReplace(player: Player): Promise<string> {
    const brush = this.app.brush.get(player);
    const response = await this.showModal(
      new ModalFormData()
        .title("Replace Brush")
        .textField("Target block", "minecraft:dirt", { defaultValue: brush.replaceTarget ?? "minecraft:dirt" })
        .textField("Material", "minecraft:grass_block", { defaultValue: brush.material })
        .slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: brush.radius, valueStep: 1 }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [target, material, radius] = response.formValues as [string, string, number];
    return target?.trim() && material?.trim() ? this.app.brush.setReplace(player, target.trim(), material.trim(), radius) : "Invalid brush inputs.";
  }

  private async promptBrushRadius(player: Player): Promise<string> {
    const brush = this.app.brush.get(player);
    const response = await this.showModal(
      new ModalFormData().title("Brush Radius").slider("Radius", 1, CONFIG.maxBrushRadius, { defaultValue: brush.radius, valueStep: 1 }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [radius] = response.formValues as [number];
    this.app.brush.setSphere(player, brush.material, radius);
    return `Brush radius set to ${radius}.`;
  }

  private async promptRollbackPlayer(player: Player): Promise<string> {
    const response = await this.showModal(
      new ModalFormData().title("Rollback Player").textField("Player name", player.name, { defaultValue: player.name }).slider("Minutes", 1, 120, { defaultValue: 10, valueStep: 1 }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [name, minutes] = response.formValues as [string, number];
    return name?.trim() ? this.app.rollbackPlayer(player, name.trim(), minutes) : "No player name entered.";
  }

  private async promptRollbackArea(player: Player): Promise<string> {
    const response = await this.showModal(
      new ModalFormData().title("Rollback Area").slider("Radius", 1, 64, { defaultValue: 8, valueStep: 1 }).slider("Minutes", 1, 120, { defaultValue: 10, valueStep: 1 }),
      player,
    );
    if (!response || response.canceled) return "Cancelled.";
    const [radius, minutes] = response.formValues as [number, number];
    return this.app.rollbackArea(player, radius, minutes);
  }

  private async showAction(form: any, player: Player): Promise<any | undefined> {
    try {
      const response = await form.show(player);
      return response;
    } catch {
      return undefined;
    }
  }

  private async showModal(form: any, player: Player): Promise<any | undefined> {
    try {
      const response = await form.show(player);
      return response;
    } catch {
      return undefined;
    }
  }

  private safeRun(action: () => string): string {
    try {
      return action();
    } catch (error) {
      return error instanceof Error ? error.message : "Action failed.";
    }
  }

  private async safeRunAsync(action: () => string | Promise<string>): Promise<string> {
    try {
      return await action();
    } catch (error) {
      return error instanceof Error ? error.message : "Action failed.";
    }
  }
}
