// Startseite „Kompass“: die wichtigsten Zahlen auf einen Blick.

import { el, eur, eurRund, zahl, datumKurz, datumLang, monatLang, monatName } from './hilfen.js';
import { symbol } from './symbole.js';
import { budget, notgroschen, depot, termine, updateFaellig } from './rechnen.js';
import { geldfluss, variableAusgaben } from './bausteine.js';

export function baueKompass(z, { gehe, importieren }) {
  const b = budget(z.daten);
  const ng = notgroschen(z.daten, z.einzahlungen);
  const d = depot(z.daten);
  return el('div', {},
    updateKarte(z, importieren),
    el('div', { class: 'kennzahlen' },
      kachel(eurRund(b.netto), 'Netto pro Monat'),
      kachel(`${zahl(b.sparquote)} %`, 'Sparquote'),
      kachel(eurRund(b.frei), 'frei verfügbar'),
    ),
    notgroschenVorschau(ng, gehe),
    handlungsbedarf(z.daten.handlungsbedarf ?? []),
    geldfluss(b),
    b.variabel && variableAusgaben(b.variabel),
    d && depotKarte(d, gehe),
    terminKarte(termine(z.daten, z.heute)),
  );
}

/** Erinnerung an das Monats-Update: erscheint ab dem Stichtag, bis neuere Daten importiert sind. */
function updateKarte(z, importieren) {
  const u = updateFaellig(z.daten, z.heute);
  if (!u.faellig) return null;
  return el('div', { class: 'karte faellig' },
    el('h2', {}, `Monats-Update ${monatName(u.fuer)} fällig`, el('span', {}, `Zahlen vom ${datumLang(z.daten.stand)}`)),
    el('ol', { class: 'schritte' },
      (z.daten.update_vorbereitung ?? []).map((schritt) => el('li', {}, schritt)),
      el('li', {}, 'Am Mac den Befehl ', el('b', {}, '/monats-update'), ' starten'),
      el('li', {}, 'Hier das neue Datenpaket importieren'),
    ),
    el('button', { class: 'neben', onclick: importieren }, 'Datenpaket importieren'),
  );
}

const kachel = (wert, name) => el('div', { class: 'kachel' }, el('b', {}, wert), el('span', {}, name));

function notgroschenVorschau(ng, gehe) {
  const ausblick = ng.voll ? 'Ziel erreicht'
    : ng.zielMonat ? `voll voraussichtlich im ${monatLang(ng.zielMonat)}` : null;
  return el('button', { class: 'karte', style: `--anteil:${ng.anteil.toFixed(4)}`, onclick: () => gehe('notgroschen') },
    el('h2', {}, 'Notgroschen', el('span', {}, 'ansehen ›')),
    el('div', { class: 'zahl' }, eur(ng.stand), ' ', el('small', {}, `von ${eurRund(ng.ziel)}`)),
    el('div', { class: 'balken' }, el('i')),
    el('p', { class: 'notiz' }, `${ng.prozent} % erreicht`, ausblick && ` · ${ausblick}`),
  );
}

function handlungsbedarf(liste) {
  if (!liste.length) return null;
  return el('div', { class: 'karte' },
    el('h2', {}, 'Handlungsbedarf'),
    liste.map((h) => el('div', { class: 'hinweis' },
      symbol('warnung'),
      el('div', {}, el('b', {}, h.titel), h.text && el('span', {}, h.text)),
    )),
  );
}

function depotKarte(d, gehe) {
  const teile = [
    `Kern ${eur(d.kernWert)}`,
    d.hatSatellit && `${d.satellitName} ${eur(d.satellitWert)}`,
    d.hatPatenkind && `Patenkind ${eur(d.patenkindWert)}`,
  ].filter(Boolean);
  const zeigeSatellit = d.satellitAnteil != null && d.satellitGrenze > 0;
  const drueber = zeigeSatellit && d.satellitAnteil > d.satellitGrenze;
  return el('button', { class: 'karte', onclick: () => gehe('depot') },
    el('h2', {}, 'Depot', el('span', {}, 'ansehen ›')),
    el('div', { class: 'zahl' }, eur(d.wert)),
    el('p', { class: 'notiz' }, teile.join(' · ')),
    d.kern.length > 1 && d.kernAbweichung != null && el('p', { class: 'notiz' },
      'Größte Abweichung im Kern: ', el('b', {}, `${zahl(d.kernAbweichung)} Prozentpunkte`)),
    zeigeSatellit && el('div', { class: 'leiste' },
      el('i', { style: `width:${Math.min(100, (d.satellitAnteil / d.satellitGrenze) * 100).toFixed(1)}%;background:${drueber ? 'var(--krit)' : 'var(--fest)'}` }),
      el('span', { class: 'grenze', style: 'left:calc(100% - 2px)' })),
    zeigeSatellit && el('div', { class: 'leiste-text' },
      el('span', {}, `Satellit: ${zahl(d.satellitAnteil)} % der ETF-Sparrate`),
      el('span', {}, `Grenze ${zahl(d.satellitGrenze, 0)} %`)),
    drueber && el('p', { class: 'status' }, symbol('warnung'), 'Satelliten-Sparrate über der Leitplanke'),
  );
}

function terminKarte(liste) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Nächste Termine'),
    liste.length
      ? el('ul', { class: 'termine' }, liste.map((t) => el('li', {}, el('time', { datetime: t.datum }, datumKurz(t.datum)), el('span', {}, t.text))))
      : el('p', { class: 'notiz', style: 'margin-top:0' }, 'Keine anstehenden Termine in den Daten.'),
  );
}
