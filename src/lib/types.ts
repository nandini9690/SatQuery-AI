export type Modality = "optical" | "sar";

export interface LoadedImage {
  id: string;
  dataUrl: string;
  mimeType: string;
  modality: Modality;
  /** Slot label shown as a chip: t1 / t2 / optical / sar / single */
  label: string;
  name: string;
  width: number;
  height: number;
}

export interface GroundingBox {
  label: string;
  /** normalized [x1, y1, x2, y2] in 0..1 relative to image width/height */
  bbox: [number, number, number, number];
  confidence: number;
}

export interface TraceStep {
  step: number;
  label: string;
  detail: string;
}

export interface AnalysisResult {
  answer: string;
  confidence: number;
  task: string;
  task_label: string;
  tool: string | null;
  tool_label: string | null;
  model: string;
  params: Record<string, unknown>;
  evidence: { boxes?: GroundingBox[] };
  metadata: { images: { modality: string; label: string }[] };
  latency_ms: number;
  simulated: boolean;
  trace: TraceStep[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  query?: string;
  images?: LoadedImage[];
  result?: AnalysisResult;
  error?: string;
  createdAt: number;
}

export interface SampleEntry {
  id: string;
  name: string;
  description: string;
  kind: "single" | "pair";
  chips: { label: string; tone: string }[];
  images: LoadedImage[];
  suggestions: string[];
}

export const TOOL_META: Record<string, { label: string; short: string }> = {
  bigearth_vqa: { label: "BigEarth VQA", short: "VQA" },
  bigearth_captioning: { label: "Scene Captioning", short: "CAP" },
  bigearth_grounding: { label: "Region Grounding", short: "GRD" },
  bitemporal_change: { label: "Bi-Temporal Change", short: "BTC" },
  sar_optical_fusion: { label: "Optical+SAR Fusion", short: "OSF" },
  simulated_demo: { label: "Simulated Demo", short: "SIM" },
};

export const TASK_BADGE: Record<
  string,
  { label: string; tone: "cyan" | "teal" | "amber" | "violet" | "neutral" }
> = {
  vqa: { label: "VQA", tone: "cyan" },
  captioning: { label: "Captioning", tone: "teal" },
  grounding: { label: "Grounding", tone: "amber" },
  change_detection: { label: "Change Det.", tone: "violet" },
  cross_modal_fusion: { label: "Optical+SAR", tone: "neutral" },
  clarify: { label: "Clarify", tone: "neutral" },
};