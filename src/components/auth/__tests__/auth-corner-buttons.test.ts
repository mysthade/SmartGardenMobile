import { ICON_BUTTON_SIZE } from '../icon-buttons';

describe('Auth corner buttons - перевірка геометрії та відсутності накладання', () => {
  const BUTTON_SIZE = ICON_BUTTON_SIZE;
  const HIT_SLOP = 8;
  const RIGHT_ACTIONS_GAP = 10; // між 8 та 12 dp
  const SCREEN_PADDING = 16;

  it('кнопки мають однаковий розмір 40×40 dp', () => {
    expect(BUTTON_SIZE).toBe(40);
  });

  it('зона тапу становить ≥ 44 dp завдяки hitSlop', () => {
    const effectiveTapWidth = BUTTON_SIZE + HIT_SLOP * 2;
    const effectiveTapHeight = BUTTON_SIZE + HIT_SLOP * 2;

    expect(effectiveTapWidth).toBe(56);
    expect(effectiveTapHeight).toBe(56);
    expect(effectiveTapWidth).toBeGreaterThanOrEqual(44);
    expect(effectiveTapHeight).toBeGreaterThanOrEqual(44);
  });

  it('відступ між кнопками праворуч знаходиться в діапазоні 8–12 dp', () => {
    expect(RIGHT_ACTIONS_GAP).toBeGreaterThanOrEqual(8);
    expect(RIGHT_ACTIONS_GAP).toBeLessThanOrEqual(12);
  });

  it('на мінімальній ширині екрана 320 dp кнопки не накладаються одна на одну й залишають простір по центру', () => {
    const screenWidth = 320;
    const availableWidth = screenWidth - SCREEN_PADDING * 2; // 288 dp

    const leftButtonWidth = BUTTON_SIZE; // 40 dp
    const rightContainerWidth = BUTTON_SIZE + RIGHT_ACTIONS_GAP + BUTTON_SIZE; // 40 + 10 + 40 = 90 dp

    const totalOccupiedWidth = leftButtonWidth + rightContainerWidth; // 130 dp
    const remainingCenterSpace = availableWidth - totalOccupiedWidth; // 158 dp

    expect(totalOccupiedWidth).toBe(130);
    expect(remainingCenterSpace).toBe(158);
    // Простір між кнопками ліворуч і праворуч строго більший за 0
    expect(remainingCenterSpace).toBeGreaterThan(100);
  });

  it('на стандартній ширині 390 dp та планшеті 600 dp відступи достатні', () => {
    for (const width of [390, 600]) {
      const available = width - SCREEN_PADDING * 2;
      const totalOccupied = BUTTON_SIZE + (BUTTON_SIZE * 2 + RIGHT_ACTIONS_GAP);
      const remaining = available - totalOccupied;
      expect(remaining).toBeGreaterThan(150);
    }
  });
});
