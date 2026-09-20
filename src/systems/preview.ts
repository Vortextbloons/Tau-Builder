import { world, type Player } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import { StateStore } from "../core/state";
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

  tick(players: Player[] = world.getPlayers()): void {
    this.ticks++;
    if (this.ticks % CONFIG.previewInterval !== 0) {
      return;
    }

    for (const player of players) {
      const session = this.state.get(player);
      if (!session.previewEnabled) {
        continue;
      }
    }
  }

  toggle(player: Player): string {
    const session = this.state.get(player);
    session.previewEnabled = !session.previewEnabled;
    return `Preview ${session.previewEnabled ? "enabled" : "disabled"}.`;
  }
}
