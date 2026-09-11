/**
 * Knowledge base — the datasets behind SatQuery's satellite vision stack:
 * the multimodal fine-tuning corpus and the public benchmark the system is
 * graded on. Surfaced in the mission-control empty state.
 */

export interface KnowledgeEntry {
  id: string;
  name: string;
  role: "Fine-tuning corpus" | "Evaluation benchmark";
  summary: string;
  reference: string; // arXiv ID / citation handle
  modifiers: string; // sensors · annotation style, short
}

export const MODEL_INFO = {
  name: "Gemini 2.5 Flash",
  note:
    "Routeing controller model — classifies each query into a task, then dispatches it to a specialist satellite tool (VQA, captioning, grounding, bi-temporal change, optical+SAR fusion).",
};

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "bigearthsat",
    name: "BigEarthSat",
    role: "Fine-tuning corpus",
    summary:
      "Paired Sentinel-1 SAR + Sentinel-2 MSI imagery with text annotations (captions and visual question-answer pairs) — the reference fine-tuning set for the satellite tool models.",
    reference: "arXiv 2603.29630",
    modifiers: "Sentinel-1 SAR · Sentinel-2 MSI · text annotations",
  },
  {
    id: "vrsbench",
    name: "VRSBench",
    role: "Evaluation benchmark",
    summary:
      "Public satellite visual-question-answering benchmark used to evaluate reference resolution and answer accuracy after fine-tuning.",
    reference: "VRSBench · public benchmark",
    modifiers: "satellite VQA · evaluation",
  },
];