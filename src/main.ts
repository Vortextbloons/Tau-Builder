import { system, world } from "@minecraft/server";
import { TauBuilder } from "./taubuilder";
import { PACK_NAME, PACK_VERSION, CREATOR } from "./config/constants";

const app = new TauBuilder();

system.beforeEvents.startup.subscribe((event) => {
  app.startup(event);
});

system.runInterval(() => {
  app.tick();
}, 1);

system.run(() => {
  world.sendMessage(`§a${PACK_NAME} v${PACK_VERSION} §7by §f${CREATOR}`);
});

world.afterEvents.playerLeave.subscribe((event) => {
  app.onPlayerLeave(event.playerId);
});
