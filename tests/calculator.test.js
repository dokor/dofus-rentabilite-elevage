import test from 'node:test';
import assert from 'node:assert/strict';
import { MOUNT_XP } from '../dist/xp-data.js';
import { defaultConfig, validate, hydrate, compareNets, calculate, compareLevels, bestLevel, runeYield, csv, FUELS } from '../dist/calculator.js';

function scenario(overrides = {}) { return { ...defaultConfig(), ...overrides }; }
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`); }

test('XP table contains all 200 mount levels and the verified thresholds', () => {
  assert.equal(MOUNT_XP.length, 201);
  assert.equal(MOUNT_XP[1], 0);
  assert.equal(MOUNT_XP[53], 39360);
  assert.equal(MOUNT_XP[55], 42906);
  assert.equal(MOUNT_XP[100], 172668);
  assert.equal(MOUNT_XP[200], 867582);
  for (let level = 2; level <= 200; level++) assert.ok(MOUNT_XP[level] > MOUNT_XP[level - 1]);
});

test('20 level-55 mounts, 10 focused, use 10 nets and 16 fuel units, not 160', () => {
  const r = calculate(defaultConfig());
  assert.equal(r.net.quantity, 10);
  assert.equal(r.net.cost, 20000);
  assert.equal(r.batches, 2);
  assert.equal(r.waves, 1);
  assert.equal(r.consumed, 42910);
  assert.equal(r.fuelPerBatch, 8);
  assert.equal(r.fuelQuantity, 16);
  assert.equal(r.fuelCost, 24000);
  near(r.runes, 8.35);
  near(r.focusRunes, 4.175);
  near(r.normalRunes, 4.175);
  near(r.profit, 119660);
  near(r.roi, 119660 / 44000 * 100);
  near(r.elapsedHours, 42910 / 3600 + 35 / 60);
});

test('focus receives no invented yield bonus under the default projection', () => {
  const noFocus = calculate(scenario({ focusCount: 0, otherRunes: 100 }));
  const allFocus = calculate(scenario({ focusCount: 20, otherRunes: 100 }));
  assert.equal(noFocus.runes, allFocus.runes);
  assert.equal(noFocus.otherRevenue, allFocus.otherRevenue);
  assert.equal(noFocus.profit, allFocus.profit);
});

test('fuel rounds by groups, including an incomplete 11th mount', () => {
  assert.equal(calculate(scenario({ count: 10, focusCount: 0 })).fuelQuantity, 8);
  assert.equal(calculate(scenario({ count: 11, focusCount: 0 })).fuelQuantity, 16);
  assert.equal(calculate(scenario({ count: 21, focusCount: 0 })).fuelQuantity, 24);
});

test('one paddock processes two groups sequentially, two paddocks in parallel', () => {
  const one = calculate(scenario({ paddocks: 1 }));
  const two = calculate(scenario({ paddocks: 2 }));
  assert.equal(one.enclosureHours, two.enclosureHours * 2);
  assert.equal(one.costs, two.costs);
  assert.equal(one.activeHours, two.activeHours);
});

test('Sage halves fuel consumption, without dividing capture work', () => {
  const base = calculate(defaultConfig());
  const sage = calculate(scenario({ sage: true }));
  assert.equal(sage.consumed, 21460);
  assert.equal(sage.fuelQuantity, 8);
  assert.equal(sage.activeHours, base.activeHours);
  assert.equal(sage.runes, base.runes);
});

test('fuel reserve is charged per group without pretending it is consumed XP', () => {
  const r = calculate(scenario({ reserve: 180000 }));
  assert.equal(r.fuelPerBatch, 38);
  assert.equal(r.fuelQuantity, 76);
  assert.equal(r.consumed, 42910);
  assert.equal(r.enclosureHours, calculate(defaultConfig()).enclosureHours);
});

test('an already reached level requires no fuel or reserve', () => {
  const r = calculate(scenario({ startLevel: 55, reserve: 180000 }));
  assert.equal(r.xp, 0);
  assert.equal(r.fuelQuantity, 0);
  assert.equal(r.enclosureHours, 0);
});

test('net choice compares rounded total purchase cost rather than nominal price', () => {
  const c = scenario({ count: 3, focusCount: 0 });
  c.nets[0].price = 1000;
  c.nets[1].price = 1700;
  assert.equal(compareNets(c)[0].id, 'universal');
  assert.equal(compareNets(c).find(n => n.id === 'multiplier').cost, 3400);
});

test('fractional captures per net are supported and round the number of nets up', () => {
  const c = defaultConfig();
  c.nets[1].yield = 2.7;
  assert.equal(calculate(c).net.quantity, 8);
});

test('observed focused and normal yields are independently valued', () => {
  const c = scenario({ model: 'observed', coefficient: 999, observations: [{ level: 55, normal: .4, focus: .6 }], otherRunes: 100 });
  const r = calculate(c);
  assert.equal(r.runes, 10);
  assert.equal(r.otherRevenue, 1000);
  assert.equal(r.kind, 'relevé');
  near(r.profit, 201000 * .98 - 44000);
});

test('observations interpolate inside their range, never outside', () => {
  const c = scenario({ model: 'observed', observations: [{ level: 40, normal: .2, focus: .4 }, { level: 60, normal: .6, focus: .8 }] });
  near(runeYield(50, c).normal, .4);
  near(runeYield(50, c).focus, .6);
  assert.equal(runeYield(39, c), null);
  assert.equal(runeYield(61, c), null);
  assert.equal(calculate(c, 61).available, false);
  assert.equal('profit' in calculate(c, 61), false);
});

test('a single observation covers exactly its own level', () => {
  const c = scenario({ model: 'observed', observations: [{ level: 55, normal: .5, focus: .5 }] });
  const available = compareLevels(c).filter(r => r.available);
  assert.deepEqual(available.map(r => r.level), [55]);
  assert.equal(bestLevel(available, 'profit').level, 55);
});

test('no observations cannot produce a false profitability recommendation', () => {
  const c = scenario({ model: 'observed' });
  assert.equal(calculate(c).available, false);
  assert.equal(bestLevel(compareLevels(c), 'profit'), null);
});

test('zero Ga Pa yield has no finite break-even rune price', () => {
  const c = scenario({ model: 'observed', observations: [{ level: 55, normal: 0, focus: 0 }] });
  const r = calculate(c);
  assert.equal(r.runes, 0);
  assert.equal(r.breakEven, null);
  assert.equal(r.profit, -r.costs);
});

test('break-even price actually sets cycle profit to zero', () => {
  const c = scenario({ loot: 1000, otherRunes: 100, tax: 3 });
  const threshold = calculate(c).breakEven;
  near(calculate({ ...c, runePrice: threshold }).profit, 0);
});

test('tax applies to all sales, not to the cost basis', () => {
  const c = scenario({ tax: 10, loot: 1000, otherRunes: 100 });
  const r = calculate(c);
  near(r.revenue, (167000 + 1000 + 2000) * .9);
  near(r.profit, r.revenue - 44000);
});

test('fixed investment affects cash and payback separately from cycle profit', () => {
  const base = calculate(defaultConfig());
  const r = calculate(scenario({ fixedInvestment: 250000 }));
  assert.equal(r.profit, base.profit);
  assert.equal(r.cashNeeded, 294000);
  near(r.firstCycleProfit, -130340);
  assert.equal(r.payback, 3);
  assert.equal(calculate(scenario({ fixedInvestment: 100, runePrice: 0 })).payback, null);
});

test('zero costs and zero time remain defined without infinite ROI or hourly rate', () => {
  const c = scenario({ level: 1, handlingMinutes: 0, captureMinutes: 0 });
  c.nets.forEach(n => n.price = 0);
  const r = calculate(c);
  assert.equal(r.costs, 0);
  assert.equal(r.roi, null);
  assert.equal(r.perHour, null);
  assert.equal(r.perActiveHour, null);
  assert.equal(bestLevel([r], 'roi'), null);
});

test('optimizer handles negative profits honestly and deterministic ties', () => {
  const rows = [{ available: true, level: 2, profit: -10 }, { available: true, level: 3, profit: -10 }, { available: true, level: 4, profit: -20 }];
  assert.equal(bestLevel(rows, 'profit').level, 2);
});

test('all 200 compared levels remain finite and satisfy accounting identities', () => {
  for (const r of compareLevels(defaultConfig())) {
    assert.ok(Number.isFinite(r.profit));
    assert.ok(Number.isFinite(r.elapsedHours));
    near(r.costs, r.net.cost + r.fuelCost);
    near(r.profit, r.revenue - r.costs);
    near(r.focusRunes + r.normalRunes, r.runes);
  }
});

test('all 20 fuel profiles have 3.7 charges and tier ceilings', () => {
  assert.equal(FUELS.length, 20);
  assert.equal(FUELS.find(f => f.id === 'fuel-0-2').charge, 6000);
  assert.equal(FUELS.find(f => f.id === 'fuel-3-4').ceiling, 200000);
});

test('bad numeric inputs and duplicate observations are rejected', () => {
  for (const overrides of [{ count: 0 }, { count: 2.5 }, { runePrice: -1 }, { xpHour: 0 }, { charge: 0 }, { tax: 100 }, { focusCount: 21 }, { paddocks: 7 }, { level: 201 }, { startLevel: 56 }, { count: NaN }, { coefficient: Infinity }, { observations: [{ level: 55, normal: .5, focus: .5 }, { level: 55, normal: .5, focus: .5 }] }]) {
    assert.ok(validate(scenario(overrides)).length, JSON.stringify(overrides));
  }
});

test('JSON import validates structure and preserves zero values', () => {
  const c = hydrate(JSON.parse(JSON.stringify(scenario({ runePrice: 0, tax: 0 }))));
  assert.equal(c.runePrice, 0);
  assert.equal(c.tax, 0);
  assert.throws(() => hydrate({ ...defaultConfig(), fuelPrices: {} }));
  assert.throws(() => hydrate({ ...defaultConfig(), sage: 'false' }));
  assert.throws(() => hydrate(null));
});

test('CSV exports all rows, with unavailable data left empty and Excel decimal commas', () => {
  const output = csv(compareLevels(defaultConfig()));
  assert.equal(output.split('\r\n').length, 201);
  assert.ok(output.includes(';8,35;'));
  assert.ok(output.startsWith('\uFEFFNiveau;'));
  const observed = csv(compareLevels(scenario({ model: 'observed' })));
  assert.ok(observed.includes('non couvert'));
  assert.ok(!observed.includes('NaN'));
});
