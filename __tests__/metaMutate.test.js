import { initMeta, mutateRules, setPerformanceSettings, getRules, formatRules } from '../metaMutate.js';

describe('meta mutation rules', () => {
  beforeEach(() => {
    localStorage.clear();
    initMeta();
  });

  test('initMeta sets default blood limit when no saved data', () => {
    const rules = getRules();
    expect(rules.bloodLimit).toBeGreaterThan(0);
  });

  test('setPerformanceSettings overrides blood limit', () => {
    setPerformanceSettings({ bloodLimit: 123 });
    const rules = getRules();
    expect(rules.bloodLimit).toBe(123);
  });

  test('mutateRules changes one of the rule values', () => {
    const before = { ...getRules() };
    const result = mutateRules();
    const after = getRules();
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('value');
    // at least one rule changed
    const changed = Object.keys(before).some(k => before[k] !== after[k]);
    expect(changed).toBe(true);
  });

  test('formatRules outputs string', () => {
    const str = formatRules();
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });
});
