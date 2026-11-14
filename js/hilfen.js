// Kleine Hilfsfunktionen, die überall gebraucht werden.

/**
 * Baut ein HTML-Element. Texte werden immer als Text eingefügt (nie als HTML),
 * damit Inhalte aus Datenpaketen nichts Unerwartetes ausführen können.
 *   el('button', { class: 'knopf', onclick: f }, 'Text')
 */
export function el(tag, attrs = {}, ...kinder) {
  return fuelle(document.createElement(tag), attrs, kinder);
}

/** Wie el(), aber für Zeichnungen (SVG). */
export function svg(tag, attrs = {}, ...kinder) {
  return fuelle(document.createElementNS('http://www.w3.org/2000/svg', tag), attrs, kinder);
}

function fuelle(e, attrs, kinder) {
  for (const [name, wert] of Object.entries(attrs)) {
    if (wert == null || wert === false) continue;
    if (name.startsWith('on')) e.addEventListener(name.slice(2), wert);
    else if (name === 'class') e.setAttribute('class', wert);
    else e.setAttribute(name, wert === true ? '' : wert);
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind == null || kind === false) continue;
    e.append(kind instanceof Node ? kind : String(kind));
  }
  return e;
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** 1234.5 → "1.234,50 €" */
export function eur(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/** 1234.56 → "1.235 €" */
export function eurRund(n) {
  return Math.round(n).toLocaleString('de-DE') + ' €';
}

/** 24.33 → "24,3" */
export function zahl(n, stellen = 1) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}

/** "2026-11-04" → "04.11.2026" */
export function datumLang(iso) {
  const [j, m, t] = iso.split('-');
  return `${t}.${m}.${j}`;
}

/** "2026-11-23" → "23.11." */
export function datumKurz(iso) {
  const [, m, t] = iso.split('-');
  return `${t}.${m}.`;
}

/** "2027-03" → "März 2027" */
export function monatLang(monat) {
  const [j, m] = monat.split('-');
  return `${MONATE[Number(m) - 1]} ${j}`;
}

/** "2027-03" → "März" */
export function monatName(monat) {
  return MONATE[Number(monat.split('-')[1]) - 1];
}

/** 1 → "einen Monat", 3 → "3 Monate" */
export function monateText(n) {
  return n === 1 ? 'einen Monat' : `${n} Monate`;
}
