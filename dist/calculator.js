import { MOUNT_XP } from './xp-data.js';

export const NETS = [
  { id: 'universal', name: 'Filet de capture universel', price: 1200, yield: 1 },
  { id: 'multiplier', name: 'Filet multiplicateur de Volkorne', price: 2000, yield: 2 },
  { id: 'reinforced', name: 'Filet à Volkorne renforcé', price: 4000, yield: 3 },
  { id: 'both', name: 'Filet multiplicateur de Volkorne renforcé', price: 6000, yield: 6 },
];
const sizes = ['Minuscule', 'Petit', '', 'Grand', 'Gigantesque'];
export const FUELS = ['Extrait', 'Philtre', 'Potion', 'Élixir'].flatMap((family, f) =>
  sizes.map((size, s) => ({ id: `fuel-${f}-${s}`, name: `${family === 'Potion' ? size.replace('Petit', 'Petite').replace('Grand', 'Grande') : size} ${family} d’expérience de monture`.trim(), charge: (s + 1) * 2000, family, ceiling: [80000, 140000, 180000, 200000][f] }))
);

export function defaultConfig() {
  return {
    count: 20, startLevel: 1, level: 55, focusCount: 10, runePrice: 20000,
    tax: 2, coefficient: 50, nets: NETS.map(n => ({ ...n })), netId: 'multiplier',
    fuelId: 'fuel-0-2', fuelPrices: Object.fromEntries(FUELS.map(f => [f.id, 1500])),
    charge: 6000, xpHour: 3600, sage: false, paddocks: 2, reserve: 0,
    captureMinutes: 3, handlingMinutes: 5, otherCosts: 0, fixedInvestment: 0,
    loot: 0, otherRunes: 0, model: 'theory', observations: [], objective: 'profit',
    scenarioName: 'Mon scénario',
  };
}

const integerFields = ['count', 'startLevel', 'level', 'focusCount', 'paddocks'];
const numberFields = ['count', 'startLevel', 'level', 'focusCount', 'runePrice', 'tax', 'coefficient', 'charge', 'xpHour', 'paddocks', 'reserve', 'captureMinutes', 'handlingMinutes', 'otherCosts', 'fixedInvestment', 'loot', 'otherRunes'];

// Validate both user input and imported/localStorage data before any financial result.
export function validate(c) {
  const errors = [];
  for (const key of numberFields) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < 0 || c[key] > 1e12) errors.push(`Valeur invalide : ${key}.`);
  }
  for (const key of integerFields) if (!Number.isInteger(c[key])) errors.push(`Un entier est nécessaire : ${key}.`);
  if (c.count < 1 || c.count > 10000) errors.push('Le lot doit contenir entre 1 et 10 000 montures.');
  if (c.startLevel < 1 || c.level > 200 || c.startLevel > c.level) errors.push('Les niveaux doivent vérifier 1 ≤ départ ≤ cible ≤ 200.');
  if (c.focusCount > c.count) errors.push('Le nombre en focus dépasse le lot.');
  if (c.paddocks < 1 || c.paddocks > 6) errors.push('Choisissez entre 1 et 6 enclos de 10 places.');
  if (c.tax >= 100) errors.push('La taxe doit être inférieure à 100 %.');
  if (c.charge <= 0 || c.xpHour <= 0) errors.push('Le carburant et la vitesse d’XP doivent être strictement positifs.');
  if (!['theory', 'observed'].includes(c.model)) errors.push('Modèle de brisage inconnu.');
  if (!['profit', 'hour', 'roi'].includes(c.objective)) errors.push('Objectif inconnu.');
  if (!Array.isArray(c.nets) || c.nets.length !== NETS.length || NETS.some(n => !c.nets.some(v => v.id === n.id))) errors.push('La liste des filets est invalide.');
  else for (const net of c.nets) {
    if (!Number.isFinite(net.price) || net.price < 0 || net.price > 1e12 || !Number.isFinite(net.yield) || net.yield <= 0 || net.yield > 100) errors.push('Prix ou rendement de filet invalide.');
  }
  if (!Array.isArray(c.nets) || !c.nets.some(n => n.id === c.netId)) errors.push('Filet inconnu.');
  if (!FUELS.some(f => f.id === c.fuelId)) errors.push('Carburant inconnu.');
  if (!c.fuelPrices || FUELS.some(f => !Number.isFinite(c.fuelPrices[f.id]) || c.fuelPrices[f.id] < 0 || c.fuelPrices[f.id] > 1e12)) errors.push('Prix des carburants invalides.');
  if (!Array.isArray(c.observations) || c.observations.length > 200) errors.push('Table de relevés invalide.');
  else {
    const levels = new Set();
    for (const row of c.observations) {
      if (!Number.isInteger(row.level) || row.level < 1 || row.level > 200 || levels.has(row.level) || !Number.isFinite(row.normal) || row.normal < 0 || row.normal > 100 || !Number.isFinite(row.focus) || row.focus < 0 || row.focus > 100) errors.push('Les relevés doivent avoir des niveaux uniques de 1 à 200 et des rendements positifs ou nuls.');
      levels.add(row.level);
    }
  }
  return [...new Set(errors)];
}

export function hydrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Configuration invalide.');
  const defaults = defaultConfig();
  const c = Object.fromEntries(Object.keys(defaults).map(k => [k, raw[k] ?? defaults[k]]));
  if (typeof c.sage !== 'boolean') throw new Error('Capacité Sage invalide.');
  if (typeof c.scenarioName !== 'string' || c.scenarioName.length > 80) throw new Error('Nom de scénario invalide.');
  const errors = validate(c);
  if (errors.length) throw new Error(errors.join(' '));
  return c;
}

export function runeYield(level, c) {
  if (c.model === 'theory') {
    // Standard equipment formula applied to a hypothetical 1 PA line. This is
    // explicitly a projection, not a verified mount-specific drop formula.
    const mean = ((100 * level * 0.015 + 1) / 100) * c.coefficient / 100;
    return { normal: mean, focus: mean, kind: 'projection' };
  }
  const rows = [...c.observations].sort((a, b) => a.level - b.level);
  const exact = rows.find(r => r.level === level);
  if (exact) return { normal: exact.normal, focus: exact.focus, kind: 'relevé' };
  const left = rows.filter(r => r.level < level).at(-1);
  const right = rows.find(r => r.level > level);
  if (!left || !right) return null; // Never extrapolate observations silently.
  const t = (level - left.level) / (right.level - left.level);
  return { normal: left.normal + t * (right.normal - left.normal), focus: left.focus + t * (right.focus - left.focus), kind: 'interpolation' };
}

export function compareNets(c) {
  return c.nets.map(net => {
    const quantity = Math.ceil(c.count / net.yield);
    return { ...net, quantity, cost: quantity * net.price, minutes: quantity * c.captureMinutes };
  }).sort((a, b) => a.cost - b.cost || a.minutes - b.minutes);
}

export function calculate(c, level = c.level) {
  const yieldData = runeYield(level, c);
  const net = compareNets(c).find(n => n.id === c.netId);
  const xp = MOUNT_XP[level] - MOUNT_XP[c.startLevel];
  // One gauge serves up to ten mounts, including an incomplete last batch.
  // Fuel is bought per batch, rounded up; leftover fuel has no resale credit.
  const batches = Math.ceil(c.count / 10);
  const waves = Math.ceil(batches / c.paddocks);
  const consumed = Math.ceil(xp / (c.sage ? 2 : 1) / 10) * 10;
  const fuelPerBatch = consumed === 0 ? 0 : Math.ceil((consumed + c.reserve) / c.charge);
  const fuelQuantity = batches * fuelPerBatch;
  const fuelCost = fuelQuantity * c.fuelPrices[c.fuelId];
  const costs = net.cost + fuelCost + c.otherCosts;
  const activeHours = (net.minutes + c.handlingMinutes) / 60;
  const enclosureHours = consumed / c.xpHour * waves;
  const elapsedHours = activeHours + enclosureHours;
  const common = { level, xp, batches, waves, consumed, fuelPerBatch, fuelQuantity, fuelCost, costs, net, activeHours, enclosureHours, elapsedHours, cashNeeded: costs + c.fixedInvestment };
  if (!yieldData) return { ...common, available: false };
  const noFocusCount = c.count - c.focusCount;
  const normalRunes = noFocusCount * yieldData.normal;
  const focusRunes = c.focusCount * yieldData.focus;
  const runes = normalRunes + focusRunes;
  const runeRevenue = runes * c.runePrice;
  // When focus has no effect, secondary runes remain for the whole lot.
  // With measured focus yields, conservatively count secondary runes only on
  // the non-focused subgroup (user may include the rest in additional sales).
  const secondaryCount = c.model === 'theory' ? c.count : noFocusCount;
  const otherRevenue = c.otherRunes * secondaryCount + c.loot;
  const gross = runeRevenue + otherRevenue;
  const revenue = gross * (1 - c.tax / 100);
  const profit = revenue - costs;
  const breakEven = runes > 0 ? Math.max(0, (costs / (1 - c.tax / 100) - otherRevenue) / runes) : null;
  return { ...common, ...yieldData, available: true, noFocusCount, normalRunes, focusRunes, runes, runeRevenue, otherRevenue, gross, revenue, profit, roi: costs > 0 ? profit / costs * 100 : null, perHour: elapsedHours > 0 ? profit / elapsedHours : null, perActiveHour: activeHours > 0 ? profit / activeHours : null, breakEven, firstCycleProfit: profit - c.fixedInvestment, payback: c.fixedInvestment === 0 ? 0 : profit > 0 ? Math.ceil(c.fixedInvestment / profit) : null };
}

export function compareLevels(c) {
  return Array.from({ length: 201 - c.startLevel }, (_, i) => calculate(c, c.startLevel + i));
}

export function bestLevel(rows, objective) {
  const key = { profit: 'profit', hour: 'perHour', roi: 'roi' }[objective];
  return rows.filter(r => r.available && Number.isFinite(r[key])).reduce((best, r) => !best || r[key] > best[key] + 1e-9 ? r : best, null);
}

export function csv(rows) {
  const header = ['Niveau', 'XP par monture', 'Carburants lot', 'Heures totales', 'Ga Pa moyennes', 'Investissement cycle', 'Recettes nettes', 'Benefice', 'ROI %', 'Kamas par heure', 'Type de rendement'];
  const cells = rows.map(r => [r.level, r.xp, r.fuelQuantity, r.elapsedHours, r.available ? r.runes : '', r.costs, r.available ? r.revenue : '', r.available ? r.profit : '', r.available ? r.roi ?? '' : '', r.available ? r.perHour ?? '' : '', r.available ? r.kind : 'non couvert']);
  return '\uFEFF' + [header, ...cells].map(row => row.map(v => typeof v === 'number' ? String(Math.round(v * 10000) / 10000).replace('.', ',') : v).join(';')).join('\r\n');
}
