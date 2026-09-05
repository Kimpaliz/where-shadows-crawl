/* [Aufgabe: Regelkern] Der Sprung zur Seite — die einzige Taste im Spiel.

   ── Warum es sie überhaupt gibt ────────────────────────────────────

   Das Spiel hat bewusst keine Angriffstaste: Waffen suchen ihr Ziel
   selbst (docs/SPIEL.md, Bauteil 2). Die einzige Entscheidung des
   Spielers ist der Laufweg — und der ist eine Entscheidung nur, solange
   man ihm entkommen kann. Genau da war die gemessene Lücke: Ab Welle 15
   überholen Hetzer und Aaskrähe den Spieler (`spiel/katalog/gegner.mjs`,
   `tempoInWelle`). Ohne Sprung endet der Laufweg dort als Entscheidung.

   ── Warum eine kurze Unverwundbarkeit dazugehört ───────────────────

   Ein Sprung ohne sie wäre nur schnelles Laufen und würde in einer
   dichten Front gar nichts ändern: Man landet mitten in einem anderen
   Gegner. Die Unverwundbarkeit ist das, was aus einer Bewegung ein
   Ausweichmanöver macht.

   ── Warum der Sprung dauert und nicht springt ──────────────────────

   Er läuft über `AUSWEICH_DAUER` Sekunden, also elf Schritte bei 1/60 s.
   Ein Sprung, der in einem Schritt fertig ist, ist ein Teleport: Die
   Figur ist einfach woanders, man sieht nichts, und es liest sich als
   Fehler.

   ── Warum mehr Weite nicht mehr Zeit heißt ─────────────────────────

   `ausweichweite` verlängert die Strecke, nicht die Dauer — der Sprung
   wird also schneller, nicht länger. Sonst würde derselbe Wert heimlich
   auch die Unverwundbarkeit verlängern, und ein Spieler, der Weite
   kauft, bekäme etwas, das nirgends draufsteht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/bewegung.mjs` (wendet den Versatz an und hält den Bannkreis —
   deshalb klemmt diese Datei selbst nichts ab und importiert von dort
   nichts: das wäre ein Ring aus zwei Modulen), `spiel/werte.mjs`
   (Ausweichweite und Ausweichhast), `spiel/welt.mjs` (rüstet einen
   neuen Spieler aus), `spiel/kampf.mjs` (zählt die Unverwundbarkeit
   herunter). */

import { wert } from "./werte.mjs";

/* Alle vier Zahlen sind gerechnet, nicht geraten. Nachrechnen:
   `node werkzeuge/pruefe-werte.mjs`.

   `AUSWEICH_WEITE = 46`  Der Sprung muss aus einer Front heraustragen.
     Ein Hauptmann berührt bei 13 + 5 = 18 Bildpunkten, dahinter stehen
     Schlurfer mit je 10 Bildpunkten Durchmesser. 18 + 20 = 38, plus
     Luft: 46.

   `AUSWEICH_DAUER = 0.18`  Elf Schritte bei 1/60 s — genug, dass die
     Bewegung sichtbar ist. Daraus folgt ein Sprungtempo von
     46 / 0,18 = 256 Bildpunkten je Sekunde, also **1,8-mal so schnell
     wie der schnellste Gegner am Tempodeckel** (Aaskrähe 74 x 1,9 =
     140,6). Wäre der Sprung langsamer, wäre er keine Flucht.

   `AUSWEICH_ABKLING = 1.6`  Dauernde Unverwundbarkeit begänne, sobald
     die Abklingzeit unter die Sprungdauer fiele — also bei 0,18 s. 1,6
     ist davon **das Neunfache** entfernt; unverwundbar ist man 11,25 %
     der Zeit.

   `AUSWEICH_SCHUTZ`  Etwas länger als der Sprung, damit auch die
     Landung noch gedeckt ist. Eine Landung, die im selben Augenblick
     wieder trifft, sähe aus, als hätte der Sprung nicht gezählt. */
export const AUSWEICH_WEITE = 46;
export const AUSWEICH_DAUER = 0.18;
export const AUSWEICH_ABKLING = 1.6;
export const AUSWEICH_SCHUTZ = AUSWEICH_DAUER + 0.08;

/* Wie weit ein Sprung trägt. Nie unter einem Zehntel des Grundwerts:
   Ein Sprung, der aus einer Berührung nicht heraustrüge, wäre eine
   Taste, die nichts tut — und der Spieler sucht den Fehler bei sich. */
export function ausweichReichweite(werte) {
  return Math.max(AUSWEICH_WEITE * 0.1, AUSWEICH_WEITE + wert(werte, "ausweichweite"));
}

/* Ausweichhast verkürzt asymptotisch, genau wie Hast die Abklingzeit
   einer Waffe: Ein direkter Abzug ergäbe bei genug Punkten **null**,
   und daraus wäre dauerhafte Unverwundbarkeit geworden. */
export function ausweichAbklingzeit(werte) {
  return AUSWEICH_ABKLING / (1 + wert(werte, "ausweichhast") / 100);
}

export function ausweichTempo(werte) {
  return ausweichReichweite(werte) / AUSWEICH_DAUER;
}

/* Die Felder eines Spielers. An **einer** Stelle gesetzt, damit ein
   neues Feld nicht an drei Orten nachgezogen werden muss. */
export function ruesteAusweichen(spieler) {
  spieler.ausweichBereitIn = 0;
  spieler.ausweichRest = 0;
  spieler.ausweichX = 0;
  spieler.ausweichY = 0;
  spieler.ausweichTempo = 0;
  return spieler;
}

export function kannAusweichen(spieler) {
  return spieler.zustand === "lebt"
    && spieler.ausweichRest <= 0
    && spieler.ausweichBereitIn <= 0;
}

/* Ein Schritt des Sprungs.

   Rückgabe `null` heißt „springt nicht" — dann bewegt sich der Spieler
   wie immer. Sonst kommt der **Versatz dieses Schritts** zurück, dazu
   die Geschwindigkeit für den Zeichner. Angewendet und im Bannkreis
   gehalten wird beides in `spiel/bewegung.mjs`; diese Datei kennt den
   Kreis nicht.

   Die Reihenfolge im Inneren ist wichtig: Erst läuft die Abklingzeit,
   dann ein laufender Sprung, **dann** erst ein neuer. Ein neuer Sprung
   im selben Schritt, in dem der alte endet, wäre ein Sprung ohne
   Abklingzeit. */
export function ausweichSchritt(spieler, eingabe, dt) {
  if (spieler.ausweichBereitIn > 0) spieler.ausweichBereitIn -= dt;

  if (spieler.ausweichRest > 0) {
    /* Der letzte Schritt ist meist kürzer als 1/60 s. Ohne diese
       Kürzung trüge der Sprung jedes Mal ein Stück weiter als
       `ausweichReichweite()` verspricht — und die Zahl auf dem Papier
       wäre eine andere als die im Spiel. */
    const zeit = Math.min(dt, spieler.ausweichRest);
    spieler.ausweichRest -= dt;
    if (spieler.ausweichRest < 0) spieler.ausweichRest = 0;
    const vx = spieler.ausweichX * spieler.ausweichTempo;
    const vy = spieler.ausweichY * spieler.ausweichTempo;
    return { dx: vx * zeit, dy: vy * zeit, vx, vy };
  }

  if (!eingabe?.ausweichen || !kannAusweichen(spieler)) return null;

  /* Gesprungen wird in die gedrückte Richtung, sonst in die zuletzt
     gelaufene. Wer stehend springt, will nicht auf der Stelle springen
     — er will weg, und „weg" heißt: dorthin, wo er hinsieht. */
  let rx = eingabe.x ?? 0, ry = eingabe.y ?? 0;
  const laenge = Math.hypot(rx, ry);
  if (laenge > 0.01) { rx /= laenge; ry /= laenge; }
  else { rx = spieler.blickX; ry = spieler.blickY; }

  const l2 = Math.hypot(rx, ry);
  if (l2 < 0.01) { rx = 0; ry = 1; } else { rx /= l2; ry /= l2; }

  spieler.ausweichX = rx;
  spieler.ausweichY = ry;
  spieler.ausweichTempo = ausweichTempo(spieler.werte);
  spieler.ausweichRest = AUSWEICH_DAUER;
  spieler.ausweichBereitIn = ausweichAbklingzeit(spieler.werte);
  spieler.unverwundbar = Math.max(spieler.unverwundbar ?? 0, AUSWEICH_SCHUTZ);

  const zeit = Math.min(dt, spieler.ausweichRest);
  spieler.ausweichRest -= dt;
  if (spieler.ausweichRest < 0) spieler.ausweichRest = 0;
  const vx = rx * spieler.ausweichTempo;
  const vy = ry * spieler.ausweichTempo;
  return { dx: vx * zeit, dy: vy * zeit, vx, vy };
}
