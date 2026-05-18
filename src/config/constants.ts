export const PREFIX = "taubuilder";

export const ITEM_IDS = {
  selectionWand: `${PREFIX}:selection_wand`,
  menuTool: `${PREFIX}:menu_tool`,
  brushTool: `${PREFIX}:brush_tool`,
  clipboardTool: `${PREFIX}:clipboard_tool`,
  inspectorTool: `${PREFIX}:inspector_tool`,
} as const;

export const COMPONENT_IDS = {
  selectionTool: `${PREFIX}:selection_tool`,
  menuTool: `${PREFIX}:menu_tool_component`,
  brushTool: `${PREFIX}:brush_tool_component`,
  clipboardTool: `${PREFIX}:clipboard_tool_component`,
  inspectorTool: `${PREFIX}:inspector_tool_component`,
} as const;

export const PARTICLES = {
  selection: "minecraft:colored_flame_particle",
  clipboard: "minecraft:colored_flame_particle",
  brush: "minecraft:colored_flame_particle",
} as const;

export const CONFIG = {
  maxQueueLength: 12,
  previewInterval: 8,
  globalBlocksPerTick: 1200,
  maxClipboardBlocks: 180000,
  maxUndoEntries: 12,
  maxLogs: 96,
  maxChangesPerLogPreview: 8,
  maxBrushRadius: 32,
  maxSelectionBlocks: 250000,
} as const;

export const STRUCTURE_PREFIX = `${PREFIX}:schem_`;
