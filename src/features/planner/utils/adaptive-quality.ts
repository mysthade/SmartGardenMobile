import { Platform } from 'react-native';

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  pixelRatio: number;
  gestureDprMultiplier: number;
  shadowsEnabled: boolean;
  antialias: boolean;
  materialType: 'standard' | 'lambert';
  fpsCap: number; // 60 or 30
  maxTriangles: number;
  enableLOD: boolean;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    pixelRatio: 2.0,
    gestureDprMultiplier: 0.75,
    shadowsEnabled: true,
    antialias: true,
    materialType: 'standard',
    fpsCap: 60,
    maxTriangles: 150000,
    enableLOD: true,
  },
  medium: {
    tier: 'medium',
    pixelRatio: 1.5,
    gestureDprMultiplier: 0.7,
    shadowsEnabled: false, // blob contact shadows
    antialias: false,
    materialType: 'lambert',
    fpsCap: 60,
    maxTriangles: 80000,
    enableLOD: true,
  },
  low: {
    tier: 'low',
    pixelRatio: 1.0,
    gestureDprMultiplier: 0.65,
    shadowsEnabled: false,
    antialias: false,
    materialType: 'lambert',
    fpsCap: 30, // 30 FPS cap saves thermal budget and battery
    maxTriangles: 40000,
    enableLOD: true,
  },
};

/**
 * Початкова класифікація пристрою за доступними параметрами платформі.
 */
export function detectInitialQualityTier(): QualityTier {
  if (Platform.OS === 'web') {
    return 'high';
  }
  // На Android за замовчуванням стартуємо зі збалансованого medium,
  // далі адаптивний монітор скоригує рівень за перші 60 кадрів
  return 'medium';
}

/**
 * Клас адаптивного монітора якості з гістерезисом.
 */
export class AdaptiveQualityMonitor {
  private currentTier: QualityTier;
  private frameTimes: number[] = [];
  private lowFpsDurationMs = 0;
  private highFpsDurationMs = 0;
  private lastTimestamp = 0;
  private onTierChange?: (tier: QualityTier) => void;
  private onSuggest25D?: () => void;
  private hasSuggested25D = false;

  constructor(
    initialTier: QualityTier = detectInitialQualityTier(),
    onTierChange?: (tier: QualityTier) => void,
    onSuggest25D?: () => void,
  ) {
    this.currentTier = initialTier;
    this.onTierChange = onTierChange;
    this.onSuggest25D = onSuggest25D;
  }

  public getProfile(): QualityProfile {
    return QUALITY_PROFILES[this.currentTier];
  }

  public getTier(): QualityTier {
    return this.currentTier;
  }

  public setTier(tier: QualityTier) {
    this.currentTier = tier;
    this.lowFpsDurationMs = 0;
    this.highFpsDurationMs = 0;
    this.onTierChange?.(tier);
  }

  /**
   * Фіксація кадру для розрахунку середнього FPS та адаптивного регулювання.
   */
  public recordFrame(nowMs: number): QualityProfile {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = nowMs;
      return this.getProfile();
    }

    const deltaMs = nowMs - this.lastTimestamp;
    this.lastTimestamp = nowMs;

    // Ігноруємо надто великі стрибки (наприклад, повернення зі сну)
    if (deltaMs > 300) {
      return this.getProfile();
    }

    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    if (this.frameTimes.length >= 20) {
      const avgDeltaMs =
        this.frameTimes.reduce((acc, v) => acc + v, 0) / this.frameTimes.length;
      const currentFps = 1000 / Math.max(1, avgDeltaMs);

      // Гістерезис: зниження якості при FPS < 40 протягом 2 секунд (2000 мс)
      if (currentFps < 40) {
        this.lowFpsDurationMs += deltaMs;
        this.highFpsDurationMs = 0;

        if (this.lowFpsDurationMs >= 2000) {
          this.lowFpsDurationMs = 0;
          if (this.currentTier === 'high') {
            this.setTier('medium');
          } else if (this.currentTier === 'medium') {
            this.setTier('low');
          } else if (this.currentTier === 'low' && currentFps < 25 && !this.hasSuggested25D) {
            this.hasSuggested25D = true;
            this.onSuggest25D?.();
          }
        }
      } else if (currentFps >= 58) {
        // Підвищення якості назад лише після 10 секунд стабільних >= 58 FPS
        this.highFpsDurationMs += deltaMs;
        this.lowFpsDurationMs = 0;

        if (this.highFpsDurationMs >= 10000) {
          this.highFpsDurationMs = 0;
          if (this.currentTier === 'low') {
            this.setTier('medium');
          } else if (this.currentTier === 'medium') {
            this.setTier('high');
          }
        }
      } else {
        this.lowFpsDurationMs = 0;
        this.highFpsDurationMs = 0;
      }
    }

    return this.getProfile();
  }

  public reset() {
    this.frameTimes = [];
    this.lowFpsDurationMs = 0;
    this.highFpsDurationMs = 0;
    this.lastTimestamp = 0;
    this.hasSuggested25D = false;
  }
}
