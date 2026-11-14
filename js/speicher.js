// Speicher auf dem Handy (IndexedDB, im Browser eingebaut). Nichts davon verlässt das Gerät.
//
// Bereiche ("Stores"):
//   inhalt        – das zuletzt importierte Datenpaket (Schlüssel "daten")
//   einzahlungen  – am Handy gebuchte Einzahlungen: { id, datum, betrag, zu_stand }
//   meta          – Kleinkram wie das Datum des letzten Imports

const DB_NAME = 'finanzkompass';
const DB_VERSION = 1;

let verbindung = null;

function oeffne() {
  return new Promise((ok, fehler) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      db.createObjectStore('inhalt');
      db.createObjectStore('einzahlungen', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('meta');
    };
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
  });
}

function db() {
  verbindung ??= oeffne();
  return verbindung;
}

function ergebnis(anfrage) {
  return new Promise((ok, fehler) => {
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
  });
}

function fertig(tx) {
  return new Promise((ok, fehler) => {
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fehler(tx.error);
  });
}

/** Lädt Datenpaket, Einzahlungen und Metadaten auf einmal. */
export async function ladeAlles() {
  const tx = (await db()).transaction(['inhalt', 'einzahlungen', 'meta']);
  const metaStore = tx.objectStore('meta');
  const [daten, einzahlungen, schluessel, werte] = await Promise.all([
    ergebnis(tx.objectStore('inhalt').get('daten')),
    ergebnis(tx.objectStore('einzahlungen').getAll()),
    ergebnis(metaStore.getAllKeys()),
    ergebnis(metaStore.getAll()),
  ]);
  const meta = Object.fromEntries(schluessel.map((k, i) => [k, werte[i]]));
  return { daten: daten ?? null, einzahlungen, meta };
}

/** Ersetzt das Datenpaket. Die gebuchten Einzahlungen bleiben unberührt. */
export async function speichereDaten(daten, meta = {}) {
  const tx = (await db()).transaction(['inhalt', 'meta'], 'readwrite');
  tx.objectStore('inhalt').put(daten, 'daten');
  for (const [k, v] of Object.entries(meta)) tx.objectStore('meta').put(v, k);
  return fertig(tx);
}

/** Merkt sich Kleinkram, z. B. wann zuletzt gesichert wurde. */
export async function speichereMeta(meta) {
  const tx = (await db()).transaction('meta', 'readwrite');
  for (const [k, v] of Object.entries(meta)) tx.objectStore('meta').put(v, k);
  return fertig(tx);
}

/** Speichert eine Einzahlung und gibt sie mit ihrer neuen id zurück. */
export async function speichereEinzahlung(einzahlung) {
  const tx = (await db()).transaction('einzahlungen', 'readwrite');
  const id = await ergebnis(tx.objectStore('einzahlungen').add(einzahlung));
  await fertig(tx);
  return { ...einzahlung, id };
}

export async function loescheEinzahlung(id) {
  const tx = (await db()).transaction('einzahlungen', 'readwrite');
  tx.objectStore('einzahlungen').delete(id);
  return fertig(tx);
}

/** Bittet den Browser, die Daten nicht bei Speicherknappheit zu löschen. */
export async function bitteUmDauerhaftenSpeicher() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* nicht überall verfügbar – kein Problem */ }
}
