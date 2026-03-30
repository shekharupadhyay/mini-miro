const AVATAR_COLORS = [
  "#4f7dff", "#7c5cfc", "#22c55e", "#fb923c",
  "#ec4899", "#eab308", "#3b82f6", "#ef4444",
];

export function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
