import type { Player } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import type { BrushConfig, PlayerSession } from "../types";

const DEFAULT_BRUSH: BrushConfig = {
  type: "sphere",
  radius: 3,
  material: "minecraft:stone",
};

export class StateStore {
  private readonly sessions = new Map<string, PlayerSession>();

  get(player: Player): PlayerSession {
    let session = this.sessions.get(player.id);
    if (!session) {
      session = {
        selection: {},
        brush: { ...DEFAULT_BRUSH },
        previewEnabled: true,
        undoStack: [],
        redoStack: [],
      };
      this.sessions.set(player.id, session);
    }

    return session;
  }

  remove(playerId: string): void {
    this.sessions.delete(playerId);
  }

  pushUndo(player: Player, entry: PlayerSession["undoStack"][number]): void {
    const session = this.get(player);
    session.undoStack.push(entry);
    while (session.undoStack.length > CONFIG.maxUndoEntries) {
      session.undoStack.shift();
    }
    session.redoStack.length = 0;
  }

  pushRedo(player: Player, entry: PlayerSession["redoStack"][number]): void {
    const session = this.get(player);
    session.redoStack.push(entry);
  }
}
