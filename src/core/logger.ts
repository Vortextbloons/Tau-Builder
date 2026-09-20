import type { Player, Vector3 } from "@minecraft/server";
import { CONFIG } from "../config/constants";
import type { HistoryEntry, OperationLogEntry } from "../types";
import { boundsContains } from "../utils/vector";

export class OperationLogger {
  private readonly logs: OperationLogEntry[] = [];

  clear(): void {
    this.logs.length = 0;
  }

  record(player: Player, entry: HistoryEntry): OperationLogEntry {
    const log: OperationLogEntry = {
      id: entry.id,
      playerId: player.id,
      playerName: player.name,
      type: entry.operationType,
      dimensionId: entry.dimensionId,
      bounds: entry.bounds,
      affectedBlocks: entry.affectedBlocks,
      timestamp: entry.timestamp,
      historyEntry: entry,
    };

    this.logs.push(log);
    while (this.logs.length > CONFIG.maxLogs) {
      this.logs.shift();
    }

    return log;
  }

  recent(): OperationLogEntry[] {
    return [...this.logs].reverse();
  }

  recentByPlayerWithin(playerName: string, minutes: number): OperationLogEntry[] {
    const cutoff = Date.now() - minutes * 60_000;
    return this.logs.filter((log) => log.playerName === playerName && log.timestamp >= cutoff).reverse();
  }

  recentByAreaWithin(dimensionId: string, location: Vector3, radius: number, minutes: number): OperationLogEntry[] {
    const cutoff = Date.now() - minutes * 60_000;
    return this.logs.filter((log) => {
      if (log.dimensionId !== dimensionId || log.timestamp < cutoff) {
        return false;
      }

      return (
        location.x >= log.bounds.min.x - radius &&
        location.x <= log.bounds.max.x + radius &&
        location.y >= log.bounds.min.y - radius &&
        location.y <= log.bounds.max.y + radius &&
        location.z >= log.bounds.min.z - radius &&
        location.z <= log.bounds.max.z + radius
      );
    }).reverse();
  }

  inspectBlock(dimensionId: string, location: Vector3): OperationLogEntry[] {
    return this.logs.filter((log) => log.dimensionId === dimensionId && boundsContains(log.bounds, location)).reverse();
  }
}
