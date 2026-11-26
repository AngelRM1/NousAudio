"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/audio";
import {
  PRESET_BACKGROUNDS,
  VIDEO_SIZES,
  type AudioTrack,
  type BackgroundMode,
  type VideoFormat,
  type VisualizerStyle,
} from "@/lib/types";

interface CustomBgItem {
  id: string;
  kind: "image" | "video";
  url: string;
  name: string;
}

let bgCounter = 0;
function nextBgId(): string {
  bgCounter += 1;
  return `fondo-${Date.now()}-${bgCounter}`;
}

function drawCoverRect(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (iw <= 0 || ih <= 0 || w <= 0 || h <= 0) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
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
  /** Fondos propios: varias imágenes y videos, que se van añadiendo. */
  const [customBgs, setCustomBgs] = useState<CustomBgItem[]>([]);
  /** null = fondo predefinido animado; si no, el fondo propio activo. */
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BackgroundMode>("single");
  const [slideSeconds, setSlideSeconds] = useState(5);
  const [slideIndex, setSlideIndex] = useState(0);
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
  /** Elementos preparados (imagen o video) por cada fondo propio. */
  const bgElementsRef = useRef(
    new Map<string, { image?: HTMLImageElement; video?: HTMLVideoElement }>(),
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const stateRef = useRef({
    preset,
    customBgs,
    activeCustomId,
    bgMode,
    slideIndex,
    visualizer,
    title,
    subtitle,
    showProgress,
    playing,
    track,
  });
  stateRef.current = {
    preset,
    customBgs,
    activeCustomId,
    bgMode,
    slideIndex,
    visualizer,
    title,
    subtitle,
    showProgress,
    playing,
    track,
  };

  const size = VIDEO_SIZES[format];

  // Fondos propios: preparar imagen o video para cada uno, y limpiar los
  // que se quiten de la lista. Los videos quedan en bucle y sin sonido.
  useEffect(() => {
    const map = bgElementsRef.current;
    for (const bg of customBgs) {
      if (map.has(bg.id)) continue;
      if (bg.kind === "image") {
        const img = new Image();
        img.src = bg.url;
        map.set(bg.id, { image: img });
      } else {
        const video = document.createElement("video");
        video.src = bg.url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        void video.play().catch(() => undefined);
        map.set(bg.id, { video });
      }
    }
    for (const id of [...map.keys()]) {
      if (!customBgs.some((b) => b.id === id)) {
        map.get(id)?.video?.pause();
        map.delete(id);
      }
    }
  }, [customBgs]);

  // Presentación de diapositivas: avanza sola cada X segundos.
  useEffect(() => {
    if (bgMode !== "slideshow" || customBgs.length < 2) return;
    const timer = window.setInterval(
      () => setSlideIndex((i) => (i + 1) % customBgs.length),
      slideSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [bgMode, slideSeconds, customBgs.length]);

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
        // Fondo: propio (una, collage o presentación) o predefinido animado.
        const drawOneBg = (
          bg: CustomBgItem,
          x: number,
          y: number,
          bw: number,
          bh: number,
        ) => {
          const el = bgElementsRef.current.get(bg.id);
          if (bg.kind === "image" && el?.image?.complete) {
            drawCoverRect(ctx, el.image, el.image.naturalWidth, el.image.naturalHeight, x, y, bw, bh);
          } else if (bg.kind === "video" && el?.video && el.video.readyState >= 2) {
            drawCoverRect(ctx, el.video, el.video.videoWidth, el.video.videoHeight, x, y, bw, bh);
          }
        };
        const activeBg = s.customBgs.find((b) => b.id === s.activeCustomId) ?? null;
        if (activeBg) {
          if (s.bgMode === "collage" && s.customBgs.length > 1) {
            drawPreset(ctx, s.preset, w, h, t);
            const cols = 2;
            const rows = Math.ceil(s.customBgs.length / cols);
            const cw = w / cols;
            const ch = h / rows;
            s.customBgs.forEach((bg, i) => {
              drawOneBg(bg, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
            });
          } else if (s.bgMode === "slideshow" && s.customBgs.length > 1) {
            drawPreset(ctx, s.preset, w, h, t);
            const bg = s.customBgs[s.slideIndex % s.customBgs.length];
            drawOneBg(bg, 0, 0, w, h);
          } else {
            drawPreset(ctx, s.preset, w, h, t);
            drawOneBg(activeBg, 0, 0, w, h);
          }
        } else {
          drawPreset(ctx, s.preset, w, h, t);
        }

        // Visualizador: datos en vivo del AnalyserNode cuando suena y
        // picos del audio como fallback cuando está en pausa.
        const analyser = analyserRef.current;
        const tr = s.track;
        const live = analyser && s.playing;
        const freqData = live ? new Uint8Array(analyser.frequencyBinCount) : null;
        if (freqData && analyser) analyser.getByteFrequencyData(freqData);
        const timeData = live ? new Uint8Array(analyser.fftSize) : null;
        if (timeData && analyser) analyser.getByteTimeDomainData(timeData);
        const valueAt = (frac: number): number => {
          if (freqData) {
            return freqData[Math.floor(frac * freqData.length)] / 255;
          }
          if (tr) {
            return tr.peaks[Math.floor(frac * tr.peaks.length)] * 0.8 + 0.1;
          }
          return 0.2;
        };
        ctx.save();
        if (s.visualizer === "bars") {
          const n = 48;
          const barW = w / n;
          for (let i = 0; i < n; i++) {
            const v = Math.max(0.05, valueAt(i / n));
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
            if (timeData) {
              v = (timeData[Math.floor((x / w) * timeData.length)] - 128) / 128;
            } else if (tr) {
              v = Math.sin(x / 40 + t * 2) * tr.peaks[Math.floor((x / w) * tr.peaks.length)];
            }
            const y = cy + v * h * 0.18;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else if (s.visualizer === "spectrum") {
          // Curva de espectro rellena.
          const baseline = h * 0.78;
          const grad = ctx.createLinearGradient(0, h * 0.3, 0, baseline);
          grad.addColorStop(0, "rgba(34,211,238,0.85)");
          grad.addColorStop(1, "rgba(255,255,255,0.25)");
          ctx.beginPath();
          ctx.moveTo(0, baseline);
          for (let x = 0; x <= w; x += 8) {
            const v = Math.max(0.05, valueAt(x / w));
            ctx.lineTo(x, baseline - v * h * 0.4);
          }
          ctx.lineTo(w, baseline);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const v = Math.max(0.05, valueAt(x / w));
            const y = baseline - v * h * 0.4;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else if (s.visualizer === "particles") {
          // Puntos que reaccionan al sonido, en órbita lenta.
          const cx = w / 2;
          const cy = h * 0.55;
          const n = 90;
          for (let i = 0; i < n; i++) {
            const v = Math.max(0.05, valueAt(i / n));
            const seed = i * 2.39996; // ángulo dorado: reparte sin azar
            const orbit = 0.25 + ((i * 37) % 100) / 100 * 0.55;
            const r = Math.min(w, h) * 0.32 * orbit;
            const ang = seed + t * (0.2 + (i % 5) * 0.08);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r * 0.7 - v * h * 0.12;
            const rad = 2 + v * 8;
            ctx.fillStyle =
              i % 3 === 0
                ? `rgba(34,211,238,${0.35 + v * 0.6})`
                : `rgba(255,255,255,${0.3 + v * 0.65})`;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (s.visualizer === "mirror") {
          // Barras simétricas arriba y abajo de una línea central.
          const cy = h * 0.62;
          const n = 48;
          const barW = w / n;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillRect(0, cy - 1, w, 2);
          for (let i = 0; i < n; i++) {
            const v = Math.max(0.05, valueAt(i / n));
            const bh = Math.max(4, v * h * 0.16);
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.fillRect(i * barW + 2, cy - bh, barW - 4, bh);
            ctx.fillRect(i * barW + 2, cy, barW - 4, bh);
          }
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
            const v = Math.max(0.05, valueAt(i / n));
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

  /** Añade varias imágenes o videos sin borrar los anteriores. */
  function onCustomBgFiles(files: File[], kind: "image" | "video") {
    const items: CustomBgItem[] = files.map((file) => ({
      id: nextBgId(),
      kind,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    if (items.length === 0) return;
    setCustomBgs((prev) => [...prev, ...items]);
    // El último añadido pasa a ser el fondo activo.
    setActiveCustomId(items[items.length - 1].id);
    setSlideIndex(0);
  }

  function removeCustomBg(id: string) {
    setCustomBgs((prev) => {
      const item = prev.find((b) => b.id === id);
      if (item) URL.revokeObjectURL(item.url);
      const next = prev.filter((b) => b.id !== id);
      if (activeCustomId === id) {
        setActiveCustomId(next[0]?.id ?? null);
      }
      setSlideIndex(0);
      return next;
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
          <div className="mt-1 flex flex-wrap gap-1">
            {(
              [
                ["bars", "Barras"],
                ["wave", "Onda"],
                ["circle", "Círculo"],
                ["spectrum", "Espectro"],
                ["particles", "Partículas"],
                ["mirror", "Espejo"],
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
                setActiveCustomId(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                activeCustomId === null && preset === i
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
            Imágenes propias
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length > 0) onCustomBgFiles(files, "image");
                e.target.value = "";
              }}
            />
          </label>
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
            Videos propios (en bucle)
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length > 0) onCustomBgFiles(files, "video");
                e.target.value = "";
              }}
            />
          </label>
          {customBgs.length > 0 && (
            <span className="self-center text-xs text-cyan-700">
              {customBgs.length} fondo{customBgs.length === 1 ? "" : "s"} propio
              {customBgs.length === 1 ? "" : "s"}
              {activeCustomId === null ? " guardados (fondo animado activo)" : ""}
            </span>
          )}
        </div>
        {customBgs.length > 0 && (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              {customBgs.map((bg) => (
                <div
                  key={bg.id}
                  className={`relative h-14 w-20 overflow-hidden rounded-lg ring-2 ${
                    activeCustomId === bg.id && bgMode === "single"
                      ? "ring-cyan-600"
                      : "ring-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCustomId(bg.id);
                      setBgMode("single");
                    }}
                    aria-label={`Usar ${bg.name} como fondo`}
                    className="block h-full w-full"
                  >
                    {bg.kind === "image" ? (
                      <img src={bg.url} alt={bg.name} className="h-full w-full object-cover" />
                    ) : (
                      <video src={bg.url} muted loop playsInline className="h-full w-full object-cover" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustomBg(bg.id)}
                    aria-label={`Quitar ${bg.name}`}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                  {bg.kind === "video" && (
                    <span className="absolute bottom-0.5 left-1 rounded bg-slate-900/70 px-1 text-[10px] font-bold text-white">
                      VIDEO
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-bold text-slate-600">Modo:</span>
              {(
                [
                  ["single", "Una"],
                  ["collage", "Collage"],
                  ["slideshow", "Presentación"],
                ] as Array<[BackgroundMode, string]>
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setBgMode(m);
                    setSlideIndex(0);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                    bgMode === m
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
              {bgMode === "slideshow" && (
                <span className="ml-2 flex items-center gap-1 text-xs text-slate-600">
                  Cambia cada
                  {[3, 5, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlideSeconds(s)}
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${
                        slideSeconds === s
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {s} s
                    </button>
                  ))}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              En “Una” toca una miniatura para mostrarla; en “Collage” se
              reparten en una rejilla de 2 columnas; en “Presentación” cambian
              solas cada {slideSeconds} s. Sin fondo propio, se usa el fondo
              animado elegido arriba.
            </p>
          </>
        )}
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
