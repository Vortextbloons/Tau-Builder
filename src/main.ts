import { system, world } from "@minecraft/server";
import { TauBuilder } from "./taubuilder";

const app = new TauBuilder();

system.beforeEvents.startup.subscribe((event) => {
  app.startup(event);
});

system.runInterval(() => {
  app.tick();
}, 1);

world.afterEvents.playerLeave.subscribe((event) => {
  app.onPlayerLeave(event.playerId);
});

console.warn("Tau Builder beta systems loaded for 1.26.20+");
