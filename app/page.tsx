"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import Donations from "@/components/Donations";
import SettingsPanelContent from "@/components/SettingsPanelContent";
import TrackList from "@/components/TrackList";
import UploadArea from "@/components/UploadArea";
import VideoStudio from "@/components/VideoStudio";
import {
  computePeaks,
  decodeFile,
  downloadBlob,
  encodeWav,
  formatTime,
  renderTrack,
  splitBuffer,
} from "@/lib/audio";
import { buildRenamedName } from "@/lib/rename";
import {
  DEFAULT_BATCH,
  MAX_FILES,
  MAX_FILE_MB,
  MAX_TOTAL_MB,
  type AudioTrack,
  type BatchSettings,
} from "@/lib/types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `audio-${Date.now()}-${counter}`;
}

function splitName(filename: string): { baseName: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { baseName: filename, ext: "" };
  return { baseName: filename.slice(0, dot), ext: filename.slice(dot + 1) };
}

/** Sección colapsable del acordeón móvil: encabezado siempre visible. */
function MobileSection({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-base font-bold text-slate-900">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {badge && (
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">
              {badge}
            </span>
          )}
          <span className="text-lg leading-none text-slate-500" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </section>
  );
}

const TRIM_SHORTCUTS: Array<{ label: string; seconds: number }> = [
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
];

export default function Home() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchSettings>(DEFAULT_BATCH);
  const [renamePattern, setRenamePattern] = useState("audio-{n}");
  const [renamePrefix, setRenamePrefix] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  /** Paneles laterales flotantes: abiertos por defecto en escritorio. */
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSection, setMobileSection] = useState<
    "audios" | "config" | "preview" | null
  >("audios");

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setIsMobile(mq.matches);
      document.documentElement.classList.toggle("na-mobile", mq.matches);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const selectedTrack = tracks.find((t) => t.id === selectedId) ?? null;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const addFiles = useCallback(async (files: File[]) => {
    const usable = files.filter(
      (f) => f.type.startsWith("audio/") || f.type.startsWith("video/"),
    );
    if (usable.length === 0) {
      setNotice("Ese archivo no es audio ni video. Prueba con MP3, WAV, OGG, M4A o MP4.");
      return;
    }
    const current = tracksRef.current;
    if (current.length + usable.length > MAX_FILES) {
      setNotice(`Máximo ${MAX_FILES} audios por lote.`);
      return;
    }
    const newTracks: AudioTrack[] = [];
    for (const file of usable) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setNotice(`«${file.name}» supera los ${MAX_FILE_MB} MB por archivo.`);
        continue;
      }
      try {
        const buffer = await decodeFile(file);
        const { baseName, ext } = splitName(file.name);
        newTracks.push({
          id: nextId(),
          name: file.name,
          baseName,
          ext: ext || "wav",
          file,
          url: URL.createObjectURL(file),
          duration: buffer.duration,
          peaks: computePeaks(buffer),
          buffer,
          start: 0,
          end: buffer.duration,
          volume: 1,
          speed: 1,
        });
      } catch {
        setNotice(
          `No se pudo decodificar «${file.name}». Prueba con MP3, WAV, OGG o M4A.`,
        );
      }
    }
    if (newTracks.length > 0) {
      setTracks((prev) => [...prev, ...newTracks]);
      setSelectedId((prev) => prev ?? newTracks[0].id);
      setNotice(
        newTracks.length === 1
          ? `«${newTracks[0].name}» listo (${formatTime(newTracks[0].duration)}).`
          : `${newTracks.length} audios cargados.`,
      );
    }
  }, []);

  const addRecording = useCallback(async (blob: Blob) => {
    try {
      const buffer = await decodeFile(blob);
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}-${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;
      const name = `Grabación ${stamp}.webm`;
      const track: AudioTrack = {
        id: nextId(),
        name,
        baseName: `Grabación ${stamp}`,
        ext: "webm",
        file: blob,
        url: URL.createObjectURL(blob),
        duration: buffer.duration,
        peaks: computePeaks(buffer),
        buffer,
        start: 0,
        end: buffer.duration,
        volume: 1,
        speed: 1,
      };
      setTracks((prev) => [...prev, track]);
      setSelectedId(track.id);
      setNotice(`Grabación guardada (${formatTime(buffer.duration)}).`);
    } catch {
      setNotice("No se pudo decodificar la grabación en este navegador.");
    }
  }, []);

  function deleteTrack(id: string) {
    setTracks((prev) => {
      const track = prev.find((t) => t.id === id);
      if (track) URL.revokeObjectURL(track.url);
      const next = prev.filter((t) => t.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  function renameTrack(id: string, name: string) {
    const { baseName, ext } = splitName(name);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, name, baseName, ext: ext || t.ext } : t,
      ),
    );
  }

  function trimTrack(id: string, start: number, end: number) {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, start, end } : t)),
    );
  }

  function trimSelectedTo(seconds: number) {
    if (!selectedTrack) return;
    const end = Math.min(selectedTrack.duration, selectedTrack.start + seconds);
    trimTrack(selectedTrack.id, selectedTrack.start, end);
    setNotice(
      `Recorte de ${selectedTrack.name}: ${formatTime(selectedTrack.start)} a ${formatTime(end)}.`,
    );
  }

  function applyBatch() {
    setTracks((prev) =>
      prev.map((t) => ({ ...t, volume: batch.volume, speed: batch.speed })),
    );
    setNotice("Volumen y velocidad aplicados a todos los audios.");
  }

  function batchRename() {
    setTracks((prev) =>
      prev.map((t, i) => {
        const name = buildRenamedName(renamePattern, renamePrefix, i + 1, t.baseName, t.ext);
        const { baseName, ext } = splitName(name);
        return { ...t, name, baseName, ext: ext || t.ext };
      }),
    );
    setNotice("Audios renombrados por lote.");
  }

  function renderSelected(): AudioBuffer | null {
    if (!selectedTrack?.buffer) return null;
    return renderTrack(selectedTrack.buffer, {
      start: selectedTrack.start,
      end: selectedTrack.end,
      volume: batch.volume,
      speed: batch.speed,
      fadeIn: batch.fadeIn,
      fadeOut: batch.fadeOut,
      normalize: batch.normalize,
      removeSilence: batch.removeSilence,
      invert: batch.invert,
    });
  }

  async function exportOne() {
    if (!selectedTrack) return;
    setProcessing(true);
    setProgress("1/1");
    try {
      const rendered = renderSelected();
      if (!rendered) throw new Error("sin buffer");
      const wavName = `${selectedTrack.baseName}.wav`;
      downloadBlob(encodeWav(rendered), wavName);
      setNotice(`«${wavName}» descargado en WAV.`);
    } catch {
      setNotice("No se pudo exportar el audio seleccionado.");
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  async function exportZip() {
    if (tracks.length === 0) return;
    setProcessing(true);
    try {
      const zip = new JSZip();
      let done = 0;
      for (const track of tracks) {
        if (!track.buffer) continue;
        const rendered = renderTrack(track.buffer, {
          start: track.start,
          end: track.end,
          volume: batch.volume,
          speed: batch.speed,
          fadeIn: batch.fadeIn,
          fadeOut: batch.fadeOut,
          normalize: batch.normalize,
          removeSilence: batch.removeSilence,
          invert: batch.invert,
        });
        zip.file(`${track.baseName}.wav`, encodeWav(rendered));
        done += 1;
        setProgress(`${done}/${tracks.length}`);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "nousaudio.zip");
      setNotice(`${done} audios exportados en nousaudio.zip (WAV).`);
    } catch {
      setNotice("No se pudo generar el ZIP.");
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  async function splitSelected() {
    if (!selectedTrack?.buffer || batch.splitMinutes === 0) return;
    setProcessing(true);
    try {
      const rendered = renderSelected();
      if (!rendered) throw new Error("sin buffer");
      const parts = splitBuffer(rendered, batch.splitMinutes);
      const newTracks: AudioTrack[] = parts.map((part, i) => {
        const wav = encodeWav(part);
        const baseName = `${selectedTrack.baseName}-parte-${i + 1}`;
        return {
          id: nextId(),
          name: `${baseName}.wav`,
          baseName,
          ext: "wav",
          file: wav,
          url: URL.createObjectURL(wav),
          duration: part.duration,
          peaks: computePeaks(part),
          buffer: part,
          start: 0,
          end: part.duration,
          volume: 1,
          speed: 1,
        };
      });
      setTracks((prev) => [...prev, ...newTracks]);
      setNotice(
        `«${selectedTrack.name}» dividido en ${parts.length} partes de ${batch.splitMinutes} min.`,
      );
    } catch {
      setNotice("No se pudo dividir el audio.");
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  const totalMB =
    tracks.reduce((n, t) => n + t.file.size, 0) / (1024 * 1024);

  const leftPanel = (
    <div className="flex flex-col gap-4 p-4">
      <UploadArea onFiles={(files) => void addFiles(files)} onRecorded={(b) => void addRecording(b)} />
      {selectedTrack && (
        <div>
          <p className="text-xs font-bold text-slate-700">
            Recorte rápido: {selectedTrack.baseName}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {TRIM_SHORTCUTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => trimSelectedTo(s.seconds)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-cyan-100"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-bold text-slate-700">
          Tus audios ({tracks.length}/{MAX_FILES})
          {tracks.length > 0 && ` · ${totalMB.toFixed(1)} MB de ${MAX_TOTAL_MB} MB`}
        </p>
        <TrackList
          tracks={tracks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deleteTrack}
          onRename={renameTrack}
          onTrim={trimTrack}
        />
      </div>
    </div>
  );

  const rightPanel = (
    <SettingsPanelContent
      batch={batch}
      onBatchChange={(patch) => setBatch((b) => ({ ...b, ...patch }))}
      renamePattern={renamePattern}
      renamePrefix={renamePrefix}
      onRenameChange={(pattern, prefix) => {
        setRenamePattern(pattern);
        setRenamePrefix(prefix);
      }}
      onApplyBatch={applyBatch}
      onBatchRename={batchRename}
      onExportOne={() => void exportOne()}
      onExportZip={() => void exportZip()}
      onSplit={() => void splitSelected()}
      hasTracks={tracks.length > 0}
      selectedName={selectedTrack?.baseName ?? ""}
      processing={processing}
      progress={progress}
    />
  );

  const preview = (
    <VideoStudio track={selectedTrack} onNotice={setNotice} />
  );

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            NousAudio <span className="text-base font-bold italic text-cyan-700">por NousLogic</span>
          </h1>
          <p className="text-xs text-slate-500">
            La razón ordena el cosmos. Editor de audio y audio a video, 100% en
            tu navegador.
          </p>
        </div>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">
          {tracks.length} {tracks.length === 1 ? "audio" : "audios"}
        </span>
        <Donations />
      </header>

      {notice && (
        <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl bg-cyan-50 px-4 py-2.5 text-sm text-cyan-900">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
            className="text-lg leading-none text-cyan-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Escritorio: rejilla de 3 columnas, cada sección ocupa solo su
          espacio, sin superponerse: Tus audios | Estudio | Configuración.
          Los paneles laterales se colapsan a una barra estrecha. */}
      <main className="na-desktop-root mx-auto max-w-[1600px] px-4 pb-10 pt-4">
        <div
          className="grid items-start gap-4"
          style={{
            gridTemplateColumns: `${leftOpen ? 340 : 48}px minmax(0, 1fr) ${rightOpen ? 320 : 48}px`,
          }}
        >
          <aside className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            {leftOpen ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-3">
                  <h2 className="text-base font-bold text-slate-900">Tus audios</h2>
                  <button
                    type="button"
                    onClick={() => setLeftOpen(false)}
                    aria-label="Colapsar Tus audios"
                    className="rounded-full px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                  >
                    ◀
                  </button>
                </div>
                {leftPanel}
              </>
            ) : (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  aria-label="Mostrar Tus audios"
                  className="[writing-mode:vertical-rl] rounded-full bg-white px-2 py-3 text-xs font-bold text-slate-700 shadow ring-1 ring-slate-200"
                >
                  Tus audios ▶
                </button>
              </div>
            )}
          </aside>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">
                Estudio Audio a Video
              </h2>
              <p className="text-xs text-slate-500">
                Vista previa en vivo con sonido. Graba el video en tiempo real
                mientras suena el audio.
              </p>
            </div>
            {preview}
          </section>

          <aside className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            {rightOpen ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-3">
                  <h2 className="text-base font-bold text-slate-900">Configuración</h2>
                  <button
                    type="button"
                    onClick={() => setRightOpen(false)}
                    aria-label="Colapsar Configuración"
                    className="rounded-full px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                  >
                    ▶
                  </button>
                </div>
                {rightPanel}
              </>
            ) : (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  aria-label="Mostrar Configuración"
                  className="[writing-mode:vertical-rl] rounded-full bg-white px-2 py-3 text-xs font-bold text-slate-700 shadow ring-1 ring-slate-200"
                >
                  ◀ Configuración
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Móvil: secciones apiladas colapsables. */}
      {isMobile && (
        <main className="mx-auto flex max-w-2xl flex-col gap-3 px-3 pb-28 pt-4">
          <MobileSection
            title="Tus audios"
            badge={tracks.length > 0 ? String(tracks.length) : undefined}
            open={mobileSection === "audios"}
            onToggle={() =>
              setMobileSection((s) => (s === "audios" ? null : "audios"))
            }
          >
            {leftPanel}
          </MobileSection>
          <MobileSection
            title="Configuración"
            open={mobileSection === "config"}
            onToggle={() =>
              setMobileSection((s) => (s === "config" ? null : "config"))
            }
          >
            {rightPanel}
          </MobileSection>
          <MobileSection
            title="Preview"
            open={mobileSection === "preview"}
            onToggle={() =>
              setMobileSection((s) => (s === "preview" ? null : "preview"))
            }
          >
            {preview}
          </MobileSection>
          <p className="px-1 text-center text-xs text-slate-400">
            NousAudio v1 · La exportación es solo WAV sin pérdida; la
            conversión a MP3 llega en la v2.
          </p>
        </main>
      )}

      {/* Barra fija inferior en móvil con las acciones principales. */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() => setMobileSection("audios")}
            className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => void exportZip()}
            disabled={tracks.length === 0 || processing}
            className="flex-1 rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Exportar ZIP
          </button>
          <button
            type="button"
            onClick={() => setMobileSection("preview")}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800"
          >
            A video
          </button>
        </div>
      )}
    </div>
  );
}
