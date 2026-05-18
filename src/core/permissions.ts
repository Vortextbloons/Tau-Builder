import { PlayerPermissionLevel, type Player } from "@minecraft/server";

export class PermissionService {
  isOperator(player: Player): boolean {
    return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  }
}
