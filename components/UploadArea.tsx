"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/audio";

/** Zona de subida: arrastrar y soltar o elegir archivos, más grabadora de voz. */
export default function UploadArea({
  onFiles,
  onRecorded,
}: {
  onFiles: (files: File[]) => void;
  onRecorded: (blob: Blob) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        onRecorded(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setRecSeconds((s) => s + 1),
        1000,
      );
    } catch {
      setRecError("No se pudo acceder al micrófono. Revisa el permiso del navegador.");
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) onFiles(files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver
            ? "border-cyan-500 bg-cyan-50"
            : "border-slate-300 bg-slate-50 hover:border-cyan-400"
        }`}
      >
        <p className="text-sm font-bold text-slate-800">
          Arrastra tus audios aquí o toca para elegirlos
        </p>
        <p className="mt-1 text-xs text-slate-500">
          MP3, WAV, OGG, M4A y más. También puedes soltar un video MP4 y se
          extrae su audio.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3">
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            Detener grabación · {formatTime(recSeconds)}
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            Grabar voz con el micrófono
          </button>
        )}
        {recError && <p className="mt-2 text-xs text-red-600">{recError}</p>}
      </div>
    </div>
  );
}
