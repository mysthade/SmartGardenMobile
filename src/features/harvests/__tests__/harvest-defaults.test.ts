import {
  getDefaultInitialQuantity,
  getQualityLabel,
  getRememberedUnit,
  getStepperStep,
  getUnitShortLabel,
  isRecordWithoutDetails,
  rememberLastUnit,
} from '../lib/harvest-defaults';

describe('harvest-defaults', () => {
  describe('getStepperStep', () => {
    it('returns appropriate steps for units', () => {
      expect(getStepperStep('PIECE')).toBe(1);
      expect(getStepperStep('KILOGRAM')).toBe(0.5);
      expect(getStepperStep('LITER')).toBe(0.5);
      expect(getStepperStep('GRAM')).toBe(100);
    });
  });

  describe('getDefaultInitialQuantity', () => {
    it('returns correct starting quantity', () => {
      expect(getDefaultInitialQuantity('KILOGRAM')).toBe(1);
      expect(getDefaultInitialQuantity('PIECE')).toBe(1);
      expect(getDefaultInitialQuantity('LITER')).toBe(1);
      expect(getDefaultInitialQuantity('GRAM')).toBe(500);
    });
  });

  describe('getUnitShortLabel & getQualityLabel', () => {
    it('returns Ukrainian short labels', () => {
      expect(getUnitShortLabel('KILOGRAM')).toBe('кг');
      expect(getUnitShortLabel('GRAM')).toBe('г');
      expect(getUnitShortLabel('PIECE')).toBe('шт');
      expect(getUnitShortLabel('LITER')).toBe('л');
    });

    it('returns Ukrainian quality labels', () => {
      expect(getQualityLabel('EXCELLENT')).toBe('Відмінна');
      expect(getQualityLabel('GOOD')).toBe('Добра');
      expect(getQualityLabel('AVERAGE')).toBe('Звичайна');
      expect(getQualityLabel('POOR')).toBe('Низька');
    });
  });

  describe('isRecordWithoutDetails', () => {
    it('detects null or empty notes as without details', () => {
      expect(isRecordWithoutDetails(null)).toBe(true);
      expect(isRecordWithoutDetails(undefined)).toBe(true);
      expect(isRecordWithoutDetails('')).toBe(true);
      expect(isRecordWithoutDetails('   ')).toBe(true);
    });

    it('detects technical batch tags as without details', () => {
      expect(isRecordWithoutDetails('[batch:b_12345]')).toBe(true);
      expect(isRecordWithoutDetails('[batch:xyz]')).toBe(true);
    });

    it('detects user notes as having details', () => {
      expect(isRecordWithoutDetails('Солодкі, стиглі плоди')).toBe(false);
      expect(isRecordWithoutDetails('[batch:b_123] віддали сусідам')).toBe(false);
    });
  });

  describe('rememberLastUnit', () => {
    it('remembers and retrieves the last chosen unit for a crop', async () => {
      await rememberLastUnit('Полуниця', 'GRAM');
      const retrieved = await getRememberedUnit('Полуниця');
      expect(retrieved).toBe('GRAM');

      // Default fallback
      const nonExistent = await getRememberedUnit('РідкіснаРослинаНевідома');
      expect(nonExistent).toBe('KILOGRAM');
    });
  });
});
