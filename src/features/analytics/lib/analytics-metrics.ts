import type { AnalyticsSummaryDto } from '@smart-garden/types';

export type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export type MonthlyBarPoint = {
  period: string;
  label: string;
  kg: number;
};

export type ProductivityInsight = {
  tone: 'ok' | 'warn' | 'info';
  title: string;
  message: string;
};

const CARE_META: Record<string, { label: string; color: string }> = {
  WATERING: { label: 'Полив та зволоження', color: '#2980B9' },
  FERTILIZING: { label: 'Підживлення та добрива', color: '#8E44AD' },
  PRUNING: { label: 'Обрізка та формування', color: '#16A085' },
  PEST_TREATMENT: { label: 'Захист від шкідників', color: '#D35400' },
  SOIL_TREATMENT: { label: 'Догляд за ґрунтом', color: '#7F8C8D' },
  TRANSPLANTING: { label: 'Пересадка', color: '#27AE60' },
  TYING: { label: 'Підв’язування', color: '#E67E22' },
  OTHER: { label: 'Інший догляд', color: '#5D6D7E' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  GROWING: { label: 'Активний ріст', color: '#27AE60' },
  FLOWERING: { label: 'Цвітіння', color: '#9B59B6' },
  FRUITING: { label: 'Плодоношення', color: '#E67E22' },
  HARVESTING: { label: 'Збір урожаю', color: '#D35400' },
  PLANTED: { label: 'Висаджено', color: '#2980B9' },
  PLANNED: { label: 'Заплановано', color: '#7F8C8D' },
  FINISHED: { label: 'Завершено сезон', color: '#95A5A6' },
  HAS_PROBLEM: { label: 'Потребує уваги', color: '#C0392B' },
};

const UK_MONTHS = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function formatMonthShort(period: string): string {
  const parts = period.split('-');
  if (parts.length < 2) return period;
  const monthIdx = Number(parts[1]) - 1;
  return UK_MONTHS[monthIdx] ?? period;
}

export function computeHarvestMetrics(summary: AnalyticsSummaryDto | undefined, year: number) {
  if (!summary) {
    return {
      seasonMassKg: 0,
      totalMassKg: 0,
      seasonPieces: 0,
      seasonLiters: 0,
      yieldKgPerSqM: null as number | null,
      monthlyMassSeries: [] as MonthlyBarPoint[],
    };
  }

  const yearPrefix = `${year}-`;
  let seasonGrams = 0;
  let totalGrams = 0;

  for (const point of summary.harvestByMassGrams) {
    const val = Number(point.total) || 0;
    totalGrams += val;
    if (point.period.startsWith(yearPrefix)) {
      seasonGrams += val;
    }
  }

  let seasonPieces = 0;
  for (const point of summary.harvestByPieces) {
    if (point.period.startsWith(yearPrefix)) {
      seasonPieces += Number(point.total) || 0;
    }
  }

  let seasonLiters = 0;
  for (const point of summary.harvestByLiters) {
    if (point.period.startsWith(yearPrefix)) {
      seasonLiters += Number(point.total) || 0;
    }
  }

  const seasonMassKg = round1(seasonGrams / 1000);
  const totalMassKg = round1(totalGrams / 1000);
  const yieldKgPerSqM =
    summary.totalAreaSqM > 0 && seasonMassKg > 0
      ? round2(seasonMassKg / summary.totalAreaSqM)
      : null;

  const monthlyMassSeries = summary.harvestByMassGrams
    .slice(-6)
    .map((point) => ({
      period: point.period,
      label: formatMonthShort(point.period),
      kg: round2((Number(point.total) || 0) / 1000),
    }));

  return {
    seasonMassKg,
    totalMassKg,
    seasonPieces: round1(seasonPieces),
    seasonLiters: round1(seasonLiters),
    yieldKgPerSqM,
    monthlyMassSeries,
  };
}

export function computeCareBreakdown(careByType: Array<{ type: string; count: number }>): BreakdownRow[] {
  const total = careByType.reduce((acc, item) => acc + item.count, 0);
  if (total <= 0) return [];
  return [...careByType]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item) => {
      const meta = CARE_META[item.type] ?? { label: item.type, color: '#5D6D7E' };
      return {
        key: item.type,
        label: meta.label,
        count: item.count,
        percentage: Math.round((item.count / total) * 100),
        color: meta.color,
      };
    });
}

export function computeStatusBreakdown(plantsByStatus: Array<{ status: string; count: number }>): BreakdownRow[] {
  const total = plantsByStatus.reduce((acc, item) => acc + item.count, 0);
  if (total <= 0) return [];
  return [...plantsByStatus]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item) => {
      const meta = STATUS_META[item.status] ?? { label: item.status, color: '#7F8C8D' };
      return {
        key: item.status,
        label: meta.label,
        count: item.count,
        percentage: Math.round((item.count / total) * 100),
        color: meta.color,
      };
    });
}

export function computeTaskCompletionRate(summary: AnalyticsSummaryDto | undefined): number | null {
  if (!summary) return null;
  const total = summary.completedTasksCount + summary.openTasksCount;
  if (total <= 0) return null;
  return Math.round((summary.completedTasksCount / total) * 100);
}

export function buildProductivityInsights(
  summary: AnalyticsSummaryDto | undefined,
  seasonMassKg: number,
  yieldKgPerSqM: number | null,
): ProductivityInsight[] {
  if (!summary) return [];
  const insights: ProductivityInsight[] = [];

  if (summary.overdueTasksCount > 0) {
    insights.push({
      tone: 'warn',
      title: `Прострочені завдання (${summary.overdueTasksCount})`,
      message: 'Є завдання догляду з простроченим терміном. Перевірте список завдань, щоб не втратити темп росту рослин.',
    });
  }

  if (summary.openProblemsCount > 0) {
    insights.push({
      tone: 'warn',
      title: `Відкриті проблеми (${summary.openProblemsCount})`,
      message: 'Зафіксовано активні проблеми зі здоров’ям рослин. Своєчасна обробка зменшує втрати врожаю.',
    });
  }

  if (summary.plantsCount > 0 && summary.careLast30DaysCount === 0) {
    insights.push({
      tone: 'info',
      title: 'Немає записів догляду за 30 днів',
      message: 'Фіксуйте полив, підживлення та обробку в картці рослини, щоб бачити реальний баланс догляду.',
    });
  }

  if (seasonMassKg > 0) {
    const densityPart = yieldKgPerSqM !== null ? ` (продуктивність ${yieldKgPerSqM} кг/м²)` : '';
    insights.push({
      tone: 'ok',
      title: `Урожайність сезону: ${seasonMassKg} кг`,
      message: `Зібрано ${seasonMassKg} кг урожаю${densityPart} по ${summary.plantsCount} рослинах.`,
    });
  }

  if (insights.length === 0) {
    const rate = computeTaskCompletionRate(summary);
    insights.push({
      tone: 'ok',
      title: 'Сад у стабільному стані',
      message:
        rate !== null
          ? `Виконано ${rate}% запланованих завдань, за останні 30 днів проведено ${summary.careLast30DaysCount} операцій догляду.`
          : `У саду ${summary.plantsCount} рослин у ${summary.zonesCount} зонах без відкритих проблем чи прострочених завдань.`,
    });
  }

  return insights;
}

