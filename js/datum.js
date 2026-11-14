// Datumsrechnung mit lokalen Kalendertagen ("JJJJ-MM-TT") und Monaten ("JJJJ-MM").

/** Heutiges Datum. Zum Testen lässt es sich mit ?heute=2026-12-01 in der Adresse überschreiben. */
export function heute() {
  const test = new URLSearchParams(location.search).get('heute');
  if (test && /^\d{4}-\d{2}-\d{2}$/.test(test)) return test;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** monatPlus("2026-11", 4) → "2027-03" */
export function monatPlus(monat, n) {
  const [j, m] = monat.split('-').map(Number);
  const index = j * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Anzahl Monate von a bis b (positiv, wenn b später ist). */
export function monateZwischen(a, b) {
  const [ja, ma] = a.split('-').map(Number);
  const [jb, mb] = b.split('-').map(Number);
  return (jb - ja) * 12 + (mb - ma);
}
