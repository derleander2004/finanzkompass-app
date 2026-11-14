// Bausteine, die auf mehreren Seiten vorkommen: geteilte Leiste mit Legende, Postenliste, Karten zum Budget.

import { el, eur, eurRund, monatLang } from './hilfen.js';
import { symbol } from './symbole.js';

/**
 * Ein Ganzes in Teilen: eine Leiste mit einem Abschnitt je Teil und darunter die Legende.
 * Antippen (oder mit der Maus überfahren) hebt einen Teil und seine Zeile hervor.
 * teile: [{ id, name, betrag, farbe }] – gibt [leiste, legende] zurück.
 */
export function teileMitLegende(alle, gesamt) {
  const teile = alle.filter((t) => t.betrag > 0);
  let fest = null;
  const hebe = (id) => {
    leiste.classList.toggle('gewaehlt', !!id);
    for (const e of [...leiste.children, ...legende.children]) e.classList.toggle('an', e.dataset.teil === id);
  };
  const lausche = (e, id) => {
    e.addEventListener('click', () => { fest = fest === id ? null : id; hebe(fest); });
    e.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') hebe(id); });
    e.addEventListener('pointerleave', () => hebe(fest));
  };
  const leiste = el('div', { class: 'teile' }, teile.map((t) => {
    const k = el('button', { 'data-teil': t.id, style: `flex:${t.betrag};background:${t.farbe}`, 'aria-label': `${t.name}: ${eur(t.betrag)}` });
    lausche(k, t.id);
    return k;
  }));
  const legende = el('ul', { class: 'legende' }, teile.map((t) => {
    const zeile = el('li', { 'data-teil': t.id },
      el('i', { style: `background:${t.farbe}` }), t.name,
      el('b', {}, eur(t.betrag)), el('em', {}, `${Math.round((t.betrag / gesamt) * 100)} %`));
    lausche(zeile, t.id);
    return zeile;
  }));
  return [leiste, legende];
}

/** Karte „Wohin fließt mein Gehalt?“ */
export function geldfluss(b) {
  return el('div', { class: 'karte' },
    el('h2', {}, 'Wohin fließt mein Gehalt?', el('span', {}, `${eur(b.netto)} netto`)),
    teileMitLegende([
      { id: 'fest', name: 'Feste Ausgaben', betrag: b.fest, farbe: 'var(--fest)' },
      { id: 'sparen', name: 'Sparen und Investieren', betrag: b.sparen, farbe: 'var(--sparen)' },
      { id: 'frei', name: 'Frei verfügbar', betrag: b.frei, farbe: 'var(--frei)' },
    ], b.netto),
    b.frei < 0 && el('p', { class: 'status' }, symbol('warnung'), `${eur(-b.frei)} mehr verplant als Einkommen`),
  );
}

/**
 * Liste von Posten, der größte zuerst, mit einem Strich je Posten (Länge = Betrag im Vergleich zum größten).
 * posten: [{ name, betrag, zusatz, ungefaehr, wertText, zuletzt }]. Mit `zuerst` zeigt die Liste anfangs nur die größten.
 */
export function postenListe(posten, farbe, zuerst = Infinity) {
  // größter Posten zuerst; ein Sammelposten („Alles andere“) steht immer am Ende
  const sortiert = [...posten].sort((a, b) => !!a.zuletzt - !!b.zuletzt || b.betrag - a.betrag);
  const groesster = Math.max(...sortiert.map((p) => p.betrag), 0) || 1;
  const zeile = (p) => el('li', {},
    el('div', { class: 'zeile' },
      el('div', {}, p.name, p.zusatz && el('small', {}, p.zusatz)),
      el('b', {}, p.wertText ?? (p.ungefaehr ? 'ca. ' : '') + eur(p.betrag))),
    el('div', { class: 'strich' }, el('i', { style: `width:${Math.max(0, (p.betrag / groesster) * 100).toFixed(1)}%;background:${farbe}` })));
  const liste = el('ul', { class: 'posten' }, sortiert.slice(0, zuerst).map(zeile));
  const rest = sortiert.slice(zuerst);
  if (!rest.length) return liste;
  const zusammen = Math.round(rest.reduce((s, p) => s + p.betrag, 0) * 100) / 100;
  const knopf = el('button', {
    class: 'mehr',
    onclick: () => { liste.append(...rest.map(zeile)); knopf.remove(); },
  }, `${rest.length} weitere anzeigen (zusammen ${eur(zusammen)})`);
  return [liste, knopf];
}

/** Karte „Variable Ausgaben“ für einen Monat. `ausfuehrlich` zeigt die Posten als Liste statt als Textzeile. */
export function variableAusgaben(v, ausfuehrlich = false) {
  const ca = v.ungefaehr ? 'ca. ' : '';
  const betrag = (n) => ca + (v.ungefaehr ? eurRund(n) : eur(n));
  const drueber = v.differenz > 0;
  const leiste = drueber
    ? el('div', { class: 'leiste' },
        el('i', { style: `flex:${v.rahmen};background:var(--frei)` }),
        el('i', { style: `flex:${v.differenz};background:var(--krit)` }),
        el('span', { class: 'grenze', style: `left:calc(${((v.rahmen / v.summe) * 100).toFixed(1)}% - 1px)` }))
    : el('div', { class: 'leiste' },
        el('i', { style: `width:${v.rahmen > 0 ? ((v.summe / v.rahmen) * 100).toFixed(1) : 0}%;background:var(--frei)` }));
  const posten = v.posten ?? [];
  const zeilen = [
    ...posten.map((p) => ({ name: p.name, betrag: p.betrag, wertText: betrag(p.betrag) })),
    ...(v.uebrige > 0 ? [{ name: 'Alles andere', betrag: v.uebrige, wertText: betrag(v.uebrige), zuletzt: true }] : []),
  ];
  return el('div', { class: 'karte' },
    el('h2', {}, 'Variable Ausgaben', el('span', {}, monatLang(v.monat))),
    el('div', { class: 'zahl' }, betrag(v.summe), ' ', el('small', {}, `bei ${eur(v.rahmen)} Rahmen`)),
    leiste,
    drueber
      ? el('p', { class: 'status' }, symbol('warnung'), `${betrag(v.differenz)} über dem Rahmen`)
      : el('p', { class: 'status' }, symbol('gut'), `Im Rahmen, ${betrag(-v.differenz)} übrig`),
    !ausfuehrlich && posten.length > 0 && el('p', { class: 'notiz' },
      'Größte Posten: ', posten.map((p) => `${p.name} ${betrag(p.betrag)}`).join(', ')),
    ausfuehrlich && zeilen.length > 0 && el('div', { class: 'abschnitt' }, postenListe(zeilen, 'var(--frei)')),
  );
}
