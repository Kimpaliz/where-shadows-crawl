/* [Aufgabe: Prüfwesen] Der Rumpf eines Sammelvorgangs, als reiner Text.

   Nur Textarbeit: kein Netz, kein Token, kein Seiteneffekt beim Laden.
   Genau dafür gibt es diese Datei. `vorgaenge.mjs` baut damit die
   Aufgabenliste eines Sammelvorgangs, und `pruefe-vorgaenge.mjs` prüft
   **dieselben** Funktionen ohne GitHub. Eine zweite Fassung in der
   Prüfung wäre wertlos: Sie liefe auseinander, und die Prüfung hielte
   sich selbst für richtig.

   ── Warum der Haken nicht zum Verweis gehört ────────────────────────

   Ein Punkt der Aufgabenliste hat zwei Teile: den Verweis `#4` und den
   Haken davor. Der Verweis ist die Verbindung; der Haken ist der Stand,
   und den setzt GitHub selbst, sobald der Schritt geschlossen wird.
   Wer beim Nachsehen den **ungehakten** Text sucht, findet einen
   gehakten Punkt nicht, hält den Schritt für fehlend und hängt die
   ganze Liste ein zweites Mal an. Am 05.09.2026 um 07:08 UTC ist genau
   das im Sammelvorgang #1 geschehen: Danach stand die Überschrift
   zweimal darin, acht Punkte für vier Schritte.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `vorgaenge.mjs` (schreibt den Rumpf zu GitHub) und
   `pruefe-vorgaenge.mjs` (prüft diese Funktionen ohne Netz). */

/* Die Überschrift, unter der die Aufgabenliste steht — an einer Stelle,
   damit Schreiben und Wiedererkennen nicht auseinanderlaufen. */
export const SCHRITTE_KOPF = "## Schritte";
const KOPF_MUSTER = /^##\s+Schritte\s*$/m;

/* Nennt der Rumpf den Schritt `#nummer` als Punkt der Aufgabenliste —
   gehakt oder nicht?

   `[ xX]` deckt die drei Formen ab, die GitHub schreibt: `- [ ] #4`,
   `- [x] #4` und `- [X] #4`. `(?!\d)` ist die Sperre gegen die
   Präfix-Falle: ohne sie fände die Nummer 1 den Punkt `- [ ] #12`, und
   der Schritt #1 gälte fälschlich als vorhanden. Ein blosser Verweis
   `#4` im Fliesstext zählt nicht — nur ein Punkt der Liste ergibt den
   Fortschrittsbalken. */
export const nenntSchritt = (rumpf, nummer) =>
  new RegExp(String.raw`^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]*#${nummer}(?!\d)`, "m").test(rumpf || "");

/* Der Rumpf, wie er nach dem Ergänzen aussehen soll — oder `null`, wenn
   nichts fehlt. Ergänzt wird nur der fehlende Schritt; die Überschrift
   kommt nur dazu, wenn es sie noch nicht gibt. Angehängt wird am Ende:
   Der Schritte-Block ist der letzte Abschnitt, den dieses Werkzeug
   schreibt. */
export function schritteErgaenzen(rumpf, nummern) {
  const text = rumpf || "";
  const fehlend = nummern.filter((n) => !nenntSchritt(text, n));
  if (!fehlend.length) return null;
  const liste = fehlend.map((n) => `- [ ] #${n}`).join("\n");
  const vorhanden = text.replace(/\s+$/, "");
  const kopf = KOPF_MUSTER.test(text) ? "" : (vorhanden ? "\n\n" : "") + SCHRITTE_KOPF + "\n";
  return vorhanden + kopf + "\n" + liste + "\n";
}
