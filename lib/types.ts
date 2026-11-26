/** Un audio cargado en el editor. El buffer decodificado vive solo en memoria. */
export interface AudioTrack {
  id: string;
  /** Nombre completo con extensión, tal como se exportará. */
  name: string;
  /** Nombre sin extensión. */
  baseName: string;
  ext: string;
  file: File | Blob;
  /** URL de objeto para reproducir el original. */
  url: string;
  duration: number;
  /** Picos normalizados (0..1) para dibujar la onda. */
  peaks: number[];
  buffer: AudioBuffer | null;
  /** Recorte: inicio y fin en segundos. */
  start: number;
  end: number;
  volume: number;
  /** Velocidad de reproducción (1 = normal). */
  speed: number;
}

/** Ajustes que se aplican por lote al exportar (y al aplicar en lote). */
export interface BatchSettings {
  volume: number;
  speed: number;
  /** Segundos de fundido de entrada / salida. */
  fadeIn: number;
  fadeOut: number;
  normalize: boolean;
  removeSilence: boolean;
  invert: boolean;
  /** Dividir en partes de N minutos (0 = no dividir). */
  splitMinutes: number;
}

export const DEFAULT_BATCH: BatchSettings = {
  volume: 1,
  speed: 1,
  fadeIn: 0,
  fadeOut: 0,
  normalize: false,
  removeSilence: false,
  invert: false,
  splitMinutes: 0,
};

export const MAX_FILES = 30;
export const MAX_FILE_MB = 200;
export const MAX_TOTAL_MB = 500;

/** Formatos de video del estudio Audio a Video. */
export type VideoFormat = "16:9" | "1:1" | "9:16";

export type VisualizerStyle =
  | "bars"
  | "wave"
  | "circle"
  | "spectrum"
  | "particles"
  | "mirror";

/** Cómo se muestran varios fondos propios en el estudio. */
export type BackgroundMode = "single" | "collage" | "slideshow";

export const VIDEO_SIZES: Record<VideoFormat, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 720, h: 720 },
  "9:16": { w: 720, h: 1280 },
};

/** Fondos animados predefinidos del estudio. */
export const PRESET_BACKGROUNDS = [
  "Aurora",
  "Neón",
  "Atardecer",
  "Océano",
  "Bosque",
  "Cosmos",
] as const;
