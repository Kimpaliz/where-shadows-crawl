/* [Aufgabe: Prüfwesen] Ist das Spiel als App installierbar, im Vollbild
   und quer?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Eine installierbare App hat kein Symptom, wenn sie kaputt ist: Der
   Browser bietet dann einfach **nicht** an, sie zu installieren, und
   sagt niemandem warum. Es gibt keine Fehlermeldung, keine rote Zeile,
   nichts — nur einen Knopf, der fehlt. Genau deshalb steht das hier.

   Die vier Fallen, die das schon einmal gekostet haben:

   **1 · Ein Symbol im Manifest, das es nicht gibt.** Fehlt eine der
   genannten Dateien, verwirft der Browser das ganze Manifest.

   **2 · Ein Pfad, der nur örtlich stimmt.** Das Spiel liegt live unter
   `/where-shadows-crawl/`, nicht an der Wurzel. Ein führender
   Schrägstrich zeigt dort ins Leere — derselbe Fehler, der die
   GitHub-Pages-Auslieferung schon einmal getroffen hat.

   **3 · Der Dienst, der den alten Stand konserviert.** Ein Vorrat, der
   vor dem Netz gefragt wird, zeigt nach jeder Veröffentlichung tagelang
   die alte Fassung. Bei Slay'Em All genau so passiert.

   **4 · Vollbild beim Laden statt beim Knopfdruck.** Ein
   `requestFullscreen()` ohne Nutzergeste wird abgelehnt — still, mit
   einer abgewiesenen Zusage, die niemand liest.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `manifest.webmanifest`, `sw.js`, `runtime/vollbild.js`,
   `index.html`, `werkzeuge/symbole.mjs` (erzeugt die Symbole). */

import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { macheMelder, liesDatei } from "./helfer.mjs";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const { melde, ende } = macheMelder({ still: true });

/* ── 1 · Das Manifest verspricht, was Jannik verlangt hat ───────────

   Wörtlich: „die webbrowser leiste komplett weg" und „von anfang an
   voll bild horizontal fix". Das sind zwei Felder, und beide sind hier
   festgenagelt — nicht weil sie sich ändern könnten, sondern weil eine
   stille Änderung genau die Ansage zurücknähme. */

const manifest = JSON.parse(liesDatei("manifest.webmanifest"));

melde(manifest.display === "fullscreen",
  "die App startet im Vollbild, ohne Browserleiste", manifest.display);
melde(manifest.orientation === "landscape",
  "die App ist auf Querformat festgelegt", manifest.orientation);
melde(Array.isArray(manifest.display_override) && manifest.display_override[0] === "fullscreen",
  "Vollbild steht auch in display_override an erster Stelle",
  JSON.stringify(manifest.display_override));

/* `standalone` als zweite Wahl ist Absicht: Browser, die kein Vollbild
   können, sollen wenigstens ohne Adressleiste starten statt auf einen
   gewöhnlichen Tab zurückzufallen. */
melde(manifest.display_override?.includes("standalone"),
  "es gibt einen Rückfall auf standalone");

/* ── 2 · Jedes genannte Symbol liegt wirklich da ────────────────────

   Ein fehlendes Symbol verwirft das **ganze** Manifest — die App wäre
   nicht installierbar, ohne dass irgendwo etwas rot wird. */

melde(manifest.icons.length >= 2, "es gibt mindestens zwei Symbole", `${manifest.icons.length}`);

for (const s of manifest.icons) {
  const pfad = join(WURZEL, s.src);
  const da = existsSync(pfad);
  melde(da, `Symbol ${s.src} liegt wirklich da`);
  if (!da) continue;

  /* Die Größe im Manifest muss zur Datei passen. Steht dort 512 und
     die Datei ist 192, nimmt Android sie für den Startbildschirm und
     zieht sie unscharf auf. Gelesen wird der PNG-Kopf: Breite und Höhe
     stehen als zwei Vierbytezahlen ab Byte 16. */
  const bytes = readPng(pfad);
  const [w, h] = [s.sizes.split("x")[0], s.sizes.split("x")[1]].map(Number);
  melde(bytes.breite === w && bytes.hoehe === h,
    `${s.src} ist wirklich ${s.sizes}`, `${bytes.breite}x${bytes.hoehe}`);
  melde(statSync(pfad).size > 100, `${s.src} ist nicht leer`, `${statSync(pfad).size} Bytes`);
}

function readPng(pfad) {
  const b = readFileSync(pfad);
  return { breite: b.readUInt32BE(16), hoehe: b.readUInt32BE(20) };
}

/* Android maskiert Symbole und schneidet dabei bis zu einem Fünftel ab.
   Ohne ein `maskable` bekäme das Spiel auf dem Startbildschirm einen
   weißen Kreis mit angefrästem Bild. */
melde(manifest.icons.some((s) => s.purpose === "maskable"),
  "es gibt ein maskable-Symbol für Android");

/* ── 3 · Alle Pfade sind relativ ────────────────────────────────────

   Das Spiel liegt live unter `/where-shadows-crawl/`. Ein führender
   Schrägstrich zeigt dort auf die Wurzel von `kimpaliz.github.io` und
   damit ins Leere. */

{
  const absolut = [
    ...manifest.icons.map((s) => s.src),
    manifest.start_url, manifest.scope
  ].filter((p) => typeof p === "string" && p.startsWith("/"));
  melde(absolut.length === 0,
    "kein Pfad im Manifest beginnt mit einem Schrägstrich", absolut.join(" "));
}

{
  const html = liesDatei("index.html");
  const treffer = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
  melde(treffer.length === 0, "kein absoluter Pfad in index.html", treffer.join(" "));
  melde(/rel="manifest"/.test(html), "index.html verweist auf das Manifest");
  melde(/apple-mobile-web-app-capable/.test(html),
    "iPhone bekommt seine eigene Angabe — es kennt das Manifest nicht");
  melde(/apple-touch-icon/.test(html), "iPhone bekommt ein Symbol");
}

/* ── 4 · Der Dienst fragt das Netz zuerst ───────────────────────────

   Die Falle aus Slay'Em All: Ein Vorrat vor dem Netz zeigt nach jeder
   Veröffentlichung den alten Stand, und niemand merkt es. */

{
  const sw = liesDatei("sw.js").replace(/\/\*[\s\S]*?\*\//g, "");
  const netzZuerst = sw.indexOf("await fetch(");
  const vorratDanach = sw.indexOf("caches.match(");
  melde(netzZuerst > 0 && vorratDanach > netzZuerst,
    "der Dienst fragt erst das Netz und den Vorrat nur als Rückhalt",
    `fetch bei ${netzZuerst}, Vorrat bei ${vorratDanach}`);
  melde(/skipWaiting\(\)/.test(sw),
    "eine neue Fassung übernimmt sofort statt erst nach dem Schließen");
  melde(/antwort\.ok/.test(sw) || /\.ok\b/.test(sw),
    "nur gelungene Antworten wandern in den Vorrat — eine 404 im Vorrat bliebe für immer");
  melde(/caches\.delete/.test(sw), "alte Vorräte werden weggeräumt");
  melde(/method !== "GET"/.test(sw), "nur Lesezugriffe werden angefasst");
}

/* ── 5 · Vollbild hängt an der Geste, nicht am Laden ────────────────

   `requestFullscreen()` ohne Nutzergeste wird abgelehnt. Der einzige
   Ort, an dem es hier stehen darf, ist der Spielstart. */

{
  const v = liesDatei("runtime/vollbild.js").replace(/\/\*[\s\S]*?\*\//g, "");
  melde(/requestFullscreen/.test(v), "es gibt überhaupt einen Vollbildweg");
  melde(/orientation\.lock\("landscape"\)/.test(v), "das Querformat wird festgelegt");
  melde(/documentElement\.requestFullscreen/.test(v),
    "das Vollbild umfasst die ganze Seite, nicht nur die Leinwand — sonst fehlt die Daumenbedienung");
  melde(/display-mode: fullscreen/.test(v) || /display-mode: standalone/.test(v),
    "die installierte App wird erkannt und nicht noch einmal ins Vollbild geschickt");
  /* Jeder der beiden Aufrufe steht in einem eigenen try — schlägt der
     erste fehl (Safari), muss der zweite trotzdem versucht werden. */
  melde((v.match(/try\s*\{/g) ?? []).length >= 2,
    "beide Wege sind einzeln abgesichert", `${(v.match(/try\s*\{/g) ?? []).length} try-Blöcke`);

  /* Der zweite Anlauf für das Querformat. Kommt das Vollbild später als
     die Frist, ist der Wechsel selbst der einzige Moment, in dem der
     Browser das Sperren erlaubt. */
  melde(/fullscreenchange/.test(v),
    "ein Horcher holt das Querformat nach, wenn das Vollbild spät kommt");

  const start = liesDatei("runtime/start.js").replace(/\/\*[\s\S]*?\*\//g, "");
  melde(/gehInsVollbild\(\)/.test(start), "der Spielstart ruft es");
  const beiStart = start.indexOf("beiStart(");
  const aufruf = start.indexOf("gehInsVollbild()");
  melde(aufruf > beiStart && beiStart > 0,
    "und zwar im Spielstart, nicht beim Laden der Seite",
    `beiStart bei ${beiStart}, Aufruf bei ${aufruf}`);
}

/* ── 6 · Die Vorschau liefert aus, was live ausgeliefert wird ───────

   Ohne die richtigen Typen lehnt der Browser das Manifest ab und zeigt
   die Symbole nicht — örtlich wäre die App nicht installierbar, obwohl
   sie es live wäre. Dann prüft man etwas anderes, als man ausliefert. */

{
  const v = liesDatei("werkzeuge/vorschau.mjs");
  for (const [endung, typ] of [[".webmanifest", "manifest"], [".png", "image/png"]]) {
    melde(v.includes(`"${endung}"`) && v.includes(typ),
      `die Vorschau kennt ${endung}`);
  }
}

/* ── 7 · Ein hängendes Vollbild verschluckt das Querformat nicht ─────

   **Der Fall, der ohne diese Prüfung still durchkäme**, und der am
   05.09.2026 wirklich eingetreten ist: `requestFullscreen()` löst sein
   Versprechen nicht immer auf. Ohne Nutzergeste lehnt es in 0 ms ab —
   mit Geste, aber von einer Richtlinie gesperrt, **hängt es**
   (2.503 ms ohne Ergebnis, gemessen). Ein nacktes `await` davor bleibt
   dann stehen, und `screen.orientation.lock` läuft **nie**. Das
   Vollbild fehlt, das Querformat auch, und keine Zeile wird rot.

   Deshalb wird hier nicht nach einem Textmuster gesucht, sondern das
   Modul wirklich ausgeführt — gegen einen Browser aus der Hand, dessen
   `requestFullscreen` absichtlich nie antwortet. Ein Regex hätte den
   Fehler nicht gesehen: Vorher wie nachher stehen dieselben zwei
   Aufrufe in derselben Reihenfolge in der Datei. */

{
  const bericht = await messeVollbild();
  melde(bericht.lockGerufen,
    "ein hängendes Vollbild hält das Querformat nicht auf",
    bericht.lockGerufen ? `nach ${bericht.abstand} ms` : "lock wurde nie gerufen");
  melde(bericht.abstand !== null && bericht.abstand < 3000,
    "und es dauert nicht länger als drei Sekunden", `${bericht.abstand} ms`);
  melde(bericht.nachzuegler,
    "kommt das Vollbild später, holt der Horcher das Querformat nach",
    bericht.nachzuegler ? "ja" : "der fullscreenchange-Horcher greift nicht");
}

/* Der Browser aus der Hand. Er tut genau zwei Dinge falsch — beide
   absichtlich: Sein `requestFullscreen` antwortet nie, und sein
   `orientation.lock` schlägt fehl, solange kein Vollbild aktiv ist
   (genau wie ein echter Browser es tut). */
async function messeVollbild() {
  const spur = [];
  let imVollbild = false;
  const horcher = [];

  const wurzel = {
    tagName: "HTML",
    requestFullscreen() {
      spur.push({ was: "vollbild", t: Date.now() });
      return new Promise(() => {});   /* antwortet nie */
    }
  };

  globalThis.document = {
    documentElement: wurzel,
    get fullscreenElement() { return imVollbild ? wurzel : null; },
    addEventListener: (art, fn) => { if (art === "fullscreenchange") horcher.push(fn); }
  };
  globalThis.matchMedia = () => ({ matches: false });
  /* `navigator` hat in Node nur einen Getter — überschreiben geht nur
     über `defineProperty`. Das Modul fragt `navigator.standalone` ab,
     also muss der Wert stimmen. */
  Object.defineProperty(globalThis, "navigator",
    { value: { standalone: false }, configurable: true });
  globalThis.screen = {
    orientation: {
      lock(lage) {
        spur.push({ was: "lock", lage, t: Date.now(), imVollbild });
        return imVollbild ? Promise.resolve() : Promise.reject(new Error("nicht im Vollbild"));
      }
    }
  };

  /* Frisch laden, damit der Horcher auf **diese** Attrappe geht. */
  const modul = await import(`../runtime/vollbild.js?t=${Date.now()}`);
  const start = Date.now();

  /* ⚠️ Selbst mit Zeitlimit warten. Genau der Fehler, den diese Prüfung
     sucht, lässt `gehInsVollbild()` **nie zurückkehren** — ein nacktes
     `await` hier ließe die Prüfung mitsamt der ganzen Kette hängen
     statt rot zu melden, und Node bräche mit „unsettled top-level
     await" ab. Ein Wächter, der beim Fehler hängt, ist ein halber
     Wächter. */
  await Promise.race([
    modul.gehInsVollbild(),
    new Promise((r) => setTimeout(r, 4000))
  ]);

  const lock = spur.find((e) => e.was === "lock");

  /* Jetzt kommt das Vollbild verspätet — der Horcher muss anspringen. */
  const vorher = spur.filter((e) => e.was === "lock").length;
  imVollbild = true;
  for (const fn of horcher) fn();
  await new Promise((r) => setTimeout(r, 20));
  const nachher = spur.filter((e) => e.was === "lock").length;

  return {
    lockGerufen: !!lock,
    abstand: lock ? lock.t - start : null,
    nachzuegler: nachher > vorher
  };
}

ende();
