// Prüft ein Datenpaket beim Import gegen das Format aus docs/datenformat.md.
// Gibt eine Liste verständlicher Fehlermeldungen zurück (leer = alles in Ordnung).

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const MONAT = /^\d{4}-\d{2}$/;
const ROLLEN = ['kern', 'satellit', 'patenkind'];

const istZahl = (w) => typeof w === 'number' && Number.isFinite(w);
const istText = (w) => typeof w === 'string' && w.trim() !== '';

export function pruefeDaten(d) {
  const fehler = [];
  const pruefe = (bedingung, meldung) => { if (!bedingung) fehler.push(meldung); return bedingung; };
  const liste = (wert, name, pflicht) => {
    if (wert == null && !pflicht) return [];
    return pruefe(Array.isArray(wert), `„${name}“ muss eine Liste sein.`) ? wert : [];
  };

  if (!pruefe(d && typeof d === 'object' && !Array.isArray(d), 'Die Datei enthält kein Datenpaket.')) return fehler;
  if (!pruefe(d.format === 'finanzkompass', 'Das ist kein Finanzkompass-Datenpaket (Feld „format“ fehlt oder ist falsch).')) return fehler;
  if (!pruefe(d.version === 1, `Unbekannte Version „${d.version}“. Diese App versteht nur Version 1.`)) return fehler;
  pruefe(istText(d.stand) && DATUM.test(d.stand), '„stand“ muss ein Datum im Format JJJJ-MM-TT sein.');

  pruefe(d.update_tag == null || (Number.isInteger(d.update_tag) && d.update_tag >= 1 && d.update_tag <= 28), '„update_tag“ muss eine ganze Zahl von 1 bis 28 sein.');
  pruefe(d.update_vorbereitung == null || (Array.isArray(d.update_vorbereitung) && d.update_vorbereitung.every(istText)), '„update_vorbereitung“ muss eine Liste von Texten sein.');

  pruefe(istZahl(d.einkommen?.netto) && d.einkommen.netto > 0, '„einkommen.netto“ muss eine Zahl über 0 sein.');

  for (const name of ['feste_ausgaben', 'sparen']) {
    liste(d[name], name, true).forEach((p, i) => {
      pruefe(istText(p?.name), `${name}, Eintrag ${i + 1}: „name“ fehlt.`);
      pruefe(istZahl(p?.betrag) && p.betrag >= 0, `${name}, Eintrag ${i + 1}: „betrag“ muss eine Zahl ab 0 sein.`);
    });
  }

  liste(d.variable_ausgaben, 'variable_ausgaben').forEach((m, i) => {
    pruefe(istText(m?.monat) && MONAT.test(m.monat), `variable_ausgaben, Eintrag ${i + 1}: „monat“ muss JJJJ-MM sein.`);
    pruefe(istZahl(m?.summe) && m.summe >= 0, `variable_ausgaben, Eintrag ${i + 1}: „summe“ muss eine Zahl ab 0 sein.`);
    liste(m?.posten, 'variable_ausgaben.posten').forEach((p, j) => {
      pruefe(istText(p?.name) && istZahl(p?.betrag), `variable_ausgaben, Eintrag ${i + 1}, Posten ${j + 1}: „name“ und „betrag“ nötig.`);
    });
  });

  const konten = liste(d.konten, 'konten', true);
  konten.forEach((k, i) => {
    pruefe(istText(k?.id) && istText(k?.name), `konten, Eintrag ${i + 1}: „id“ und „name“ nötig.`);
    pruefe(istZahl(k?.stand), `konten, Eintrag ${i + 1}: „stand“ muss eine Zahl sein.`);
  });

  const ng = d.notgroschen;
  if (pruefe(ng && typeof ng === 'object', '„notgroschen“ fehlt.')) {
    pruefe(konten.some((k) => k?.id === ng.konto), `notgroschen: Das Konto „${ng.konto}“ gibt es nicht in „konten“.`);
    pruefe(istZahl(ng.ziel) && ng.ziel > 0, 'notgroschen: „ziel“ muss eine Zahl über 0 sein.');
    pruefe(istZahl(ng.untergrenze) && ng.untergrenze >= 0, 'notgroschen: „untergrenze“ muss eine Zahl ab 0 sein.');
    pruefe(istZahl(ng.rate) && ng.rate >= 0, 'notgroschen: „rate“ muss eine Zahl ab 0 sein.');
    pruefe(ng.geplant_bis == null || (istText(ng.geplant_bis) && MONAT.test(ng.geplant_bis)), 'notgroschen: „geplant_bis“ muss JJJJ-MM sein.');
    liste(ng.etappen, 'notgroschen.etappen', true).forEach((e, i) => {
      pruefe(istZahl(e?.betrag) && e.betrag > 0 && istText(e?.name), `notgroschen.etappen, Eintrag ${i + 1}: „betrag“ (über 0) und „name“ nötig.`);
    });
  }

  if (d.depot != null) {
    pruefe(istZahl(d.depot.wert), 'depot: „wert“ muss eine Zahl sein.');
    liste(d.depot.positionen, 'depot.positionen', true).forEach((p, i) => {
      pruefe(ROLLEN.includes(p?.rolle), `depot.positionen, Eintrag ${i + 1}: „rolle“ muss kern, satellit oder patenkind sein.`);
      pruefe(istText(p?.name) && istZahl(p?.wert), `depot.positionen, Eintrag ${i + 1}: „name“ und „wert“ nötig.`);
      pruefe(p?.sparplan == null || istZahl(p.sparplan), `depot.positionen, Eintrag ${i + 1}: „sparplan“ muss eine Zahl sein.`);
    });
  }

  liste(d.handlungsbedarf, 'handlungsbedarf').forEach((h, i) => {
    pruefe(istText(h?.titel), `handlungsbedarf, Eintrag ${i + 1}: „titel“ fehlt.`);
  });
  liste(d.termine, 'termine').forEach((t, i) => {
    pruefe(istText(t?.datum) && DATUM.test(t.datum) && istText(t?.text), `termine, Eintrag ${i + 1}: „datum“ (JJJJ-MM-TT) und „text“ nötig.`);
  });
  liste(d.serien, 'serien').forEach((s, i) => {
    pruefe(istText(s?.name) && istZahl(s?.monate), `serien, Eintrag ${i + 1}: „name“ und „monate“ nötig.`);
  });
  liste(d.abzeichen, 'abzeichen').forEach((a, i) => {
    pruefe(istText(a?.name), `abzeichen, Eintrag ${i + 1}: „name“ fehlt.`);
  });

  return fehler;
}
