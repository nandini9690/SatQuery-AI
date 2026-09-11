import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";
import type { AnalysisResult, LoadedImage } from "./types";

export type FailureKind = "auth" | "validation" | "service" | "network" | "geotiff";

export class AnalysisFailure extends Error {
  kind: FailureKind;
  constructor(kind: FailureKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "AnalysisFailure";
  }
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const GEO_TIFF_MARKERS = /\.(tif|tiff|gtiff)$/i;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Read + downscale an uploaded file to a compact JPEG data URL.
 * Rejects GeoTIFF with a friendly notice (demo accepts PNG/JPEG previews).
 */
export async function fileToImage(file: File): Promise<LoadedImage> {
  if (GEO_TIFF_MARKERS.test(file.name) || /(geotiff|tiff)/i.test(file.type)) {
    throw new AnalysisFailure(
      "geotiff",
      "That looks like a GeoTIFF — full raster processing lives in the Python backend. For this demo, export a PNG/JPEG preview and upload that.",
    );
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new AnalysisFailure("validation", "Only PNG or JPEG previews are accepted in the demo.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AnalysisFailure("validation", "That image is too large — please keep it under 4 MB.");
  }

  const dataUrl = await downscaleToDataUrl(file);
  const meta = await readDims(dataUrl);

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl,
    mimeType: "image/jpeg",
    modality: "optical",
    label: "single",
    name: file.name,
    width: meta.width,
    height: meta.height,
  };
}

function downscaleToDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new AnalysisFailure("validation", "Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new AnalysisFailure("validation", "Could not decode that image."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new AnalysisFailure("validation", "Could not decode that image."));
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataUrl;
  });
}

/** Local fallback for demo mode — a simulated, fully-typed AnalysisResult. */
function demoAnalysis(query: string, images: LoadedImage[]): AnalysisResult {
  const count = images.length === 1 ? "1 image" : `${images.length} images`;
  const labels = images.map((im) => im.label || im.modality).join(", ");
  return {
    answer:
      "Demo mode: no analysis service is configured in this environment, so this run was " +
      `simulated locally against the bundled ${count} (${labels}). ` +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then sign in, to run live Gemini analysis.",
    confidence: 0.62,
    task: "vqa",
    task_label: "VQA",
    tool: "simulated_demo",
    tool_label: "Simulated Demo",
    model: "local demo simulator",
    params: { demo: true, offline: true, imageCount: images.length },
    evidence: {},
    metadata: { images: images.map((im) => ({ modality: im.modality, label: im.label })) },
    latency_ms: 0,
    simulated: true,
    trace: [
      { step: 1, label: "Query received", detail: `Parsed query: "${query.slice(0, 140)}"` },
      { step: 2, label: "Imagery ingest", detail: `${count} loaded — modalities: ${labels}` },
      {
        step: 3,
        label: "Analysis service",
        detail:
          "No Supabase endpoint configured — result simulated locally, nothing was sent to Gemini.",
      },
    ],
  };
}

/**
 * Call the satquery-analyze Edge Function directly (REST) instead of via the
 * SDK wrapper so that non-2xx responses keep their JSON body — that body holds
 * the server-side `error`/`detail` we surface to the user instead of a generic
 * "analysis failed" message. The session JWT is attached the same way the SDK
 * would, so the function's auth check behaves identically.
 */
export async function runAnalysis(
  query: string,
  images: LoadedImage[],
): Promise<AnalysisResult> {
  if (images.length === 0) {
    throw new AnalysisFailure("validation", "Attach at least one image before asking a question.");
  }

  // Demo mode (no Supabase env vars): return a local simulated result so the
  // whole mission pipeline stays explorable without a backend.
  if (!supabase) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return demoAnalysis(query, images);
  }

  const body = {
    query,
    images: images.map((im) => ({
      data: im.dataUrl,
      mimeType: im.mimeType,
      modality: im.modality,
      label: im.label,
    })),
  };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? "";

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/satquery-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AnalysisFailure(
      "network",
      "Could not reach the analysis service. Check your connection and try again.",
    );
  }

  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const status = res.status;
    const serverMsg = payload && typeof payload.error === "string" ? payload.error : null;
    const detail = payload && typeof payload.detail === "string" ? payload.detail : null;
    if (status === 401) {
      throw new AnalysisFailure(
        "auth",
        "Your session expired. Please sign in again, then retry.",
      );
    }
    const reason = detail
      ? `${serverMsg ?? "The analysis service could not be reached."} ${detail}`
      : (serverMsg ?? `The analysis service did not respond (HTTP ${status}). Please try again.`);
    throw new AnalysisFailure("service", reason);
  }

  if (payload && typeof payload.error === "string") {
    throw new AnalysisFailure("service", payload.error);
  }
  return payload as unknown as AnalysisResult;
}