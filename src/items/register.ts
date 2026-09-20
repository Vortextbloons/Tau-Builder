import { system, type ItemComponentRegistry, type Player } from "@minecraft/server";
import { COMPONENT_IDS } from "../config/constants";
import { TauBuilder } from "../taubuilder";
import { floorVector3 } from "../utils/vector";

export function registerItemComponents(registry: ItemComponentRegistry, app: TauBuilder): void {
  const blockUseTicks = new Map<string, number>();
  const isPlayer = (entity: unknown): entity is Player => {
    return typeof entity === "object" && entity !== null && (entity as Player).typeId === "minecraft:player";
  };

  registry.registerCustomComponent(COMPONENT_IDS.selectionTool, {
    onUse: (event) => {
      if (!isPlayer(event.source)) return;
      if (event.source.isSneaking) {
        const player = event.source;
        const startTick = system.currentTick;
        system.run(() => {
          if ((blockUseTicks.get(player.id) ?? -1) >= startTick) return;
          void app.ui.showSelection(player);
        });
      }
    },
    onUseOn: (event) => {
      if (!isPlayer(event.source)) return;
      const player = event.source;
      blockUseTicks.set(player.id, system.currentTick);
      const anchor = floorVector3(event.block.location);
      try {
        app.requireBuildAccess(player);
        app.tell(player, app.selection.setWandPosition(player, anchor));
      } catch (error) {
        app.tell(player, error instanceof Error ? error.message : "Action failed.");
      }
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
