// Seite „Depot“: Aufteilung, Soll und Ist im Kern, Sparpläne, Patenkind-Topf und die einzelnen Positionen.
// Bewertet wird nur das eigene Verhalten (Aufteilung, Leitplanke), nie der Kursverlauf.

import { el, eur, eurRund, zahl } from './hilfen.js';
import { symbol } from './symbole.js';
import { depot } from './rechnen.js';
import { teileMitLegende } from './bausteine.js';

const ROLLE = { kern: 'Kern', satellit: 'Satellit', patenkind: 'Patenkind' };
const FARBE = { kern: 'var(--kern)', satellit: 'var(--satellit)', patenkind: 'var(--patenkind)' };

export function baueDepot(z, blatt) {
  const d = depot(z.daten);
  if (!d) return el('div', { class: 'leer' }, el('b', {}, 'Kein Depot'), 'In den Daten steht kein Depot.');
  const anzahl = d.positionen.length;
  return el('div', { class: 'wachs' },
    el('div', { class: 'ng-kopf' },
      el('div', { class: 'ort' }, 'Depotwert'),
      el('div', { class: 'zahl' }, eur(d.wert)),
      el('div', { class: 'von' }, `${anzahl === 1 ? '1 Position' : `${anzahl} Positionen`} · `, el('b', {}, eur(d.sparplanSumme)), ' Sparpläne pro Monat'),
    ),
    aufteilung(d),
    d.kern.length > 0 && kernKarte(d),
    d.sparplaene.length > 0 && sparplanKarte(d),
    d.patenkind.map(patenkindKarte),
    positionenKarte(d, blatt),
  );
}

function aufteilung(d) {
  const teile = [
    { id: 'kern', name: 'Kern', betrag: d.kernWert, farbe: FARBE.kern },
    { id: 'satellit', name: `Satellit (${d.satellitName})`, betrag: d.satellitWert, farbe: FARBE.satellit },
    { id: 'patenkind', name: 'Patenkind', betrag: d.patenkindWert, farbe: FARBE.patenkind },
  ];
  if (teile.filter((t) => t.betrag > 0).length < 2) return null;
  return el('div', { class: 'karte' },
    el('h2', {}, 'Aufteilung'),
    teileMitLegende(teile, d.summeWerte),
    d.guthaben > 0 && el('p', { class: 'notiz' }, `Dazu ${eur(d.guthaben)} nicht angelegtes Guthaben.`),
  );
}

/** Kern: je Baustein der heutige Anteil als Balken, der Zielanteil als Strich. */
function kernKarte(d) {
  const mitZiel = d.kern.some((p) => p.zielanteil != null);
  const w = d.weiteste;
  return el('div', { class: 'karte' },
    el('h2', {}, mitZiel ? 'Kern: Soll und Ist' : 'Kern', el('span', {}, eur(d.kernWert))),
    el('ul', { class: 'posten' }, d.kern.map((p) => el('li', {},
      el('div', { class: 'zeile' },
        el('div', {}, p.name,
          el('small', {}, p.zielanteil != null
            ? `Ist ${zahl(p.istanteil)} % · Ziel ${zahl(p.zielanteil, 0)} % · ${vorzeichen(p.abweichung)} Punkte`
            : `${zahl(p.istanteil)} % des Kerns`)),
        el('b', {}, eur(p.wert))),
      el('div', { class: 'leiste' },
        el('i', { style: `width:${Math.min(100, p.istanteil).toFixed(1)}%;background:${FARBE.kern}` }),
        p.zielanteil != null && el('span', { class: 'grenze', style: `left:calc(${Math.min(100, p.zielanteil)}% - 1px)` })),
    ))),
    w && d.kern.length > 1 && el('p', { class: 'notiz' },
      'Am weitesten vom Ziel: ', el('b', {}, w.name), ` mit ${zahl(Math.abs(w.abweichung))} Prozentpunkten ${w.abweichung > 0 ? 'darüber' : 'darunter'}. Der Strich zeigt das Ziel.`),
  );
}

/** 0.7 → "+0,7", -0.74 → "−0,7", 0.04 → "±0,0" (das Vorzeichen richtet sich nach der gerundeten Zahl) */
function vorzeichen(n) {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${zahl(Math.abs(r))}`;
}

function sparplanKarte(d) {
  const zeigeSatellit = d.satellitAnteil != null && d.satellitGrenze > 0;
  const drueber = zeigeSatellit && d.satellitAnteil > d.satellitGrenze;
  const groesster = Math.max(...d.sparplaene.map((p) => p.sparplan));
  return el('div', { class: 'karte' },
    el('h2', {}, 'Sparpläne', el('span', {}, `${eur(d.sparplanSumme)} pro Monat`)),
    el('ul', { class: 'posten' }, d.sparplaene.map((p) => el('li', {},
      el('div', { class: 'zeile' },
        el('div', {}, p.name, p.name !== ROLLE[p.rolle] && el('small', {}, ROLLE[p.rolle])),
        el('b', {}, eur(p.sparplan))),
      el('div', { class: 'strich' }, el('i', { style: `width:${((p.sparplan / groesster) * 100).toFixed(1)}%;background:${FARBE[p.rolle]}` })),
    ))),
    zeigeSatellit && el('div', { class: 'abschnitt' },
      el('div', { class: 'leiste' },
        el('i', { style: `width:${Math.min(100, (d.satellitAnteil / d.satellitGrenze) * 100).toFixed(1)}%;background:${drueber ? 'var(--krit)' : FARBE.satellit}` }),
        el('span', { class: 'grenze', style: 'left:calc(100% - 2px)' })),
      el('div', { class: 'leiste-text' },
        el('span', {}, `Satellit: ${zahl(d.satellitAnteil)} % der eigenen ETF-Sparrate (${eur(d.eigeneRate)})`),
        el('span', {}, `Grenze ${zahl(d.satellitGrenze, 0)} %`)),
      el('p', { class: 'status' }, symbol(drueber ? 'warnung' : 'gut'),
        drueber ? 'Satelliten-Sparrate über der Leitplanke' : 'Leitplanke eingehalten'),
    ),
  );
}

function patenkindKarte(p) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Patenkind-Topf', p.ziel_bis && el('span', {}, `Ziel bis ${p.ziel_bis}`)),
    el('div', { class: 'zahl' }, eur(p.wert), p.ziel > 0 && [' ', el('small', {}, `von ${eurRund(p.ziel)}`)]),
    p.anteil != null && el('div', { class: 'leiste' },
      el('i', { style: `width:${Math.max(1, p.anteil * 100).toFixed(1)}%;background:${FARBE.patenkind}` })),
    el('p', { class: 'notiz' },
      [
        p.anteil != null && `${zahl(p.anteil * 100)} % des Ziels`,
        p.eingezahlt != null && `bisher eingezahlt ${eur(p.eingezahlt)}`,
        p.sparplan > 0 && `${eur(p.sparplan)} pro Monat`,
      ].filter(Boolean).join(' · ')),
  );
}

function positionenKarte(d, blatt) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Positionen', el('span', {}, 'antippen für Details')),
    el('ul', { class: 'auswahl' }, d.positionen.map((p) => el('li', {},
      el('button', { onclick: () => zeigePosition(p, d, blatt) },
        el('i', { style: `background:${FARBE[p.rolle]}` }),
        el('div', {}, p.name, p.wertpapier && el('small', {}, p.wertpapier)),
        el('b', {}, eur(p.wert)),
        el('span', { class: 'pfeil' }, '›')),
    ))),
    d.kosten != null && el('p', { class: 'notiz' },
      'Laufende Kosten im Schnitt: ', el('b', {}, `${zahl(d.kosten, 2)} % pro Jahr`), ' (TER, nach Wert gewichtet).'),
  );
}

function zeigePosition(p, d, { oeffneBlatt, schliesseBlatt }) {
  const kern = d.kern.find((k) => k === p || (k.name === p.name && k.rolle === p.rolle));
  const zeilen = [
    ['Rolle', ROLLE[p.rolle]],
    ['Wert', eur(p.wert)],
    p.sparplan > 0 && ['Sparplan pro Monat', eur(p.sparplan)],
    kern?.zielanteil != null && ['Zielanteil im Kern', `${zahl(kern.zielanteil, 0)} %`],
    kern && ['Anteil im Kern heute', `${zahl(kern.istanteil)} %`],
    p.eingezahlt != null && ['Bisher eingezahlt', eur(p.eingezahlt)],
    p.ziel > 0 && ['Ziel', `${eurRund(p.ziel)}${p.ziel_bis ? ` bis ${p.ziel_bis}` : ''}`],
    p.ter != null && ['Laufende Kosten (TER)', `${zahl(p.ter, 2)} % pro Jahr`],
    p.isin && ['ISIN', p.isin],
  ].filter(Boolean);
  oeffneBlatt(
    el('h2', {}, p.name),
    p.wertpapier && el('p', {}, p.wertpapier),
    el('dl', { class: 'angaben' }, zeilen.map(([name, wert]) => [el('dt', {}, name), el('dd', {}, wert)])),
    el('button', { class: 'neben', onclick: schliesseBlatt }, 'Schließen'),
  );
}
