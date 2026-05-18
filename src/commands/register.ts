import {
  CustomCommandStatus,
  type CustomCommandOrigin,
  type CustomCommandRegistry,
  type Player,
} from "@minecraft/server";
import { TauBuilder } from "../taubuilder";

function getPlayer(origin: CustomCommandOrigin): Player | undefined {
  const source = origin.sourceEntity;
  if (!source || source.typeId !== "minecraft:player") {
    return undefined;
  }
  return source as Player;
}

export function registerCommands(registry: CustomCommandRegistry, app: TauBuilder): void {
  registry.registerCommand(
    {
      name: "taubuilder:menu",
      description: "Open Tau Builder menu",
      permissionLevel: 2,
    },
    (origin) => {
      const player = getPlayer(origin);
      if (!player) {
        return { status: CustomCommandStatus.Failure, message: "Player source required." };
      }

      void app.ui.showMain(player);
      return { status: CustomCommandStatus.Success, message: "Opened Tau Builder menu." };
    },
  );
}
