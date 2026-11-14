// Seite „Budget“: Was kommt rein, was ist fest verplant, was bleibt frei – und wo liegt das Geld.

import { el, eur, eurRund, zahl, monatLang, monatName } from './hilfen.js';
import { symbol } from './symbole.js';
import { budget } from './rechnen.js';
import { geldfluss, postenListe, variableAusgaben } from './bausteine.js';

export function baueBudget(z) {
  const b = budget(z.daten);
  return el('div', { class: 'wachs' },
    el('div', { class: 'ng-kopf' },
      el('div', { class: 'ort' }, 'Frei verfügbar pro Monat'),
      el('div', { class: 'zahl' }, eur(b.frei)),
      el('div', { class: 'von' }, `von ${eur(b.netto)} netto · Sparquote `, el('b', {}, `${zahl(b.sparquote)} %`)),
    ),
    geldfluss(b),
    b.variabel && variableAusgaben(b.variabel, true),
    b.verlauf.length > 1 && verlaufKarte(b.verlauf),
    postenKarte('Feste Ausgaben', b.fest, 'var(--fest)',
      z.daten.feste_ausgaben.map((p) => ({ ...p, zusatz: p.rhythmus })), 5,
      'Seltenere Zahlungen sind auf den Monat umgerechnet.'),
    postenKarte('Sparen und Investieren', b.sparen, 'var(--sparen)',
      z.daten.sparen.map((p) => ({ ...p, zusatz: p.ausfuehrung }))),
    kontenKarte(z.daten.konten),
  );
}

function postenKarte(titel, summe, farbe, posten, zuerst, notiz) {
  if (!posten.length) return null;
  return el('div', { class: 'karte' },
    el('h2', {}, titel, el('span', {}, `${eur(summe)} pro Monat`)),
    postenListe(posten, farbe, zuerst),
    notiz && el('p', { class: 'notiz' }, notiz),
  );
}

/** Die letzten Monate als Säulen, mit dem heutigen Rahmen als Linie. Antippen zeigt den Monat. */
function verlaufKarte(verlauf) {
  const monate = verlauf.slice(-6);
  const rahmen = monate[0].rahmen;
  const hoechster = Math.max(rahmen, ...monate.map((m) => m.summe)) || 1;
  const betrag = (m, n) => (m.ungefaehr ? `ca. ${eurRund(n)}` : eur(n));
  const text = el('p', { class: 'status' });
  const zeige = (m) => {
    const drueber = m.differenz > 0;
    text.replaceChildren(symbol(drueber ? 'warnung' : 'gut'),
      `${monatLang(m.monat)}: ${betrag(m, m.summe)}, ${drueber ? `${betrag(m, m.differenz)} über dem Rahmen` : `${betrag(m, -m.differenz)} übrig`}`);
    for (const k of saeulen.querySelectorAll('button')) k.classList.toggle('an', k.dataset.monat === m.monat);
  };
  const saeulen = el('div', { class: 'saeulen verlauf' },
    monate.map((m) => el('button', {
      'data-monat': m.monat,
      style: `height:${((m.summe / hoechster) * 100).toFixed(1)}%`,
      'aria-label': `${monatLang(m.monat)}: ${betrag(m, m.summe)}`,
      onclick: () => zeige(m),
    })),
    rahmen > 0 && el('span', { class: 'rahmenlinie', style: `bottom:${((rahmen / hoechster) * 100).toFixed(1)}%` }),
  );
  zeige(monate[monate.length - 1]);
  const imRahmen = monate.filter((m) => m.differenz <= 0).length;
  return el('div', { class: 'karte' },
    el('h2', {}, 'Verlauf', el('span', {}, `Linie: Rahmen ${eurRund(rahmen)}`)),
    saeulen,
    el('div', { class: 'saeulen-achse' }, monate.map((m) => el('span', {}, monatName(m.monat).slice(0, 3)))),
    text,
    el('p', { class: 'notiz' }, `${imRahmen} von ${monate.length} Monaten im Rahmen. Verglichen wird mit dem heutigen Rahmen.`),
  );
}

function kontenKarte(konten) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Wo liegt mein Geld?'),
    el('ul', { class: 'posten' }, konten.map((k) => el('li', {},
      el('div', { class: 'zeile' },
        el('div', {}, k.name,
          k.zweck && el('small', {}, k.zweck),
          k.zins != null && el('small', {}, `${zahl(k.zins, 2)} % Zinsen`)),
        el('b', {}, eur(k.stand))),
      k.toepfe?.length > 0 && el('ul', { class: 'toepfe' }, k.toepfe.map((t) => el('li', {}, el('span', {}, `davon ${t.name}`), el('span', {}, eur(t.betrag))))),
      k.hinweis && el('p', { class: 'hinweis-zeile' }, k.hinweis),
    ))),
  );
}
