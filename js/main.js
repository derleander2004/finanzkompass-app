// Einstieg der App: Zustand laden, Seiten wechseln, Daten importieren, Einzahlungen buchen und sichern.

import { ladeAlles, speichereDaten, speichereMeta, speichereEinzahlung, loescheEinzahlung, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { BACKUP_FORMAT, erstelleBackup, pruefeBackup, fehlende, teileOderLadeHerunter } from './backup.js';
import { pruefeDaten } from './pruefung.js';
import { notgroschen, runde, updateFaellig } from './rechnen.js';
import { heute } from './datum.js';
import { el, eur, eurRund, datumLang } from './hilfen.js';
import { symbol } from './symbole.js';
import { baueKompass } from './ansicht-kompass.js';
import { baueNotgroschen } from './ansicht-notgroschen.js';
import { baueBudget } from './ansicht-budget.js';
import { baueDepot } from './ansicht-depot.js';

const SEITEN = [
  { id: 'kompass', titel: 'Kompass', symbol: 'kompass' },
  { id: 'notgroschen', titel: 'Notgroschen', symbol: 'schild' },
  { id: 'budget', titel: 'Budget', symbol: 'geldboerse' },
  { id: 'depot', titel: 'Depot', symbol: 'saeulen' },
  { id: 'fahrplan', titel: 'Fahrplan', symbol: 'kalender' },
];

// Alles, was die App gerade weiß. `einzahlungen` sind die am Handy gebuchten Einzahlungen.
const z = { daten: null, einzahlungen: [], meta: {}, seite: 'kompass', heute: heute() };

const $ = (id) => document.getElementById(id);
const betragText = (n) => (Number.isInteger(n) ? eurRund(n) : eur(n));

// ---------- Zeichnen ----------

function zeichne({ von = null } = {}) {
  z.heute = heute();
  const seite = SEITEN.find((s) => s.id === z.seite);
  $('titel').textContent = seite.titel;
  $('stand').textContent = z.daten ? `Stand ${datumLang(z.daten.stand)}${z.daten.demo ? ' · Demo-Daten' : ''}` : '';

  const serie = z.daten?.serien?.[0];
  $('serie').hidden = !serie;
  if (serie) {
    $('serie').replaceChildren(symbol('flamme'), `Serie: ${serie.monate === 1 ? '1 Monat' : `${serie.monate} Monate`}`);
    $('serie').title = serie.name;
  }
  // roter Punkt am Menü, solange das Monats-Update fällig ist
  const faellig = !!z.daten && updateFaellig(z.daten, z.heute).faellig;
  $('menue-knopf').classList.toggle('punkt', faellig);
  $('menue-knopf').setAttribute('aria-label', faellig ? 'Menü öffnen (Monats-Update fällig)' : 'Menü öffnen');

  for (const k of $('reiter').children) {
    if (k.dataset.seite === z.seite) k.setAttribute('aria-current', 'page');
    else k.removeAttribute('aria-current');
  }

  const inhalt = $('inhalt');
  if (!z.daten) {
    inhalt.replaceChildren(willkommen());
  } else if (z.seite === 'kompass') {
    inhalt.replaceChildren(baueKompass(z, { gehe, importieren: () => $('datei').click() }));
  } else if (z.seite === 'notgroschen') {
    const { element, starte } = baueNotgroschen(z, { oeffneBuchen, entferne }, von);
    inhalt.replaceChildren(element);
    starte();
  } else if (z.seite === 'budget') {
    inhalt.replaceChildren(baueBudget(z));
  } else if (z.seite === 'depot') {
    inhalt.replaceChildren(baueDepot(z, { oeffneBlatt, schliesseBlatt }));
  } else {
    inhalt.replaceChildren(el('div', { class: 'leer' }, el('b', {}, seite.titel), 'Dieser Bereich kommt als Nächstes.'));
  }
  if (!von) inhalt.scrollTop = 0;
}

function willkommen() {
  return el('div', { class: 'leer' },
    el('b', {}, 'Noch keine Daten'),
    'Importiere dein Datenpaket, dann zeigt die App deinen Finanzkompass. Die Daten bleiben nur auf diesem Gerät.',
    el('button', { class: 'haupt', onclick: () => $('datei').click() }, 'Datenpaket importieren'),
    el('button', { class: 'neben', onclick: ladeDemo }, 'Demo mit erfundenen Zahlen ansehen'),
  );
}

function gehe(seite) {
  z.seite = seite;
  history.replaceState(null, '', `#${seite}`);
  zeichne();
}

// ---------- Blatt von unten und Meldung ----------

function oeffneBlatt(...inhalt) {
  $('blatt').replaceChildren(...inhalt.filter((k) => k != null && k !== false));
  $('blatt').scrollTop = 0;
  $('app').classList.add('blatt-offen');
}

function schliesseBlatt() {
  $('app').classList.remove('blatt-offen');
}

let meldungZeit;
function melde(titel, text = '') {
  $('meldung').replaceChildren(el('b', {}, titel), text);
  $('meldung').classList.add('da');
  clearTimeout(meldungZeit);
  meldungZeit = setTimeout(() => $('meldung').classList.remove('da'), 3500);
}

// ---------- Einzahlung buchen ----------

function oeffneBuchen() {
  const rate = z.daten.notgroschen.rate;
  const vorschlaege = [...new Set([50, 100, 200, rate].filter((n) => n > 0))].sort((a, b) => a - b).slice(0, 4);
  let betrag = vorschlaege.includes(rate) ? rate : vorschlaege[0];

  const knopf = el('button', { class: 'haupt', onclick: () => buche(betrag) });
  const zeige = () => {
    knopf.disabled = !(betrag > 0);
    knopf.textContent = betrag > 0 ? `${betragText(betrag)} buchen` : 'Betrag eingeben';
    for (const k of auswahl.children) k.setAttribute('aria-pressed', String(Number(k.dataset.betrag) === betrag && eingabe.value === ''));
  };
  const auswahl = el('div', { class: 'betraege' }, vorschlaege.map((n) => el('button', {
    'data-betrag': n,
    onclick: () => { eingabe.value = ''; betrag = n; zeige(); },
  }, eurRund(n))));
  const eingabe = el('input', {
    class: 'eingabe', type: 'text', inputmode: 'decimal', placeholder: 'Anderer Betrag in Euro', 'aria-label': 'Anderer Betrag in Euro',
    oninput: () => {
      const n = runde(Number(eingabe.value.trim().replace(/\./g, '').replace(',', '.')));
      betrag = eingabe.value.trim() === '' ? vorschlaege[0] : (Number.isFinite(n) && n > 0 && n <= 100000 ? n : 0);
      zeige();
    },
  });
  zeige();
  oeffneBlatt(
    el('h2', {}, 'Einzahlung buchen'),
    el('p', {}, `Wie viel hast du auf „${notgroschen(z.daten, z.einzahlungen).konto.name}“ überwiesen?`),
    auswahl, eingabe, knopf,
    z.daten.demo && el('p', { class: 'klein' }, 'Demo: Die Einzahlung wird nicht gespeichert.'),
  );
}

async function buche(betrag) {
  const vorher = notgroschen(z.daten, z.einzahlungen);
  const neu = { datum: heute(), betrag, zu_stand: z.daten.stand };
  // In der Demo bleibt die Einzahlung nur bis zum Schließen der App erhalten.
  z.einzahlungen.push(z.daten.demo ? { ...neu, id: Date.now(), demo: true } : await speichereEinzahlung(neu));
  schliesseBlatt();
  z.seite = 'notgroschen';
  zeichne({ von: vorher });

  const nachher = notgroschen(z.daten, z.einzahlungen);
  const erreicht = nachher.etappen.filter((e) => e.erreicht && e.betrag > vorher.stand);
  if (erreicht.length) {
    melde(`Etappe erreicht: ${erreicht[erreicht.length - 1].name}`, `+${betragText(betrag)} gebucht. Neues Abzeichen freigeschaltet.`);
  } else {
    melde(`+${betragText(betrag)} gebucht`, nachher.naechste ? `Noch ${eur(nachher.rest)} bis: ${nachher.naechste.name}.` : 'Ziel erreicht.');
  }
}

async function entferne(einzahlung) {
  if (!einzahlung.demo) await loescheEinzahlung(einzahlung.id);
  z.einzahlungen = z.einzahlungen.filter((e) => e.id !== einzahlung.id);
  const oben = $('inhalt').scrollTop;
  zeichne();
  $('inhalt').scrollTop = oben;
  melde('Einzahlung entfernt', `${eur(einzahlung.betrag)} vom ${datumLang(einzahlung.datum)}`);
}

// ---------- Daten importieren ----------

function oeffneMenue() {
  const stand = !z.daten ? 'Noch keine Daten geladen.'
    : z.daten.demo ? 'Geladen sind Demo-Daten mit erfundenen Zahlen.'
    : `Stand der Daten: ${datumLang(z.daten.stand)}.${z.meta.importiert_am ? ` Importiert am ${datumLang(z.meta.importiert_am)}.` : ''}`;
  oeffneBlatt(
    el('h2', {}, 'Daten'),
    el('p', {}, stand),
    z.daten && updateFaellig(z.daten, z.heute).faellig && el('p', {}, el('b', {}, 'Das Monats-Update ist fällig. '), 'Am Mac /monats-update starten, dann hier das neue Datenpaket importieren.'),
    el('button', { class: 'haupt', style: 'margin-top:0', onclick: () => $('datei').click() }, 'Datenpaket importieren'),
    (!z.daten || z.daten.demo) && el('button', { class: 'neben', onclick: ladeDemo }, 'Demo mit erfundenen Zahlen laden'),
    el('h2', { class: 'zwischen' }, 'Sicherung'),
    el('p', {}, sicherungText()),
    eigeneEinzahlungen().length > 0 && el('button', { class: 'neben', style: 'margin-top:0', onclick: sichere }, 'Einzahlungen sichern'),
    el('button', { class: 'neben', onclick: () => $('datei').click() }, 'Sicherung wiederherstellen'),
    el('button', { class: 'neben', onclick: schliesseBlatt }, 'Schließen'),
    el('p', { class: 'klein' }, 'Deine Daten bleiben nur auf diesem Gerät. Die App hat keinen Zugang zu deiner Bank.'),
  );
}

// ---------- Sicherung der gebuchten Einzahlungen ----------

const eigeneEinzahlungen = () => z.einzahlungen.filter((e) => !e.demo);
const anzahlText = (n) => (n === 1 ? '1 Einzahlung' : `${n} Einzahlungen`);

function sicherungText() {
  const alle = eigeneEinzahlungen();
  if (!alle.length) return 'Am Handy gebuchte Einzahlungen lassen sich als Datei sichern, zum Beispiel für einen Handywechsel. Bisher ist nichts gebucht.';
  const offen = alle.filter((e) => e.id > (z.meta.gesichert_bis ?? 0)).length;
  const zuletzt = z.meta.gesichert_am ? `Zuletzt gesichert am ${datumLang(z.meta.gesichert_am)}` : 'Noch nie gesichert';
  return `${anzahlText(alle.length)} am Handy gebucht. ${zuletzt}${offen && z.meta.gesichert_am ? `, ${offen} davon seitdem neu` : ''}.`;
}

async function sichere() {
  const alle = eigeneEinzahlungen();
  const inhalt = JSON.stringify(erstelleBackup(alle, heute()), null, 2);
  const wie = await teileOderLadeHerunter(inhalt, `finanzkompass-sicherung-${heute()}`);
  if (wie === 'abgebrochen') return;
  const meta = { gesichert_am: heute(), gesichert_bis: Math.max(...alle.map((e) => e.id)) };
  Object.assign(z.meta, meta);
  try { await speichereMeta(meta); } catch { /* ohne Speicher fehlt nur der Vermerk */ }
  schliesseBlatt();
  melde('Sicherung erstellt', wie === 'geteilt' ? `${anzahlText(alle.length)} weitergegeben.` : `${anzahlText(alle.length)} als Datei heruntergeladen.`);
}

async function stelleWiederHer(backup) {
  const fehler = pruefeBackup(backup);
  if (fehler) return zeigeFehler([fehler], 'Wiederherstellen nicht möglich');
  const neu = fehlende(eigeneEinzahlungen(), backup.einzahlungen);
  for (const e of neu) z.einzahlungen.push(await speichereEinzahlung(e));
  schliesseBlatt();
  zeichne();
  melde(neu.length ? `${anzahlText(neu.length)} wiederhergestellt` : 'Schon alles da',
    neu.length ? `Aus der Sicherung vom ${datumLang(backup.erstellt)}.` : 'Die Sicherung enthält nichts, was auf diesem Gerät fehlt.');
}

async function importiere(datei) {
  let daten;
  try {
    daten = JSON.parse(await datei.text());
  } catch {
    return zeigeFehler(['Die Datei lässt sich nicht lesen. Richtig ist das Datenpaket „finanzkompass-daten.json“ oder eine Sicherung dieser App.']);
  }
  // Eine Datei, ein Dialog: Die App erkennt selbst, ob es ein Datenpaket oder eine Sicherung ist.
  if (daten?.format === BACKUP_FORMAT) return stelleWiederHer(daten);
  await uebernimm(daten);
}

async function ladeDemo() {
  try {
    await uebernimm(await (await fetch('demo/finanzen-demo.json')).json());
  } catch {
    zeigeFehler(['Die Demo-Daten konnten nicht geladen werden.']);
  }
}

async function uebernimm(daten) {
  const fehler = pruefeDaten(daten);
  if (fehler.length) return zeigeFehler(fehler);
  const meta = { importiert_am: heute() };
  await speichereDaten(daten, meta);
  z.einzahlungen = z.einzahlungen.filter((e) => !e.demo);   // Demo-Einzahlungen gehören nicht zu echten Daten
  z.daten = daten;
  Object.assign(z.meta, meta);
  schliesseBlatt();
  zeichne();
  melde(daten.demo ? 'Demo-Daten geladen' : 'Daten geladen', `Stand ${datumLang(daten.stand)}`);
  if (!daten.demo) bitteUmDauerhaftenSpeicher();
}

function zeigeFehler(fehler, titel = 'Import nicht möglich') {
  oeffneBlatt(
    el('h2', {}, titel),
    el('p', {}, 'Die bisherigen Daten bleiben unverändert.'),
    el('ul', {}, fehler.slice(0, 6).map((f) => el('li', {}, f)), fehler.length > 6 && el('li', {}, `… und ${fehler.length - 6} weitere`)),
    el('button', { class: 'neben', onclick: schliesseBlatt }, 'Schließen'),
  );
}

// ---------- Offline-Betrieb ----------

// Der Service Worker (sw.js) legt alle App-Dateien auf dem Gerät ab. Das geht nur über HTTPS oder localhost.
// Am Mac beim Entwickeln bleibt er aus, sonst zeigt der Browser nach Änderungen die alte Fassung.
// Zum Testen des Offline-Betriebs am Mac: ?offline an die Adresse hängen.
async function starteOfflineBetrieb() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const amMac = ['localhost', '127.0.0.1'].includes(location.hostname);
  try {
    if (!amMac || new URLSearchParams(location.search).has('offline')) {
      await navigator.serviceWorker.register('sw.js');
    } else {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      for (const name of await caches.keys()) if (name.startsWith('finanzkompass-')) await caches.delete(name);
    }
  } catch (fehler) {
    console.warn('Offline-Betrieb nicht eingerichtet', fehler);
  }
}

// ---------- Start ----------

async function start() {
  $('menue-knopf').append(symbol('menue'));
  $('menue-knopf').addEventListener('click', oeffneMenue);
  $('reiter').append(...SEITEN.map((s) => el('button', { 'data-seite': s.id, onclick: () => gehe(s.id) }, symbol(s.symbol), s.titel)));
  $('schleier').addEventListener('click', schliesseBlatt);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseBlatt(); });
  $('datei').addEventListener('change', async () => {
    const datei = $('datei').files[0];
    $('datei').value = '';
    if (datei) await importiere(datei);
  });

  const ausAdresse = location.hash.slice(1);
  if (SEITEN.some((s) => s.id === ausAdresse)) z.seite = ausAdresse;

  try {
    Object.assign(z, await ladeAlles());
  } catch {
    melde('Speicher nicht verfügbar', 'Die App läuft, kann aber nichts dauerhaft speichern.');
  }
  zeichne();
  starteOfflineBetrieb();
}

start();
