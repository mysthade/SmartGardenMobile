import type { CanvasPlanObject } from '../types';

export interface Point2D {
  x: number;
  y: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

export interface ExtrudedFace {
  points: Point2D[];
  color: string;
  brightness: number; // 0.0 to 1.0 multiplier
}

export interface ExtrudedBox25D {
  topFace: Point2D[];
  sideFaces: ExtrudedFace[];
  shadowFace?: Point2D[];
  centerProjected: ProjectedPoint;
}

/**
 * Перетворює координати ділянки (в сантиметрах) у 2.5D проекцію екрана (в пікселях).
 */
export function projectPoint25D(
  xCm: number,
  yCm: number,
  zCm: number,
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
  scale: number,
  offset: Point2D,
): ProjectedPoint {
  'worklet';
  const radYaw = (yawDeg * Math.PI) / 180;
  const radPitch = (pitchDeg * Math.PI) / 180;

  const dx = xCm - centerCm.x;
  const dy = yCm - centerCm.y;

  // Обертання навколо вертикальної осі Y (yaw)
  const rotX = dx * Math.cos(radYaw) - dy * Math.sin(radYaw);
  const rotY = dx * Math.sin(radYaw) + dy * Math.cos(radYaw);

  // Нахил камери (pitch): sin(pitch) стискає площину землі, cos(pitch) проектує висоту Z
  const sinP = Math.sin(radPitch);
  const cosP = Math.cos(radPitch);

  const screenX = rotX * scale + offset.x;
  const screenY = (rotY * sinP - zCm * cosP) * scale + offset.y;
  const depth = rotY * cosP + zCm * sinP;

  return {
    x: screenX,
    y: screenY,
    depth,
  };
}

/**
 * Обчислює глибину об'єкта для сортування за алгоритмом художника (Painter's algorithm).
 */
export function computeDepthZ(
  xCm: number,
  yCm: number,
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
): number {
  'worklet';
  const radYaw = (yawDeg * Math.PI) / 180;
  const radPitch = (pitchDeg * Math.PI) / 180;

  const dx = xCm - centerCm.x;
  const dy = yCm - centerCm.y;

  const rotY = dx * Math.sin(radYaw) + dy * Math.cos(radYaw);
  return rotY * Math.cos(radPitch);
}

/**
 * Сортування об'єктів плану за віддаленістю від камери (від дальніх до ближніх).
 */
export function sortObjectsByDepth(
  objects: CanvasPlanObject[],
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
): CanvasPlanObject[] {
  // Кошик кутів для запобігання зайвому сортуванню (quantized by 2.5 degrees)
  const quantizedYaw = Math.round(yawDeg / 2.5) * 2.5;
  const quantizedPitch = Math.round(pitchDeg / 2.5) * 2.5;

  return [...objects].sort((a, b) => {
    // Доріжки та газони завжди на землі (малюються першими)
    const isGroundA = a.type === 'PATH' || a.type === 'LAWN' || a.type === 'PARKING';
    const isGroundB = b.type === 'PATH' || b.type === 'LAWN' || b.type === 'PARKING';
    if (isGroundA && !isGroundB) return -1;
    if (!isGroundA && isGroundB) return 1;

    const centerA = { x: a.xCm + a.widthCm / 2, y: a.yCm + a.heightCm / 2 };
    const centerB = { x: b.xCm + b.widthCm / 2, y: b.yCm + b.heightCm / 2 };

    const depthA = computeDepthZ(centerA.x, centerA.y, centerCm, quantizedYaw, quantizedPitch);
    const depthB = computeDepthZ(centerB.x, centerB.y, centerCm, quantizedYaw, quantizedPitch);

    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.zIndex - b.zIndex;
  });
}

/**
 * Обчислює 2.5D екструзію (нижні й верхні вершини, бічні грані та тінь) для прямокутного об'єкта.
 */
export function computeExtrudedBox25D(
  obj: CanvasPlanObject,
  heightCm: number,
  baseColor: string,
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
  scale: number,
  offset: Point2D,
): ExtrudedBox25D {
  const cx = obj.xCm + obj.widthCm / 2;
  const cy = obj.yCm + obj.heightCm / 2;
  const hw = obj.widthCm / 2;
  const hh = obj.heightCm / 2;

  // Обертання самого об'єкта у 2D (rotationDeg)
  const radObjRot = (obj.rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(radObjRot);
  const sinR = Math.sin(radObjRot);

  const localCorners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  // 4 кути основи у просторі ділянки
  const baseWorld = localCorners.map((c) => ({
    x: cx + c.x * cosR - c.y * sinR,
    y: cy + c.x * sinR + c.y * cosR,
  }));

  // Проектуємо основу (Z = 0) та верх (Z = heightCm)
  const projectedBottom = baseWorld.map((p) =>
    projectPoint25D(p.x, p.y, 0, centerCm, yawDeg, pitchDeg, scale, offset),
  );

  const projectedTop = baseWorld.map((p) =>
    projectPoint25D(p.x, p.y, heightCm, centerCm, yawDeg, pitchDeg, scale, offset),
  );

  const centerProjected = projectPoint25D(
    cx,
    cy,
    heightCm / 2,
    centerCm,
    yawDeg,
    pitchDeg,
    scale,
    offset,
  );

  // Бічні грані: визначаємо видимі за напрямком обходу
  const sideFaces: ExtrudedFace[] = [];

  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const b0 = projectedBottom[i]!;
    const b1 = projectedBottom[next]!;
    const t1 = projectedTop[next]!;
    const t0 = projectedTop[i]!;

    // Векторний добуток для визначення орієнтації грані до спостерігача
    const cross = (b1.x - b0.x) * (t0.y - b0.y) - (b1.y - b0.y) * (t0.x - b0.x);

    // Якщо грань орієнтована до нас (cross > 0)
    if (cross > 0.001) {
      // Різний коефіцієнт освітлення для об'ємності залежно від нормалі грані
      const faceAngle = Math.atan2(b1.y - b0.y, b1.x - b0.x);
      const brightness = 0.65 + 0.25 * Math.abs(Math.sin(faceAngle));

      sideFaces.push({
        points: [b0, b1, t1, t0],
        color: baseColor,
        brightness,
      });
    }
  }

  // Проектована тінь на землі (зсув залежно від напрямку сонця)
  let shadowFace: Point2D[] | undefined;
  if (heightCm > 15) {
    const shadowOffsetCm = heightCm * 0.45;
    const shadowWorld = baseWorld.map((p) => ({
      x: p.x + shadowOffsetCm * 0.7,
      y: p.y + shadowOffsetCm * 0.7,
    }));
    shadowFace = shadowWorld.map((p) =>
      projectPoint25D(p.x, p.y, 0, centerCm, yawDeg, pitchDeg, scale, offset),
    );
  }

  return {
    topFace: projectedTop,
    sideFaces,
    shadowFace,
    centerProjected,
  };
}

/**
 * Генерує рядок координат SVG Path "M x0 y0 L x1 y1 ... Z"
 */
export function pointsToSvgPath(points: Point2D[]): string {
  'worklet';
  if (!points || points.length === 0) return '';
  let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x.toFixed(1)} ${points[i]!.y.toFixed(1)}`;
  }
  return d + ' Z';
}

/**
 * Проектує полігон ділянки на рівні землі (Z=0) у рядок SVG Path
 */
export function projectGroundPolygon25D(
  boundary: Array<{ xCm: number; yCm: number }>,
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
  scale: number,
  offset: Point2D,
): string {
  const projected = boundary.map((p) =>
    projectPoint25D(p.xCm, p.yCm, 0, centerCm, yawDeg, pitchDeg, scale, offset),
  );
  return pointsToSvgPath(projected);
}

/**
 * Проектує сітку ділянки на рівні землі (Z=0) у рядок SVG Path
 */
export function projectGridLines25D(
  widthCm: number,
  heightCm: number,
  stepCm: number,
  centerCm: { x: number; y: number },
  yawDeg: number,
  pitchDeg: number,
  scale: number,
  offset: Point2D,
): string {
  let d = '';
  for (let y = 0; y <= heightCm; y += stepCm) {
    const p1 = projectPoint25D(0, y, 0, centerCm, yawDeg, pitchDeg, scale, offset);
    const p2 = projectPoint25D(widthCm, y, 0, centerCm, yawDeg, pitchDeg, scale, offset);
    d += ` M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  for (let x = 0; x <= widthCm; x += stepCm) {
    const p1 = projectPoint25D(x, 0, 0, centerCm, yawDeg, pitchDeg, scale, offset);
    const p2 = projectPoint25D(x, heightCm, 0, centerCm, yawDeg, pitchDeg, scale, offset);
    d += ` M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
