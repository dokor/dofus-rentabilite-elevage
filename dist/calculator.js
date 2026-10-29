import { MOUNT_XP } from './xp-data.js';
import { CRUSHING_OBSERVATIONS } from './crushing-data.js';

export const NETS = [
  { id: 'reinforced', name: 'Filet à Volkorne renforcé', price: 17500, yield: 7, level: 149, reference: '15 000–20 000 k · 6–8 montures' },
  { id: 'both', name: 'Filet multiplicateur de Volkorne renforcé', price: 42000, yield: 13.5, level: 200, reference: '42 000 k · 12–15 montures' },
];
export const SALE_TAX = 0.02;
export const CONFIG_VERSION = 5;
const sizes = ['Minuscule', 'Petit', '', 'Grand', 'Gigantesque'];
export const FUELS = ['Extrait', 'Philtre', 'Potion', 'Élixir'].flatMap((family, f) =>
  sizes.map((size, s) => ({ id: `fuel-${f}-${s}`, name: `${family === 'Potion' ? size.replace('Petit', 'Petite').replace('Grand', 'Grande') : size} ${family} d’expérience de monture`.trim(), charge: (s + 1) * 2000, family, ceiling: [80000, 140000, 180000, 200000][f] }))
);

export function defaultConfig() {
  return {
    count: 20, startLevel: 1, level: 53, runePrice: 20000,
    nets: NETS.map(n => ({ ...n })), netId: 'reinforced',
    fuelId: 'fuel-0-2', fuelPrices: Object.fromEntries(FUELS.map(f => [f.id, f.id === 'fuel-0-4' ? 2400 : 1500])),
    charge: 6000, xpHour: 3600, paddocks: 2, reserve: 0,
    captureMinutes: 3, handlingMinutes: 5, otherCosts: 0, fixedInvestment: 0,
    loot: 0, otherRunes: 0, model: 'manual', normalRate: 38.32, observations: [], objective: 'profit',
    scenarioName: 'Mon scénario',
  };
}

const integerFields = ['count', 'startLevel', 'level', 'paddocks'];
const numberFields = ['count', 'startLevel', 'level', 'runePrice', 'charge', 'xpHour', 'paddocks', 'reserve', 'captureMinutes', 'handlingMinutes', 'otherCosts', 'fixedInvestment', 'loot', 'otherRunes'];

// Validate both user input and imported/localStorage data before any financial result.
export function validate(c) {
  const errors = [];
  for (const key of numberFields) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < 0 || c[key] > 1e12) errors.push(`Valeur invalide : ${key}.`);
  }
  for (const key of integerFields) if (!Number.isInteger(c[key])) errors.push(`Un entier est nécessaire : ${key}.`);
  if (c.count < 1 || c.count > 10000) errors.push('Le lot doit contenir entre 1 et 10 000 montures.');
  if (c.startLevel < 1 || c.level > 200 || c.startLevel > c.level) errors.push('Les niveaux doivent vérifier 1 ≤ départ ≤ cible ≤ 200.');
  if (c.paddocks < 1 || c.paddocks > 6) errors.push('Choisissez entre 1 et 6 enclos de 10 places.');
  if (c.charge <= 0 || c.xpHour <= 0) errors.push('Le carburant et la vitesse d’XP doivent être strictement positifs.');
  if (!['manual', 'community', 'observed'].includes(c.model)) errors.push('Source de rendement inconnue.');
  if (c.normalRate !== null && (!Number.isFinite(c.normalRate) || c.normalRate < 0 || c.normalRate > 10000)) errors.push('Le taux de Ga Pa doit être compris entre 0 et 10 000 %.');
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
      const validMean = value => value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
      if (!Number.isInteger(row.level) || row.level < 1 || row.level > 200 || levels.has(row.level) || !validMean(row.normal) || row.normal === null) errors.push('Chaque relevé doit avoir un niveau unique de 1 à 200 et un rendement mesuré.');
      levels.add(row.level);
    }
  }
  return [...new Set(errors)];
}

export function hydrate(raw, version = CONFIG_VERSION) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Configuration invalide.');
  if (![1, 2, 3, 4, CONFIG_VERSION].includes(version)) throw new Error('Version de configuration inconnue.');
  const defaults = defaultConfig();
  const c = Object.fromEntries(Object.keys(defaults).map(k => [k, Object.hasOwn(raw, k) && raw[k] !== undefined ? raw[k] : defaults[k]]));
  // Keep custom prices and observations, but replace obsolete example defaults.
  // Old tax, Sage and focus settings are excluded from the new schema.
  if (version === 1) {
    if (!Array.isArray(c.nets)) throw new Error('La liste des filets est invalide.');
    c.nets = NETS.map(net => {
      const previous = c.nets.find(n => n?.id === net.id);
      if (!previous) return { ...net };
      const legacy = net.id === 'reinforced' ? { price: 4000, yield: 3 } : { price: 6000, yield: 6 };
      return { ...net, price: previous.price === legacy.price ? net.price : previous.price, yield: previous.yield === legacy.yield ? net.yield : previous.yield };
    });
    if (!NETS.some(n => n.id === c.netId)) c.netId = defaults.netId;
  }
  if (version < 3 && c.model === 'theory') c.model = 'community';
  if (version < 5 && Number.isInteger(raw.focusCount) && raw.focusCount > 0 && raw.focusCount <= c.count) {
    // Preserve the total optional revenue previously assigned to that group.
    c.otherRunes *= (c.count - raw.focusCount) / c.count;
  }
  // A focused rate cannot be used as a mount yield. Preserve the measured
  // normal rate, discard focus-only rows, and leave an unknown rate unknown.
  if (Array.isArray(c.observations)) c.observations = c.observations
    .filter(row => version >= 5 || row.normal !== null)
    .map(row => ({ level: row.level, normal: row.normal }));
  if (typeof c.scenarioName !== 'string' || c.scenarioName.length > 80) throw new Error('Nom de scénario invalide.');
  const errors = validate(c);
  if (errors.length) throw new Error(errors.join(' '));
  return c;
}

export function runeYield(level, c) {
  if (c.model === 'manual') {
    // A rate entered for this scenario is an assumption at its chosen level,
    // never an observed yield curve that could justify a level recommendation.
    return level === c.level ? { normal: c.normalRate === null ? null : c.normalRate / 100, kind: 'taux saisi' } : null;
  }
  if (c.model === 'community') {
    const row = CRUSHING_OBSERVATIONS.find(r => r.level === level);
    return row ? { normal: row.normal, kind: row.origin === 'user' ? 'relevé personnel' : 'relevé public', sampleSize: row.mounts, source: row.source } : null;
  }
  const exact = c.observations.find(r => r.level === level);
  // Unknown levels stay unknown, even between two measured points.
  return exact ? { normal: exact.normal, kind: 'relevé personnel' } : null;
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
  const consumed = Math.ceil(xp / 10) * 10;
  const fuelPerBatch = consumed === 0 ? 0 : Math.ceil((consumed + c.reserve) / c.charge);
  const fuelQuantity = batches * fuelPerBatch;
  const fuelCost = fuelQuantity * c.fuelPrices[c.fuelId];
  const costs = net.cost + fuelCost + c.otherCosts;
  const activeHours = (net.minutes + c.handlingMinutes) / 60;
  const enclosureHours = consumed / c.xpHour * waves;
  const elapsedHours = activeHours + enclosureHours;
  const common = { level, xp, batches, waves, consumed, fuelPerBatch, fuelQuantity, fuelCost, costs, net, activeHours, enclosureHours, elapsedHours, cashNeeded: costs + c.fixedInvestment };
  if (!yieldData) return { ...common, available: false, missing: 'level' };
  if (yieldData.normal === null) return { ...common, available: false, missing: 'rate' };
  const runes = c.count * yieldData.normal;
  const runeRevenue = runes * c.runePrice;
  // Integrated counts of stat runes are informational, never sale prices.
  const otherRevenue = c.otherRunes * c.count + c.loot;
  const gross = runeRevenue + otherRevenue;
  const revenue = gross * (1 - SALE_TAX);
  const profit = revenue - costs;
  const breakEven = runes > 0 ? Math.max(0, (costs / (1 - SALE_TAX) - otherRevenue) / runes) : null;
  const requiredGaPaRevenue = Math.max(0, costs / (1 - SALE_TAX) - otherRevenue);
  const breakEvenRate = c.runePrice > 0 ? requiredGaPaRevenue / (c.count * c.runePrice) * 100 : requiredGaPaRevenue === 0 ? 0 : null;
  return { ...common, ...yieldData, available: true, runes, runeRevenue, otherRevenue, gross, revenue, profit, roi: costs > 0 ? profit / costs * 100 : null, perHour: elapsedHours > 0 ? profit / elapsedHours : null, perActiveHour: activeHours > 0 ? profit / activeHours : null, breakEven, breakEvenRate, firstCycleProfit: profit - c.fixedInvestment, payback: c.fixedInvestment === 0 ? 0 : profit > 0 ? Math.ceil(c.fixedInvestment / profit) : null };
}

export function compareLevels(c) {
  return Array.from({ length: 201 - c.startLevel }, (_, i) => calculate(c, c.startLevel + i));
}

export function bestLevel(rows, objective) {
  const key = { profit: 'profit', hour: 'perHour', roi: 'roi' }[objective];
  const measured = rows.filter(r => r.available && ['relevé public', 'relevé personnel'].includes(r.kind) && Number.isFinite(r[key]));
  // One observed level cannot establish a comparison or an optimal level.
  if (measured.length < 2) return null;
  return measured.reduce((best, r) => !best || r[key] > best[key] + 1e-9 ? r : best, null);
}

export function csv(rows) {
  const header = ['Niveau', 'XP par monture', 'Carburants lot', 'Heures totales', 'Ga Pa moyennes', 'Investissement cycle', 'Recettes nettes', 'Benefice', 'ROI %', 'Kamas par heure', 'Type de rendement'];
  const cells = rows.map(r => [r.level, r.xp, r.fuelQuantity, r.elapsedHours, r.available ? r.runes : '', r.costs, r.available ? r.revenue : '', r.available ? r.profit : '', r.available ? r.roi ?? '' : '', r.available ? r.perHour ?? '' : '', r.available ? r.kind : 'non couvert']);
  return '\uFEFF' + [header, ...cells].map(row => row.map(v => typeof v === 'number' ? String(Math.round(v * 10000) / 10000).replace('.', ',') : v).join(';')).join('\r\n');
}
