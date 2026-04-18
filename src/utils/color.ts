import { colord, extend } from "colord";
import hwbPlugin from "colord/plugins/hwb";

extend([hwbPlugin]);

// sRGB → linear sRGB
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = linearize(r / 255);
  const lg = linearize(g / 255);
  const lb = linearize(b / 255);

  // linear sRGB → LMS (using OKLab M1 matrix)
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2220049874 * lg + 0.6896925507 * lb;

  // cube root
  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);

  // LMS → OKLab (M2 matrix)
  const L = 0.2104542553 * l1 + 0.793617785 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.428592205 * m1 + 0.4505937099 * s1;
  const bk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.808675766 * s1;

  // OKLab → OKLCh
  const C = Math.sqrt(a * a + bk * bk);
  let h = (Math.atan2(bk, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return [L, C, h];
}

export function convertColor(
  text: string,
  format: string,
): string | null {
  const c = colord(text);
  if (!c.isValid()) return null;

  switch (format) {
    case "hex":
      return c.toHex();
    case "hex-no-hash":
      return c.toHex().replace(/^#/, "");
    case "rgb":
      return c.toRgbString();
    case "hsl":
      return c.toHslString();
    case "hwb": {
      const { h, w, b } = c.toHwb();
      return `hwb(${Math.round(h)} ${Math.round(w)}% ${Math.round(b)}%)`;
    }
    case "oklch": {
      const { r, g, b } = c.toRgb();
      const [L, C, h] = toOklch(r, g, b);
      return `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${h.toFixed(2)})`;
    }
    default:
      return null;
  }
}
