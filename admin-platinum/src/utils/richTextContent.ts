/** Detecta si el HTML del editor TipTap tiene contenido real (texto, imágenes, etc.). */
export function hasRichTextContent(html: string): boolean {
  if (!html?.trim()) return false;

  if (/<(img|video|iframe|audio|embed|hr)\b/i.test(html)) return true;

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0;
}
