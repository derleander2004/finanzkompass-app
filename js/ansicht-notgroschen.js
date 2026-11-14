// Seite „Notgroschen“: Ring mit Etappen, Einzahlung buchen, Prognose, Abzeichen.

import { el, svg, eur, eurRund, zahl, datumLang, monatLang, monatName, monateText } from './hilfen.js';
import { symbol } from './symbole.js';
import { notgroschen } from './rechnen.js';

const RADIUS = 92;
const MITTE = 110;

/**
 * Baut die Seite. `von` ist der Stand vor einer gerade gebuchten Einzahlung;
 * dann wachsen Ring und Zahl sichtbar vom alten zum neuen Wert.
 * Rückgabe: { element, starte } – starte() nach dem Einfügen aufrufen, damit die Bewegung losläuft.
 */
export function baueNotgroschen(z, { oeffneBuchen, entferne }, von = null) {
  const ng = notgroschen(z.daten, z.einzahlungen);
  const neuErreicht = von ? ng.etappen.filter((e) => e.erreicht && e.betrag > von.stand).map((e) => e.betrag) : [];
  const istNeu = (e) => neuErreicht.includes(e.betrag);

  const betrag = el('div', { class: 'zahl' }, eur(von ? von.stand : ng.stand));
  const ort = ng.konto.zins != null ? `${ng.konto.name} (${zahl(ng.konto.zins, 2)} %)` : ng.konto.name;

  const element = el('div', { style: `--anteil:${(von ? von.anteil : 0).toFixed(4)}` },
    el('div', { class: 'ng-kopf' },
      el('div', { class: 'ort' }, ort),
      betrag,
      el('div', { class: 'von' }, `von ${eurRund(ng.ziel)} · `, el('b', {}, `${ng.prozent} %`)),
    ),
    el('div', { class: 'bild' }, ring(ng)),
    el('button', { class: 'haupt', onclick: oeffneBuchen }, 'Einzahlung buchen'),
    buchungen(ng, z, entferne),
    etappenKarte(ng, istNeu),
    prognoseKarte(ng),
    regelKarte(ng),
    abzeichenKarte(ng, z.daten.abzeichen ?? [], istNeu),
  );

  const starte = () => {
    void element.getBoundingClientRect();             // alten Stand einmal zeichnen lassen …
    element.style.setProperty('--anteil', ng.anteil.toFixed(4));   // … dann zum neuen wachsen
    if (von) zaehle(betrag, von.stand, ng.stand);
    if (neuErreicht.length) funken(element.querySelector('.bild'));
  };
  return { element, starte, neuErreicht: ng.etappen.filter(istNeu) };
}

/** Ring: ein Anteil gegen das Ziel, mit einem Punkt je Etappe. */
function ring(ng) {
  const punkte = ng.etappen.map((e) => {
    const winkel = (Math.min(e.betrag, ng.ziel) / ng.ziel) * 2 * Math.PI;   // 0 = oben, im Uhrzeigersinn
    const sin = Math.sin(winkel), cos = Math.cos(winkel);
    const anker = Math.abs(sin) < 0.35 ? 'middle' : sin > 0 ? 'start' : 'end';
    return [
      svg('circle', { class: `ring-punkt${e.erreicht ? ' erreicht' : ''}`, cx: (MITTE + RADIUS * sin).toFixed(1), cy: (MITTE - RADIUS * cos).toFixed(1), r: 5 }),
      svg('text', { class: 'ring-text', x: (MITTE + (RADIUS + 16) * sin).toFixed(1), y: (MITTE - (RADIUS + 16) * cos + 3.5).toFixed(1), 'text-anchor': anker },
        e.betrag.toLocaleString('de-DE')),
    ];
  });
  return svg('svg', { class: 'ring', viewBox: '-40 -14 300 248', role: 'img', 'aria-label': `Notgroschen: ${ng.prozent} Prozent von ${eurRund(ng.ziel)} erreicht` },
    svg('circle', { class: 'ring-spur', cx: MITTE, cy: MITTE, r: RADIUS }),
    svg('circle', { class: 'ring-fuell', cx: MITTE, cy: MITTE, r: RADIUS, transform: `rotate(-90 ${MITTE} ${MITTE})` }),
    punkte,
    svg('text', { class: 'ring-mitte', x: MITTE, y: MITTE + 6 }, `${ng.prozent} %`),
    svg('text', { class: 'ring-unter', x: MITTE, y: MITTE + 28 },
      ng.naechste ? `Etappe ${ng.erreicht + 1} von ${ng.etappen.length}` : 'Ziel erreicht'),
  );
}

function buchungen(ng, z, entferne) {
  if (!ng.offene.length) return null;
  return el('div', { class: 'karte' },
    el('h2', {}, 'Am Handy gebucht', el('span', {}, `seit dem Stand vom ${datumLang(z.daten.stand)}`)),
    el('ul', { class: 'buchungen' }, ng.offene.map((e) => el('li', {},
      el('span', {}, datumLang(e.datum)),
      el('b', {}, `+${eur(e.betrag)}`),
      el('button', { 'aria-label': `Einzahlung vom ${datumLang(e.datum)} über ${eur(e.betrag)} entfernen`, onclick: () => entferne(e) }, symbol('kreuz')),
    ))),
    el('p', { class: 'notiz' }, 'Zählt dazu, bis das nächste Datenpaket die Einzahlung enthält.'),
  );
}

function etappenKarte(ng, istNeu) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Etappen', el('span', {}, ng.naechste ? `noch ${eur(ng.rest)} bis: ${ng.naechste.name}` : 'alle erreicht')),
    el('ul', { class: 'etappen' }, ng.etappen.map((e) => el('li', { class: [e.erreicht && 'erreicht', istNeu(e) && 'neu'].filter(Boolean).join(' ') },
      el('span', { class: 'punkt' }, symbol('haken')),
      el('div', {}, el('b', {}, e.name), e.text && el('small', {}, e.text)),
      el('em', {}, eurRund(e.betrag)),
    ))),
  );
}

function prognoseKarte(ng) {
  if (ng.voll || ng.raten == null) return null;
  const anzeige = el('span', {});
  const zeige = (p, knopf) => {
    anzeige.textContent = p ? ` ${monatLang(p.monat)}: ${eurRund(p.wert)}.` : '';
    for (const k of saeulen.children) k.classList.toggle('an', k === knopf);
  };
  let gewaehlt = null;
  const saeulen = el('div', { class: 'saeulen' }, ng.prognose.map((p, i) => {
    const knopf = el('button', {
      class: [i === 0 && 'heute', p.wert >= ng.ziel && 'voll'].filter(Boolean).join(' '),
      style: `height:${((p.wert / ng.ziel) * 100).toFixed(1)}%`,
      'aria-label': `${monatLang(p.monat)}: ${eurRund(p.wert)}`,
      onclick: () => { gewaehlt = gewaehlt === p ? null : p; zeige(gewaehlt, gewaehlt && knopf); },
    });
    return knopf;
  }));
  const frueher = ng.monateFrueher > 0 ? ` Das ist ${monateText(ng.monateFrueher)} früher als geplant.`
    : ng.monateFrueher < 0 ? ` Das ist ${monateText(-ng.monateFrueher)} später als geplant (${monatLang(ng.geplantBis)}).` : '';
  const abgeschnitten = ng.raten > 11;
  return el('div', { class: 'karte' },
    el('h2', {}, 'Prognose', el('span', {}, `+${eurRund(ng.rate)} pro Monat`)),
    saeulen,
    el('div', { class: 'saeulen-achse' }, ng.prognose.map((p) => el('span', {}, monatName(p.monat).slice(0, 3)))),
    el('p', { class: 'notiz' }, 'Voll voraussichtlich im ', el('b', {}, monatLang(ng.zielMonat)), '.', frueher,
      abgeschnitten && ' Das Diagramm zeigt die nächsten 12 Monate.', anzeige),
  );
}

function regelKarte(ng) {
  const text = ng.ueberUntergrenze >= 0
    ? ['Anschaffungen nur aus dem Betrag über der Untergrenze von ', eurRund(ng.untergrenze), '. Aktuell sind das ', el('b', {}, eur(ng.ueberUntergrenze)), '. Nach einer Entnahme hat das Auffüllen Vorrang.']
    : ['Der Notgroschen liegt ', el('b', {}, eur(-ng.ueberUntergrenze)), ' unter der Untergrenze von ', eurRund(ng.untergrenze), '. Auffüllen hat Vorrang.'];
  return el('div', { class: 'karte' },
    el('h2', {}, 'Meine Regel'),
    el('p', { class: 'notiz', style: 'margin-top:0' }, text),
  );
}

function abzeichenKarte(ng, feste, istNeu) {
  const eins = (name, zeile, bild, frei, neu) => el('div', { class: ['abz', frei && 'frei', neu && 'neu'].filter(Boolean).join(' ') },
    el('div', { class: 'medaille' }, symbol(bild)), name, el('br'), zeile);
  return el('div', { class: 'karte' },
    el('h2', {}, 'Abzeichen'),
    el('div', { class: 'abzeichen' },
      feste.map((a) => eins(a.name, a.datum ? datumLang(a.datum) : '', a.symbol, true, false)),
      ng.etappen.map((e) => eins(e.name, eurRund(e.betrag), e.symbol, e.erreicht, istNeu(e))),
    ),
  );
}

/** Zählt die große Zahl vom alten zum neuen Betrag hoch. */
function zaehle(element, von, bis) {
  const dauer = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000;
  const start = performance.now();
  const schritt = (jetzt) => {
    const t = dauer ? Math.min(1, (jetzt - start) / dauer) : 1;
    element.textContent = eur(von + (bis - von) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
  setTimeout(() => { element.textContent = eur(bis); }, dauer + 150);   // Sicherheitsnetz, falls die App im Hintergrund ist
}

function funken(ort) {
  if (!ort || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const farben = ['var(--sparen)', 'var(--fest)', 'var(--frei)', '#f5c542'];
  for (let i = 0; i < 18; i++) {
    const winkel = Math.random() * Math.PI * 2, weite = 60 + Math.random() * 90;
    const f = el('span', { class: 'funke', style: `background:${farben[i % 4]};--dx:${(Math.cos(winkel) * weite).toFixed(0)}px;--dy:${(Math.sin(winkel) * weite).toFixed(0)}px` });
    ort.append(f);
    setTimeout(() => f.remove(), 950);
  }
}
