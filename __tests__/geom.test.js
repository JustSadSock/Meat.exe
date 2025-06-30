import { AABB, circleVsCircle, circleVsAABB, circleInsideAABB, clampCircleToAABB } from '../geom.js';

describe('geom utilities', () => {
  test('circle vs circle collision', () => {
    const a = {x: 0, y: 0, r: 1};
    const b = {x: 1.5, y: 0, r: 1};
    expect(circleVsCircle(a, b)).toBe(true);
    b.x = 3;
    expect(circleVsCircle(a, b)).toBe(false);
  });

  test('circle vs AABB collision', () => {
    const c = {x: 1, y: 1, r: 0.5};
    const box = AABB(0, 0, 2, 2);
    expect(circleVsAABB(c, box)).toBe(true);
    c.x = 3; c.y = 3;
    expect(circleVsAABB(c, box)).toBe(false);
  });

  test('circle inside AABB', () => {
    const c = {x: 1, y: 1, r: 0.5};
    const box = AABB(0, 0, 2, 2);
    expect(circleInsideAABB(c, box)).toBe(true);
    c.x = -0.1;
    expect(circleInsideAABB(c, box)).toBe(false);
  });

  test('clamp circle to AABB', () => {
    const c = {x: -1, y: -1, r: 0.5};
    const box = AABB(0, 0, 2, 2);
    clampCircleToAABB(c, box);
    expect(c.x).toBeCloseTo(0.5);
    expect(c.y).toBeCloseTo(0.5);
  });
});
