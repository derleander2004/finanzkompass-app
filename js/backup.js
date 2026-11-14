// Sicherung der am Handy gebuchten Einzahlungen: erstellen, prüfen, zusammenführen, weitergeben.
// Die Sicherung enthält nur die Einzahlungen. Alle anderen Zahlen kommen aus dem Datenpaket.

export const BACKUP_FORMAT = 'finanzkompass-backup';

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Baut die Sicherung. Einzahlungen aus der Demo gehören nicht hinein. */
export function erstelleBackup(einzahlungen, heute) {
  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    erstellt: heute,
    einzahlungen: einzahlungen
      .filter((e) => !e.demo)
      .map(({ datum, betrag, zu_stand }) => ({ datum, betrag, zu_stand })),
  };
}

/** @returns Fehlertext oder null */
export function pruefeBackup(b) {
  if (b?.format !== BACKUP_FORMAT) return 'Die Datei ist keine Sicherung dieser App.';
  if (b.formatVersion !== 1) return `Sicherungen der Version ${b.formatVersion} kennt diese App noch nicht.`;
  if (!Array.isArray(b.einzahlungen)) return 'Die Sicherung ist unvollständig.';
  const kaputt = b.einzahlungen.some((e) => !DATUM.test(e?.datum) || !DATUM.test(e?.zu_stand)
    || typeof e.betrag !== 'number' || !Number.isFinite(e.betrag) || e.betrag <= 0 || e.betrag > 100000);
  return kaputt ? 'Die Sicherung enthält beschädigte Einträge.' : null;
}

const schluessel = (e) => `${e.datum}|${e.betrag}|${e.zu_stand}`;

/**
 * Welche Einzahlungen aus der Sicherung fehlen auf dem Gerät?
 * Gleiche Einträge werden gezählt: Stehen zwei gleiche in der Sicherung und einer auf dem Gerät, fehlt einer.
 * So geht beim Wiederherstellen nichts verloren und nichts wird doppelt angelegt.
 */
export function fehlende(lokal, ausBackup) {
  const vorhanden = new Map();
  for (const e of lokal) vorhanden.set(schluessel(e), (vorhanden.get(schluessel(e)) ?? 0) + 1);
  const neu = [];
  for (const e of ausBackup) {
    const k = schluessel(e);
    const n = vorhanden.get(k) ?? 0;
    if (n > 0) vorhanden.set(k, n - 1);
    else neu.push({ datum: e.datum, betrag: e.betrag, zu_stand: e.zu_stand });
  }
  return neu;
}

/**
 * Gibt die Datei über das Teilen-Menü weiter (z. B. „In Drive speichern“) oder lädt sie herunter.
 * @returns 'geteilt' | 'abgebrochen' | 'heruntergeladen'
 */
export async function teileOderLadeHerunter(inhalt, name) {
  // Chrome erlaubt beim Teilen keine .json-Dateien, wohl aber .txt – der Inhalt bleibt JSON.
  const datei = new File([inhalt], `${name}.txt`, { type: 'text/plain' });
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: 'Finanzkompass-Sicherung' });
      return 'geteilt';
    } catch (e) {
      if (e.name === 'AbortError') return 'abgebrochen';
      // sonst: Teilen nicht möglich → Download als Ausweg
    }
  }
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'heruntergeladen';
}
