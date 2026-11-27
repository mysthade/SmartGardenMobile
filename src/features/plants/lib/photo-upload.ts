const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Нормалізує MIME-тип зображення до дозволених сервером значень
 * (`image/jpeg`, `image/png`, `image/webp`).
 */
export function normalizeImageMimeType(
  rawMime?: string | null,
  uriOrName?: string | null,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  const normalized = rawMime?.trim().toLowerCase();
  if (normalized === 'image/jpg') {
    return 'image/jpeg';
  }
  if (normalized && ALLOWED_IMAGE_MIMES.has(normalized)) {
    return normalized as 'image/jpeg' | 'image/png' | 'image/webp';
  }

  const lowerName = uriOrName?.toLowerCase() ?? '';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Зчитує локальний URI (`file://`, `content://`, `blob:`, `data:`) у `Blob` через XHR.
 * У React Native (особливо на Android) `fetch(file://...)` часто повертає `status: 0`
 * (`response.ok === false`), тоді як XHR з `responseType = 'blob'` коректно читає локальні файли.
 */
export function readUriAsBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        const blob = xhr.response as Blob | null;
        if (blob && blob.size > 0) {
          resolve(blob);
          return;
        }
      }
      reject(new Error('Не вдалося прочитати вибраний файл'));
    };
    xhr.onerror = () => {
      reject(new Error('Не вдалося прочитати вибраний файл'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

