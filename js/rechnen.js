// Rechenlogik: macht aus dem Datenpaket die Zahlen, die die App anzeigt.
// Alles hier ist reine Rechnung ohne Bildschirm und ohne Speicher, damit es sich leicht testen lässt.

import { monatPlus, monateZwischen } from './datum.js';

/** Auf Cent runden (vermeidet Fehler wie 0.1 + 0.2 = 0.30000000000000004). */
export const runde = (n) => Math.round(n * 100) / 100;

const summe = (liste, feld = 'betrag') => runde((liste ?? []).reduce((s, e) => s + (e[feld] ?? 0), 0));

/** Monatsbudget: Summen, Sparquote, frei verfügbar und der letzte ausgewertete Monat. */
export function budget(daten) {
  const netto = daten.einkommen.netto;
  const fest = summe(daten.feste_ausgaben);
  const sparen = summe(daten.sparen);
  const frei = runde(netto - fest - sparen);
  const monate = [...(daten.variable_ausgaben ?? [])].sort((a, b) => a.monat.localeCompare(b.monat));
  // Jeder Monat wird mit dem heutigen Rahmen verglichen. „uebrige“ ist der Teil ohne eigenen Posten.
  const mitRahmen = (m) => ({
    ...m,
    rahmen: frei,
    differenz: runde(m.summe - frei),
    uebrige: m.posten?.length ? runde(m.summe - summe(m.posten)) : null,
  });
  const verlauf = monate.map(mitRahmen);
  return {
    netto, fest, sparen, frei,
    sparquote: (sparen / netto) * 100,
    variabel: verlauf[verlauf.length - 1] ?? null,
    verlauf,
  };
}

/**
 * Zählt eine am Handy gebuchte Einzahlung zum Füllstand dazu?
 * Ja, wenn sie nach dem Stand der Daten gebucht wurde (oder während genau diese Daten geladen waren).
 * Ältere Einzahlungen gelten als im Datenpaket enthalten und werden nicht doppelt gezählt.
 */
export function zaehlt(einzahlung, stand) {
  return einzahlung.datum > stand || einzahlung.zu_stand === stand;
}

/** Notgroschen: Füllstand, Etappen und Prognose. */
export function notgroschen(daten, einzahlungen = []) {
  const ng = daten.notgroschen;
  const konto = daten.konten.find((k) => k.id === ng.konto);
  const offene = einzahlungen
    .filter((e) => zaehlt(e, daten.stand))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id);
  const stand = runde(konto.stand + summe(offene));
  const anteil = Math.min(1, Math.max(0, stand / ng.ziel));
  const etappen = [...ng.etappen]
    .sort((a, b) => a.betrag - b.betrag)
    .map((e) => ({ ...e, erreicht: stand >= e.betrag }));
  const naechste = etappen.find((e) => !e.erreicht) ?? null;

  // Prognose: Ab dem Monat nach der letzten bekannten Bewegung kommt jeden Monat eine Rate dazu.
  const voll = stand >= ng.ziel;
  const letzteBewegung = offene.reduce((d, e) => (e.datum > d ? e.datum : d), daten.stand);
  const startMonat = letzteBewegung.slice(0, 7);
  const raten = voll ? 0 : ng.rate > 0 ? Math.ceil(runde(ng.ziel - stand) / ng.rate) : null;
  const zielMonat = raten == null ? null : monatPlus(startMonat, raten);
  const prognose = [];
  if (raten != null) {
    for (let i = 0; i <= Math.min(raten, 11); i++) {
      prognose.push({ monat: monatPlus(startMonat, i), wert: Math.min(ng.ziel, runde(stand + ng.rate * i)) });
    }
  }

  return {
    konto, offene, stand, anteil, voll,
    ziel: ng.ziel, untergrenze: ng.untergrenze, rate: ng.rate,
    // gerundet wie im Finanzkompass, aber 100 % erst, wenn das Ziel wirklich erreicht ist
    prozent: voll ? 100 : Math.min(99, Math.round(anteil * 100)),
    ueberUntergrenze: runde(stand - ng.untergrenze),
    etappen, naechste,
    erreicht: etappen.filter((e) => e.erreicht).length,
    rest: naechste ? runde(naechste.betrag - stand) : 0,
    raten, zielMonat, prognose,
    geplantBis: ng.geplant_bis ?? null,
    monateFrueher: zielMonat && ng.geplant_bis ? monateZwischen(zielMonat, ng.geplant_bis) : 0,
  };
}

/** Depot: Werte je Rolle, Soll und Ist im Kern, Sparpläne, Kosten und der Patenkind-Topf. */
export function depot(daten) {
  const d = daten.depot;
  if (!d) return null;
  const alle = d.positionen;
  const nach = (rolle) => alle.filter((p) => p.rolle === rolle);
  const satellit = nach('satellit');
  const patenkind = nach('patenkind');
  const kernWert = summe(nach('kern'), 'wert');
  const kern = nach('kern').map((p) => {
    const istanteil = kernWert > 0 ? (p.wert / kernWert) * 100 : 0;
    // Abweichung vom Zielanteil in Prozentpunkten: plus = über dem Ziel, minus = darunter
    return { ...p, istanteil, abweichung: p.zielanteil != null ? istanteil - p.zielanteil : null };
  });
  const mitZiel = kern.filter((p) => p.abweichung != null);
  const weiteste = mitZiel.reduce((w, p) => (!w || Math.abs(p.abweichung) > Math.abs(w.abweichung) ? p : w), null);
  const eigeneRate = summe(kern, 'sparplan') + summe(satellit, 'sparplan');
  // Laufende Kosten (TER) im Schnitt, nach Wert gewichtet. Nur wenn jede Position eine TER hat.
  const gewichtet = alle.reduce((s, p) => s + p.wert * (p.ter ?? 0), 0);
  const summeWerte = summe(alle, 'wert');
  return {
    wert: d.wert,
    guthaben: d.guthaben ?? 0,
    positionen: alle,
    summeWerte,
    kern,
    kernWert,
    satellit,
    satellitWert: summe(satellit, 'wert'),
    satellitName: satellit[0]?.name ?? 'Satellit',
    patenkind: patenkind.map((p) => ({ ...p, anteil: p.ziel > 0 ? Math.min(1, Math.max(0, p.wert / p.ziel)) : null })),
    patenkindWert: summe(patenkind, 'wert'),
    hatSatellit: satellit.length > 0,
    hatPatenkind: patenkind.length > 0,
    // größte Abweichung eines Kern-Bausteins von seinem Zielanteil, in Prozentpunkten
    kernAbweichung: weiteste ? Math.abs(weiteste.abweichung) : null,
    weiteste,
    sparplaene: alle.filter((p) => p.sparplan > 0),
    sparplanSumme: summe(alle, 'sparplan'),
    eigeneRate: runde(eigeneRate),
    // Anteil des Satelliten an der eigenen ETF-Sparrate (ohne Patenkind), in Prozent
    satellitAnteil: satellit.length && eigeneRate > 0 ? (summe(satellit, 'sparplan') / eigeneRate) * 100 : null,
    satellitGrenze: d.satellit_grenze_prozent ?? null,
    kosten: alle.length && summeWerte > 0 && alle.every((p) => p.ter != null) ? gewichtet / summeWerte : null,
  };
}

/**
 * Ist das Monats-Update fällig? Einmal pro Kalendermonat, Erinnerung ab dem Stichtag (Standard: der 5.).
 * Fällig heißt: Die Daten stammen noch aus einem früheren Monat und der Stichtag ist erreicht –
 * oder die Daten sind schon mehr als einen Monat alt.
 */
export function updateFaellig(daten, heute) {
  const tag = daten.update_tag ?? 5;
  const rueckstand = monateZwischen(daten.stand.slice(0, 7), heute.slice(0, 7));
  const faellig = !daten.demo && (rueckstand >= 2 || (rueckstand === 1 && Number(heute.slice(8, 10)) >= tag));
  return { faellig, tag, fuer: faellig ? heute.slice(0, 7) : null };
}

/** Die nächsten Termine ab heute. */
export function termine(daten, heute, anzahl = 5) {
  return (daten.termine ?? [])
    .filter((t) => t.datum >= heute)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, anzahl);
}
