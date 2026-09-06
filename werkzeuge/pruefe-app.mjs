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

/* ⚠️ **Die Pflichtfelder, die bis zum 06.09.2026 niemand geprüft hat.**
   Gemessen an einer Kopie: `name` und `short_name` gelöscht → 55
   Zusicherungen, 0 Fehler. `start_url` gelöscht → ebenfalls 0 Fehler.
   Genau ohne diese drei verweigert Chrome die Installation — ohne
   Namen hat die App keine Beschriftung für den Startbildschirm, ohne
   `start_url` weiß der Browser nicht, was er beim Antippen öffnen
   soll. Und er sagt dazu nichts; er bietet es einfach nicht an. */
melde(typeof manifest.name === "string" && manifest.name.length > 0,
  "das Manifest hat einen Namen — ohne ihn verweigert Chrome die Installation", manifest.name);
melde(typeof manifest.short_name === "string" && manifest.short_name.length > 0
  && manifest.short_name.length <= 12,
  "und einen kurzen Namen, der unter das Symbol passt", manifest.short_name);
melde(typeof manifest.start_url === "string" && manifest.start_url.length > 0,
  "und eine Startadresse — sonst weiß der Browser nicht, was er beim Antippen öffnen soll",
  manifest.start_url);
melde(typeof manifest.scope === "string" && manifest.scope.length > 0,
  "und einen Geltungsbereich", manifest.scope);

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

  /* ⚠️ **Nicht nur, dass verwiesen wird — sondern wohin.** Gemessen an
     einer Kopie: `href="manifest.webmanifest"` auf `href="manifest.json"`
     geändert, eine Datei, die es nicht gibt → 55 Zusicherungen, 0
     Fehler. Die Prüfung las ihr Manifest weiter selbst über den festen
     Namen und merkte darum nie, dass die Seite ein ganz anderes
     anfordert. Live wäre das ein 404 aufs Manifest: kein Name, keine
     Symbole, kein Vollbild, keine Installation — wieder ohne Meldung. */
  const mref = html.match(/<link[^>]+rel="manifest"[^>]+href="([^"]+)"/);
  melde(!!mref, "index.html verweist auf ein Manifest");
  melde(mref && existsSync(join(WURZEL, mref[1])),
    "und die Datei, auf die der Verweis zeigt, liegt wirklich da", mref?.[1]);
  melde(mref?.[1] === "manifest.webmanifest",
    "und es ist dieselbe, die diese Prüfung liest", mref?.[1]);

  melde(/apple-mobile-web-app-capable/.test(html),
    "iPhone bekommt seine eigene Angabe — es kennt das Manifest nicht");
  melde(/name="mobile-web-app-capable"/.test(html),
    "und Chrome die seine — sonst schreibt es bei jedem Laden eine Verfallswarnung in die Konsole");

  const aref = html.match(/rel="apple-touch-icon"[^>]*href="([^"]+)"/);
  melde(!!aref, "iPhone bekommt ein Symbol");
  melde(aref && existsSync(join(WURZEL, aref[1])),
    "und auch dieses Symbol liegt wirklich da", aref?.[1]);

  /* ⚠️ **Ohne diese Zeile ist `sw.js` toter Quelltext.** Nimmt sie
     jemand beim Aufräumen oder beim Zusammenführen zweier Zweige
     heraus, meldet die ganze Kette weiter „alles grün" — gemessen: 55
     Zusicherungen, 0 Fehler, bei null Vorkommen von `serviceWorker` in
     index.html. Auf dem Telefon hieße das: kein Vorrat, kein Offline,
     und nach Chromes Bedingungen kein Installationsangebot mehr. */
  melde(/navigator\.serviceWorker\.register\(\s*["']sw\.js["']/.test(html),
    "index.html meldet den Dienstarbeiter wirklich an");
  melde(/["']serviceWorker["']\s+in\s+navigator/.test(html),
    "und nur, wenn der Browser ihn überhaupt kennt");
}

/* ── 4 · Der Dienst fragt das Netz zuerst ───────────────────────────

   Die Falle aus Slay'Em All: Ein Vorrat vor dem Netz zeigt nach jeder
   Veröffentlichung den alten Stand, und niemand merkt es. */

/* ⚠️ **Hier wurde bis zum 06.09.2026 nur Text gesucht** — und das war
   nachweislich wertlos. Gemessen an einer Kopie außerhalb des
   Repositorys: ein `sw.js`, das nichts einlagert, keinen
   Startseiten-Rückfall hat und dessen Vorratsblick in einem toten
   `if (false)` steht — offline also ein schwarzer Bildschirm —,
   bestand **alle 41 Prüfungen, 0 Fehler**, Wort für Wort dieselbe
   Ausgabe wie der echte Stand. Die fünf Zeilen suchten `await fetch(`,
   `caches.match(`, `skipWaiting()`, `.ok` und `method !== "GET"`
   irgendwo in der Datei; in welcher Reihenfolge sie wirken und ob sie
   überhaupt erreicht werden, sah keine davon.

   Deshalb derselbe Weg wie in Abschnitt 7: ein Browser aus der Hand,
   und der Dienst wird wirklich ausgeführt. */

{
  const b = await messeDienstarbeiter();

  melde(b.einstiegVorab.length === 2,
    "nach dem Einbau liegt die Startseite schon im Vorrat — sonst endet der erste Start im Funkloch auf der Fehlerseite",
    b.einstiegVorab.join(" "));
  melde(b.einstiegVorab.some((u) => u.endsWith("/")) && b.einstiegVorab.some((u) => u.endsWith("index.html")),
    "und zwar unter beiden Adressen, unter denen sie erreichbar ist");

  melde(b.netzGewinnt,
    "online gewinnt das Netz — ein Vorrat davor zeigte tagelang den alten Stand",
    b.netzGewinnt ? "die frische Fassung kam an" : "es kam die Vorratsfassung");
  melde(b.eingelagert,
    "und was ankam, liegt danach im Vorrat");

  melde(b.offlineAusDemVorrat,
    "ohne Netz kommt dieselbe Datei aus dem Vorrat");
  melde(b.offlineNavigationAufDieStartseite,
    "ohne Netz und ohne passenden Eintrag zeigt eine Navigation die Startseite statt der Fehlerseite des Browsers");

  melde(b.schlechteAntwortFaelltZurueck,
    "eine 404 vom Server holt die gute Fassung aus dem Vorrat — sie ist kein Netzfehler und fiel früher nicht in den catch");
  melde(!b.schlechteEingelagert,
    "und wandert selbst nicht in den Vorrat — eine 404 dort bliebe für immer");

  melde(b.fristGreift,
    "ein hängendes Netz wartet nicht länger als die Frist, wenn der Vorrat liefern kann",
    b.fristMs === null ? "es kam nie etwas zurück" : `${b.fristMs} ms`);

  melde(b.schreibenUnangetastet, "ein Schreibzugriff wird nicht angefasst");
  melde(b.fremdeUnangetastet, "fremde Herkunft bleibt unangetastet — der Vermittler fürs Netz-Koop geht hier nicht durch");
  melde(b.alteVorraeteWeg, "alte Vorräte werden beim Aktivieren weggeräumt");
  melde(b.uebernimmtSofort, "eine neue Fassung übernimmt sofort statt erst nach dem Schließen aller Tabs");
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

/* ⚠️ **Die alte Bedingung konnte nicht fehlschlagen.** Sie lautete
   `v.includes('".webmanifest"') && v.includes("manifest")` — und das
   Wort „manifest" steckt bereits in „.webmanifest". Geprüft wurde also
   nur, ob die Endung irgendwo vorkommt; welcher Typ danebensteht, war
   der Prüfung gleichgültig. Gemessen an einer Kopie: den Typ auf
   `"text/plain"` gesetzt → 55 Zusicherungen, 0 Fehler. Genau das,
   wovor der Absatz darüber warnt.

   Jetzt wird das **Paar** gesucht, nicht zwei Wörter irgendwo. */
{
  const v = liesDatei("werkzeuge/vorschau.mjs");
  for (const [endung, typ] of [
    [".webmanifest", "application/manifest+json"],
    [".png", "image/png"],
    [".js", "text/javascript"]
  ]) {
    const paar = new RegExp(`"\\${endung}"\\s*:\\s*"${typ.replace(/[/+]/g, "\\$&")}`);
    melde(paar.test(v), `die Vorschau liefert ${endung} als ${typ} aus`);
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

/* ── 8 · Das Spiel bietet die Installation selbst an ────────────────

   **Der Fall, der ohne diese Prüfung still durchkäme:** Das Spiel war
   seit Fassung 0.9.5 installierbar — und hat es nie gesagt. Wer die App
   wollte, musste sie im Drei-Punkte-Menü von Chrome suchen. Ein Angebot,
   das niemand findet, ist keins, und nichts daran wird jemals rot.

   Geprüft wird auch hier durch **Ausführen**, nicht durch Textsuche.
   Der eine Fehler, der alles kostet, ist unsichtbar: Ohne
   `preventDefault()` verwirft der Browser seine Zusage, und das spätere
   `prompt()` läuft ins Leere — die Datei sieht dabei völlig richtig aus. */

{
  const b = await messeInstallation();

  melde(b.preventDefaultGerufen,
    "die Zusage des Browsers wird abgefangen, statt sie verfallen zu lassen",
    b.preventDefaultGerufen ? "ja" : "preventDefault() wurde nie gerufen — prompt() liefe später ins Leere");
  melde(b.knopfDarfErscheinen,
    "nach der Zusage darf der Knopf erscheinen");
  melde(b.horcherGerufen,
    "ein Bild, das schon steht, erfährt davon",
    b.horcherGerufen ? "ja" : "der Horcher schlägt nicht an — der Knopf bliebe bis zum Bildwechsel verborgen");
  melde(b.promptGerufen,
    "der Klick fragt wirklich den Browser");
  melde(b.ausgang === "angenommen",
    "und meldet zurück, wie der Spieler sich entschieden hat", b.ausgang);
  melde(!b.knopfDanach,
    "ein verbrauchtes Angebot verschwindet — ein zweiter Klick liefe ins Leere");
  melde(!b.knopfNachInstallation,
    "nach der Installation ist der Knopf weg, ohne Neuladen");
  melde(!b.knopfAlsApp,
    "in der installierten App wird die Installation nicht noch einmal angeboten");
  melde(b.ohneBrowserStumm,
    "ohne Zusage gibt es keinen Knopf — Firefox und iPhone sehen nichts, was nicht ginge");
}

/* Und die Stelle, an der er hängt: Ein Knopf im Modul nützt nichts,
   wenn ihn kein Bildschirm zeigt. */
{
  const l = liesDatei("runtime/lobby.js").replace(/\/\*[\s\S]*?\*\//g, "");
  melde(/biteInstallieren/.test(l), "das Vorspiel ruft die Installation");
  melde(/installierbar\(\)/.test(l), "und zeigt den Knopf nur, wenn sie möglich ist");
  melde(/loeseInstallHorcher/.test(l),
    "der Horcher wird beim Bildwechsel wieder abgemeldet — sonst wächst die Liste bei jedem ZURÜCK");

  /* ⚠️ **Gebaut heißt nicht angehängt.** Beim ersten Anlauf suchten die
     drei Zeilen oben nur nach Namen — und blieben grün, als der Kasten
     absichtlich aus `kasten.append(…)` genommen wurde: Die Funktion
     stand ja noch da, nur rief sie niemand mehr. Ein Knopf, den kein
     Bildschirm zeigt, ist genau der Zustand von vorher. Deshalb wird
     gezählt: einmal die Erklärung, mindestens einmal der Aufruf. */
  const stellen = (l.match(/baueInstallkasten/g) ?? []).length;
  melde(stellen >= 2,
    "und der Kasten hängt wirklich im Vorspiel, nicht nur im Quelltext",
    `${stellen} Stellen — bei 1 ist er gebaut, aber nirgends angehängt`);

  const html = liesDatei("index.html");
  melde(/#installkasten\[hidden\]/.test(html),
    "der Kasten ist über `hidden` schaltbar und nicht über `style`");
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

/* ── 9 · Das Bild füllt den Bildschirm, und zwar im ganzen Raster ───

   **Der Fall, der ohne diese Prüfung still durchkäme:** Bis zum
   06.09.2026 deckte *nichts* in `werkzeuge/` die Skalierung ab —
   `passeAn`, `devicePixelRatio`, `viewport-fit` und `innerWidth` kamen
   dort kein einziges Mal vor. Man konnte den Faktor auf 0,5 setzen
   oder `viewport-fit` entfernen, und die Kette blieb grün. Genau
   deshalb stand das Bild auf einem Pixel 7 als Fleck über 34,4 % der
   Fläche, mit 2,625 Punkten je Spielpunkt.

   Geprüft wird **dieselbe** Funktion, die im Browser läuft
   (`runtime/bildmass.js`), gegen echte Gerätemaße — keine Kopie der
   Formel, die man mitändern müsste. */

{
  const { bildLage } = await import("../runtime/bildmass.js");
  const B = 480, H = 270;

  /* Vier Geräte quer, an denen zu viert gespielt werden soll. Die Maße
     sind CSS-Punkte im Querformat plus die Bildpunktdichte. */
  const QUER = [
    { name: "Pixel 7", w: 915, h: 412, dpr: 2.625 },
    { name: "iPhone 14", w: 844, h: 390, dpr: 3 },
    { name: "Galaxy S21", w: 800, h: 360, dpr: 3 },
    { name: "Laptop 1920", w: 1920, h: 1080, dpr: 1 }
  ];

  for (const g of QUER) {
    const l = bildLage({ breite: B, hoehe: H, fensterBreite: g.w, fensterHoehe: g.h, dpr: g.dpr });
    const ganz = Math.abs(l.punkteJeSpielpunkt - Math.round(l.punkteJeSpielpunkt)) < 1e-9;
    melde(ganz,
      `${g.name} quer: ein Spielpunkt ist eine ganze Zahl echter Bildpunkte`,
      l.punkteJeSpielpunkt.toFixed(3));
    melde(l.anteil >= 0.5,
      `${g.name} quer: das Bild belegt mindestens die halbe Fläche`,
      `${(l.anteil * 100).toFixed(1)} %`);
  }

  /* Hochkant gibt es keinen ganzen Faktor — dort ist krumm richtig, und
     das muss die Prüfung aushalten, statt es zu verbieten. */
  const hoch = bildLage({ breite: B, hoehe: H, fensterBreite: 412, fensterHoehe: 915, dpr: 2.625 });
  melde(hoch.faktor > 0 && hoch.faktor * B <= 412 + 1e-9,
    "hochkant passt das Bild ins Fenster, statt abgeschnitten zu werden",
    `Faktor ${hoch.faktor.toFixed(3)}`);

  /* Und ein Bildschirm, der kleiner ist als das Bild, bekommt lieber
     ein krummes Bild als gar keins. */
  const winzig = bildLage({ breite: B, hoehe: H, fensterBreite: 320, fensterHoehe: 240, dpr: 1 });
  melde(winzig.faktor > 0 && winzig.faktor < 1,
    "ein zu kleiner Bildschirm bekommt ein verkleinertes Bild statt eines abgeschnittenen",
    `Faktor ${winzig.faktor.toFixed(3)}`);

  const html = liesDatei("index.html");
  melde(/viewport-fit=cover/.test(html),
    "die Seite darf bis unter Aussparung und Gestenleiste zeichnen");
  melde((html.match(/env\(safe-area-inset-/g) ?? []).length >= 4,
    "und nimmt sich dafür den sicheren Bereich — sonst liegt der Ausweichknopf auf der Gestenleiste",
    `${(html.match(/env\(safe-area-inset-/g) ?? []).length} Stellen`);
}

/* ── 10 · Jeder der drei Startwege kommt ins Vollbild ───────────────

   **Der Fall, der ohne diese Prüfung still durchkam** — und der bis
   zum 06.09.2026 wirklich eintrat: `gehInsVollbild()` hing allein am
   Spielstart. Für „ALLEIN SPIELEN" und für das „ANFANGEN" des Wirts
   ist das ein Klick und damit eine Nutzergeste. Beim **Gast** kommt
   der Start aus einer Netznachricht: Sein letzter Klick war
   „BEITRETEN", danach hat er im Warteraum gewartet, und Chrome gibt
   einer Geste rund fünf Sekunden. Er spielte die ganze Nacht mit
   Adressleiste und in der Lage, in der er das Telefon gerade hielt.

   Die alte Prüfung verglich zwei Byte-Positionen in `start.js`
   (`indexOf("beiStart(")` gegen `indexOf("gehInsVollbild()")`) —
   nachgerechnet 6513 gegen 6589. Position 6513 ist aber die
   **Erklärung** von `beiStart`, nicht ein Aufruf davon; wer `beiStart`
   ruft und ob dabei eine Geste vorliegt, konnte sie gar nicht sehen. */

{
  const lobby = liesDatei("runtime/lobby.js").replace(/\/\*[\s\S]*?\*\//g, "");
  const eingabe = liesDatei("runtime/eingabe.js").replace(/\/\*[\s\S]*?\*\//g, "");
  const vollbild = liesDatei("runtime/vollbild.js").replace(/\/\*[\s\S]*?\*\//g, "");

  /* Der Gast: im Klick auf BEITRETEN, nicht in der Nachricht des Wirts. */
  const beitritt = lobby.slice(lobby.indexOf("const los = ()"), lobby.indexOf("knopf.addEventListener"));
  melde(beitritt.includes("gehInsVollbild()"),
    "der Gast geht im Klick auf BEITRETEN ins Vollbild — sein Spielstart kommt aus einer Nachricht und trägt keine Geste");

  /* Und der Nachzügler, der beides rettet: den Gast, der zu lange
     gewartet hat, und jeden, der aus dem Vollbild gefallen ist. */
  melde(/vollbildNachholen\(/.test(eingabe),
    "die erste Berührung im Spiel holt das Vollbild nach");
  melde((eingabe.match(/vollbildNachholen\(/g) ?? []).length >= 2,
    "und zwar am Stick wie am Ausweichknopf",
    `${(eingabe.match(/vollbildNachholen\(/g) ?? []).length} Stellen`);
  melde(/export function vollbildNachholen/.test(vollbild),
    "der Nachzügler steht bei den anderen Vollbildwegen");
  melde(/NACHHOL_SPERRE/.test(vollbild),
    "mit einer Sperre — sonst fragte jede Berührung des Sticks neu");

  /* Und die Trennung, ohne die eine App im Rückfall `standalone` mit
     Android-Statusleiste dasteht und niemand etwas dagegen versucht. */
  melde(/export function randlosGestartet/.test(vollbild),
    "randlos und als App gestartet sind zwei Fragen — standalone ist nicht fullscreen");
}

/* Der Browser aus der Hand für den Dienstarbeiter.

   Er ist nicht viel mehr als drei Landkarten und ein `fetch`, dessen
   Antwort man von außen bestimmt: einmal gut, einmal 404, einmal
   hängend, einmal geworfen. Genau diese vier Fälle unterscheidet keine
   Textsuche. */
async function messeDienstarbeiter() {
  const HERKUNFT = "https://kimpaliz.github.io";
  const BASIS = `${HERKUNFT}/where-shadows-crawl/`;

  /* Ein Vorrat ist eine Landkarte von Adresse auf Antwort. Mehr braucht
     der Dienst von `caches` nicht. */
  const vorraete = new Map();
  const macheVorrat = (name) => {
    if (!vorraete.has(name)) vorraete.set(name, new Map());
    const m = vorraete.get(name);
    return {
      put: async (a, r) => { m.set(new URL(a.url, BASIS).href, r); },
      match: async (a) => m.get(new URL(typeof a === "string" ? a : a.url, BASIS).href) ?? undefined,
      addAll: async (liste) => {
        for (const u of liste) {
          const antwort = await globalThis.fetch({ url: new URL(u, BASIS).href, method: "GET" });
          if (!antwort || !antwort.ok) throw new Error("addAll: nicht ok");
          m.set(new URL(u, BASIS).href, antwort);
        }
      }
    };
  };

  globalThis.caches = {
    open: async (name) => macheVorrat(name),
    keys: async () => [...vorraete.keys()],
    delete: async (name) => vorraete.delete(name),
    match: async (a) => {
      const schluessel = new URL(typeof a === "string" ? a : a.url, BASIS).href;
      for (const m of vorraete.values()) if (m.has(schluessel)) return m.get(schluessel);
      return undefined;
    }
  };

  /* Was das Netz gerade tut, und womit es sich meldet. Beides von außen
     umgeschaltet: Die **Marke** ist der Trick, mit dem sich „das kam
     frisch aus dem Netz" von „das kam aus dem Vorrat" unterscheiden
     lässt, ohne raten zu müssen. */
  let netzArt = "gut";
  let netzMarke = "netz";
  const antwortAus = (marke, ok = true) => ({ ok, marke, clone() { return { ...this, clone: this.clone }; } });
  globalThis.fetch = () => {
    if (netzArt === "gut") return Promise.resolve(antwortAus(netzMarke));
    if (netzArt === "vierhundertvier") return Promise.resolve(antwortAus("404", false));
    if (netzArt === "haengt") return new Promise(() => {});
    return Promise.reject(new Error("offline"));
  };

  const horcher = new Map();
  let uebernimmtSofort = false, beansprucht = false;
  globalThis.self = {
    addEventListener: (art, fn) => {
      if (!horcher.has(art)) horcher.set(art, []);
      horcher.get(art).push(fn);
    },
    skipWaiting: () => { uebernimmtSofort = true; },
    clients: { claim: async () => { beansprucht = true; } },
    location: { origin: HERKUNFT, href: `${BASIS}sw.js` }
  };

  await import(`../sw.js?t=${Date.now()}`);

  /* Ein Ereignis, das mitschreibt, was der Dienst damit macht. */
  const feuere = async (art, zusatz = {}) => {
    const e = { ...zusatz, warten: [], antwort: undefined,
      waitUntil(p) { e.warten.push(p); },
      respondWith(p) { e.antwort = p; } };
    for (const fn of horcher.get(art) ?? []) fn(e);
    await Promise.all(e.warten);
    return e;
  };

  /* ⚠️ **Das `catch` ist der Unterschied zwischen rot und abgestürzt.**
     Nimmt man dem Dienst seinen Rückhalt weg, wirft er den Netzfehler
     weiter — im Browser landet der auf der Fehlerseite, hier als
     unbehandelte Ablehnung, die Node mitsamt der ganzen Prüfkette
     beendet. Beim ersten Anlauf ist genau das passiert: drei Sabotagen
     rissen die Kette ab, statt eine rote Zeile zu erzeugen. Ein
     Wächter, der bei dem Fehler abstürzt, den er sucht, ist keiner —
     dieselbe Lehre wie in Abschnitt 7 (Fehlerbuch E5). */
  const hole = async (pfad, art = "gut", zusatz = {}) => {
    netzArt = art;
    const e = await feuere("fetch", {
      request: { url: new URL(pfad, BASIS).href, method: "GET", mode: "no-cors", ...zusatz }
    });
    if (e.antwort === undefined) return "nicht angefasst";
    try { return await e.antwort; } catch { return "geworfen"; }
  };

  /* ── 1 · Einbau: liegt die Startseite vorab im Vorrat? ── */
  netzArt = "gut";
  /* Eigene Marke, damit sich die vorab eingelagerte Startseite spaeter
     von jeder anderen Antwort unterscheiden laesst. */
  netzMarke = "einstieg";
  await feuere("install");
  const einstiegVorab = [...(vorraete.values().next().value ?? new Map()).keys()];

  /* ── 2 · Online: gewinnt das Netz, und wird eingelagert? ──

     ⚠️ **Zwei Abrufe, nicht einer.** Der erste füllt den Vorrat, erst
     der zweite kann die Slay'Em-All-Falle überhaupt zeigen: Ein Dienst,
     der den Vorrat zuerst fragt, fällt bei einem Abruf auf eine noch
     **leere** Landkarte durch und sieht dabei völlig richtig aus.
     Beim ersten Anlauf war es genau ein Abruf — und die eingebaute
     Falle blieb grün. Deshalb wechselt die Marke dazwischen: Was jetzt
     ankommt, muss die **neue** sein. */
  netzMarke = "netz-alt";
  await hole("runtime/start.js", "gut");
  const eingelagert = (await globalThis.caches.match({ url: `${BASIS}runtime/start.js` }))?.marke === "netz-alt";

  netzMarke = "netz-neu";
  const frisch = await hole("runtime/start.js", "gut");
  const netzGewinnt = frisch?.marke === "netz-neu";

  /* ── 3 · Offline: kommt dieselbe Datei aus dem Vorrat? ── */
  const ausVorrat = await hole("runtime/start.js", "offline");
  const offlineAusDemVorrat = ausVorrat?.marke === "netz-neu";

  /* ── 4 · Offline und keine passende Datei: die Startseite ── */
  const nav = await hole("welle/gibtesnicht", "offline", { mode: "navigate" });
  const offlineNavigationAufDieStartseite = !!nav && typeof nav === "object" && nav.marke === "einstieg";

  /* ── 5 · Schlechte Antwort: gewinnt der Vorrat? ── */
  const beiVierhundertvier = await hole("runtime/start.js", "vierhundertvier");
  const schlechteAntwortFaelltZurueck = beiVierhundertvier?.marke === "netz-neu";
  const schlechteEingelagert = (await globalThis.caches.match({ url: `${BASIS}runtime/start.js` }))?.marke === "404";

  /* ── 6 · Hängendes Netz: greift die Frist? ── */
  const beginn = Date.now();
  const gehaengt = await Promise.race([
    hole("runtime/start.js", "haengt"),
    new Promise((r) => setTimeout(() => r("nie zurückgekommen"), 6000))
  ]);
  const fristGreift = gehaengt !== "nie zurückgekommen" && gehaengt?.marke === "netz-neu";
  const fristMs = fristGreift ? Date.now() - beginn : null;

  /* ── 7 · Was gar nicht angefasst werden darf ── */
  netzArt = "gut";
  const schreiben = await feuere("fetch", {
    request: { url: `${BASIS}irgendwas`, method: "POST", mode: "cors" }
  });
  const schreibenUnangetastet = schreiben.antwort === undefined;

  const fremd = await feuere("fetch", {
    request: { url: "https://0.peerjs.com/peerjs/id", method: "GET", mode: "cors" }
  });
  const fremdeUnangetastet = fremd.antwort === undefined;

  /* ── 8 · Aktivieren räumt alte Vorräte weg ── */
  vorraete.set("wsc-uralt", new Map());
  await feuere("activate");
  const alteVorraeteWeg = !vorraete.has("wsc-uralt") && beansprucht;

  return {
    einstiegVorab, netzGewinnt, eingelagert, offlineAusDemVorrat,
    offlineNavigationAufDieStartseite, schlechteAntwortFaelltZurueck,
    schlechteEingelagert, fristGreift, fristMs,
    schreibenUnangetastet, fremdeUnangetastet, alteVorraeteWeg, uebernimmtSofort
  };
}

/* Der zweite Browser aus der Hand — für das Installationsangebot.

   Er schickt dieselbe Zusage, die Chrome auf Android schickt, und merkt
   sich, was das Modul damit macht. Ein Textmuster käme hier nicht weit:
   Ob `preventDefault()` **vor** dem Aufheben steht, ob ein verbrauchtes
   Angebot wirklich verschwindet und ob der Horcher anspringt, steht in
   keiner Zeile, die man suchen könnte — das zeigt sich erst im Ablauf. */
async function messeInstallation() {
  const listen = new Map();
  globalThis.addEventListener = (art, fn) => {
    if (!listen.has(art)) listen.set(art, []);
    listen.get(art).push(fn);
  };
  const feuere = (art, e) => { for (const fn of listen.get(art) ?? []) fn(e); };

  /* Die Umschaltung zwischen „im Tab" und „als installierte App". */
  let alsApp = false;
  globalThis.matchMedia = () => ({ matches: alsApp });
  Object.defineProperty(globalThis, "navigator",
    { value: { standalone: false }, configurable: true });
  globalThis.document = { addEventListener() {}, documentElement: {}, fullscreenElement: null };

  /* Eine Zusage, wie der Browser sie schickt. Jede meldet für sich,
     was mit ihr geschehen ist. */
  const macheZusage = () => {
    const z = {
      abgefangen: false, gefragt: false,
      preventDefault() { z.abgefangen = true; },
      prompt() { z.gefragt = true; return Promise.resolve(); },
      userChoice: Promise.resolve({ outcome: "accepted" })
    };
    return z;
  };

  const modul = await import(`../runtime/installieren.js?t=${Date.now()}`);

  /* Vor jeder Zusage darf es keinen Knopf geben — das ist der Zustand
     auf jedem Browser, der die Installation nicht anbietet. */
  const ohneBrowserStumm = modul.installierbar() === false;

  /* Anmelden wie die Lobby: Das Bild steht schon, wenn die Zusage kommt. */
  let horcherGerufen = false;
  const loese = modul.beiAenderung(() => { horcherGerufen = true; });

  const erste = macheZusage();
  feuere("beforeinstallprompt", erste);

  /* ⚠️ **Sofort ablesen, nicht am Ende.** Beim ersten Anlauf stand
     dieser Griff hinter `biteInstallieren()` — und das benachrichtigt
     die Horcher ebenfalls. Die Prüfung war deshalb grün, als der
     Aufruf in `beforeinstallprompt` absichtlich entfernt wurde: Sie
     maß den zweiten Weg statt den, um den es geht. */
  const horcherSofort = horcherGerufen;

  const knopfDarfErscheinen = modul.installierbar();
  const ausgang = await modul.biteInstallieren();
  const knopfDanach = modul.installierbar();

  /* Eine frische Zusage, dann meldet der Browser die Installation. */
  feuere("beforeinstallprompt", macheZusage());
  feuere("appinstalled", {});
  const knopfNachInstallation = modul.installierbar();

  /* Und derselbe Fall noch einmal, diesmal in der installierten App. */
  feuere("beforeinstallprompt", macheZusage());
  alsApp = true;
  const knopfAlsApp = modul.installierbar();
  alsApp = false;

  if (typeof loese === "function") loese();

  return {
    ohneBrowserStumm,
    preventDefaultGerufen: erste.abgefangen,
    promptGerufen: erste.gefragt,
    horcherGerufen: horcherSofort,
    knopfDarfErscheinen,
    ausgang,
    knopfDanach,
    knopfNachInstallation,
    knopfAlsApp
  };
}

ende();
