/** Column with a 4px rounded data end and a square base (dataviz mark spec). */
export function columnPath(x: number, w: number, base: number, top: number, radius = 4): string {
  const h = base - top;
  if (h <= 0) return '';
  const r = Math.min(radius, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}
/** Horizontal bar growing right from x0 with a rounded right end. */
export function barPath(x0: number, y: number, len: number, h: number, radius = 4): string {
  if (len <= 0) return '';
  const r = Math.min(radius, h / 2, len);
  const x1 = x0 + len;
  return `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 - r},${y + h}H${x0}Z`;
}
