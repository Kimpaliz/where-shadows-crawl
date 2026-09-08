/* [Aufgabe: Prüfwesen] Bleibt das Spiel aus den Suchmaschinen heraus?

   ── Was ohne diese Prüfung still durchkäme ─────────────────────────

   Jannik am 08.09.2026, auf die Frage „reicht dir ein Vorhang, oder
   willst du ein Schloss": **der Vorhang.** Das Repository wird privat,
   und die Seite bittet die Suchmaschinen, sie nicht zu listen.

   Der zweite Teil davon ist **eine einzige Zeile** im Kopf von
   `index.html` — und genau darin liegt die Gefahr: Eine Zeile, die
   kein Spieler vermisst und kein Programm braucht, verschwindet beim
   nächsten Umbau des Kopfbereichs, ohne dass irgendetwas rot wird.
   Bemerkt würde es erst Monate später, wenn jemand den Spielnamen in
   eine Suchmaschine tippt und die Seite findet — und dann steht sie
   längst im Index. Ein Fehler ohne Symptom, mit langer Zündschnur.

   ── Die Falle, die genau umgekehrt aussieht ────────────────────────

   Eine `robots.txt` mit `Disallow` wirkt wie die strengere Lösung und
   ist die schlechtere. Sie verbietet der Suchmaschine das **Lesen**
   der Seite; den Vermerk „nicht listen" im Kopf bekommt sie dann nie
   zu Gesicht und darf die Adresse trotzdem in die Trefferliste
   aufnehmen — ohne Beschreibung, aber auffindbar. Google beschreibt
   diesen Fall selbst und rät ausdrücklich davon ab, `robots.txt` zum
   Verstecken zu benutzen.

   Deshalb prüft diese Datei zwei Dinge, nicht eines: dass der Vermerk
   da ist — **und** dass es keine `robots.txt` gibt, die ihn unlesbar
   macht.

   ── Zuerst rot gemacht ─────────────────────────────────────────────

   Am 08.09.2026 gegen `index.html` **ohne** die Zeile gelaufen:
   4 Prüfungen, 2 Fehler (die dritte Zusicherung geht ins Leere, solange
   es keinen Vermerk gibt, den man umdrehen könnte — sie ist unten
   einzeln rot gemacht). Danach mit der Zeile: 4 Prüfungen, 0 Fehler.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` (der Vermerk selbst) und `.github/workflows/pages.yml`
   — der liefert den Ordner unverändert aus, was hier steht, steht
   live. */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { macheMelder, liesDatei, WURZEL } from "./helfer.mjs";

const { melde, ende } = macheMelder({ still: true });

const html = liesDatei("index.html");

/* Nur im Kopfbereich wirkt der Vermerk. Ein `<meta>` weiter unten im
   Körper liest keine Suchmaschine mehr — es sähe richtig aus und täte
   nichts. Findet sich kein `</head>`, ist die Datei so kaputt, dass
   jede weitere Aussage geraten wäre; dann bleibt der Kopf leer und
   alle drei Zusicherungen schlagen an. */
const endeKopf = html.indexOf("</head>");
const kopf = endeKopf === -1 ? "" : html.slice(0, endeKopf);

const treffer = kopf.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']\s*\/?>/i);
melde(Boolean(treffer),
  "`index.html` trägt den Vermerk `robots` im Kopfbereich");

/* Kleingeschrieben verglichen: `NOINDEX` wirkt genauso, und ein
   Vergleich, der daran scheitert, meldete einen Fehler, den es nicht
   gibt. */
const inhalt = (treffer?.[1] ?? "").trim().toLowerCase();
melde(inhalt.includes("noindex"),
  "und er sagt `noindex` — diese Seite gehört in keine Trefferliste",
  inhalt || "der Vermerk fehlt ganz");

/* Der Gegen-Fall: Wer die Zeile später auf `index` oder `all` ändert,
   hebt sie auf, ohne sie zu löschen — von außen sieht der Kopf dann
   unverändert aus. `noindex` wird vorher herausgeschnitten, sonst
   fände `\bindex\b` es in ihm selbst wieder. */
const ohneNoindex = inhalt.replace("noindex", "");
melde(!/\bindex\b/.test(ohneNoindex) && !/\ball\b/.test(ohneNoindex),
  "und er nimmt sich nicht selbst zurück (`index` oder `all`)",
  inhalt || "der Vermerk fehlt ganz");

/* Keine `robots.txt` — siehe die Falle in der Kopfnotiz. Geprüft wird
   die Wurzel, denn nur dort liest eine Suchmaschine sie. */
melde(!existsSync(join(WURZEL, "robots.txt")),
  "es gibt keine `robots.txt` — sie würde den Vermerk unlesbar machen");

ende();
