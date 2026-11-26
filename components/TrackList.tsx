"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime, parseTime } from "@/lib/audio";
import type { AudioTrack } from "@/lib/types";

/** Onda de un audio con la zona de recorte resaltada. Tocar busca en ese
    punto. Dos tiradores (inicio y fin) se arrastran con el dedo o el ratón
    (pointer events) para ajustar el recorte, mostrando el tiempo en la barra
    mientras se arrastra. */
function Waveform({
  track,
  onSeek,
  onTrim,
}: {
  track: AudioTrack;
  onSeek: (seconds: number) => void;
  onTrim: (start: number, end: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const [dragging, setDragging] = useState<{
    which: "start" | "end";
    time: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, w, h);
    const startX = (track.start / track.duration) * w;
    const endX = (track.end / track.duration) * w;
    ctx.fillStyle = "#a5f3fc";
    ctx.fillRect(startX, 0, Math.max(1, endX - startX), h);
    ctx.fillStyle = "#0891b2";
    const mid = h / 2;
    const peaks = track.peaks;
    const barW = w / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const bh = Math.max(2, peaks[i] * (h - 6));
      ctx.fillRect(i * barW + 0.5, mid - bh / 2, Math.max(1, barW - 1), bh);
    }
  }, [track]);

  function timeFromClientX(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const frac = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(track.duration, frac * track.duration));
  }

  function applyDrag(clientX: number) {
    const which = dragRef.current;
    if (!which) return;
    const t = timeFromClientX(clientX);
    const GAP = 0.5;
    if (which === "start") {
      const s = Math.min(t, track.end - GAP);
      onTrim(Math.max(0, s), track.end);
      setDragging({ which, time: Math.max(0, s) });
    } else {
      const e = Math.max(t, track.start + GAP);
      onTrim(track.start, Math.min(track.duration, e));
      setDragging({ which, time: Math.min(track.duration, e) });
    }
  }

  function handleKey(which: "start" | "end") {
    return (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        if (which === "start")
          onTrim(Math.max(0, track.start - step), track.end);
        else onTrim(track.start, Math.max(track.start + 0.5, track.end - step));
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        if (which === "start")
          onTrim(Math.min(track.end - 0.5, track.start + step), track.end);
        else onTrim(track.start, Math.min(track.duration, track.end + step));
      }
    };
  }

  const startPct = (track.start / track.duration) * 100;
  const endPct = (track.end / track.duration) * 100;

  return (
    <div
      ref={containerRef}
      className="relative h-14 w-full"
      onClick={(e) => {
        // El clic en la onda busca en ese punto; los tiradores detienen
        // la propagación, así que un clic suyo nunca llega aquí.
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const frac = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(track.duration, frac * track.duration)));
      }}
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        className="h-14 w-full cursor-pointer rounded-lg"
        aria-label={`Onda de ${track.name}`}
      />
      {(["start", "end"] as const).map((which) => {
        const pct = which === "start" ? startPct : endPct;
        const time = which === "start" ? track.start : track.end;
        const isDragging = dragging?.which === which;
        return (
          <div
            key={which}
            role="slider"
            tabIndex={0}
            aria-label={
              which === "start" ? "Inicio del recorte" : "Fin del recorte"
            }
            aria-valuemin={0}
            aria-valuemax={track.duration}
            aria-valuenow={Math.round(time)}
            aria-valuetext={formatTime(time)}
            className="absolute top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-ew-resize touch-none items-stretch justify-center outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
            style={{ left: `${pct}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              dragRef.current = which;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setDragging({ which, time });
            }}
            onPointerMove={(e) => {
              if (dragRef.current === which) applyDrag(e.clientX);
            }}
            onPointerUp={(e) => {
              if (dragRef.current === which) {
                applyDrag(e.clientX);
                dragRef.current = null;
                setDragging(null);
              }
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setDragging(null);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKey(which)}
          >
            <span
              className={`block h-full w-1.5 rounded-full ${
                isDragging ? "bg-cyan-700" : "bg-cyan-600"
              } shadow`}
            />
            {isDragging && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow">
                {which === "start" ? "Inicio " : "Fin "}
                {formatTime(dragging.time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Una fila de audio: onda, reproducir, recorte, renombre y eliminar. */
function TrackRow({
  track,
  selected,
  onSelect,
  onDelete,
  onRename,
  onTrim,
}: {
  track: AudioTrack;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onTrim: (start: number, end: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startText, setStartText] = useState(formatTime(track.start));
  const [endText, setEndText] = useState(formatTime(track.end));
  const [nameText, setNameText] = useState(track.name);

  useEffect(() => {
    setStartText(formatTime(track.start));
    setEndText(formatTime(track.end));
  }, [track.start, track.end]);

  useEffect(() => {
    setNameText(track.name);
  }, [track.name]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function getAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const audio = new Audio(track.url);
      audio.preservesPitch = true;
      audio.addEventListener("ended", () => setPlaying(false));
      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= track.end) {
          audio.pause();
          audio.currentTime = track.start;
          setPlaying(false);
        }
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function togglePlay() {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.playbackRate = track.speed;
      audio.volume = track.volume;
      if (audio.currentTime < track.start || audio.currentTime >= track.end)
        audio.currentTime = track.start;
      void audio.play();
      setPlaying(true);
    }
  }

  function seek(seconds: number) {
    const audio = getAudio();
    audio.currentTime = Math.max(track.start, Math.min(track.end, seconds));
    if (!playing) {
      void audio.play();
      setPlaying(true);
    }
  }

  function commitTrim() {
    const s = parseTime(startText);
    const e = parseTime(endText);
    if (s === null || e === null || e <= s || s >= track.duration) {
      setStartText(formatTime(track.start));
      setEndText(formatTime(track.end));
      return;
    }
    onTrim(s, Math.min(e, track.duration));
  }

  return (
    <article
      className={`rounded-xl border p-3 ${
        selected
          ? "border-cyan-500 bg-cyan-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausar" : "Reproducir"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-base text-white"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
            onBlur={() => {
              const v = nameText.trim();
              if (v && v !== track.name) onRename(v);
              else setNameText(track.name);
            }}
            onClick={onSelect}
            aria-label="Nombre del audio"
            className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-slate-900 hover:border-slate-200 focus:border-cyan-500 focus:outline-none"
          />
          <p className="px-1 text-xs text-slate-500">
            {formatTime(track.duration)} · {formatTime(track.end - track.start)}{" "}
            seleccionados
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${track.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          ×
        </button>
      </div>

      <div
        className="mt-2 block w-full cursor-pointer"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect();
        }}
      >
        <Waveform track={track} onSeek={seek} onTrim={onTrim} />
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1 text-slate-600">
          Inicio
          <input
            value={startText}
            onChange={(e) => setStartText(e.target.value)}
            onBlur={commitTrim}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Inicio del recorte"
            className="w-14 rounded-md border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-900"
          />
        </label>
        <label className="flex items-center gap-1 text-slate-600">
          Fin
          <input
            value={endText}
            onChange={(e) => setEndText(e.target.value)}
            onBlur={commitTrim}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Fin del recorte"
            className="w-14 rounded-md border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-900"
          />
        </label>
        <span className="ml-auto text-slate-400">
          {track.speed !== 1 ? `${track.speed}x` : ""}
        </span>
      </div>
    </article>
  );
}

export default function TrackList({
  tracks,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onTrim,
}: {
  tracks: AudioTrack[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTrim: (id: string, start: number, end: number) => void;
}) {
  if (tracks.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Todavía no hay audios. Sube uno o graba tu voz para empezar.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {tracks.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          selected={track.id === selectedId}
          onSelect={() => onSelect(track.id)}
          onDelete={() => onDelete(track.id)}
          onRename={(name) => onRename(track.id, name)}
          onTrim={(s, e) => onTrim(track.id, s, e)}
        />
      ))}
    </div>
  );
}
