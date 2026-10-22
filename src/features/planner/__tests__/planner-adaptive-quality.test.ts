import {
  AdaptiveQualityMonitor,
  detectInitialQualityTier,
  QUALITY_PROFILES,
  type QualityTier,
} from '../utils/adaptive-quality';

describe('AdaptiveQualityMonitor (Hysteresis & Performance Guard)', () => {
  it('has consistent definitions for all quality profiles', () => {
    expect(QUALITY_PROFILES.high.fpsCap).toBe(60);
    expect(QUALITY_PROFILES.high.antialias).toBe(true);
    expect(QUALITY_PROFILES.medium.fpsCap).toBe(60);
    expect(QUALITY_PROFILES.medium.antialias).toBe(false);
    expect(QUALITY_PROFILES.low.fpsCap).toBe(30); // 30 FPS cap protects thermal budget
    expect(QUALITY_PROFILES.low.antialias).toBe(false);
  });

  it('detects initial tier as medium for mobile platforms', () => {
    const tier = detectInitialQualityTier();
    expect(tier).toBe('medium');
  });

  it('downgrades quality tier when FPS < 40 for 2 seconds', () => {
    let changedTier: QualityTier = 'high';
    const monitor = new AdaptiveQualityMonitor('high', (tier) => {
      changedTier = tier;
    });

    let timeMs = 1000;
    monitor.recordFrame(timeMs);

    // Warmup (20 frames) + simulate 30 FPS (33.3ms per frame) for > 2000ms
    for (let i = 0; i < 90; i++) {
      timeMs += 33.3;
      monitor.recordFrame(timeMs);
    }

    // High should have degraded to Medium
    expect(monitor.getTier()).toBe('medium');
    expect(changedTier).toBe('medium');

    // Simulate another 90 frames of 30 FPS (> 2000ms)
    for (let i = 0; i < 90; i++) {
      timeMs += 33.3;
      monitor.recordFrame(timeMs);
    }

    // Medium should have degraded to Low
    expect(monitor.getTier()).toBe('low');
    expect(changedTier).toBe('low');
  });

  it('triggers onSuggest25D when FPS < 25 on low tier', () => {
    let suggested25D = false;
    const monitor = new AdaptiveQualityMonitor(
      'low',
      undefined,
      () => {
        suggested25D = true;
      },
    );

    let timeMs = 1000;
    monitor.recordFrame(timeMs);

    // Warmup (20 frames) + simulate 20 FPS (50ms per frame) for > 2000ms
    for (let i = 0; i < 70; i++) {
      timeMs += 50;
      monitor.recordFrame(timeMs);
    }

    expect(suggested25D).toBe(true);
  });

  it('upgrades quality tier only after 10 seconds of stable >= 58 FPS (hysteresis)', () => {
    let changedTier: QualityTier = 'low';
    const monitor = new AdaptiveQualityMonitor('low', (tier) => {
      changedTier = tier;
    });

    let timeMs = 1000;
    monitor.recordFrame(timeMs);

    // Simulate 60 FPS (16.6ms per frame) for 5 seconds (5000ms < 10000ms)
    const framesFor5Sec = Math.floor(5000 / 16.6);
    for (let i = 0; i < framesFor5Sec; i++) {
      timeMs += 16.6;
      monitor.recordFrame(timeMs);
    }

    // Hysteresis prevents premature upgrade after only 5 seconds
    expect(monitor.getTier()).toBe('low');

    // Simulate another 6 seconds of 60 FPS (total > 10000ms)
    const framesFor6Sec = Math.floor(6000 / 16.6);
    for (let i = 0; i < framesFor6Sec; i++) {
      timeMs += 16.6;
      monitor.recordFrame(timeMs);
    }

    // After 10s of stable 60 FPS, Low upgrades to Medium
    expect(monitor.getTier()).toBe('medium');
    expect(changedTier).toBe('medium');
  });

  it('resets frame times and counters on reset()', () => {
    const monitor = new AdaptiveQualityMonitor('medium');
    let timeMs = 1000;
    for (let i = 0; i < 30; i++) {
      timeMs += 33.3;
      monitor.recordFrame(timeMs);
    }

    monitor.reset();
    expect(monitor.getTier()).toBe('medium');
  });
});
