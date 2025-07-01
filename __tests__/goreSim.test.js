import { bindPlayer, spawnBlood, updateBlood, getBlood, applyBloodEffects } from '../goreSim.js';
import { setPerformanceSettings } from '../metaMutate.js';

describe('gore simulation', () => {
  beforeEach(() => {
    localStorage.clear();
    setPerformanceSettings({ bloodLimit: 5 });
    bindPlayer({ hp: 50 });
    getBlood().length = 0; // reset internal blood array if accessible
  });

  test('spawnBlood respects limit and heals player', () => {
    const player = { hp: 50 };
    bindPlayer(player);
    // spawn more than limit
    spawnBlood(0, 0, 'normal', 10);
    expect(getBlood().length).toBeLessThanOrEqual(5);
    // after exceeding limit, player should receive some hp
    expect(player.hp).toBeGreaterThan(50);
  });

  test('updateBlood decreases life and removes dead particles', () => {
    spawnBlood(0, 0, 'normal', 2);
    const b = getBlood();
    const initialLength = b.length;
    // set life low to ensure removal
    b.forEach(p => p.life = 0.01);
    updateBlood(0.02);
    expect(getBlood().length).toBeLessThan(initialLength);
  });

  test('applyBloodEffects damages nearby entities', () => {
    const enemy = { x: 0, y: 0, hp: 5, speed: 1 };
    const player = { x: 0, y: 0, hp: 5 };
    bindPlayer(player);
    spawnBlood(0, 0, 'burning', 1);
    applyBloodEffects([enemy], player, 0.1);
    expect(enemy.hp).toBeLessThan(5);
    expect(player.hp).toBeLessThan(5);
  });
});
