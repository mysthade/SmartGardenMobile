import { normalizeImageMimeType, readUriAsBlob } from '@/src/features/plants/lib/photo-upload';

describe('normalizeImageMimeType', () => {
  it('нормалізує image/jpg до image/jpeg', () => {
    expect(normalizeImageMimeType('image/jpg')).toBe('image/jpeg');
  });

  it('зберігає дозволені типи PNG та WebP', () => {
    expect(normalizeImageMimeType('image/png')).toBe('image/png');
    expect(normalizeImageMimeType('image/webp')).toBe('image/webp');
  });

  it('визначає тип за розширенням URI, якщо MIME порожній або octet-stream', () => {
    expect(normalizeImageMimeType('', 'file:///cache/photo.png')).toBe('image/png');
    expect(normalizeImageMimeType('application/octet-stream', 'file:///cache/photo.webp')).toBe('image/webp');
    expect(normalizeImageMimeType(null, 'content://media/external/images/123')).toBe('image/jpeg');
  });
});

describe('readUriAsBlob', () => {
  const originalXhr = globalThis.XMLHttpRequest;

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXhr;
  });

  it('успішно читає локальний file:// URI зі статусом 0', async () => {
    const mockBlob = { size: 1024, type: 'image/jpeg' } as Blob;
    class MockXHR {
      status = 0;
      responseType = '';
      response: Blob | null = mockBlob;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      open() {}
      send() {
        this.onload?.();
      }
    }
    globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;

    const blob = await readUriAsBlob('file:///data/user/0/app/cache/photo.jpg');
    expect(blob).toBe(mockBlob);
  });

  it('відхиляє проміс при помилці читання або порожньому файлі', async () => {
    class MockXHR {
      status = 0;
      responseType = '';
      response: Blob | null = { size: 0, type: '' } as Blob;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      open() {}
      send() {
        this.onload?.();
      }
    }
    globalThis.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;

    await expect(readUriAsBlob('file:///missing.jpg')).rejects.toThrow(
      'Не вдалося прочитати вибраний файл',
    );
  });
});

