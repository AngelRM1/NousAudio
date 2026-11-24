"use client";

import { renamePreview } from "@/lib/rename";
import type { BatchSettings } from "@/lib/types";

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-semibold text-slate-800">
        {label}
        <span className="font-mono text-slate-500">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-600"
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-cyan-600"
      />
      {label}
    </label>
  );
}

/** Panel de configuración: procesado por lote, renombre y exportación. */
export default function SettingsPanelContent({
  batch,
  onBatchChange,
  renamePattern,
  renamePrefix,
  onRenameChange,
  onApplyBatch,
  onBatchRename,
  onExportOne,
  onExportZip,
  onSplit,
  hasTracks,
  selectedName,
  processing,
  progress,
}: {
  batch: BatchSettings;
  onBatchChange: (patch: Partial<BatchSettings>) => void;
  renamePattern: string;
  renamePrefix: string;
  onRenameChange: (pattern: string, prefix: string) => void;
  onApplyBatch: () => void;
  onBatchRename: () => void;
  onExportOne: () => void;
  onExportZip: () => void;
  onSplit: () => void;
  hasTracks: boolean;
  selectedName: string;
  processing: boolean;
  progress: string;
}) {
  const preview = selectedName
    ? renamePreview(renamePattern, renamePrefix, selectedName, "wav")
    : "";

  return (
    <div className="flex flex-col gap-5 p-4">
      <section>
        <h3 className="text-sm font-bold text-slate-900">Procesado por lote</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Se aplica al exportar. “Aplicar en lote” también actualiza el volumen
          y la velocidad de cada audio.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Slider
            label="Volumen"
            value={batch.volume}
            min={0}
            max={2}
            step={0.05}
            display={`${Math.round(batch.volume * 100)}%`}
            onChange={(v) => onBatchChange({ volume: v })}
          />
          <Slider
            label="Velocidad"
            value={batch.speed}
            min={0.5}
            max={2}
            step={0.05}
            display={`${batch.speed.toFixed(2)}x`}
            onChange={(v) => onBatchChange({ speed: v })}
          />
          <Slider
            label="Fundido de entrada"
            value={batch.fadeIn}
            min={0}
            max={5}
            step={0.1}
            display={`${batch.fadeIn.toFixed(1)} s`}
            onChange={(v) => onBatchChange({ fadeIn: v })}
          />
          <Slider
            label="Fundido de salida"
            value={batch.fadeOut}
            min={0}
            max={5}
            step={0.1}
            display={`${batch.fadeOut.toFixed(1)} s`}
            onChange={(v) => onBatchChange({ fadeOut: v })}
          />
          <div className="flex flex-col gap-2">
            <Check
              label="Normalizar volumen"
              checked={batch.normalize}
              onChange={(v) => onBatchChange({ normalize: v })}
            />
            <Check
              label="Quitar silencios"
              checked={batch.removeSilence}
              onChange={(v) => onBatchChange({ removeSilence: v })}
            />
            <Check
              label="Invertir audio"
              checked={batch.invert}
              onChange={(v) => onBatchChange({ invert: v })}
            />
          </div>
          <label className="block text-sm font-semibold text-slate-800">
            Dividir en partes de
            <select
              value={batch.splitMinutes}
              onChange={(e) =>
                onBatchChange({ splitMinutes: Number(e.target.value) })
              }
              className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
            >
              <option value={0}>No dividir</option>
              <option value={1}>1 minuto</option>
              <option value={2}>2 minutos</option>
              <option value={3}>3 minutos</option>
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
            </select>
          </label>
          <p className="text-xs text-slate-500">
            La velocidad en la vista previa conserva el tono (playbackRate con
            preservesPitch). En la exportación WAV el cambio de velocidad se
            hace por remuestreo y sí cambia el tono.
          </p>
          <button
            type="button"
            onClick={onApplyBatch}
            disabled={!hasTracks || processing}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Aplicar en lote
          </button>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-900">Renombrar por lote</h3>
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Patrón (usa {"{n}"} para el número)
            <input
              value={renamePattern}
              onChange={(e) => onRenameChange(e.target.value, renamePrefix)}
              placeholder="audio-{n}"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Prefijo
            <input
              value={renamePrefix}
              onChange={(e) => onRenameChange(renamePattern, e.target.value)}
              placeholder="podcast"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          {preview && (
            <p className="text-xs text-slate-500">
              Ejemplo: <span className="font-mono text-slate-700">{preview}</span>
            </p>
          )}
          <button
            type="button"
            onClick={onBatchRename}
            disabled={!hasTracks || processing}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Renombrar todos
          </button>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-900">Exportar</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          La v1 exporta solo en WAV sin pérdida. La conversión a MP3 llega en
          la v2.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onExportOne}
            disabled={!hasTracks || processing}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Exportar WAV del seleccionado
          </button>
          <button
            type="button"
            onClick={onExportZip}
            disabled={!hasTracks || processing}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Exportar todos en ZIP
          </button>
          <button
            type="button"
            onClick={onSplit}
            disabled={!hasTracks || processing || batch.splitMinutes === 0}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-40"
          >
            Dividir seleccionado en partes
          </button>
          {processing && (
            <p className="text-center text-xs font-semibold text-cyan-700">
              Procesando… {progress}
            </p>
          )}
        </div>
      </section>

      <p className="text-center text-[11px] text-slate-400">
        Todo se procesa en tu navegador. Ningún audio sale de tu dispositivo.
      </p>
    </div>
  );
}
