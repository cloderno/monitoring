import { t } from '../i18n';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Возвращает текст ошибки или null, если файл подходит */
export function validatePhoto(file: File): string | null {
  const type = file.type || (/\.(heic|heif)$/i.test(file.name) ? 'image/heic' : '');
  if (!ACCEPTED.includes(type)) {
    return t('photo.errFormat');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return t('photo.errSize');
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });
}

function toJpeg(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export interface PreparedPhoto {
  /** base64 без префикса data: — для отправки на распознавание */
  base64: string;
  mimeType: string;
  /** Маленькая копия для истории */
  thumbnail: string | null;
}

/**
 * Уменьшает фото до 1600 px по большей стороне (быстрее загрузка, достаточно для чтения ценника).
 * Если браузер не умеет декодировать формат (например, HEIC), отправляет исходный файл.
 */
export async function preparePhoto(file: File, previewUrl: string): Promise<PreparedPhoto> {
  try {
    const img = await loadImage(previewUrl);
    const full = toJpeg(img, 1600, 0.85);
    return { base64: full.split(',')[1], mimeType: 'image/jpeg', thumbnail: toJpeg(img, 360, 0.7) };
  } catch {
    const dataUrl = await readAsDataUrl(file);
    return { base64: dataUrl.split(',')[1], mimeType: file.type || 'image/heic', thumbnail: null };
  }
}
