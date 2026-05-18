import type { Player, Vector3 } from "@minecraft/server";
import { StateStore } from "../core/state";
import type { Bounds } from "../types";
import { boundsFromPositions, cloneVector3 } from "../utils/vector";

export class SelectionService {
  constructor(private readonly state: StateStore) {}

  setPos1(player: Player, position: Vector3): string {
    const session = this.state.get(player);
    session.selection.dimensionId = player.dimension.id;
    session.selection.pos1 = cloneVector3(position);
    return `Pos1 set to ${position.x}, ${position.y}, ${position.z}`;
  }

  setPos2(player: Player, position: Vector3): string {
    const session = this.state.get(player);
    session.selection.dimensionId = player.dimension.id;
    session.selection.pos2 = cloneVector3(position);
    return `Pos2 set to ${position.x}, ${position.y}, ${position.z}`;
  }

  clear(player: Player): string {
    const session = this.state.get(player);
    session.selection = {};
    return "Selection cleared.";
  }

  getBounds(player: Player): Bounds | undefined {
    const session = this.state.get(player);
    const { dimensionId, pos1, pos2 } = session.selection;
    if (!dimensionId || !pos1 || !pos2) {
      return undefined;
    }

    return boundsFromPositions(dimensionId, pos1, pos2);
  }

  describe(player: Player): string {
    const bounds = this.getBounds(player);
    if (!bounds) {
      return "Selection incomplete. Set both positions first.";
    }

    return `Selection ${bounds.min.x},${bounds.min.y},${bounds.min.z} -> ${bounds.max.x},${bounds.max.y},${bounds.max.z} (${bounds.volume} blocks)`;
  }
}
