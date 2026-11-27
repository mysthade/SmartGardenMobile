import { createGardenSchema, createPlantSchema, updatePlantSchema } from '@smart-garden/validation';
import { decodeCursor, encodeCursor, takePage } from '../common/utils/pagination.util';

describe('garden validation', () => {
  it('accepts valid garden payload', () => {
    const parsed = createGardenSchema.parse({
      name: 'Дача',
      area: '12.5',
      latitude: 50.45,
    });
    expect(parsed.name).toBe('Дача');
    expect(parsed.area).toBe('12.5');
  });

  it('requires plant version on update', () => {
    const result = updatePlantSchema.safeParse({ name: 'Томат' });
    expect(result.success).toBe(false);
  });

  it('accepts plant create payload', () => {
    const parsed = createPlantSchema.parse({
      plantTypeId: '11111111-1111-1111-1111-111111111111',
      name: 'Черрі',
    });
    expect(parsed.quantity).toBe(1);
    expect(parsed.status).toBe('PLANNED');
  });
});

describe('pagination util', () => {
  it('encodes and decodes cursors', () => {
    const encoded = encodeCursor({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: '11111111-1111-1111-1111-111111111111',
    });
    expect(decodeCursor(encoded)).toEqual({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('takes page with overflow item', () => {
    expect(takePage([1, 2, 3], 2)).toEqual([1, 2]);
  });
});
