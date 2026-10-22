import * as THREE from 'three';

export interface PolygonPoint {
  xCm: number;
  yCm: number;
}

/**
 * Перевірка орієнтації полігону (Shoelace formula).
 * Повертає > 0 для орієнтації проти годинникової стрілки (CCW) у стандартній декартовій площині
 * (або CW у координатах з Y вниз).
 */
export function getSignedArea(points: PolygonPoint[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pi = points[i]!;
    const pj = points[j]!;
    area += pi.xCm * pj.yCm - pj.xCm * pi.yCm;
  }
  return area / 2;
}

/**
 * Перевірка, чи лежить точка p всередині трикутника (a, b, c).
 */
export function isPointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = px - ax;
  const v2y = py - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  if (!Number.isFinite(invDenom) || invDenom === 0) return false;

  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  // Використовуємо невеликий епсилон для уникнення проблем на ребрах
  return u >= -1e-5 && v >= -1e-5 && u + v <= 1 + 1e-5;
}

/**
 * Очищення вершин полігону від дублікатів та занадто близьких точок (< 1 см).
 */
export function cleanPolygonVertices(points: PolygonPoint[]): PolygonPoint[] {
  if (points.length < 3) return points;
  const cleaned: PolygonPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.hypot(pt.xCm - prev.xCm, pt.yCm - prev.yCm) >= 1) {
      cleaned.push(pt);
    }
  }

  // Перевірка між першою і останньою точкою
  if (cleaned.length >= 3) {
    const first = cleaned[0]!;
    const last = cleaned[cleaned.length - 1]!;
    if (Math.hypot(first.xCm - last.xCm, first.yCm - last.yCm) < 1) {
      cleaned.pop();
    }
  }

  return cleaned;
}

/**
 * Ear-clipping тріангуляція полігону.
 * Підтримує довільні опуклі та увігнуті полігони.
 * Стійка до вироджених випадків (гарантовано не вішає потік JS, максимум O(N^2)).
 * Повертає масив індексів вершин: [i0, i1, i2, i3, i4, i5, ...].
 */
export function triangulatePolygon2D(rawPoints: PolygonPoint[]): number[] {
  const points = cleanPolygonVertices(rawPoints);
  const n = points.length;
  if (n < 3) return [];
  if (n === 3) return [0, 1, 2];

  // Визначаємо орієнтацію: забезпечуємо консистентний CCW порядок для спрощення
  const area = getSignedArea(points);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) indices.push(i);

  // Працюємо з індексами у CCW орієнтації
  const isCCW = area > 0;
  const activeIndices = isCCW ? [...indices] : [...indices].reverse();

  const triangles: number[] = [];
  let iterations = 0;
  const maxIterations = activeIndices.length * 3;

  while (activeIndices.length > 3 && iterations < maxIterations) {
    iterations++;
    let earFound = false;
    const len = activeIndices.length;

    for (let i = 0; i < len; i++) {
      const prevIdx = activeIndices[(i - 1 + len) % len]!;
      const currIdx = activeIndices[i]!;
      const nextIdx = activeIndices[(i + 1) % len]!;

      const prev = points[prevIdx]!;
      const curr = points[currIdx]!;
      const next = points[nextIdx]!;

      // Векторний добуток для перевірки опуклості вершини
      const cross =
        (curr.xCm - prev.xCm) * (next.yCm - curr.yCm) -
        (curr.yCm - prev.yCm) * (next.xCm - curr.xCm);

      // Якщо кут рефлексивний (увігнутий) у CCW, це не може бути ear
      if (cross <= 0) continue;

      // Перевіряємо, чи є всередині утвореного трикутника інші активні вершини
      let hasPointInside = false;
      for (let j = 0; j < len; j++) {
        const testIdx = activeIndices[j]!;
        if (testIdx === prevIdx || testIdx === currIdx || testIdx === nextIdx) {
          continue;
        }
        const testPt = points[testIdx]!;
        if (
          isPointInTriangle(
            testPt.xCm,
            testPt.yCm,
            prev.xCm,
            prev.yCm,
            curr.xCm,
            curr.yCm,
            next.xCm,
            next.yCm,
          )
        ) {
          hasPointInside = true;
          break;
        }
      }

      if (!hasPointInside) {
        // Знайшли "вухо" — відрізаємо його!
        triangles.push(prevIdx, currIdx, nextIdx);
        activeIndices.splice(i, 1);
        earFound = true;
        break;
      }
    }

    // Якщо ear не знайдено через самоперетини чи колінеарність — беремо перший трикутник
    if (!earFound && activeIndices.length > 3) {
      triangles.push(activeIndices[0]!, activeIndices[1]!, activeIndices[2]!);
      activeIndices.splice(1, 1);
    }
  }

  // Останні 3 вершини утворюють фінальний трикутник
  if (activeIndices.length === 3) {
    triangles.push(activeIndices[0]!, activeIndices[1]!, activeIndices[2]!);
  }

  return triangles;
}

// Простий LRU / Map кеш для створених геометрій полігонів ділянки
const geometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * Створює BufferGeometry для 3D ділянки з урахуванням довільної межі (включаючи увігнуті).
 * Кешує геометрію за сигнатурою точок для виключення зайвих перерахунків.
 */
export function createBoundaryBufferGeometry(
  boundary: PolygonPoint[] | null,
  widthM: number,
  depthM: number,
): THREE.BufferGeometry | null {
  if (!boundary || boundary.length < 3) return null;

  const points = cleanPolygonVertices(boundary);
  if (points.length < 3) return null;

  // Формуємо ключ кешу
  const cacheKey = `${widthM.toFixed(2)}_${depthM.toFixed(2)}_${points
    .map((p) => `${p.xCm},${p.yCm}`)
    .join(';')}`;

  const cached = geometryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const indices = triangulatePolygon2D(points);
  if (indices.length === 0) return null;

  const vertexCount = points.length;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < vertexCount; i++) {
    const pt = points[i]!;
    // Переведення з сантиметрів у метри та центрування відносно ділянки
    const xM = pt.xCm / 100 - widthM / 2;
    const zM = pt.yCm / 100 - depthM / 2;
    const yM = 0.015; // Рівень 0.015м над базовою площиною для запобігання Z-fighting

    positions[i * 3] = xM;
    positions[i * 3 + 1] = yM;
    positions[i * 3 + 2] = zM;

    // Нормаль вгору
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;

    // UV координати
    uvs[i * 2] = pt.xCm / (widthM * 100);
    uvs[i * 2 + 1] = pt.yCm / (depthM * 100);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Очистка кешу, якщо розмір перевищує 20 геометрій
  if (geometryCache.size > 20) {
    const firstKey = geometryCache.keys().next().value;
    if (firstKey) {
      geometryCache.get(firstKey)?.dispose();
      geometryCache.delete(firstKey);
    }
  }

  geometryCache.set(cacheKey, geometry);
  return geometry;
}
