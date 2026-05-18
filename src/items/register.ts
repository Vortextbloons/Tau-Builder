import type { ItemComponentRegistry, Player } from "@minecraft/server";
import { COMPONENT_IDS } from "../config/constants";
import { TauBuilder } from "../taubuilder";

export function registerItemComponents(registry: ItemComponentRegistry, app: TauBuilder): void {
  const isPlayer = (entity: unknown): entity is Player => {
    return typeof entity === "object" && entity !== null && (entity as Player).typeId === "minecraft:player";
  };

  registry.registerCustomComponent(COMPONENT_IDS.selectionTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app.ui.showSelection(event.source);
    },
    onUseOn: (event) => {
      if (!isPlayer(event.source)) return;
      const player = event.source;
      const message = player.isSneaking
        ? app.selection.setPos2(player, event.block.location)
        : app.selection.setPos1(player, event.block.location);
      app.tell(player, message);
    },
  });

  registry.registerCustomComponent(COMPONENT_IDS.menuTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app.ui.showMain(event.source);
    },
  });

  registry.registerCustomComponent(COMPONENT_IDS.brushTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app.ui.showBrush(event.source);
    },
  });

  registry.registerCustomComponent(COMPONENT_IDS.clipboardTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app.ui.showClipboard(event.source);
    },
  });

  registry.registerCustomComponent(COMPONENT_IDS.inspectorTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      void app.ui.showLogs(event.source);
    },
  });
}
