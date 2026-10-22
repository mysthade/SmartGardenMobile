import {
  type CandidateLabel,
  resolveNonOverlappingLabels,
} from '../utils/label-manager';

describe('Label Manager (Greedy Non-Overlapping & Screen Clamping)', () => {
  const screenWidth = 390;
  const screenHeight = 844;

  it('1. Clamps labels inside screen bounds avoiding offscreen clipping', () => {
    const candidates: CandidateLabel[] = [
      { id: '1', text: 'Західний паркан', screenX: -50, screenY: 200 },
      { id: '2', text: 'Східний край', screenX: 500, screenY: 200 },
      { id: '3', text: 'Верхній край', screenX: 150, screenY: 10 },
      { id: '4', text: 'Нижній край', screenX: 150, screenY: 900 },
    ];

    const placed = resolveNonOverlappingLabels(candidates, screenWidth, screenHeight, 10, 16);

    for (const p of placed) {
      expect(p.screenX).toBeGreaterThanOrEqual(16);
      expect(p.screenX + p.width).toBeLessThanOrEqual(screenWidth - 16);
      expect(p.screenY).toBeGreaterThanOrEqual(16);
      expect(p.screenY + p.height).toBeLessThanOrEqual(screenHeight - 16);
    }
  });

  it('2. Prevents overlapping between close labels', () => {
    const candidates: CandidateLabel[] = [
      { id: '1', text: 'Житловий будинок', screenX: 100, screenY: 200 },
      { id: '2', text: 'Гараж', screenX: 105, screenY: 205 }, // Exactly overlapping with #1
      { id: '3', text: 'Альтанка', screenX: 250, screenY: 400 }, // Far away
    ];

    const placed = resolveNonOverlappingLabels(candidates, screenWidth, screenHeight, 10, 16);

    expect(placed.some((p) => p.id === '1')).toBe(true);
    // #2 should be dropped due to collision with #1
    expect(placed.some((p) => p.id === '2')).toBe(false);
    // #3 should be placed cleanly
    expect(placed.some((p) => p.id === '3')).toBe(true);
  });

  it('3. Always prioritizes and displays the selected object label', () => {
    const candidates: CandidateLabel[] = [
      { id: '1', text: 'Великий будинок', screenX: 100, screenY: 200, priority: 500 },
      { id: '2', text: 'Маленький колодязь', screenX: 102, screenY: 202, isSelected: true, priority: 5 },
    ];

    const placed = resolveNonOverlappingLabels(candidates, screenWidth, screenHeight, 10, 16);

    // Selected object must be present
    expect(placed.some((p) => p.id === '2' && p.isSelected)).toBe(true);
  });

  it('4. Enforces maxLabels limit (<= 12)', () => {
    const candidates: CandidateLabel[] = Array.from({ length: 30 }, (_, i) => ({
      id: `item-${i}`,
      text: `Обʼєкт ${i}`,
      screenX: (i % 5) * 70 + 30,
      screenY: Math.floor(i / 5) * 80 + 100,
    }));

    const placed = resolveNonOverlappingLabels(candidates, screenWidth, screenHeight, 12, 16);
    expect(placed.length).toBeLessThanOrEqual(12);
  });
});
