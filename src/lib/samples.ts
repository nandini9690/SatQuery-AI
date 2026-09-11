/**
 * Bundled sample gallery — deterministic, procedurally-rendered satellite-style
 * preview scenes (no network/asset dependency, always demos). Includes optical,
 * SAR, optical+SAR co-registered pair and a bi-temporal t1/t2 pair.
 */

import type { LoadedImage, SampleEntry } from "./types";

/** mulberry32 seeded PRNG — deterministic renders */
function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 512;
const H = 480;

type Style = "optical" | "sar";

interface DrawOpts {
  seed: number;
  style: Style;
  /** t2 variant — adds new construction, changed fields */
  variant?: "base" | "variant";
}

function rgb(r: number, g: number, b: number, a = 1): string {
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

function speckle(ctx: CanvasRenderingContext2D, rand: () => number, alpha: number, grain: number) {
  ctx.save();
  for (let i = 0; i < 900; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const v = Math.floor(90 + rand() * 165);
    ctx.fillStyle = rgb(v, v, v, alpha);
    ctx.fillRect(x, y, 1 + rand() * grain, 1 + rand() * grain);
  }
  ctx.restore();
}

/** field palette per style */
const FIELD = {
  optical: ["#7a8f4a", "#8b9c55", "#6d8242", "#9aa75e", "#5f7340"],
  sar: ["#4a4f55", "#3c4148", "#464b52", "#43484f"],
};
const BLOCKS = {
  optical: ["#b3b6bb", "#a7abb1", "#c2c5ca", "#9a9ea5", "#b9bcc2", "#898d94"],
  sar: ["#e8eaee", "#f2f4f8", "#d8dbe0", "#cfd2d8"],
};

function renderScene(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  const rand = rng(o.seed);
  const sar = o.style === "sar";
  const variant = o.variant === "variant";

  // Base land backdrop
  ctx.fillStyle = sar ? "#3a3f44" : "#4d6a46";
  ctx.fillRect(0, 0, W, H);

  // --- agricultural fields (western + lower area) ---
  const tones = FIELD[o.style];
  const nF = 16 + Math.floor(rand() * 8);
  for (let i = 0; i < nF; i++) {
    const fx = rand() * W * 0.75;
    const fy = H * 0.3 + rand() * H * 0.68;
    const fw = 60 + rand() * 130;
    const fh = 40 + rand() * 90;
    ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D).roundRect(fx, fy, fw, fh, 8);
    ctx.fill();
    ctx.strokeStyle = sar ? rgb(20, 20, 24, 0.35) : rgb(30, 45, 25, 0.28);
    ctx.lineWidth = 1;
    for (let r = 8; r < fh - 6; r += 7) {
      ctx.beginPath();
      ctx.moveTo(fx + 6, fy + r);
      ctx.lineTo(fx + fw - 6, fy + r);
      ctx.stroke();
    }
  }

  // --- water body (south) ---
  const waterY = H * 0.66;
  const waterGrad = ctx.createLinearGradient(0, waterY - 40, 0, H);
  waterGrad.addColorStop(0, sar ? "#2a2d33" : "#2e5b7a");
  waterGrad.addColorStop(1, sar ? "#23262c" : "#1d4059");
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.moveTo(0, waterY + 90 + rand() * 40);
  ctx.bezierCurveTo(W * 0.12, waterY + 30, W * 0.3, waterY + 130, W * 0.5, waterY + 60);
  ctx.bezierCurveTo(W * 0.7, waterY - 10, W * 0.88, waterY + 120, W, waterY + 70);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // --- forest patches (north) ---
  ctx.fillStyle = sar ? "#4e535a" : "#2f5d33";
  const nForest = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < nForest; i++) {
    const fpx = rand() * W * 0.9;
    const fpy = rand() * H * 0.24;
    ctx.beginPath();
    ctx.arc(fpx, fpy, 26 + rand() * 46, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!sar) {
    ctx.fillStyle = rgb(47, 93, 51, 0.55);
    for (let i = 0; i < 260; i++) {
      ctx.fillRect(rand() * W, rand() * H * 0.3, 2, 2);
    }
  }

  // --- urban grid (center-east) ---
  const ux = W * 0.42 + rand() * 40;
  const uy = H * 0.2;
  const uw = 240 + rand() * 30;
  const uh = 170 + rand() * 20;
  ctx.fillStyle = sar ? "#62686f" : "#8b8f95";
  ctx.fillRect(ux, uy, uw, uh);
  ctx.strokeStyle = sar ? "#33363c" : "#6a6e74";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(ux + uw / 2, uy);
  ctx.lineTo(ux + uw / 2, uy + uh);
  ctx.moveTo(ux, uy + uh / 2);
  ctx.lineTo(ux + uw, uy + uh / 2);
  ctx.stroke();

  const blk = BLOCKS[o.style];
  for (let r = 1; r < 4; r++) {
    for (let c = 1; c < 5; c++) {
      const bx = ux + (c * uw) / 5 + 4;
      const by = uy + (r * uh) / 4 + 4;
      const bw = uw / 5 - 14;
      const bh = uh / 4 - 12;
      ctx.fillStyle = blk[Math.floor(rand() * blk.length)];
      ctx.fillRect(bx, by, bw, bh);
    }
  }

  // variant: new construction + changed field
  if (variant) {
    ctx.fillStyle = sar ? "#fdfeff" : "#e6e9ed";
    ctx.fillRect(ux + uw * 0.72, uy + uh * 0.04, uw * 0.25, uh * 0.18);
    ctx.fillStyle = sar ? "#5b6159" : "#b2c96e";
    ctx.fillRect(W * 0.06, H * 0.4, 90, 60);
  }

  // --- road corridor (diagonal) ---
  ctx.strokeStyle = sar ? "#4b4f56" : "#a5a79b";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-20, H * 0.52);
  ctx.quadraticCurveTo(W * 0.4, H * 0.6, W + 20, H * 0.42);
  ctx.stroke();

  speckle(ctx, rand, sar ? 0.2 : 0.05, sar ? 2.4 : 1.6);
  if (sar) {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(rand() * W, rand() * H, 1, 1);
    }
  }

  // vignette
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function render(opts: DrawOpts): LoadedImage {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  renderScene(ctx, opts);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  const baseModality: "optical" | "sar" = opts.style === "sar" ? "sar" : "optical";
  const label = opts.variant === "variant" ? "t2" : baseModality;
  return {
    id: `${opts.style}-${opts.seed}-${opts.variant ?? "base"}`,
    dataUrl,
    mimeType: "image/jpeg",
    modality: baseModality,
    label,
    name: `${opts.style}-${opts.seed}`,
    width: W,
    height: H,
  };
}

let cache: SampleEntry[] | null = null;

export async function loadSampleScenes(): Promise<SampleEntry[]> {
  if (cache) return cache;

  const singleOpticalA = render({ seed: 4173, style: "optical" });
  const singleOpticalB = render({ seed: 8123, style: "optical" });
  const singleSar = render({ seed: 555, style: "sar" });
  const opticalFusion = render({ seed: 2024, style: "optical" });
  const sarFusion = render({ seed: 2024, style: "sar" });
  const t1 = render({ seed: 9090, style: "optical", variant: "base" });
  const t2 = render({ seed: 9090, style: "optical", variant: "variant" });

  const list: SampleEntry[] = [
    {
      id: "scene-optical-1",
      name: "Urban fringe · optical",
      description: "Mixed land cover with a built-up core, fields and a water body.",
      kind: "single",
      chips: [{ label: "OPTICAL", tone: "cyan" }],
      images: [singleOpticalA],
      suggestions: [
        "Describe the land-cover and major objects visible in this image.",
        "Highlight the urban built-up area in this scene.",
      ],
    },
    {
      id: "scene-optical-2",
      name: "Rural mosaic · optical",
      description: "Agricultural parcels, vegetation patches and a river.",
      kind: "single",
      chips: [{ label: "OPTICAL", tone: "cyan" }],
      images: [singleOpticalB],
      suggestions: [
        "Write a caption describing this rural scene.",
        "Where are the water features located in this image?",
      ],
    },
    {
      id: "scene-sar",
      name: "SAR texture · single",
      description: "Synthetic aperture radar preview — bright returns for urban areas.",
      kind: "single",
      chips: [{ label: "SAR", tone: "amber" }],
      images: [singleSar],
      suggestions: [
        "Describe the land-cover patterns visible in this SAR image.",
        "Highlight the built-up regions in this radar scene.",
      ],
    },
    {
      id: "scene-optsar",
      name: "Optical + SAR pair",
      description: "Co-registered optical and SAR views of the same area (fusion demo).",
      kind: "pair",
      chips: [
        { label: "OPTICAL", tone: "cyan" },
        { label: "SAR", tone: "amber" },
      ],
      images: [opticalFusion, sarFusion],
      suggestions: [
        "Use the optical and SAR images together to identify built-up and water-covered regions.",
      ],
    },
    {
      id: "scene-bitemporal",
      name: "Bi-temporal change pair",
      description: "t1 (earlier) and t2 (later) — new construction and land-cover change.",
      kind: "pair",
      chips: [
        { label: "t1", tone: "teal" },
        { label: "t2", tone: "violet" },
      ],
      images: [
        { ...t1, label: "t1" },
        { ...t2, label: "t2" },
      ],
      suggestions: ["What changed between these two dates, and where did the change occur?"],
    },
  ];

  cache = list;
  return list;
}