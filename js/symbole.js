// Kleine selbst gezeichnete Symbole (SVG). Die Zeichnungen stehen fest im Code,
// aus dem Datenpaket kommt höchstens der Name eines Symbols.

const LINIE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const ZEICHNUNGEN = {
  kompass: `<g ${LINIE}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></g>`,
  schild: `<path ${LINIE} d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>`,
  geldboerse: `<g ${LINIE}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12.5h2M3 10h18"/></g>`,
  saeulen: `<path ${LINIE} d="M4 19V11M10 19V5M16 19v-6M21 19H3"/>`,
  kalender: `<g ${LINIE}><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/></g>`,
  tausch: `<path ${LINIE} d="M4 8h13l-3-3M20 16H7l3 3"/>`,
  halb: `<g ${LINIE}><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/></g>`,
  trend: `<path ${LINIE} d="M4 17l5-5 4 3 7-8M15 7h5v5"/>`,
  pokal: `<path ${LINIE} d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 20h8M7 6H4c0 3 1.5 4.5 3.5 4.5M17 6h3c0 3-1.5 4.5-3.5 4.5"/>`,
  stern: `<path ${LINIE} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>`,
  haken: `<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/>`,
  menue: `<g fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></g>`,
  kreuz: `<path ${LINIE} d="M6 6l12 12M18 6L6 18"/>`,
  flamme: `<path fill="currentColor" d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 12 22a5 5 0 0 1-5-5c0-2 1-3.5 2-4.5.3 1.5 1 2.3 2 2.5C10.5 11 10.5 6 12 2z"/>`,
  // Statussymbole: immer zusammen mit einem Text verwenden, nie allein über die Farbe
  warnung: `<path d="M12 3 2.5 20h19z" fill="#fab219"/><path d="M12 10v5M12 17.5v.5" stroke="#0b0b0b" stroke-width="2" stroke-linecap="round"/>`,
  gut: `<circle cx="12" cy="12" r="9.5" fill="#0ca30c"/><path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l3 3 6-6.5"/>`,
};

/** Gibt das Symbol als fertiges SVG-Element zurück. Unbekannte Namen werden zum Stern. */
export function symbol(name, klasse = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  if (klasse) s.setAttribute('class', klasse);
  s.innerHTML = Object.hasOwn(ZEICHNUNGEN, name) ? ZEICHNUNGEN[name] : ZEICHNUNGEN.stern;
  return s;
}
