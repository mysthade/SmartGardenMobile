import { updatePlantSchema } from '@smart-garden/validation';
import type { PlantDto } from '@smart-garden/types';
import {
  formatDateToYMD,
  formatDateUkrainian,
  getStatusMeta,
  isOverviewDirty,
  type PlantFormFields,
} from '../lib/plant-helpers';

describe('Plant Form & Helpers', () => {
  const mockPlant: PlantDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    zoneId: 'zone-1',
    gardenId: 'garden-1',
    plantTypeId: 'pt-1',
    name: 'Помідор Чері',
    variety: 'Балконне диво',
    description: 'Солодкі ранні томати',
    quantity: 4,
    occupiedArea: '0.4',
    positionX: '1.2',
    positionY: '0.8',
    size: '0.4',
    rotation: '0',
    plantedAt: '2026-05-10T12:00:00.000Z',
    expectedHarvestAt: '2026-07-20T12:00:00.000Z',
    finishedAt: null,
    status: 'GROWING',
    mainImageUrl: null,
    version: 3,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-10T12:00:00.000Z',
  };

  describe('formatDateToYMD', () => {
    it('formats ISO date to YYYY-MM-DD correctly', () => {
      expect(formatDateToYMD('2026-05-10T12:00:00.000Z')).toBe('2026-05-10');
    });

    it('returns empty string on null or invalid dates', () => {
      expect(formatDateToYMD(null)).toBe('');
      expect(formatDateToYMD('')).toBe('');
      expect(formatDateToYMD('not-a-date')).toBe('');
    });
  });

  describe('formatDateUkrainian', () => {
    it('formats valid date string with Ukrainian month name', () => {
      const res = formatDateUkrainian('2026-05-10T12:00:00.000Z');
      expect(res).toContain('2026');
      expect(res).toContain('травня');
    });

    it('returns fallback dash for null', () => {
      expect(formatDateUkrainian(null)).toBe('—');
    });
  });

  describe('getStatusMeta', () => {
    it('returns Ukrainian label and badge colors for statuses', () => {
      expect(getStatusMeta('GROWING').label).toBe('Росте');
      expect(getStatusMeta('HAS_PROBLEM').label).toBe('Є проблема');
      expect(getStatusMeta('HARVESTING').label).toBe('Збір урожаю');
    });
  });

  describe('isOverviewDirty', () => {
    it('returns false when values match original plant', () => {
      const current: PlantFormFields = {
        name: 'Помідор Чері',
        variety: 'Балконне диво',
        quantity: 4,
        plantedAt: '2026-05-10',
        status: 'GROWING',
        description: 'Солодкі ранні томати',
      };
      expect(isOverviewDirty(mockPlant, current)).toBe(false);
    });

    it('detects changes in name', () => {
      const current: PlantFormFields = {
        name: 'Помідор Рожевий',
        variety: 'Балконне диво',
        quantity: 4,
        plantedAt: '2026-05-10',
        status: 'GROWING',
        description: 'Солодкі ранні томати',
      };
      expect(isOverviewDirty(mockPlant, current)).toBe(true);
    });

    it('detects changes in quantity', () => {
      const current: PlantFormFields = {
        name: 'Помідор Чері',
        variety: 'Балконне диво',
        quantity: 6,
        plantedAt: '2026-05-10',
        status: 'GROWING',
        description: 'Солодкі ранні томати',
      };
      expect(isOverviewDirty(mockPlant, current)).toBe(true);
    });

    it('detects changes in status', () => {
      const current: PlantFormFields = {
        name: 'Помідор Чері',
        variety: 'Балконне диво',
        quantity: 4,
        plantedAt: '2026-05-10',
        status: 'FLOWERING',
        description: 'Солодкі ранні томати',
      };
      expect(isOverviewDirty(mockPlant, current)).toBe(true);
    });
  });

  describe('updatePlantSchema validation', () => {
    it('validates a correct payload successfully', () => {
      const payload = {
        name: 'Томат Чері',
        variety: 'Санька',
        quantity: 5,
        plantedAt: '2026-05-10',
        status: 'GROWING',
        description: 'Добре росте',
        version: 3,
      };

      const result = updatePlantSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects short name less than 2 characters', () => {
      const payload = {
        name: 'А',
        version: 3,
      };

      const result = updatePlantSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative version', () => {
      const payload = {
        name: 'Томат',
        version: 0,
      };

      const result = updatePlantSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects payload with invalid quantity', () => {
      const payload = {
        name: 'Томат',
        quantity: -5,
        version: 1,
      };

      const result = updatePlantSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
