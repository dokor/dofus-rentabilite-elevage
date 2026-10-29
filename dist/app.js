import { NETS, FUELS, SALE_TAX, CONFIG_VERSION, defaultConfig, hydrate, validate, runeYield, compareNets, calculate, compareLevels, bestLevel, csv } from './calculator.js';
import { CRUSHING_OBSERVATIONS } from './crushing-data.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const precise = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 });
const num = (value) => Number.isFinite(value) ? nf.format(value) : '—';
const money = (value) => Number.isFinite(value) ? `${num(value)} k` : '—';
const signed = (value) => `${value > 0 ? '+' : ''}${money(value)}`;
const duration = (hours) => {
  const minutes = Math.round(hours * 60);
  return Number.isFinite(minutes) ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : '—';
};
const STORAGE_KEY = 'volkorne-atelier-v1';
let config = defaultConfig();
let activeTab = 'simulation';
let storageFailed = false;
let currentRows = [];
let toastTimer;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    config = hydrate(parsed.config, parsed.version);
  }
} catch {
  storageFailed = true;
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CONFIG_VERSION, config }));
    $('#save-status').textContent = 'Enregistré sur cet appareil';
  } catch {
    $('#save-status').textContent = 'Sauvegarde locale indisponible';
  }
}

function setTab(id, scroll = true) {
  if (!['simulation', 'comparison', 'method'].includes(id)) return;
  activeTab = id;
  $$('.tab-panel').forEach(panel => { panel.hidden = panel.id !== id; });
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === id);
    if (item.dataset.tab === id) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  $('#breadcrumb-current').textContent = { simulation: 'Simulateur', comparison: 'Comparer les niveaux', method: 'Méthode & sources' }[id];
  history.replaceState(null, '', `#${id}`);
  if (id === 'comparison') renderComparison();
  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = $(`#${id} h1`);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function fillInputs() {
  $$('[data-key]').forEach(input => {
    if (input.type === 'checkbox') input.checked = config[input.dataset.key];
    else input.value = config[input.dataset.key] ?? '';
  });
  $('#fuelPrice').value = config.fuelPrices[config.fuelId];
  renderNetInputs();
  syncRateInputs();
  renderObservations();
}

function renderNetInputs() {
  const net = config.nets.find(n => n.id === config.netId);
  const reference = NETS.find(n => n.id === config.netId);
  $('#net-rows').innerHTML = `<div class="two-fields"><label>Prix d’un filet<div class="input-with-unit"><input type="number" min="0" step="10" data-net="${escape(net.id)}" data-property="price" value="${net.price}"><span>k</span></div></label><label>Montures par filet<input type="number" min="0.01" max="100" step="0.1" data-net="${escape(net.id)}" data-property="yield" value="${net.yield}"></label></div>`;
  $('#net-reference').textContent = `Repère : niv. ${reference.level} · ${reference.reference}. Nombre de filets arrondi au supérieur.`;
}

function syncRateInputs() {
  const data = config.model === 'manual' ? { normal: config.normalRate } : runeYield(config.level, config);
  $('#normalRate').value = config.model === 'manual' ? data.normal ?? '' : data?.normal === null || !data ? '' : Number((data.normal * 100).toFixed(8));
}

function renderObservations() {
  $('#observation-rows').innerHTML = config.observations.length ? config.observations.map((r, i) => `<div class="observation-row"><input type="number" min="1" max="200" step="1" aria-label="Niveau du relevé ${i + 1}" data-observation="${i}" data-property="level" value="${r.level}"><input type="number" min="0" step="0.001" aria-label="Ga Pa par monture, relevé ${i + 1}" data-observation="${i}" data-property="normal" value="${r.normal ?? ''}"><button type="button" class="icon-button remove-observation" data-remove="${i}" aria-label="Supprimer le relevé ${i + 1}">×</button></div>`).join('') : '<p class="empty-note">Aucun relevé. Ajoutez vos premiers résultats mesurés.</p>';
}

function render() {
  const errors = validate(config);
  $('#validation').hidden = errors.length === 0;
  $('#validation').textContent = errors.join(' ');
  $('#method-validation').hidden = errors.length === 0;
  $('#method-validation').textContent = errors.join(' ');
  $('#level-chart').hidden = config.model === 'manual';
  $('#level-recommendation').hidden = config.model === 'manual';
  const measuredRate = config.model === 'manual' ? null : runeYield(config.level, config)?.normal;
  const rate = config.model === 'manual' ? config.normalRate : measuredRate == null ? null : measuredRate * 100;
  const reference = config.model === 'community' ? CRUSHING_OBSERVATIONS.find(row => row.level === config.level) : null;
  $('#rate-explanation').innerHTML = `${Number.isFinite(rate) ? `<strong>${precise.format(rate)} % = ${precise.format(rate / 100)} Ga Pa par monture.</strong> ` : 'Taux inconnu à ce niveau. '}${config.model === 'manual' ? `Hypothèse modifiable pour le niveau ${num(config.level)}.` : reference ? `Source : ${reference.origin === 'user' ? 'relevé personnel' : 'vidéo'}, ${num(reference.gaPa)} Ga Pa sur ${num(reference.mounts)} montures.${reference.statRunes ? ` ${num(reference.statRunes)} runes de stats exclues des recettes du relevé.` : ''} Modifiez le taux pour tester une hypothèse.` : 'Vos relevés couvrent uniquement les niveaux renseignés.'} <button type="button" class="inline-button" data-documented-scenario="71">Charger mon relevé : 30 au niv. 71 · 60 % ↗</button> <button type="button" class="inline-button" data-documented-scenario="53">Repère vidéo : niv. 53 · 38,32 % ↗</button>`;
  if (errors.length) {
    $('#results').innerHTML = '<div class="card unavailable"><h2>Vérifiez les paramètres.</h2><p>Le calcul reprendra une fois les valeurs corrigées.</p></div>';
    $('#chart').innerHTML = '';
    $('#recommendation').innerHTML = '<p>Paramètres invalides : comparaison suspendue.</p>';
    $('#net-advice').textContent = 'Vérifiez vos prix et vos captures moyennes.';
    $('#fuel-advice').textContent = 'Corrigez les paramètres pour calculer le coût du carburant.';
    $('#level-table').innerHTML = '';
    $('#comparison-best').textContent = 'Corrigez les paramètres du simulateur.';
    currentRows = [];
    $('#save-status').textContent = 'Paramètres à corriger';
    return;
  }
  save();
  const result = calculate(config);
  currentRows = compareLevels(config);
  const best = bestLevel(currentRows, config.objective);
  const cheapest = compareNets(config)[0];
  $('#net-advice').innerHTML = `${num(result.net.quantity)} filets × ${money(result.net.price)} = <strong>${money(result.net.cost)}</strong>${cheapest.id !== config.netId ? `<br>Moins cher pour ce lot : ${escape(cheapest.name)} (${money(cheapest.cost)}). <button type="button" class="inline-button" id="use-cheapest" data-id="${escape(cheapest.id)}">Utiliser</button>` : ''}`;
  $('#fuel-advice').innerHTML = `${num(result.fuelQuantity)} carburants × ${money(config.fuelPrices[config.fuelId])} = <strong>${money(result.fuelCost)}</strong><br>${num(result.fuelPerBatch)} par groupe · ${num(result.batches)} groupes de 10 maximum`;
  renderResults(result);
  renderChart(currentRows, result);
  renderRecommendation(best, result);
  if (activeTab === 'comparison') renderComparison();
}

function renderResults(r) {
  if (!r.available) {
    $('#results').innerHTML = `<section class="card unavailable"><span class="section-kicker">BUDGET DU LOT · ${money(r.costs)}</span><h2>Quel taux de Ga Pa souhaitez-vous tester ?</h2><p>Saisissez le taux de Ga Pa dans le champ en haut du simulateur. Le bénéfice se calcule dès que le taux est renseigné.</p><button type="button" class="button button-dark" data-enter-rate>Renseigner mon taux ↗</button></section>`;
    return;
  }
  const profitClass = r.profit >= 0 ? 'positive' : 'negative';
  const payback = config.fixedInvestment === 0 ? 'Aucun investissement fixe' : r.payback === null ? 'Non amorti avec ce scénario' : `${num(r.payback)} cycle${r.payback > 1 ? 's' : ''} · ${duration(r.payback * r.elapsedHours)} minimum`;
  $('#results').innerHTML = `
    <section class="profit-card ${r.profit < 0 ? 'loss-card' : ''}">
      <div class="profit-header"><span>CE QUE VOUS GAGNEZ</span><span class="status-pill">${escape(r.kind)}</span></div>
      <div class="profit-title">${r.profit >= 0 ? 'Bénéfice net attendu' : 'Perte nette attendue'}</div><div class="profit-amount" id="profit-amount">${r.profit > 0 ? '+' : ''}${num(r.profit)} <span>kamas</span></div>
      <p class="profit-description">${num(config.count)} Volkornes · niveau ${r.level}${r.sampleSize ? ` · relevé de ${num(r.sampleSize)} montures` : ''}</p>
      <div class="profit-metrics"><div><span>DÉPENSES DU LOT</span><strong>${money(r.costs)}</strong></div><div><span>RECETTES APRÈS TAXE</span><strong>${money(r.revenue)}</strong></div><div><span>GA PA ESTIMÉES</span><strong>${decimal.format(r.runes)} <small>runes</small></strong></div></div>
      <div class="profit-footer"><span class="small-star">✦</span> ${r.profit >= 0 ? 'Rentable avec ces paramètres.' : 'Les recettes estimées ne couvrent pas les frais.'} ${config.model === 'manual' ? 'Résultat fondé sur le taux saisi.' : r.sampleSize === 30 ? 'Relevé de 30 montures : tendance à confirmer.' : 'Résultat fondé sur un relevé, à revalider en jeu.'}</div>
    </section>
    <section class="card threshold-card"><span class="section-kicker">POUR COUVRIR VOS FRAIS</span><div class="threshold-grid"><div><span>Prix minimum d’une Ga Pa</span><strong>${money(r.breakEven)}</strong><small>avec le taux retenu</small></div><div><span>Taux moyen minimum de Ga Pa</span><strong>${r.breakEvenRate === null ? '—' : decimal.format(r.breakEvenRate) + ' %'}</strong><small>avec une Ga Pa à ${money(config.runePrice)}</small></div></div><p class="field-help">${money(r.revenue)} de ventes après taxe − ${money(r.costs)} de dépenses = ${signed(r.profit)}.</p></section>
    <section class="card breakdown-card"><div class="card-heading"><div><span class="section-kicker">DU BUDGET AUX RECETTES</span><h2>Le détail de votre cycle.</h2></div><span class="outlined-badge">${num(r.xp)} XP / monture</span></div>
      <dl class="cost-lines"><div><dt>Filets de capture <small>${num(r.net.quantity)} × ${money(r.net.price)}</small></dt><dd>− ${money(r.net.cost)}</dd></div><div><dt>Carburants d’XP <small>${num(r.fuelQuantity)} unités · ${r.fuelPerBatch} / groupe</small></dt><dd>− ${money(r.fuelCost)}</dd></div><div><dt>Autres frais</dt><dd>− ${money(config.otherCosts)}</dd></div><div class="subtotal"><dt>Coût du cycle</dt><dd>${money(r.costs)}</dd></div><div><dt>Vente des Ga Pa <small>${decimal.format(r.runes)} × ${money(config.runePrice)}</small></dt><dd>+ ${money(r.runeRevenue)}</dd></div><div><dt>Autres runes et ressources</dt><dd>+ ${money(r.otherRevenue)}</dd></div><div><dt>Taxe sur les ventes <small>${num(SALE_TAX * 100)} %</small></dt><dd>− ${money(r.gross - r.revenue)}</dd></div><div class="total"><dt>Bénéfice net du cycle</dt><dd class="${profitClass}">${signed(r.profit)}</dd></div></dl>
      <details class="advanced"><summary>Temps et rendement du cycle</summary><dl class="cost-lines"><div><dt>Temps actif</dt><dd>${duration(r.activeHours)}</dd></div><div><dt>Attente en enclos</dt><dd>${duration(r.enclosureHours)}</dd></div><div><dt>Durée totale</dt><dd>${duration(r.elapsedHours)}</dd></div><div><dt>Kamas / heure totale</dt><dd>${money(r.perHour)}</dd></div><div><dt>Kamas / heure active</dt><dd>${money(r.perActiveHour)}</dd></div><div><dt>ROI du cycle</dt><dd>${r.roi === null ? '—' : num(r.roi) + ' %'}</dd></div></dl></details>
      <details class="advanced"><summary>Trésorerie & retour sur investissement</summary><dl class="cost-lines"><div><dt>Investissement fixe</dt><dd>${money(config.fixedInvestment)}</dd></div><div><dt>Budget initial à mobiliser</dt><dd>${money(r.cashNeeded)}</dd></div><div><dt>Solde après le premier cycle</dt><dd class="${r.firstCycleProfit >= 0 ? 'positive' : 'negative'}">${signed(r.firstCycleProfit)}</dd></div><div><dt>Amortissement du fixe</dt><dd>${payback}</dd></div></dl><p class="field-help">Amortissement par cycles identiques, après vente de tout le stock. Le délai de vente et les variations de prix ne sont pas inclus.</p></details>
    </section>`;
}

function compact(value) {
  if (Math.abs(value) >= 1000000) return `${decimal.format(value / 1000000)} M`;
  if (Math.abs(value) >= 1000) return `${num(value / 1000)} k`;
  return num(value);
}

function renderChart(rows, selected) {
  const available = rows.filter(r => r.available && r.kind !== 'taux saisi');
  if (!available.length) { $('#chart').innerHTML = '<p class="empty-note">Ajoutez des relevés pour afficher les points mesurés.</p>'; return; }
  const width = 660, height = 245, left = 62, right = 22, top = 20, bottom = 34;
  const min = Math.min(0, ...available.map(r => r.profit));
  const max = Math.max(1, ...available.map(r => r.profit));
  const range = Math.max(1, max - min);
  const x = (level) => left + (level - config.startLevel) / Math.max(1, 200 - config.startLevel) * (width - left - right);
  const y = (profit) => top + (max - profit) / range * (height - top - bottom);
  const ticks = Array.from({ length: 4 }, (_, i) => min + range * i / 3);
  $('#chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="profit-chart" role="img" aria-label="Bénéfices calculés uniquement aux niveaux mesurés. Les points ne sont pas reliés.">${ticks.map(t => `<line x1="${left}" x2="${width - right}" y1="${y(t)}" y2="${y(t)}" stroke="#e5e7df" stroke-dasharray="3 5"/><text x="${left - 12}" y="${y(t) + 4}" text-anchor="end">${compact(t)}</text>`).join('')}${[...new Set([config.startLevel, 50, 100, 150, 200])].filter(l => l >= config.startLevel).map(l => `<text x="${x(l)}" y="${height - 10}" text-anchor="middle">${l}</text>`).join('')}${available.map(row => `<circle cx="${x(row.level)}" cy="${y(row.profit)}" r="${row.level === selected.level ? 6 : 4}" fill="${row.level === selected.level ? '#d2e6a3' : '#466d4f'}" stroke="#182f29" stroke-width="1.5"><title>Niveau ${row.level} : ${money(row.profit)}</title></circle>`).join('')}<text x="${left}" y="12">KAMAS</text></svg>`;

}

function renderRecommendation(best, current) {
  const measuredCount = currentRows.filter(r => r.available).length;
  if (!best) {
    $('#recommendation').innerHTML = `<h2>Le niveau optimal reste indéterminé.</h2><p>${measuredCount === 1 ? 'Un seul niveau est couvert pour vos paramètres.' : 'Aucun couple de niveaux n’est comparable pour vos paramètres.'} Il faut au moins deux niveaux mesurés pour effectuer un classement.${config.model === 'community' ? ' Les références intégrées portent sur les niveaux 53 et 71 ; les autres niveaux restent inconnus.' : ' Complétez vos relevés pour comparer leurs résultats.'}</p><button type="button" class="text-button" data-tab="method">Voir les relevés et compléter mes données ↗</button>`;
    return;
  }
  const objective = { profit: 'le bénéfice net par cycle', hour: 'les kamas par heure totale', roi: 'le retour sur frais du cycle' }[config.objective];
  $('#recommendation').innerHTML = `<div class="recommendation-title"><h2>Niveau ${best.level}<span>${best.profit >= 0 ? 'Le meilleur parmi les niveaux renseignés.' : 'La perte la plus faible parmi les niveaux renseignés.'}</span></h2><span class="level-medallion">${best.level}</span></div><p>En comparant ${measuredCount} niveaux pour ${objective} : <strong>${signed(best.profit)}</strong> par cycle, ${duration(best.elapsedHours)} au total.${current.available && current.level !== best.level ? ` Écart avec le niveau ${current.level} : <strong>${signed(best.profit - current.profit)}</strong>.` : ''}</p><div class="recommendation-actions"><button type="button" class="button button-dark" data-use-level="${best.level}">Simuler ce niveau ↗</button><button type="button" class="text-button" data-tab="comparison">Changer l’objectif</button></div><p class="field-help">Classement limité aux niveaux mesurés, sans interpolation. Les tailles d’échantillon et les conditions de jeu peuvent différer ; ce résultat n’établit pas un optimum global.</p>`;
}

function renderComparison() {
  if (validate(config).length) return;
  const best = bestLevel(currentRows, config.objective);
  $('#comparison-best').innerHTML = config.model === 'manual' ? `Taux saisi pour le niveau ${num(config.level)} uniquement · aucun classement. <button type="button" class="inline-button" data-tab="method">Utiliser des relevés ↗</button>` : best ? `<span class="outlined-badge">Parmi les niveaux mesurés</span><strong>Niveau ${best.level}</strong><span>${signed(best.profit)} / cycle</span>` : `${currentRows.filter(r => r.available).length} niveau documenté pour vos paramètres · classement impossible.`;
  $('#level-table').innerHTML = currentRows.map(r => `<tr class="${best?.level === r.level ? 'best-row' : ''} ${r.level === config.level ? 'current-row' : ''}"><td><button type="button" data-use-level="${r.level}" aria-label="Simuler le niveau ${r.level}">${r.level}${best?.level === r.level ? '<span title="Meilleur niveau selon l’objectif">✦</span>' : ''}</button></td><td>${num(r.xp)}</td><td>${num(r.fuelQuantity)}</td><td>${duration(r.elapsedHours)}</td><td>${r.available ? decimal.format(r.runes) : '—'}</td><td>${money(r.costs)}</td><td class="${!r.available ? '' : r.profit >= 0 ? 'positive' : 'negative'}">${r.available ? signed(r.profit) : r.missing === 'mode' ? 'Mode non mesuré' : 'Niveau non mesuré'}</td><td>${r.available && r.roi !== null ? `${num(r.roi)} %` : '—'}</td><td>${r.available ? money(r.perHour) : '—'}</td></tr>`).join('');
}

function download(content, filename, type) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], { type }));
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function changeInput(event) {
  const input = event.target;
  if (!input.matches('input, select')) return;
  if (input.dataset.key) {
    const key = input.dataset.key;
    if (key === 'normalRate' && config.model !== 'manual') {
      const current = runeYield(config.level, config);
      config.normalRate = current?.normal == null ? null : Number((current.normal * 100).toFixed(8));
      config.model = 'manual';
      $('#model').value = 'manual';
    }
    config[key] = input.type === 'checkbox' ? input.checked : ['model', 'fuelId', 'netId', 'objective'].includes(key) ? input.value : input.value === '' ? key === 'normalRate' ? null : NaN : Number(input.value);
    if (key === 'model' || (key === 'level' && config.model !== 'manual')) syncRateInputs();
    if (key === 'netId') renderNetInputs();
    if (key === 'startLevel' && config.level < config.startLevel) { config.level = config.startLevel; $('#level').value = config.level; syncRateInputs(); }
    if (key === 'fuelId') {
      config.charge = FUELS.find(f => f.id === config.fuelId).charge;
      $('#charge').value = config.charge;
      $('#fuelPrice').value = config.fuelPrices[config.fuelId];
    }
  } else if (input.id === 'fuelPrice') config.fuelPrices[config.fuelId] = input.value === '' ? NaN : Number(input.value);
  else if (input.dataset.net) config.nets.find(n => n.id === input.dataset.net)[input.dataset.property] = input.value === '' ? NaN : Number(input.value);
  else if (input.name === 'net') config.netId = input.value;
  else if (input.dataset.observation !== undefined) {
    config.observations[Number(input.dataset.observation)][input.dataset.property] = input.value === '' ? null : Number(input.value);
    if (config.model === 'observed') syncRateInputs();
  }
  else return;
  render();
}

$('#public-observations').innerHTML = CRUSHING_OBSERVATIONS.map(row => `<div class="subtle-callout"><strong>Niveau ${row.level} · ${precise.format(row.normal * 100)} %</strong><br>${num(row.gaPa)} Ga Pa / ${num(row.mounts)} montures = <strong>${precise.format(row.normal)} Ga Pa par monture</strong>.<br>${escape(row.author)} · ${row.origin === 'user' ? 'communiqué le 29 octobre 2026' : 'publication du 4 août 2026'}.<br>${escape(row.note)}${row.source ? `<br><a href="${escape(row.source)}" target="_blank" rel="noopener noreferrer">Bilan vidéo ↗</a> · <a href="${escape(row.levelSource)}" target="_blank" rel="noopener noreferrer">Niveau confirmé par l’auteur ↗</a>` : ''}<br><button type="button" class="inline-button" data-documented-scenario="${row.level}">Simuler ce relevé ↗</button></div>`).join('');
$('#fuelId').innerHTML = FUELS.map(f => `<option value="${f.id}">${escape(f.name)}</option>`).join('');
$('#netId').innerHTML = NETS.map(n => `<option value="${n.id}">${escape(n.name)}</option>`).join('');
document.addEventListener('input', changeInput);
document.addEventListener('change', event => { if (event.target.matches('select, input[type="radio"], input[type="checkbox"]')) changeInput(event); });
$('#calculator-form').addEventListener('submit', event => event.preventDefault());
document.addEventListener('click', event => {
  const documented = event.target.closest('[data-documented-scenario]');
  if (documented) {
    const row = CRUSHING_OBSERVATIONS.find(r => r.level === Number(documented.dataset.documentedScenario));
    config.model = 'community'; config.level = row.level; config.normalRate = row.normal * 100;
    if (row.origin === 'user') { config.count = row.mounts; config.otherRunes = 0; }
    if (config.startLevel > row.level) config.startLevel = 1;
    fillInputs(); render(); setTab('simulation');
    toast(`Relevé chargé : niveau ${row.level}, ${precise.format(row.normal * 100)} %. Vos prix sont conservés.${row.statRunes ? ' Les runes de stats ne sont pas valorisées.' : ''}`);
  }
  if (event.target.closest('[data-enter-rate]')) {
    $('#normalRate').focus();
  }
  const tab = event.target.closest('[data-tab]');
  if (tab) { event.preventDefault(); setTab(tab.dataset.tab); }
  const level = event.target.closest('[data-use-level]');
  if (level) { config.level = Number(level.dataset.useLevel); $('#level').value = config.level; syncRateInputs(); render(); setTab('simulation'); }
  const speed = event.target.closest('[data-speed]');
  if (speed) {
    config.xpHour = Number(speed.dataset.speed);
    const tier = config.xpHour / 3600;
    const size = config.fuelId.split('-')[2];
    config.fuelId = `fuel-${tier - 1}-${size}`;
    config.charge = FUELS.find(f => f.id === config.fuelId).charge;
    config.reserve = [0, 80010, 140010, 180010][tier - 1];
    fillInputs();
    render();
    toast(`Tier ${tier} : carburant adapté et réserve de ${num(config.reserve)} points inclus dans le budget.`);
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) { config.observations.splice(Number(remove.dataset.remove), 1); renderObservations(); syncRateInputs(); render(); }
  if (event.target.closest('#use-cheapest')) { config.netId = $('#use-cheapest').dataset.id; fillInputs(); render(); }
});
$('.brand').addEventListener('click', event => { event.preventDefault(); setTab('simulation'); });
$('#add-observation').addEventListener('click', () => {
  if (config.observations.length >= 200) { toast('La table couvre déjà 200 niveaux.'); return; }
  const existing = new Set(config.observations.map(r => r.level));
  const nextLevel = existing.has(config.level) ? Array.from({ length: 200 }, (_, i) => i + 1).find(i => !existing.has(i)) : config.level;
  config.observations.push({ level: nextLevel, normal: null });
  renderObservations();
  render();
  $$('.observation-row input').at(-2)?.focus();
  toast('Renseignez les Ga Pa moyennes par monture, puis choisissez « Mes relevés ».');
});
$('#export-config').addEventListener('click', () => {
  if (validate(config).length) { toast('Corrigez les paramètres avant l’export.'); return; }
  download(JSON.stringify({ version: CONFIG_VERSION, config }, null, 2), 'volkorne-scenario.json', 'application/json');
  toast('Configuration et relevés exportés.');
});
$('#export-csv').addEventListener('click', () => {
  if (validate(config).length) { toast('Corrigez les paramètres avant l’export.'); return; }
  download(csv(currentRows), 'volkorne-comparaison.csv', 'text/csv;charset=utf-8');
  toast('Comparaison des niveaux exportée.');
});
$('#import-config').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Fichier trop volumineux (1 Mo maximum).');
    const parsed = JSON.parse(await file.text());
    const imported = hydrate(parsed.config, parsed.version);
    config = imported;
    fillInputs();
    render();
    toast('Configuration importée et enregistrée.');
  } catch (error) { toast(`Import refusé : ${error.message}`); }
  event.target.value = '';
});
function reset() { config = defaultConfig(); fillInputs(); render(); setTab('simulation'); toast('Exemple restauré : modifiez les prix et le taux pour tester votre rentabilité.'); }
$('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
$('#load-example').addEventListener('click', () => $('#reset-dialog').showModal());
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', () => { $('#reset-dialog').close(); reset(); });
window.addEventListener('hashchange', () => setTab(location.hash.slice(1), false));
fillInputs();
render();
setTab(location.hash.slice(1) || 'simulation', false);
if (storageFailed) toast('La sauvegarde précédente est illisible ou inaccessible. Paramètres d’exemple chargés.');
