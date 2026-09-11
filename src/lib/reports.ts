import { supabase } from "./supabase";
import type { ChatMessage, GroundingBox } from "./types";

export const REPORTS_BUCKET = "reports";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function boxSvg(box: GroundingBox, w: number, h: number): string {
  const [x1, y1, x2, y2] = box.bbox;
  const cx = x1 * w;
  const cy = y1 * h;
  const cw = (x2 - x1) * w;
  const ch = (y2 - y1) * h;
  return `<g><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="none" stroke="#fbbf24" stroke-width="3"/><text x="${cx}" y="${Math.max(
    14,
    cy - 6,
  )}" fill="#fbbf24" font-size="13" font-family="monospace">${escapeHtml(box.label)}</text></g>`;
}

/** Build a self-contained HTML snapshot of a Q&A exchange. */
export function buildReportHtml(message: ChatMessage): string {
  const r = message.result;
  const t = new Date(message.createdAt).toLocaleString();

  let imagesHtml = "";
  if (message.images?.length) {
    imagesHtml = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0;">
      ${message.images
        .map((im) => {
          const boxes = r?.task === "grounding" ? (r.evidence?.boxes ?? []) : [];
          const overlay = boxes.length
            ? `<svg width="100%" height="100%" viewBox="0 0 ${im.width} ${im.height}" preserveAspectRatio="none" style="position:absolute;inset:0;">${boxes
                .map((b) => boxSvg(b, im.width, im.height))
                .join("")}</svg>`
            : "";
          return `<figure style="position:relative;margin:0;border:1px solid #24344d;background:#000;display:inline-block;">
            <img src="${im.dataUrl}" style="max-width:340px;display:block;"/>
            ${overlay}
            <figcaption style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.72);color:#67e8f9;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:4px;">${escapeHtml(
              im.label ?? im.modality,
            )}</figcaption>
          </figure>`;
        })
        .join("")}
    </div>`;
  }

  let traceHtml = "";
  if (r?.trace?.length) {
    traceHtml = `<ol style="font-family:monospace;font-size:13px;color:#cbd5e1;line-height:1.8;padding-left:20px;">${r.trace
      .map(
        (s) =>
          `<li><strong style="color:#fbbf24;">step ${s.step} — ${escapeHtml(s.label)}</strong><br/>${escapeHtml(
            s.detail,
          )}</li>`,
      )
      .join("")}</ol>`;
  }

  const conf = r ? Math.round(r.confidence * 100) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>SatQuery AI — Analysis Report</title>
<style>
  body{background:#0b1020;color:#e2e8f0;font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:0 auto;padding:32px 20px;}
  h1{font-family:system-ui,-apple-system,sans-serif;}
  .meta{color:#94a3b8;font-size:13px;font-family:monospace;}
  .box{background:#0d1526;border:1px solid #24344d;border-radius:12px;padding:16px 20px;margin:16px 0;}
  .cap{font-size:11px;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;}
  .bar{height:8px;background:#1e293b;border-radius:999px;overflow:hidden;margin-top:6px;}
  .bar>div{height:100%;background:linear-gradient(90deg,#22d3ee,#0ea5e9);}
  .q{color:#f1f5f9;font-size:15px;line-height:1.6;}
  .a{color:#dbeafe;font-size:15px;line-height:1.7;white-space:pre-wrap;}
  .sim{color:#fbbf24;font-family:monospace;font-size:12px;}
</style>
</head>
<body>
<h1>🛰️ SatQuery AI — Analysis Report</h1>
<p class="meta">Generated ${t} · task ${escapeHtml(r?.task ?? "—")} · model ${escapeHtml(
    r?.model ?? "—",
  )}</p>
${
  message.images?.length
    ? `<div class="box"><div class="cap">Input imagery</div>${imagesHtml}</div>`
    : ""
}
<div class="box">
  <div class="cap">Query</div>
  <p class="q">${escapeHtml(message.query ?? "")}</p>
</div>
<div class="box">
  <div class="cap">Answer</div>
  ${r?.simulated ? '<p class="sim">SIMULATED DEMO MODE — no live model run</p>' : ""}
  <p class="a">${escapeHtml(r?.answer ?? "")}</p>
  ${
    r && conf !== null
      ? `<div style="margin-top:8px;"><span style="font-size:12px;color:#94a3b8;font-family:monospace;">confidence ${conf}%</span><div class="bar"><div style="width:${conf}%"></div></div></div>`
      : ""
  }
</div>
<div class="box">
  <div class="cap">Execution trace</div>
  ${traceHtml || '<p style="color:#64748b;font-size:13px;">No trace available.</p>'}
</div>
<hr style="border:none;border-top:1px solid #24344d;margin:24px 0;"/>
<p class="meta">SatQuery AI — agentic remote-sensing analysis (demo dashboard).</p>
</body>
</html>`;
}

/** Trigger a browser download of the HTML snapshot. */
export function downloadReport(message: ChatMessage) {
  const html = buildReportHtml(message);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date(message.createdAt).toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `satquery-report-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Persist a JSON snapshot to the private `reports` bucket. */
export async function saveReportSnapshot(message: ChatMessage): Promise<string> {
  if (!supabase) {
    throw new Error("Report saving is disabled in demo mode — no Supabase storage configured.");
  }
  const stamp = new Date(message.createdAt).toISOString().replace(/[:.]/g, "-");
  const path = `${stamp}-report.json`;
  const body = JSON.stringify({
    query: message.query,
    images: message.images ?? [],
    result: message.result,
    createdAt: message.createdAt,
    app: "satquery-ai",
  });
  const { error } = await supabase.storage.from(REPORTS_BUCKET).upload(path, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`Could not save report: ${error.message}`);
  return path;
}

export interface StoredReport {
  path: string;
  name: string;
  createdAt: number;
  url: string | null;
}

/** List the signed-in user's saved reports (oldest last). */
export async function listSavedReports(): Promise<StoredReport[]> {
  if (!supabase) {
    throw new Error("Report history is disabled in demo mode — no Supabase storage configured.");
  }
  const client = supabase; // re-narrowed const so closures keep the non-null type
  const { data: files, error } = await client.storage.from(REPORTS_BUCKET).list();
  if (error) throw new Error(`Could not list reports: ${error.message}`);

  const rows = await Promise.all(
    (files ?? []).map(async (f) => {
      const signed = await client.storage
        .from(REPORTS_BUCKET)
        .createSignedUrl(f.name, 3600, { download: f.name });
      return {
        path: f.name,
        name: f.name.replace(/-report\.json$/, "").replace(/T|Z|\./g, " ").trim(),
        createdAt: new Date(f.created_at ?? Date.now()).getTime(),
        url: signed.data?.signedUrl ?? null,
      };
    }),
  );
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}