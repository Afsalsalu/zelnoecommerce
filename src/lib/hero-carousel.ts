export const HERO_AUTOPLAY_MS = 5000;
export const HERO_SWIPE_THRESHOLD_PX = 40;

export function heroHasControls(bannerCount: number): boolean {
  return bannerCount > 1;
}

export function shouldAutoplayHero(bannerCount: number, reducedMotion: boolean, paused: boolean): boolean {
  return heroHasControls(bannerCount) && !reducedMotion && !paused;
}

export function nextHeroIndex(current: number, bannerCount: number, step: -1 | 1): number {
  if (bannerCount < 1) return 0;
  return (current + step + bannerCount) % bannerCount;
}

export function swipeStep(deltaX: number, threshold = HERO_SWIPE_THRESHOLD_PX): -1 | 0 | 1 {
  if (Math.abs(deltaX) < threshold) return 0;
  return deltaX < 0 ? 1 : -1;
}
