export const MODULE_KEYS = {
  afk: "afk",
  fun: "fun",
  games: "games",
  utility: "utility"
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

export const DEFAULT_GUILD_SETTINGS: Record<ModuleKey, boolean> = {
  afk: true,
  fun: true,
  games: true,
  utility: true
};

export const DEFAULT_PREFIX = "!";
