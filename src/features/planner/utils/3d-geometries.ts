import * as THREE from 'three';

/**
 * Створює геометрію двосхилого даху (трикутна призма) з чіткими роздільними нормалями без діагональних швів.
 * Коник (ridge) розташований зверху вздовж осі X (від x = -0.5 до x = 0.5) при y = 0.5, z = 0.
 * Звиси (eaves) розташовані знизу при y = -0.5, z = -0.5 та z = +0.5.
 */
export function createGableRoofGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // Вершини:
  // Коник (ridge): R1 = (-0.5, 0.5, 0), R2 = (0.5, 0.5, 0)
  // Звиси (eaves):
  // E1_FL = (-0.5, -0.5, -0.5), E2_FR = (0.5, -0.5, -0.5)
  // E3_BR = (0.5, -0.5, 0.5),   E4_BL = (-0.5, -0.5, 0.5)

  const positions: number[] = [
    // 1. Передній схил (Front slope, Z = -0.5 -> Z = 0)
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5,  0.0,

    -0.5, -0.5, -0.5,
     0.5,  0.5,  0.0,
    -0.5,  0.5,  0.0,

    // 2. Задній схил (Back slope, Z = 0 -> Z = 0.5)
    -0.5,  0.5,  0.0,
     0.5,  0.5,  0.0,
     0.5, -0.5,  0.5,

    -0.5,  0.5,  0.0,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

    // 3. Лівий фронтон (Left gable triangle at X = -0.5)
    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.0,
    -0.5, -0.5,  0.5,

    // 4. Правий фронтон (Right gable triangle at X = +0.5)
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.0,

    // 5. Дно даху (Bottom base)
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,

    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
  ];

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Створює геометрію 4-гранної піраміди з роздільними нормалями (flat faces),
 * щоб уникнути артефактів згладжування по діагоналях.
 */
export function createPyramidRoofGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const apex = [0, 0.5, 0];
  const bl = [-0.5, -0.5, -0.5];
  const br = [0.5, -0.5, -0.5];
  const tr = [0.5, -0.5, 0.5];
  const tl = [-0.5, -0.5, 0.5];

  const positions: number[] = [
    // Front face
    bl[0]!, bl[1]!, bl[2]!,
    br[0]!, br[1]!, br[2]!,
    apex[0]!, apex[1]!, apex[2]!,

    // Right face
    br[0]!, br[1]!, br[2]!,
    tr[0]!, tr[1]!, tr[2]!,
    apex[0]!, apex[1]!, apex[2]!,

    // Back face
    tr[0]!, tr[1]!, tr[2]!,
    tl[0]!, tl[1]!, tl[2]!,
    apex[0]!, apex[1]!, apex[2]!,

    // Left face
    tl[0]!, tl[1]!, tl[2]!,
    bl[0]!, bl[1]!, bl[2]!,
    apex[0]!, apex[1]!, apex[2]!,

    // Bottom base
    bl[0]!, bl[1]!, bl[2]!,
    tl[0]!, tl[1]!, tl[2]!,
    tr[0]!, tr[1]!, tr[2]!,

    bl[0]!, bl[1]!, bl[2]!,
    tr[0]!, tr[1]!, tr[2]!,
    br[0]!, br[1]!, br[2]!,
  ];

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Створює стрічкову геометрію для контуру межі ділянки заданої товщини (наприклад 0.16м),
 * щоб межа виглядала солідною плоскою стрічкою на 3D ділянці замість 1-піксельної дротяної лінії.
 */
export function createBoundaryRibbonGeometry(
  boundary: Array<{ xCm: number; yCm: number }> | null,
  planWidthM: number,
  planDepthM: number,
  ribbonWidthM = 0.16,
): THREE.BufferGeometry | null {
  if (!boundary || boundary.length < 3) return null;

  const pts = boundary.map((p) => ({
    x: p.xCm / 100 - planWidthM / 2,
    z: p.yCm / 100 - planDepthM / 2,
  }));

  const n = pts.length;
  const positions: number[] = [];
  const halfW = ribbonWidthM / 2;
  const yLevel = 0.026; // Трішки вище за площину газону (0.015) для уникнення z-fighting

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]!;
    const curr = pts[i]!;
    const next = pts[(i + 1) % n]!;

    // Вектор до наступної вершини
    const d1x = next.x - curr.x;
    const d1z = next.z - curr.z;
    const len1 = Math.hypot(d1x, d1z) || 1;

    // Вектор від попередньої
    const d0x = curr.x - prev.x;
    const d0z = curr.z - prev.z;
    const len0 = Math.hypot(d0x, d0z) || 1;

    // Нормалі до сегментів
    const n1x = -d1z / len1;
    const n1z = d1x / len1;

    const n0x = -d0z / len0;
    const n0z = d0x / len0;

    // Середня нормаль у вершині
    let nx = (n0x + n1x) / 2;
    let nz = (n0z + n1z) / 2;
    const nLen = Math.hypot(nx, nz) || 1;
    nx /= nLen;
    nz /= nLen;

    const innerX = curr.x - nx * halfW;
    const innerZ = curr.z - nz * halfW;

    const outerX = curr.x + nx * halfW;
    const outerZ = curr.z + nz * halfW;

    // Наступна вершина (для утворення квада сегмента)
    const nextInnerX = next.x - n1x * halfW;
    const nextInnerZ = next.z - n1z * halfW;
    const nextOuterX = next.x + n1x * halfW;
    const nextOuterZ = next.z + n1z * halfW;

    // Два трикутники стрічкового сегмента
    positions.push(
      innerX, yLevel, innerZ,
      outerX, yLevel, outerZ,
      nextOuterX, yLevel, nextOuterZ,

      innerX, yLevel, innerZ,
      nextOuterX, yLevel, nextOuterZ,
      nextInnerX, yLevel, nextInnerZ,
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Створює лінії сітки 1м та 5м у межах ділянки
 */
export function createPlotGridGeometry(
  widthM: number,
  depthM: number,
  stepM = 1.0,
): THREE.BufferGeometry {
  const points: number[] = [];
  const y = 0.02; // лежить над газоном

  const halfW = widthM / 2;
  const halfD = depthM / 2;

  // Лінії вздовж X
  for (let z = -halfD; z <= halfD + 0.001; z += stepM) {
    points.push(-halfW, y, z, halfW, y, z);
  }

  // Лінії вздовж Z
  for (let x = -halfW; x <= halfW + 0.001; x += stepM) {
    points.push(x, y, -halfD, x, y, halfD);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geom;
}
