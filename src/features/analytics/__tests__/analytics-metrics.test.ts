import type { AnalyticsSummaryDto } from '@smart-garden/types';
import {
  buildProductivityInsights,
  computeCareBreakdown,
  computeHarvestMetrics,
  computeStatusBreakdown,
  computeTaskCompletionRate,
} from '@/src/features/analytics/lib/analytics-metrics';

const baseSummary: AnalyticsSummaryDto = {
  gardensCount: 1,
  zonesCount: 3,
  plantsCount: 12,
  openProblemsCount: 0,
  resolvedProblemsCount: 2,
  openTasksCount: 2,
  completedTasksCount: 8,
  overdueTasksCount: 0,
  careLast30DaysCount: 15,
  totalAreaSqM: 20,
  harvestByMassGrams: [
    { period: '2026-06', total: '4500', unit: 'GRAM' },
    { period: '2026-07', total: '15500', unit: 'GRAM' },
  ],
  harvestByPieces: [{ period: '2026-07', total: '14', unit: 'PIECE' }],
  harvestByLiters: [{ period: '2026-07', total: '3.5', unit: 'LITER' }],
  plantsByStatus: [
    { status: 'GROWING', count: 9 },
    { status: 'HARVESTING', count: 3 },
  ],
  careByType: [
    { type: 'WATERING', count: 10 },
    { type: 'FERTILIZING', count: 5 },
  ],
};

describe('analytics-metrics', () => {
  it('обчислює масу сезону, штуки, літри та врожайність на м²', () => {
    const metrics = computeHarvestMetrics(baseSummary, 2026);
    expect(metrics.seasonMassKg).toBe(20);
    expect(metrics.seasonPieces).toBe(14);
    expect(metrics.seasonLiters).toBe(3.5);
    expect(metrics.yieldKgPerSqM).toBe(1);
    expect(metrics.monthlyMassSeries).toEqual([
      { period: '2026-06', label: 'Чер', kg: 4.5 },
      { period: '2026-07', label: 'Лип', kg: 15.5 },
    ]);
  });

  it('рахує реальний баланс операцій догляду та статусів рослин', () => {
    const care = computeCareBreakdown(baseSummary.careByType);
    expect(care[0]).toMatchObject({ key: 'WATERING', count: 10, percentage: 67 });
    expect(care[1]).toMatchObject({ key: 'FERTILIZING', count: 5, percentage: 33 });

    const statuses = computeStatusBreakdown(baseSummary.plantsByStatus);
    expect(statuses[0]).toMatchObject({ key: 'GROWING', count: 9, percentage: 75 });
    expect(statuses[1]).toMatchObject({ key: 'HARVESTING', count: 3, percentage: 25 });
  });

  it('рахує відсоток виконання завдань', () => {
    expect(computeTaskCompletionRate(baseSummary)).toBe(80);
    expect(computeTaskCompletionRate({ ...baseSummary, completedTasksCount: 0, openTasksCount: 0 })).toBeNull();
  });

  it('генерує попередження при прострочених завданнях та відкритих проблемах', () => {
    const insights = buildProductivityInsights(
      { ...baseSummary, overdueTasksCount: 2, openProblemsCount: 1 },
      20,
      1,
    );
    expect(insights.some((i) => i.tone === 'warn' && i.title.includes('Прострочені'))).toBe(true);
    expect(insights.some((i) => i.tone === 'warn' && i.title.includes('Відкриті проблеми'))).toBe(true);
  });
});

