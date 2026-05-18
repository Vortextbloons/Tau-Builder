import type { MaskRule } from "../types";

export class MaskService {
  parse(raw: string): MaskRule {
    const text = raw.trim();
    const tokens = text.split(",").map((token) => token.trim()).filter(Boolean);

    return {
      raw: text,
      description: tokens.length > 0 ? tokens.join(", ") : "none",
      test: ({ blockTypeId, y, isAir }) => {
        if (tokens.length === 0) {
          return true;
        }

        for (const token of tokens) {
          if (token === "air" && isAir) return true;
          if (token === "!air" && !isAir) return true;
          if (token.startsWith("y<") && y < Number(token.slice(2))) return true;
          if (token.startsWith("y>") && y > Number(token.slice(2))) return true;
          if (token.startsWith("y=") && y === Number(token.slice(2))) return true;
          if (token.startsWith("!minecraft:") && blockTypeId !== token.slice(1)) return true;
          if (token.startsWith("minecraft:") && blockTypeId === token) return true;
        }

        return false;
      },
    };
  }
}
