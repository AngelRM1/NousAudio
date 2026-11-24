"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/audio";
import {
  PRESET_BACKGROUNDS,
  VIDEO_SIZES,
  type AudioTrack,
  type VideoFormat,
  type VisualizerStyle,
} from "@/lib/types";

type CustomBg =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | null;

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Fondos animados predefinidos, dibujados en el canvas. */
function drawPreset(
  ctx: CanvasRenderingContext2D,
  preset: number,
  w: number,
  h: number,
  t: number,
) {
  if (preset === 0) {
    // Aurora
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const blobs: Array<[number, number, number, string]> = [
      [0.3 + 0.15 * Math.sin(t * 0.4), 0.4, 0.45, "rgba(34,211,238,0.55)"],
      [0.7 + 0.15 * Math.cos(t * 0.3), 0.6, 0.5, "rgba(168,85,247,0.5)"],
      [0.5, 0.3 + 0.2 * Math.sin(t * 0.5), 0.4, "rgba(244,114,182,0.45)"],
    ];
    for (const [fx, fy, fr, color] of blobs) {
      const rg = ctx.createRadialGradient(
        fx * w, fy * h, 0, fx * w, fy * h, fr * w,
      );
      rg.addColorStop(0, color);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (preset === 1) {
    // Neón
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(34,211,238,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (h / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const y = h * (0.3 + 0.25 * i) + Math.sin(t * 2 + i) * 8;
      ctx.fillStyle = ["#22d3ee", "#e879f9", "#facc15"][i];
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.shadowBlur = 24;
      ctx.fillRect(0, y, w, 6);
      ctx.shadowBlur = 0;
    }
  } else if (preset === 2) {
    // Atardecer
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#7c2d12");
    g.addColorStop(0.55, "#db2777");
    g.addColorStop(1, "#312e81");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fde68a";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 60;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.45, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  } else if (preset === 3) {
    // Océano
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#082f49");
    g.addColorStop(1, "#0e7490");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(165,243,252,0.6)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = h * (0.25 + i * 0.13) + Math.sin(x / 90 + t * 1.5 + i) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (preset === 4) {
    // Bosque
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#052e16");
    g.addColorStop(1, "#14532d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = ((i * 137.5) % w) + Math.sin(t * 0.6 + i) * 10;
      const y = ((i * 89.3) % h) + Math.cos(t * 0.4 + i) * 8;
      ctx.fillStyle = `rgba(187,247,208,${0.25 + (i % 5) * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Cosmos
    ctx.fillStyle = "#030014";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = (i * 173.3) % w;
      const y = (i * 97.7) % h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t + i));
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    const rg = ctx.createRadialGradient(
      w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.4,
    );
    rg.addColorStop(0, "rgba(129,140,248,0.35)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }
}

function pickMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
      return m;
  }
  return "";
}

/** Estudio Audio a Video: vista previa en vivo con sonido y grabación real. */
export default function VideoStudio({
  track,
  onNotice,
}: {
  track: AudioTrack | null;
  onNotice: (msg: string) => void;
}) {
  const [format, setFormat] = useState<VideoFormat>("16:9");
  const [preset, setPreset] = useState(0);
  const [customBg, setCustomBg] = useState<CustomBg>(null);
  const [visualizer, setVisualizer] = useState<VisualizerStyle>("bars");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [showProgress, setShowProgress] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState("");
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const stateRef = useRef({ preset, customBg, visualizer, title, subtitle, showProgress, playing, track });
  stateRef.current = { preset, customBg, visualizer, title, subtitle, showProgress, playing, track };

  const size = VIDEO_SIZES[format];

  // Fondo propio: preparar imagen o video cuando cambia.
  useEffect(() => {
    if (!customBg) return;
    if (customBg.kind === "image") {
      const img = new Image();
      img.src = customBg.url;
      bgImageRef.current = img;
    } else {
      const video = document.createElement("video");
      video.src = customBg.url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => undefined);
      bgVideoRef.current = video;
    }
    return () => {
      bgVideoRef.current?.pause();
      bgVideoRef.current = null;
      bgImageRef.current = null;
    };
  }, [customBg]);

  // Bucle de dibujo del canvas.
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const { w, h } = VIDEO_SIZES[format];
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const t = now / 1000;
        const s = stateRef.current;
        const bgImage = bgImageRef.current;
        const bgVideo = bgVideoRef.current;
        if (s.customBg?.kind === "image" && bgImage?.complete) {
          drawCover(ctx, bgImage, bgImage.naturalWidth, bgImage.naturalHeight, w, h);
        } else if (s.customBg?.kind === "video" && bgVideo && bgVideo.readyState >= 2) {
          drawCover(ctx, bgVideo, bgVideo.videoWidth, bgVideo.videoHeight, w, h);
        } else {
          drawPreset(ctx, s.preset, w, h, t);
        }

        // Visualizador
        const analyser = analyserRef.current;
        const tr = s.track;
        ctx.save();
        if (s.visualizer === "bars") {
          const n = 48;
          const barW = w / n;
          for (let i = 0; i < n; i++) {
            let v = 0.25;
            if (analyser && s.playing) {
              const data = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(data);
              v = data[Math.floor((i / n) * data.length)] / 255;
            } else if (tr) {
              v = tr.peaks[Math.floor((i / n) * tr.peaks.length)] * 0.8 + 0.1;
            }
            const bh = Math.max(6, v * h * 0.35);
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.fillRect(i * barW + 2, h * 0.78 - bh, barW - 4, bh);
          }
        } else if (s.visualizer === "wave") {
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          const cy = h * 0.62;
          for (let x = 0; x <= w; x += 8) {
            let v = 0;
            if (analyser && s.playing) {
              const data = new Uint8Array(analyser.fftSize);
              analyser.getByteTimeDomainData(data);
              v = (data[Math.floor((x / w) * data.length)] - 128) / 128;
            } else if (tr) {
              v = Math.sin(x / 40 + t * 2) * tr.peaks[Math.floor((x / w) * tr.peaks.length)];
            }
            const y = cy + v * h * 0.18;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else {
          // Círculo
          const cx = w / 2;
          const cy = h * 0.55;
          const r = Math.min(w, h) * 0.16;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          const n = 64;
          for (let i = 0; i < n; i++) {
            let v = 0.2;
            if (analyser && s.playing) {
              const data = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(data);
              v = data[Math.floor((i / n) * data.length)] / 255;
            } else if (tr) {
              v = tr.peaks[Math.floor((i / n) * tr.peaks.length)] * 0.8 + 0.1;
            }
            const ang = (i / n) * Math.PI * 2;
            const len = 8 + v * r * 0.9;
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
            ctx.lineTo(cx + Math.cos(ang) * (r + len), cy + Math.sin(ang) * (r + len));
            ctx.stroke();
          }
        }
        ctx.restore();

        // Título y subtítulo
        ctx.save();
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 12;
        if (s.title) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(h * 0.055)}px sans-serif`;
          ctx.fillText(s.title, w / 2, h * 0.16, w * 0.9);
        }
        if (s.subtitle) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `${Math.round(h * 0.032)}px sans-serif`;
          ctx.fillText(s.subtitle, w / 2, h * 0.16 + h * 0.055, w * 0.9);
        }
        ctx.restore();

        // Barra de progreso
        if (s.showProgress && tr) {
          const audio = audioRef.current;
          const cur = audio ? audio.currentTime : tr.start;
          const frac = Math.max(0, Math.min(1, (cur - tr.start) / (tr.end - tr.start)));
          setProgress(frac);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(0, h - 10, w, 10);
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(0, h - 10, w * frac, 10);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [format]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    };
  }, []);

  function ensureAudio(): HTMLAudioElement | null {
    const tr = track;
    if (!tr) return null;
    if (!audioRef.current || audioRef.current.dataset.trackId !== tr.id) {
      audioRef.current?.pause();
      const audio = new Audio(tr.url);
      audio.dataset.trackId = tr.id;
      audio.preservesPitch = true;
      audio.addEventListener("ended", () => setPlaying(false));
      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= tr.end) {
          audio.pause();
          audio.currentTime = tr.start;
          setPlaying(false);
          if (recorderRef.current?.state === "recording") stopRecording();
        }
      });
      // Analizador para el visualizador en vivo.
      try {
        const AC = window.AudioContext;
        const actx = audioCtxRef.current ?? new AC();
        audioCtxRef.current = actx;
        if (actx.state === "suspended") void actx.resume();
        const src = actx.createMediaElementSource(audio);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        const dest = actx.createMediaStreamDestination();
        src.connect(analyser);
        analyser.connect(actx.destination);
        analyser.connect(dest);
        analyserRef.current = analyser;
        mediaDestRef.current = dest;
      } catch {
        analyserRef.current = null;
      }
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function togglePlay() {
    if (!track) {
      onNotice("Elige un audio en «Tus audios» para verlo en el estudio.");
      return;
    }
    const audio = ensureAudio();
    if (!audio) return;
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

  function startRecording() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!track) {
      onNotice("Elige un audio antes de grabar el video.");
      return;
    }
    const mime = pickMime();
    if (!mime) {
      onNotice("Este navegador no permite grabar video con MediaRecorder.");
      return;
    }
    const audio = ensureAudio();
    if (!audio) return;
    if (!playing) togglePlay();
    const canvasStream = canvas.captureStream(30);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    const audioTracks = mediaDestRef.current?.stream.getAudioTracks() ?? [];
    tracks.push(...audioTracks);
    const stream = new MediaStream(tracks);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setRecordedUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setRecordedMime(mime);
      onNotice("Video grabado. Ya puedes descargarlo.");
    };
    rec.start(250);
    recorderRef.current = rec;
    setRecTime(0);
    setRecording(true);
    recTimerRef.current = window.setInterval(() => setRecTime((s) => s + 1), 1000);
  }

  function stopRecording() {
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    recTimerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function onCustomBgFile(file: File, kind: "image" | "video") {
    const url = URL.createObjectURL(file);
    setCustomBg((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { kind, url };
    });
  }

  const videoExt = recordedMime.includes("mp4") ? "mp4" : "webm";

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="overflow-hidden rounded-2xl bg-slate-900">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          className="mx-auto block h-auto w-full"
          style={{ aspectRatio: `${size.w} / ${size.h}` }}
          aria-label="Vista previa del video"
        />
      </div>
      {!track && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          Sin audio seleccionado. Sube un audio y tócalo en «Tus audios» para
          verlo aquí.
        </p>
      )}
      {track && (
        <p className="text-center text-xs text-slate-500">
          {track.name} · {formatTime(track.duration)} · progreso{" "}
          {Math.round(progress * 100)}%
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          {playing ? "❚❚ Pausar" : "▶ Reproducir"}
        </button>
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Detener grabación · {formatTime(recTime)}
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={!track}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Grabar video
          </button>
        )}
        {recordedUrl && (
          <a
            href={recordedUrl}
            download={`nousaudio-video.${videoExt}`}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Descargar video ({videoExt.toUpperCase()})
          </a>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-bold text-slate-700">Formato</legend>
          <div className="mt-1 flex gap-1">
            {(Object.keys(VIDEO_SIZES) as VideoFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  format === f
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-bold text-slate-700">Visualizador</legend>
          <div className="mt-1 flex gap-1">
            {(
              [
                ["bars", "Barras"],
                ["wave", "Onda"],
                ["circle", "Círculo"],
              ] as Array<[VisualizerStyle, string]>
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisualizer(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  visualizer === v
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="text-xs font-bold text-slate-700">Fondo</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESET_BACKGROUNDS.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setPreset(i);
                setCustomBg((old) => {
                  if (old) URL.revokeObjectURL(old.url);
                  return null;
                });
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                customBg === null && preset === i
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
            Imagen propia
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCustomBgFile(f, "image");
                e.target.value = "";
              }}
            />
          </label>
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
            Video propio (en bucle)
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCustomBgFile(f, "video");
                e.target.value = "";
              }}
            />
          </label>
          {customBg && (
            <span className="self-center text-xs text-cyan-700">
              Fondo propio activo ({customBg.kind === "image" ? "imagen" : "video"})
            </span>
          )}
        </div>
      </fieldset>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mi podcast"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Subtítulo
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Episodio 1"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={showProgress}
          onChange={(e) => setShowProgress(e.target.checked)}
          className="h-4 w-4 accent-cyan-600"
        />
        Mostrar barra de progreso
      </label>
      <p className="text-xs text-slate-500">
        El video se graba en tiempo real mientras suena el audio. La descarga
        es WebM o MP4 según lo que soporte tu navegador.
      </p>
    </div>
  );
}
