export interface Point {
  x: number;
  y: number;
}

export interface BoundaryPoint {
  xCm: number;
  yCm: number;
}

export interface RectCm {
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotationDeg?: number;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  posCm: number;
  startCm: number;
  endCm: number;
}

export interface DistanceRulers {
  toPlot: {
    leftCm: number;
    topCm: number;
    rightCm: number;
    bottomCm: number;
  };
  nearestNeighbor?: {
    distanceCm: number;
    line: { from: Point; to: Point };
  };
}

/**
 * Перетворення сантиметрів у екранні пікселі: px = cm * scale.
 */
export function cmToPx(cm: number, scale: number): number {
  return cm * scale;
}

/**
 * Перетворення екранних пікселів у сантиметри: cm = px / scale.
 */
export function pxToCm(px: number, scale: number): number {
  return scale > 0 ? px / scale : 0;
}

/**
 * Перетворення метрів у сантиметри.
 */
export function metersToCm(meters: number): number {
  return meters * 100;
}

/**
 * Перетворення сантиметрів у метри.
 */
export function cmToMeters(cm: number): number {
  return cm / 100;
}

/**
 * Форматування вимірювання для підписів розмірних ліній.
 * Якщо >= 100 см — показує у метрах (наприклад "3.5 м"), інакше у см ("60 см").
 */
export function formatMeasurement(cm: number): string {
  const abs = Math.abs(cm);
  if (abs >= 100) {
    const m = cm / 100;
    return `${Number(m.toFixed(2))} м`;
  }
  return `${Math.round(cm)} см`;
}

/**
 * Привʼязка значення до кроку сітки.
 */
export function snapValueToGrid(valCm: number, gridSizeCm: number): number {
  if (gridSizeCm <= 0) return valCm;
  return Math.round(valCm / gridSizeCm) * gridSizeCm;
}

/**
 * Поворот точки навколо заданого центру на кут у градусах.
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Отримання 4 вершин оберненого прямокутника.
 */
export function getRotatedCorners(rect: RectCm): Point[] {
  const rot = rect.rotationDeg ?? 0;
  const cx = rect.xCm + rect.widthCm / 2;
  const cy = rect.yCm + rect.heightCm / 2;
  const corners: Point[] = [
    { x: rect.xCm, y: rect.yCm },
    { x: rect.xCm + rect.widthCm, y: rect.yCm },
    { x: rect.xCm + rect.widthCm, y: rect.yCm + rect.heightCm },
    { x: rect.xCm, y: rect.yCm + rect.heightCm },
  ];
  if (!rot) return corners;
  return corners.map((p) => rotatePoint(p, { x: cx, y: cy }, rot));
}

/**
 * Отримання AABB (Axis-Aligned Bounding Box) для набору точок.
 */
export function getAABB(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Перевірка перетину двох опуклих багатокутників за теоремою про розділяючу вісь (SAT).
 */
export function checkPolygonsOverlap(polyA: Point[], polyB: Point[]): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  const polygons = [polyA, polyB];
  for (const polygon of polygons) {
    for (let i1 = 0; i1 < polygon.length; i1++) {
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];
      if (!p1 || !p2) continue;

      // Нормаль до ребра
      const normal: Point = {
        x: -(p2.y - p1.y),
        y: p2.x - p1.x,
      };

      // Проекція полігону A
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of polyA) {
        const dot = p.x * normal.x + p.y * normal.y;
        if (dot < minA) minA = dot;
        if (dot > maxA) maxA = dot;
      }

      // Проекція полігону B
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyB) {
        const dot = p.x * normal.x + p.y * normal.y;
        if (dot < minB) minB = dot;
        if (dot > maxB) maxB = dot;
      }

      // Якщо проекції не перетинаються — знайдено розділяючу вісь
      if (maxA <= minB || maxB <= minA) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Перевірка перетину двох об'єктів плану з урахуванням повороту.
 */
export function checkObjectsOverlap(a: RectCm, b: RectCm): boolean {
  // Швидка перевірка AABB для оптимізації
  const cornersA = getRotatedCorners(a);
  const cornersB = getRotatedCorners(b);
  const aabbA = getAABB(cornersA);
  const aabbB = getAABB(cornersB);

  if (
    aabbA.maxX <= aabbB.minX ||
    aabbA.minX >= aabbB.maxX ||
    aabbA.maxY <= aabbB.minY ||
    aabbA.minY >= aabbB.maxY
  ) {
    return false;
  }

  // Якщо обидва без повороту — AABB перевірки достатньо
  if (!(a.rotationDeg ?? 0) && !(b.rotationDeg ?? 0)) {
    return true;
  }

  return checkPolygonsOverlap(cornersA, cornersB);
}

/**
 * Перевірка виходу об'єкта за межі ділянки [0..plotWidthCm, 0..plotHeightCm].
 */
export function isObjectOutOfBounds(
  rect: RectCm,
  plotWidthCm: number,
  plotHeightCm: number,
): boolean {
  const corners = getRotatedCorners(rect);
  return corners.some(
    (p) => p.x < 0 || p.x > plotWidthCm || p.y < 0 || p.y > plotHeightCm,
  );
}

/**
 * Пошук магнітних напрямних ліній (Snapping Guides) до меж ділянки та сусідніх об'єктів.
 */
export function findSnapGuides(
  candidate: RectCm,
  otherObjects: RectCm[],
  plotWidthCm: number,
  plotHeightCm: number,
  snapThresholdCm = 15,
): { snappedX: number; snappedY: number; guides: SnapGuide[] } {
  let snappedX = candidate.xCm;
  let snappedY = candidate.yCm;
  const guides: SnapGuide[] = [];

  const candLeft = candidate.xCm;
  const candRight = candidate.xCm + candidate.widthCm;
  const candCenterX = candidate.xCm + candidate.widthCm / 2;

  const candTop = candidate.yCm;
  const candBottom = candidate.yCm + candidate.heightCm;
  const candCenterY = candidate.yCm + candidate.heightCm / 2;

  // Орієнтири для X: межі ділянки [0, plotWidthCm, plotWidthCm / 2] + ребра сусідів
  const targetsX: Array<{ pos: number; source: string; startY: number; endY: number }> = [
    { pos: 0, source: 'plot-left', startY: 0, endY: plotHeightCm },
    { pos: plotWidthCm / 2, source: 'plot-mid', startY: 0, endY: plotHeightCm },
    { pos: plotWidthCm, source: 'plot-right', startY: 0, endY: plotHeightCm },
  ];

  // Орієнтири для Y: межі ділянки [0, plotHeightCm, plotHeightCm / 2] + ребра сусідів
  const targetsY: Array<{ pos: number; source: string; startX: number; endX: number }> = [
    { pos: 0, source: 'plot-top', startX: 0, endX: plotWidthCm },
    { pos: plotHeightCm / 2, source: 'plot-mid', startX: 0, endX: plotWidthCm },
    { pos: plotHeightCm, source: 'plot-bottom', startX: 0, endX: plotWidthCm },
  ];

  for (const obj of otherObjects) {
    targetsX.push(
      { pos: obj.xCm, source: 'obj-left', startY: Math.min(obj.yCm, candTop), endY: Math.max(obj.yCm + obj.heightCm, candBottom) },
      { pos: obj.xCm + obj.widthCm / 2, source: 'obj-mid', startY: Math.min(obj.yCm, candTop), endY: Math.max(obj.yCm + obj.heightCm, candBottom) },
      { pos: obj.xCm + obj.widthCm, source: 'obj-right', startY: Math.min(obj.yCm, candTop), endY: Math.max(obj.yCm + obj.heightCm, candBottom) },
    );
    targetsY.push(
      { pos: obj.yCm, source: 'obj-top', startX: Math.min(obj.xCm, candLeft), endX: Math.max(obj.xCm + obj.widthCm, candRight) },
      { pos: obj.yCm + obj.heightCm / 2, source: 'obj-mid', startX: Math.min(obj.xCm, candLeft), endX: Math.max(obj.xCm + obj.widthCm, candRight) },
      { pos: obj.yCm + obj.heightCm, source: 'obj-bottom', startX: Math.min(obj.xCm, candLeft), endX: Math.max(obj.xCm + obj.widthCm, candRight) },
    );
  }

  // Привʼязка по осі X
  let minDiffX = snapThresholdCm + 1;
  let bestSnapX: number | null = null;
  let bestGuideX: SnapGuide | null = null;

  for (const target of targetsX) {
    // 1. candLeft -> target.pos
    const diffLeft = Math.abs(candLeft - target.pos);
    if (diffLeft < minDiffX) {
      minDiffX = diffLeft;
      bestSnapX = target.pos;
      bestGuideX = {
        type: 'vertical',
        posCm: target.pos,
        startCm: target.startY,
        endCm: target.endY,
      };
    }

    // 2. candRight -> target.pos
    const diffRight = Math.abs(candRight - target.pos);
    if (diffRight < minDiffX) {
      minDiffX = diffRight;
      bestSnapX = target.pos - candidate.widthCm;
      bestGuideX = {
        type: 'vertical',
        posCm: target.pos,
        startCm: target.startY,
        endCm: target.endY,
      };
    }

    // 3. candCenterX -> target.pos
    const diffCenter = Math.abs(candCenterX - target.pos);
    if (diffCenter < minDiffX) {
      minDiffX = diffCenter;
      bestSnapX = target.pos - candidate.widthCm / 2;
      bestGuideX = {
        type: 'vertical',
        posCm: target.pos,
        startCm: target.startY,
        endCm: target.endY,
      };
    }
  }

  if (bestSnapX !== null && bestGuideX) {
    snappedX = bestSnapX;
    guides.push(bestGuideX);
  }

  // Привʼязка по осі Y
  let minDiffY = snapThresholdCm + 1;
  let bestSnapY: number | null = null;
  let bestGuideY: SnapGuide | null = null;

  for (const target of targetsY) {
    // 1. candTop -> target.pos
    const diffTop = Math.abs(candTop - target.pos);
    if (diffTop < minDiffY) {
      minDiffY = diffTop;
      bestSnapY = target.pos;
      bestGuideY = {
        type: 'horizontal',
        posCm: target.pos,
        startCm: target.startX,
        endCm: target.endX,
      };
    }

    // 2. candBottom -> target.pos
    const diffBottom = Math.abs(candBottom - target.pos);
    if (diffBottom < minDiffY) {
      minDiffY = diffBottom;
      bestSnapY = target.pos - candidate.heightCm;
      bestGuideY = {
        type: 'horizontal',
        posCm: target.pos,
        startCm: target.startX,
        endCm: target.endX,
      };
    }

    // 3. candCenterY -> target.pos
    const diffCenter = Math.abs(candCenterY - target.pos);
    if (diffCenter < minDiffY) {
      minDiffY = diffCenter;
      bestSnapY = target.pos - candidate.heightCm / 2;
      bestGuideY = {
        type: 'horizontal',
        posCm: target.pos,
        startCm: target.startX,
        endCm: target.endX,
      };
    }
  }

  if (bestSnapY !== null && bestGuideY) {
    snappedY = bestSnapY;
    guides.push(bestGuideY);
  }

  return { snappedX, snappedY, guides };
}

/**
 * Розрахунок відстаней для вимірювальних лінійок:
 * - відстані до 4 меж ділянки (left, top, right, bottom)
 * - відстань до найближчого об'єкта та координати лінії
 */
export function calculateDistances(
  target: RectCm,
  otherObjects: RectCm[],
  plotWidthCm: number,
  plotHeightCm: number,
): DistanceRulers {
  const leftCm = Math.max(0, target.xCm);
  const topCm = Math.max(0, target.yCm);
  const rightCm = Math.max(0, plotWidthCm - (target.xCm + target.widthCm));
  const bottomCm = Math.max(0, plotHeightCm - (target.yCm + target.heightCm));

  let nearest: DistanceRulers['nearestNeighbor'] = undefined;
  let minDistance = Infinity;

  const tCenter = {
    x: target.xCm + target.widthCm / 2,
    y: target.yCm + target.heightCm / 2,
  };

  for (const obj of otherObjects) {
    const oCenter = {
      x: obj.xCm + obj.widthCm / 2,
      y: obj.yCm + obj.heightCm / 2,
    };

    // Орієнтовна евклідова відстань між межами
    const dx = Math.max(0, Math.abs(tCenter.x - oCenter.x) - (target.widthCm + obj.widthCm) / 2);
    const dy = Math.max(0, Math.abs(tCenter.y - oCenter.y) - (target.heightCm + obj.heightCm) / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < minDistance) {
      minDistance = dist;
      nearest = {
        distanceCm: Math.round(dist),
        line: {
          from: tCenter,
          to: oCenter,
        },
      };
    }
  }

  return {
    toPlot: { leftCm, topCm, rightCm, bottomCm },
    nearestNeighbor: nearest,
  };
}

/**
 * Отримання ефективної межі ділянки:
 * якщо `boundary` присутній та містить >= 3 точок — повертає його,
 * інакше генерує прямокутник з `[widthCm, heightCm]` як 4 точки.
 */
export function getEffectiveBoundary(plan: {
  widthCm: number;
  heightCm: number;
  boundary?: BoundaryPoint[] | null;
}): BoundaryPoint[] {
  if (plan.boundary && plan.boundary.length >= 3) {
    return plan.boundary;
  }
  return [
    { xCm: 0, yCm: 0 },
    { xCm: plan.widthCm, yCm: 0 },
    { xCm: plan.widthCm, yCm: plan.heightCm },
    { xCm: 0, yCm: plan.heightCm },
  ];
}

/**
 * Знакова площа полігону за формулою Гауса (Shoelace).
 * У 2D координатній системі, де Y йде вниз:
 * площа > 0 означає орієнтацію за годинниковою стрілкою (clockwise).
 */
export function getPolygonSignedArea(points: BoundaryPoint[]): number {
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
 * Перевірка орієнтації полігону за годинниковою стрілкою (CW).
 */
export function isPolygonClockwise(points: BoundaryPoint[]): boolean {
  return getPolygonSignedArea(points) > 0;
}

/**
 * Гарантування орієнтації вершин полігону за годинниковою стрілкою.
 */
export function ensurePolygonClockwise(points: BoundaryPoint[]): BoundaryPoint[] {
  if (points.length < 3) return points;
  if (!isPolygonClockwise(points)) {
    return [...points].reverse();
  }
  return points;
}

/**
 * Перевірка перетину двох відрізків (p1-p2 та p3-p4).
 */
export function doSegmentsIntersect(
  p1: BoundaryPoint,
  p2: BoundaryPoint,
  p3: BoundaryPoint,
  p4: BoundaryPoint,
): boolean {
  function ccw(a: BoundaryPoint, b: BoundaryPoint, c: BoundaryPoint): number {
    return (c.yCm - a.yCm) * (b.xCm - a.xCm) - (b.yCm - a.yCm) * (c.xCm - a.xCm);
  }

  const cp1 = ccw(p1, p2, p3);
  const cp2 = ccw(p1, p2, p4);
  const cp3 = ccw(p3, p4, p1);
  const cp4 = ccw(p3, p4, p2);

  // Строгий перетин (відрізки перетинаються у внутрішній точці)
  if (((cp1 > 0 && cp2 < 0) || (cp1 < 0 && cp2 > 0)) &&
      ((cp3 > 0 && cp4 < 0) || (cp3 < 0 && cp4 > 0))) {
    return true;
  }

  return false;
}

/**
 * Перевірка полігону на самоперетин ребер.
 */
export function hasPolygonSelfIntersections(points: BoundaryPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const iNext = (i + 1) % n;
    const p1 = points[i]!;
    const p2 = points[iNext]!;

    for (let j = i + 1; j < n; j++) {
      const jNext = (j + 1) % n;
      // Суміжні ребра мають спільну вершину — пропускаємо їх
      if (i === j || i === jNext || iNext === j || iNext === jNext) {
        continue;
      }

      const p3 = points[j]!;
      const p4 = points[jNext]!;

      if (doSegmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Обчислення довжини та кута нахилу ребра у градусах (-180..180).
 */
export function calculateEdgeProperties(
  p1: BoundaryPoint,
  p2: BoundaryPoint,
): { lengthCm: number; angleDeg: number } {
  const dx = p2.xCm - p1.xCm;
  const dy = p2.yCm - p1.yCm;
  const lengthCm = Math.round(Math.hypot(dx, dy));
  let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  if (angleDeg < 0) angleDeg += 360;
  return { lengthCm, angleDeg };
}

/**
 * Переміщення кінцевої точки ребра на основі заданої нової довжини або кута відносно початкової.
 */
export function moveEdgeEndpoint(
  p1: BoundaryPoint,
  newLengthCm: number,
  angleDeg: number,
): BoundaryPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    xCm: Math.round(p1.xCm + newLengthCm * Math.cos(rad)),
    yCm: Math.round(p1.yCm + newLengthCm * Math.sin(rad)),
  };
}

/**
 * Отримання точок лінійного об'єкта (LinePath).
 * Якщо у `meta.linePoints` вже є масив точок — повертає його.
 * Якщо це старий прямокутний об'єкт (FENCE, PATH тощо) — мігрує його «на льоту»
 * у 2 точки між його кінцями з урахуванням повороту.
 */
export function getEffectiveLinePoints(object: {
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotationDeg: number;
  meta?: Record<string, unknown> | null;
}): BoundaryPoint[] {
  const metaPoints = object.meta?.linePoints;
  if (Array.isArray(metaPoints) && metaPoints.length >= 2) {
    return metaPoints as BoundaryPoint[];
  }

  // Міграція старого прямокутного об'єкта: лінія від лівого до правого краю
  const cx = object.xCm + object.widthCm / 2;
  const cy = object.yCm + object.heightCm / 2;
  const rad = ((object.rotationDeg ?? 0) * Math.PI) / 180;
  const halfL = object.widthCm / 2;
  const dx = Math.cos(rad) * halfL;
  const dy = Math.sin(rad) * halfL;

  return [
    { xCm: Math.round(cx - dx), yCm: Math.round(cy - dy) },
    { xCm: Math.round(cx + dx), yCm: Math.round(cy + dy) },
  ];
}

/**
 * Обчислення AABB для точок лінії з урахуванням ширини стрічки (товщини).
 */
export function computeLineBoundingBox(
  points: BoundaryPoint[],
  strokeWidthCm = 80,
): { xCm: number; yCm: number; widthCm: number; heightCm: number } {
  if (points.length === 0) {
    return { xCm: 0, yCm: 0, widthCm: 100, heightCm: 100 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.xCm < minX) minX = p.xCm;
    if (p.yCm < minY) minY = p.yCm;
    if (p.xCm > maxX) maxX = p.xCm;
    if (p.yCm > maxY) maxY = p.yCm;
  }

  const pad = Math.round(strokeWidthCm / 2);
  const xCm = Math.max(0, minX - pad);
  const yCm = Math.max(0, minY - pad);
  const widthCm = Math.max(20, maxX - minX + pad * 2);
  const heightCm = Math.max(20, maxY - minY + pad * 2);

  return { xCm, yCm, widthCm, heightCm };
}

/**
 * Розрахунок загальної кумулятивної довжини ламаної лінії.
 */
export function calculateTotalLineLength(points: BoundaryPoint[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    len += Math.hypot(p2.xCm - p1.xCm, p2.yCm - p1.yCm);
  }
  return Math.round(len);
}


