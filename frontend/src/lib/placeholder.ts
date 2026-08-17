/** Deterministic SVG placeholder used as a product image fallback. */
export function placeholderImage(name: string, seed?: string): string {
  const palettes = [
    ["#6d28d9", "#a855f7"],
    ["#0f766e", "#2dd4bf"],
    ["#b45309", "#f59e0b"],
    ["#be123c", "#fb7185"],
    ["#1d4ed8", "#60a5fa"],
    ["#166534", "#4ade80"],
    ["#7c2d12", "#fb923c"],
    ["#581c87", "#c084fc"],
  ];
  const key = seed ?? name;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [c1, c2] = palettes[h % palettes.length]!;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="320" r="150" fill="rgba(255,255,255,0.12)"/><text x="400" y="360" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="rgba(255,255,255,0.92)" text-anchor="middle">${initials}</text><text x="400" y="520" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,0.75)" text-anchor="middle">${name.slice(0, 22)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
