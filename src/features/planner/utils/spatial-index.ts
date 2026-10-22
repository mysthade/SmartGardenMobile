import type { CanvasPlanObject } from '../types';
import type { SnapGuide } from '@smart-garden/validation';

/**
 * 2D Spatial Hash Grid для швидкого пошуку сусідів, колізій і прив'язок
 * за час O(1) замість повного перебору O(N^2).
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, CanvasPlanObject[]>;
  private objectMap: Map<string, CanvasPlanObject>;

  constructor(cellSize: number = 300) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objectMap = new Map();
  }

  private getKey(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`;
  }

  public clear(): void {
    this.grid.clear();
    this.objectMap.clear();
  }

  public rebuild(objects: CanvasPlanObject[]): void {
    this.clear();
    for (const obj of objects) {
      if (!obj.deleted) {
        this.insert(obj);
      }
    }
  }

  public insert(obj: CanvasPlanObject): void {
    this.objectMap.set(obj.id, obj);
    const minCellX = Math.floor(obj.xCm / this.cellSize);
    const maxCellX = Math.floor((obj.xCm + obj.widthCm) / this.cellSize);
    const minCellY = Math.floor(obj.yCm / this.cellSize);
    const maxCellY = Math.floor((obj.yCm + obj.heightCm) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.getKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(obj);
      }
    }
  }

  /**
   * Пошук кандидатів у прямокутній області
   */
  public queryBox(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    excludeId?: string,
  ): CanvasPlanObject[] {
    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);

    const resultSet = new Set<CanvasPlanObject>();

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const cell = this.grid.get(this.getKey(cx, cy));
        if (cell) {
          for (const item of cell) {
            if (item.id !== excludeId && !item.deleted) {
              // Точна перевірка перетину рамок
              if (
                item.xCm + item.widthCm >= minX &&
                item.xCm <= maxX &&
                item.yCm + item.heightCm >= minY &&
                item.yCm <= maxY
              ) {
                resultSet.add(item);
              }
            }
          }
        }
      }
    }

    return Array.from(resultSet);
  }

  /**
   * Пошук найближчих сусідів для об'єкта в радіусі radiusCm
   */
  public queryNeighbors(
    target: CanvasPlanObject,
    radiusCm: number = 500,
  ): CanvasPlanObject[] {
    const minX = target.xCm - radiusCm;
    const minY = target.yCm - radiusCm;
    const maxX = target.xCm + target.widthCm + radiusCm;
    const maxY = target.yCm + target.heightCm + radiusCm;

    return this.queryBox(minX, minY, maxX, maxY, target.id);
  }

  /**
   * Обчислення магнітних напрямних для об'єкта лише серед найближчих сусідів
   */
  public computeSnapGuidesForObject(
    target: CanvasPlanObject,
    plotWidthCm: number,
    plotHeightCm: number,
    snapThresholdCm: number = 15,
  ): { guides: SnapGuide[]; snappedX: number; snappedY: number } {
    const guides: SnapGuide[] = [];
    let snappedX = target.xCm;
    let snappedY = target.yCm;

    const neighbors = this.queryNeighbors(target, 400);

    const targetCenterX = target.xCm + target.widthCm / 2;
    const targetRight = target.xCm + target.widthCm;
    const targetCenterY = target.yCm + target.heightCm / 2;
    const targetBottom = target.yCm + target.heightCm;

    // 1. Прив'язка до меж ділянки (X: 0, plotWidth)
    if (Math.abs(target.xCm) <= snapThresholdCm) {
      snappedX = 0;
      guides.push({
        type: 'vertical',
        posCm: 0,
        startCm: 0,
        endCm: plotHeightCm,
      });
    } else if (Math.abs(targetRight - plotWidthCm) <= snapThresholdCm) {
      snappedX = plotWidthCm - target.widthCm;
      guides.push({
        type: 'vertical',
        posCm: plotWidthCm,
        startCm: 0,
        endCm: plotHeightCm,
      });
    }

    // 2. Прив'язка до меж ділянки (Y: 0, plotHeight)
    if (Math.abs(target.yCm) <= snapThresholdCm) {
      snappedY = 0;
      guides.push({
        type: 'horizontal',
        posCm: 0,
        startCm: 0,
        endCm: plotWidthCm,
      });
    } else if (Math.abs(targetBottom - plotHeightCm) <= snapThresholdCm) {
      snappedY = plotHeightCm - target.heightCm;
      guides.push({
        type: 'horizontal',
        posCm: plotHeightCm,
        startCm: 0,
        endCm: plotWidthCm,
      });
    }

    // 3. Прив'язка до сусідів (left, center, right, top, middle, bottom)
    for (const other of neighbors) {
      const otherCenterX = other.xCm + other.widthCm / 2;
      const otherRight = other.xCm + other.widthCm;
      const otherCenterY = other.yCm + other.heightCm / 2;
      const otherBottom = other.yCm + other.heightCm;

      // X вирівнювання: left-to-left
      if (Math.abs(target.xCm - other.xCm) <= snapThresholdCm) {
        snappedX = other.xCm;
        guides.push({
          type: 'vertical',
          posCm: other.xCm,
          startCm: Math.min(target.yCm, other.yCm),
          endCm: Math.max(targetBottom, otherBottom),
        });
      }
      // X вирівнювання: center-to-center
      else if (Math.abs(targetCenterX - otherCenterX) <= snapThresholdCm) {
        snappedX = otherCenterX - target.widthCm / 2;
        guides.push({
          type: 'vertical',
          posCm: otherCenterX,
          startCm: Math.min(target.yCm, other.yCm),
          endCm: Math.max(targetBottom, otherBottom),
        });
      }
      // X вирівнювання: right-to-right
      else if (Math.abs(targetRight - otherRight) <= snapThresholdCm) {
        snappedX = otherRight - target.widthCm;
        guides.push({
          type: 'vertical',
          posCm: otherRight,
          startCm: Math.min(target.yCm, other.yCm),
          endCm: Math.max(targetBottom, otherBottom),
        });
      }

      // Y вирівнювання: top-to-top
      if (Math.abs(target.yCm - other.yCm) <= snapThresholdCm) {
        snappedY = other.yCm;
        guides.push({
          type: 'horizontal',
          posCm: other.yCm,
          startCm: Math.min(target.xCm, other.xCm),
          endCm: Math.max(targetRight, otherRight),
        });
      }
      // Y вирівнювання: middle-to-middle
      else if (Math.abs(targetCenterY - otherCenterY) <= snapThresholdCm) {
        snappedY = otherCenterY - target.heightCm / 2;
        guides.push({
          type: 'horizontal',
          posCm: otherCenterY,
          startCm: Math.min(target.xCm, other.xCm),
          endCm: Math.max(targetRight, otherRight),
        });
      }
      // Y вирівнювання: bottom-to-bottom
      else if (Math.abs(targetBottom - otherBottom) <= snapThresholdCm) {
        snappedY = otherBottom - target.heightCm;
        guides.push({
          type: 'horizontal',
          posCm: otherBottom,
          startCm: Math.min(target.xCm, other.xCm),
          endCm: Math.max(targetRight, otherRight),
        });
      }
    }

    return { guides, snappedX, snappedY };
  }
}
