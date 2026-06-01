/**
 * Generates the 1200x630 social/Discord embed image (public/og.png) from an
 * inline SVG built in the site's own aesthetic. No external/scraped art; run with
 * `node scripts/make-og.mjs` to regenerate.
 */

import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const VX = 820; // vanishing point
const VY = 300;

// Corridor perspective lines converging on the vanishing point.
let lines = "";
for (let x = -200; x <= 1400; x += 160) {
  lines += `<line x1="${x}" y1="0" x2="${VX}" y2="${VY}" />`;
  lines += `<line x1="${x}" y1="${H}" x2="${VX}" y2="${VY}" />`;
}
for (let y = -120; y <= 750; y += 120) {
  lines += `<line x1="0" y1="${y}" x2="${VX}" y2="${VY}" />`;
  lines += `<line x1="${W}" y1="${y}" x2="${VX}" y2="${VY}" />`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${VX}" cy="${VY}" r="360" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#dfd27a" stop-opacity="0.95"/>
      <stop offset="0.45" stop-color="#b6a83f" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#b6a83f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="${VX}" cy="${VY}" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#060503" stop-opacity="0.95"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#08070333" stop-opacity="0.94"/>
      <stop offset="0.62" stop-color="#080703" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1605"/>
      <stop offset="0.7" stop-color="#0a0803"/>
      <stop offset="1" stop-color="#0a0803" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0b0a05"/>
  <g stroke="#3c3612" stroke-width="1.5" opacity="0.5">${lines}</g>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- fluorescent bar -->
  <rect x="${VX - 70}" y="${VY - 7}" width="140" height="14" rx="2" fill="#f4e88c"/>
  <!-- a tall figure, lurking near the vanishing point -->
  <rect x="${VX - 12}" y="${VY + 6}" width="24" height="120" rx="12" fill="url(#fig)"/>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>

  <!-- text -->
  <text x="80" y="232" font-family="Consolas, monospace" font-size="23" letter-spacing="5" fill="#e3d258">PROCEDURAL &#183; SEEDED &#183; ENDLESS</text>
  <text x="76" y="332" font-family="Segoe UI, Arial, sans-serif" font-size="84" font-weight="700" fill="#fbf6da">An endless room</text>
  <text x="76" y="424" font-family="Segoe UI, Arial, sans-serif" font-size="84" font-weight="700" fill="#fbf6da">you'll never map.</text>
  <text x="80" y="486" font-family="Segoe UI, Arial, sans-serif" font-size="27" fill="#cdc7a6">A seeded Backrooms you can share by link.</text>
  <text x="80" y="522" font-family="Segoe UI, Arial, sans-serif" font-size="27" fill="#cdc7a6">Something else is in there with you.</text>
  <text x="80" y="586" font-family="Consolas, monospace" font-size="22" letter-spacing="2" fill="#8c8347">liminal-space-generator.vercel.app</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: W },
  font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" },
});
const png = resvg.render().asPng();

mkdirSync(resolve(root, "public"), { recursive: true });
const out = resolve(root, "public", "og.png");
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
