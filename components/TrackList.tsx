"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime, parseTime } from "@/lib/audio";
import type { AudioTrack } from "@/lib/types";

/** Onda de un audio con la zona de recorte resaltada. Tocar busca en ese punto. */
function Waveform({
  track,
  onSeek,
}: {
  track: AudioTrack;
  onSeek: (seconds: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={56}
      className="h-14 w-full cursor-pointer rounded-lg"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(track.duration, frac * track.duration)));
      }}
      aria-label={`Onda de ${track.name}`}
    />
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

      <button type="button" onClick={onSelect} className="mt-2 block w-full">
        <Waveform track={track} onSeek={seek} />
      </button>

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
