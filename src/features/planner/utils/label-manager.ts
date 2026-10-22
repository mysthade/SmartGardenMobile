export interface CandidateLabel {
  id: string;
  text: string;
  screenX: number;
  screenY: number;
  width?: number;
  height?: number;
  isSelected?: boolean;
  priority?: number;
}

export interface PlacedLabel {
  id: string;
  text: string;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  isSelected: boolean;
}

/**
 * Жадібний алгоритм розміщення підписів (Greedy Label Placement)
 * із запобіганням накладанням (collision avoidance) та обмеженням до меж екрана (clamping).
 */
export function resolveNonOverlappingLabels(
  candidates: CandidateLabel[],
  screenWidth: number,
  screenHeight: number,
  maxLabels = 12,
  screenPadding = 16,
): PlacedLabel[] {
  const defaultHeight = 22;
  const charWidth = 7.5;
  const padH = 16;

  // 1. Формуємо розміри та пріоритет
  const normalized: Array<PlacedLabel & { priority: number }> = candidates
    .filter((c) => Boolean(c.text && c.screenX > -100 && c.screenY > -100))
    .map((c) => {
      const width = c.width || Math.max(38, c.text.length * charWidth + padH);
      const height = c.height || defaultHeight;

      // Клемп усередині екрана
      const clampedX = Math.max(
        screenPadding,
        Math.min(screenWidth - width - screenPadding, c.screenX - width / 2),
      );
      const clampedY = Math.max(
        screenPadding + 50, // Відступ під верхнім баром
        Math.min(screenHeight - height - screenPadding - 60, c.screenY - height / 2),
      );

      return {
        id: c.id,
        text: c.text,
        screenX: clampedX,
        screenY: clampedY,
        width,
        height,
        isSelected: Boolean(c.isSelected),
        priority: c.isSelected ? 10000 : (c.priority || 100),
      };
    });

  // 2. Сортуємо: спочатку вибраний, потім за пріоритетом
  normalized.sort((a, b) => b.priority - a.priority);

  const placed: PlacedLabel[] = [];

  for (const item of normalized) {
    if (placed.length >= maxLabels && !item.isSelected) {
      break;
    }

    // Перевірка колізії прямокутників (AABB intersection)
    let hasCollision = false;
    for (const p of placed) {
      const xOverlap =
        item.screenX < p.screenX + p.width + 6 &&
        item.screenX + item.width + 6 > p.screenX;
      const yOverlap =
        item.screenY < p.screenY + p.height + 4 &&
        item.screenY + item.height + 4 > p.screenY;

      if (xOverlap && yOverlap) {
        hasCollision = true;
        break;
      }
    }

    // Вибраний показується завжди; невибрані лише якщо не перекривають
    if (!hasCollision || item.isSelected) {
      placed.push({
        id: item.id,
        text: item.text,
        screenX: item.screenX,
        screenY: item.screenY,
        width: item.width,
        height: item.height,
        isSelected: item.isSelected,
      });
    }
  }

  return placed;
}
