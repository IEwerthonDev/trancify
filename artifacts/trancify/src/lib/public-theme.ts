import type React from "react";

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(125,37,53,${alpha})`;
  return `rgba(${parseInt(result[1]!, 16)},${parseInt(result[2]!, 16)},${parseInt(result[3]!, 16)},${alpha})`;
}

export function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "345 60% 35%";
  let r = parseInt(result[1]!, 16) / 255;
  let g = parseInt(result[2]!, 16) / 255;
  let b = parseInt(result[3]!, 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hexLuminance(hex: string): number {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return 1;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(parseInt(m[1]!, 16) / 255);
  const g = lin(parseInt(m[2]!, 16) / 255);
  const b = lin(parseInt(m[3]!, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function adjustHslL(hsl: string, delta: number): string {
  const m = /^(-?\d+)\s+(\d+)%\s+(\d+)%$/.exec(hsl);
  if (!m) return hsl;
  const h = m[1], s = m[2];
  const l = Math.max(0, Math.min(100, parseInt(m[3]!, 10) + delta));
  return `${h} ${s}% ${l}%`;
}

function contrastRatio(lumA: number, lumB: number): number {
  const [lo, hi] = lumA < lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

export function pickContrastHsl(hex: string): string {
  const lum = hexLuminance(hex);
  const cWhite = contrastRatio(lum, 1);
  const cBlack = contrastRatio(lum, 0);
  return cWhite >= cBlack ? "0 0% 100%" : "0 0% 10%";
}

export function buildPublicTheme(primaryHex: string, secondaryHex: string): React.CSSProperties {
  const bgHsl = hexToHsl(secondaryHex);
  const primaryHsl = hexToHsl(primaryHex);
  const bgLum = hexLuminance(secondaryHex);
  const isDarkBg = bgLum < 0.5;
  const primaryFg = pickContrastHsl(primaryHex);

  if (isDarkBg) {
    return {
      "--background": bgHsl,
      "--foreground": "0 0% 96%",
      "--card": adjustHslL(bgHsl, 6),
      "--card-foreground": "0 0% 96%",
      "--popover": adjustHslL(bgHsl, 6),
      "--popover-foreground": "0 0% 96%",
      "--primary": primaryHsl,
      "--primary-foreground": primaryFg,
      "--secondary": adjustHslL(bgHsl, 10),
      "--secondary-foreground": "0 0% 95%",
      "--muted": adjustHslL(bgHsl, 8),
      "--muted-foreground": "0 0% 70%",
      "--accent": adjustHslL(bgHsl, 12),
      "--accent-foreground": "0 0% 96%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--border": adjustHslL(bgHsl, 14),
      "--input": adjustHslL(bgHsl, 14),
      "--ring": primaryHsl,
    } as React.CSSProperties;
  }

  return {
    "--background": bgHsl,
    "--foreground": "20 14% 16%",
    "--card": "0 0% 100%",
    "--card-foreground": "20 14% 16%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "20 14% 16%",
    "--primary": primaryHsl,
    "--primary-foreground": primaryFg,
    "--secondary": adjustHslL(bgHsl, -6),
    "--secondary-foreground": "345 60% 25%",
    "--muted": adjustHslL(bgHsl, -4),
    "--muted-foreground": "25 10% 45%",
    "--accent": "35 85% 55%",
    "--accent-foreground": "20 14% 16%",
    "--destructive": "0 84% 60%",
    "--destructive-foreground": "0 0% 100%",
    "--border": adjustHslL(bgHsl, -10),
    "--input": adjustHslL(bgHsl, -10),
    "--ring": primaryHsl,
  } as React.CSSProperties;
}
