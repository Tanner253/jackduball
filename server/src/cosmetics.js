/**
 * Cosmetic catalog — source of truth (client mirrors in COSMETICS_CATALOG).
 */

export const COSMETICS = {
  "tag-gold": { type: "tag", name: "Golden Tag", cost: 0, default: true, color: "#ffd700" },
  "tag-pink": { type: "tag", name: "Pink Tag", cost: 15, color: "#ff69b4" },
  "tag-cyan": { type: "tag", name: "Cyan Tag", cost: 15, color: "#66ccff" },
  "tag-lime": { type: "tag", name: "Lime Tag", cost: 15, color: "#7dff9a" },
  "tag-crown": { type: "tag", name: "Crown", cost: 25, prefix: "👑 ", color: "#ffd700" },
  "tag-sparkle": { type: "tag", name: "Sparkles", cost: 25, suffix: " ✨", color: "#ffe066" },
  "tag-fire": { type: "tag", name: "On Fire", cost: 30, prefix: "🔥 ", color: "#ff8844" },
  "tag-rainbow": { type: "tag", name: "Rainbow", cost: 40, style: "rainbow" },

  "trail-none": { type: "trail", name: "No Trail", cost: 0, default: true, trail: "none" },
  "trail-spark": { type: "trail", name: "Gold Sparks", cost: 20, trail: "spark" },
  "trail-donut": { type: "trail", name: "Donut Crumbs", cost: 30, trail: "donut" },
  "trail-neon": { type: "trail", name: "Neon Streak", cost: 45, trail: "neon" },
  "trail-rainbow": { type: "trail", name: "Rainbow Wake", cost: 35, trail: "rainbow" },
};

export const DEFAULT_OWNED = Object.entries(COSMETICS)
  .filter(([, v]) => v.default)
  .map(([id]) => id);

export const DEFAULT_EQUIPPED = {
  tag: "tag-gold",
  trail: "trail-none",
};

export function catalogForClient() {
  return Object.entries(COSMETICS).map(([id, item]) => ({ id, ...item }));
}

export function isValidItem(id) {
  return id in COSMETICS;
}

export function itemType(id) {
  return COSMETICS[id]?.type ?? null;
}

export function sanitizeEquipped(id, slot) {
  const key = String(id ?? "").trim().slice(0, 32);
  if (isValidItem(key) && COSMETICS[key].type === slot) return key;
  return slot === "tag" ? DEFAULT_EQUIPPED.tag : DEFAULT_EQUIPPED.trail;
}
