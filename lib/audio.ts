/** Procesado de audio 100% en el navegador (Web Audio API, sin servidor). */

let sharedCtx: AudioContext | null = null;

/** AudioContext compartido, creado solo tras un gesto del usuario. */
export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new AC();
  }
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

/** "2:30" -> 150. Acepta "m:ss", "ss" y "mm:ss". Devuelve null si no es válido. */
export function parseTime(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const parts = v.split(":");
  if (parts.length === 1) {
    const s = Number(parts[0]);
    return Number.isFinite(s) && s >= 0 ? s : null;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60)
      return null;
    return m * 60 + s;
  }
  return null;
}

/** 150 -> "2:30". */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDuration(sec: number): string {
  return formatTime(sec);
}

/** Decodifica un archivo de audio o de video (MP4: se extrae su pista de audio). */
export async function decodeFile(file: File | Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const ab = await file.arrayBuffer();
  return ctx.decodeAudioData(ab);
}

/** Picos normalizados para dibujar la onda. */
export function computePeaks(buffer: AudioBuffer, count = 240): number[] {
  const ch = buffer.getChannelData(0);
  const peaks: number[] = [];
  const block = Math.max(1, Math.floor(ch.length / count));
  for (let i = 0; i < count; i++) {
    const start = i * block;
    let max = 0;
    for (let j = start; j < Math.min(start + block, ch.length); j += 4) {
      const v = Math.abs(ch[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const peak = Math.max(...peaks, 0.01);
  return peaks.map((p) => p / peak);
}

export interface RenderOptions {
  start: number;
  end: number;
  volume: number;
  /** 1 = normal. En la exportación el cambio de velocidad se hace por
      remuestreo y cambia el tono; en la vista previa se usa playbackRate
      con preservesPitch, que sí conserva el tono. */
  speed: number;
  fadeIn: number;
  fadeOut: number;
  normalize: boolean;
  removeSilence: boolean;
  invert: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Quita los silencios: conserva los tramos por encima del umbral con un
    pequeño margen antes y después. */
function removeSilenceFrom(
  channels: Float32Array[],
  sampleRate: number,
): Float32Array[] {
  const threshold = 0.015;
  const pad = Math.floor(sampleRate * 0.08);
  const first = channels[0];
  const keep: Array<[number, number]> = [];
  let i = 0;
  while (i < first.length) {
    if (Math.abs(first[i]) > threshold) {
      let j = i;
      while (j < first.length && Math.abs(first[j]) > threshold) j++;
      keep.push([Math.max(0, i - pad), Math.min(first.length, j + pad)]);
      i = j;
    } else {
      i++;
    }
  }
  if (keep.length === 0) return channels;
  return channels.map((ch) => {
    const total = keep.reduce((n, [a, b]) => n + (b - a), 0);
    const out = new Float32Array(total);
    let pos = 0;
    for (const [a, b] of keep) {
      out.set(ch.subarray(a, b), pos);
      pos += b - a;
    }
    return out;
  });
}

/** Remuestreo lineal para cambiar la velocidad (cambia el tono). */
function resample(data: Float32Array, speed: number): Float32Array {
  const outLen = Math.max(1, Math.floor(data.length / speed));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * speed;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = data[Math.min(idx, data.length - 1)];
    const b = data[Math.min(idx + 1, data.length - 1)];
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Aplica recorte, silencios, velocidad, normalización, inversión,
    volumen y fundidos, y devuelve un AudioBuffer nuevo. */
export function renderTrack(
  buffer: AudioBuffer,
  opts: RenderOptions,
): AudioBuffer {
  const ctx = getAudioContext();
  const sr = buffer.sampleRate;
  const startS = clamp(opts.start, 0, buffer.duration);
  const endS = clamp(opts.end, startS, buffer.duration);

  let channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const s0 = Math.floor(startS * sr);
    const s1 = Math.min(Math.floor(endS * sr), src.length);
    channels.push(src.slice(s0, Math.max(s1, s0 + 1)));
  }

  if (opts.removeSilence) channels = removeSilenceFrom(channels, sr);
  if (opts.speed !== 1) channels = channels.map((d) => resample(d, opts.speed));

  if (opts.normalize) {
    let peak = 0;
    for (const ch of channels)
      for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
    if (peak > 0) {
      const gain = 0.95 / peak;
      channels = channels.map((ch) => {
        const out = new Float32Array(ch.length);
        for (let i = 0; i < ch.length; i++) out[i] = ch[i] * gain;
        return out;
      });
    }
  }

  if (opts.invert) {
    channels = channels.map((ch) => {
      const out = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) out[i] = -ch[i];
      return out;
    });
  }

  const len = channels[0].length;
  const out = ctx.createBuffer(channels.length, len, sr);
  const fadeInSamples = Math.floor(clamp(opts.fadeIn, 0, len / sr) * sr);
  const fadeOutSamples = Math.floor(clamp(opts.fadeOut, 0, len / sr) * sr);
  for (let c = 0; c < channels.length; c++) {
    const dst = out.getChannelData(c);
    const src = channels[c];
    for (let i = 0; i < len; i++) {
      let g = opts.volume;
      if (fadeInSamples > 0 && i < fadeInSamples) g *= i / fadeInSamples;
      if (fadeOutSamples > 0 && i >= len - fadeOutSamples)
        g *= (len - i) / fadeOutSamples;
      dst[i] = src[i] * g;
    }
  }
  return out;
}

/** Divide un buffer en partes de N minutos. */
export function splitBuffer(buffer: AudioBuffer, minutes: number): AudioBuffer[] {
  const ctx = getAudioContext();
  const sr = buffer.sampleRate;
  const chunkLen = Math.floor(minutes * 60 * sr);
  if (chunkLen <= 0) return [buffer];
  const parts: AudioBuffer[] = [];
  for (let start = 0; start < buffer.length; start += chunkLen) {
    const len = Math.min(chunkLen, buffer.length - start);
    const part = ctx.createBuffer(buffer.numberOfChannels, len, sr);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      part
        .getChannelData(c)
        .set(buffer.getChannelData(c).subarray(start, start + len));
    }
    parts.push(part);
  }
  return parts;
}

/** Codifica un AudioBuffer como WAV PCM de 16 bits sin pérdida. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length * numCh * 2;
  const view = new DataView(new ArrayBuffer(44 + len));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
