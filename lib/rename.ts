/** Renombre por lote con patrón {n} y prefijo, igual que en NousPixel. */

/** Construye el nombre de salida: patrón con {n} sustituido por el índice. */
export function buildRenamedName(
  pattern: string,
  prefix: string,
  index: number,
  baseName: string,
  ext: string,
): string {
  const trimmed = pattern.trim();
  let stem: string;
  if (!trimmed) {
    stem = baseName;
  } else if (trimmed.includes("{n}")) {
    stem = trimmed.replaceAll("{n}", String(index));
  } else {
    stem = `${trimmed}-${index}`;
  }
  const clean = (prefix.trim() ? `${prefix.trim()}-` : "") + stem;
  return ext ? `${clean}.${ext}` : clean;
}

/** Vista previa del primer nombre renombrado, para mostrar en el panel. */
export function renamePreview(
  pattern: string,
  prefix: string,
  baseName: string,
  ext: string,
): string {
  return buildRenamedName(pattern, prefix, 1, baseName, ext);
}
