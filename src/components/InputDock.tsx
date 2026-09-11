import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { fileToImage } from "../lib/analyze";
import { loadSampleScenes } from "../lib/samples";
import type { LoadedImage, SampleEntry } from "../lib/types";

interface Props {
  images: LoadedImage[];
  onChange: (imgs: LoadedImage[]) => void;
}

const SLOT_TONES: Record<string, string> = {
  optical: "border-primary/50 text-primary",
  sar: "border-accent/50 text-accent",
  t1: "border-secondary/50 text-secondary",
  t2: "border-violet-400/60 text-violet-300",
  single: "border-muted/50 text-muted",
};

export default function InputDock({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SampleEntry[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadSampleScenes().then((s) => mounted && setScenes(s));
    return () => {
      mounted = false;
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      setErr(null);
      setBusy(true);
      try {
        const loaded: LoadedImage[] = [];
        for (const f of files.slice(0, 2 - images.length)) {
          const img = await fileToImage(f);
          img.label = images.length + loaded.length === 0 ? "single" : "t2";
          loaded.push(img);
        }
        if (loaded.length) onChange([...images, ...loaded].slice(0, 2));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load that image.");
      } finally {
        setBusy(false);
      }
    },
    [images, onChange],
  );

  function pickScene(s: SampleEntry) {
    onChange(s.images.map((im) => ({ ...im, id: `${im.id}-picked` })));
    setGalleryOpen(false);
  }

  function removeImage(id: string) {
    onChange(images.filter((i) => i.id !== id));
  }

  const atCapacity = images.length >= 2;

  return (
    <div className="space-y-2">
      {/* Selected thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {images.map((im) => (
            <div
              key={im.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-surface-2"
            >
              <img src={im.dataUrl} alt={im.name} className="h-24 w-24 object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1">
                <span
                  className={`readout text-[10px] ${SLOT_TONES[im.label] ?? SLOT_TONES.single}`}
                >
                  {im.label}
                </span>
                <button
                  aria-label={`Remove ${im.name}`}
                  onClick={() => removeImage(im.id)}
                  className="btn-press rounded p-0.5 text-muted hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {images.length === 2 && (
            <button
              onClick={() => setGalleryOpen((v) => !v)}
              className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Change pair
            </button>
          )}
        </div>
      )}

      {err && (
        <p
          role="alert"
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-amber-100"
        >
          {err}
        </p>
      )}

      {/* Primary action area */}
      {!atCapacity && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add satellite images"
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length) addFiles(files);
          }}
          className={`btn-press flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border bg-surface/40 hover:border-primary/50"
          }`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
          )}
          <p className="text-sm font-medium text-foreground">
            {busy ? "Processing…" : atCapacity ? "Pair ready" : "Drop images or click to upload"}
          </p>
          <p className="text-xs text-muted">PNG / JPEG · 1 image or a t1–t2, optical–SAR pair</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {/* Sample gallery toggle */}
      <button
        onClick={() => setGalleryOpen((v) => !v)}
        aria-expanded={galleryOpen}
        className="btn-press inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {galleryOpen ? "Hide sample gallery" : "Load a bundled sample scene"}
      </button>

      {galleryOpen && (
        <div
          role="list"
          aria-label="Bundled sample scenes"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 animate-fade-in"
        >
          {scenes.map((s) => (
            <button
              key={s.id}
              role="listitem"
              onClick={() => pickScene(s)}
              className="btn-press group overflow-hidden rounded-xl border border-border bg-surface-2 text-left transition-colors hover:border-primary/50"
            >
              <div className="relative flex gap-0.5 bg-black">
                {s.images.slice(0, 2).map((im, i) => (
                  <img
                    key={`${s.id}-${i}`}
                    src={im.dataUrl}
                    alt=""
                    className={`h-24 object-cover ${s.images.length === 2 ? "w-1/2" : "w-full"}`}
                  />
                ))}
                {s.kind === "pair" && (
                  <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 readout text-[9px] text-primary">
                    PAIR
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-foreground">{s.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.chips.map((c) => (
                    <span
                      key={c.label}
                      className={`readout rounded border px-1.5 py-0.5 text-[9px] ${
                        SLOT_TONES[c.tone] ?? SLOT_TONES.single
                      }`}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}