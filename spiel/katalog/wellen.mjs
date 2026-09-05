/* [Aufgabe: Katalog] Wie eine Welle zusammengestellt wird.

   Eine Welle wird nicht Gegner für Gegner aufgeschrieben, sondern
   **eingekauft**: Sie bekommt ein Budget, und daraus werden Gegner
   gezogen, solange es reicht. Der Grund ist Wartbarkeit — ein neuer
   Gegner braucht nur einen `kosten`-Wert und ist ab da automatisch
   Teil aller passenden Wellen. Zwölf handgeschriebene Wellenlisten
   müsste man dagegen zwölfmal anfassen.

   Das Budget wächst mit der Welle **und** mit der Zahl der Spieler
   (docs/SPIEL.md 4.4). Die Lebenspunkte je Gegner wachsen nur mit der
   Welle — sonst würden schwache Bauten doppelt bestraft.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/gegner.mjs` (der Warenkorb), `spiel/welt.mjs`
   (bekommt den fertigen Bauplan und setzt ihn um), `spiel/zufall.mjs`
   (zieht). */

import { GEGNER, GEGNER_NACH_ID } from "./gegner.mjs";

/* ── Endlos, und warum die Kurve dafür nicht taugte ─────────────────

   Janniks Ansage vom 05.09.2026: „Im arena modus endloswellen, jede
   welle 30 sekunden". Vorher waren es zwölf Wellen mit wachsender
   Dauer, und das Budget wuchs quadratisch **ohne Grenze**.

   Endlos gerechnet bricht das an zwei Stellen, beide gemessen:

   | Welle | Gegner je Welle | gleichzeitig | nötige Schadensleistung |
   | ---: | ---: | ---: | ---: |
   | 12 | 87 | ~35 | 275 |
   | 30 | 393 | ~157 | **3.333** |
   | 50 | 1.084 | ~434 | **14.210** |

   Flüssig läuft es mit rund fünfzig gleichzeitig, und der stärkste
   gemessene Bau kommt auf gut zweihundert Schaden je Sekunde. Das
   Spiel wäre also bei Welle 25 zu Ende — **an der Bildrate, nicht am
   Können.** Das ist die schlechteste Art zu verlieren.

   ── Also wachsen die Gegner, nicht ihre Zahl ───────────────────────

   Ab `ENDLOS_AB` bleibt das Budget stehen: Die Zahl der Gegner
   sättigt, ihre Lebenspunkte und ihr Schaden wachsen weiter
   (`gegner.mjs`, `LEBEN_JE_WELLE`). Damit steigt die nötige
   Schadensleistung **linear** statt quadratisch — und das kann ein Bau
   verfolgen, bis er es irgendwann nicht mehr kann.

   Genau da endet der Lauf, und das ist der Sinn eines endlosen Modus:
   nicht zu gewinnen, sondern zu sehen, wie weit man kommt. */

/* Bis hierhin wächst die Welle in Zahl und Stärke. Danach nur noch in
   Stärke. Die Zahl ist die höchste, bei der es gemessen flüssig läuft. */
export const ENDLOS_AB = 12;

/* Die feste Wellenlänge in Sekunden (Janniks Ansage). Ein Modus darf
   sie überschreiben — `spiel/katalog/modi.mjs`. */
export const WELLE_SEKUNDEN = 30;

/* Nur noch für Modi mit Ende. Der Bannkreis ist endlos; die Zahl
   bleibt, weil ein Modus mit festem Ende sie brauchen wird. */
export const WELLEN_JE_LAUF = 12;

export function dauerDerWelle(welle, modus) {
  return modus?.wellenSekunden ?? WELLE_SEKUNDEN;
}

/* Das Budget. Quadratisch, weil die Macht des Spielers es auch ist:
   Waffen werden stärker (Stufen), zahlreicher (bis sechs) **und** die
   Werte wachsen — drei Faktoren, die sich multiplizieren. Ein linear
   wachsendes Budget wäre ab Welle 6 langweilig.

   Und gedeckelt, weil es sonst die Bildrate frisst statt den Spieler
   zu fordern (siehe oben). */
/* Gerechnet wird in **Dichte** — Budget je Sekunde —, nicht in Budget
   je Welle. Das ist der Unterschied, der die erste Fassung der
   Endloswellen kaputt gemacht hat: Die alte Kurve war auf wachsende
   Wellenlänge ausgelegt (23 s bis 55 s). Bei festen 30 s war Welle 12
   dadurch **1,83-mal so dicht** wie vorher, und die Läufe starben
   reihenweise zwischen Welle 6 und 11.

   Die Zahlen unten geben die alte, erprobte Dichte wieder:
   0,57 bei Welle 1 und 5,13 bei Welle 12. */
export function dichteDerWelle(welle) {
  const w = Math.min(welle, ENDLOS_AB);
  return 0.16 + 0.415 * w;
}

export function budgetDerWelle(welle, spielerzahl, modus) {
  const sekunden = dauerDerWelle(welle, modus);
  return Math.round(dichteDerWelle(welle) * sekunden * spielerzahl);
}

/* Alle vier Wellen ein Hauptmann (Bauteil 9) — der Abstand steht im
   Modus, damit ein zweiter ihn anders wählen kann. */
export function istElitewelle(welle, modus) {
  return welle % (modus?.elitewelleJede ?? 4) === 0;
}

/* Welche Gegnerarten in dieser Welle überhaupt vorkommen. Neue Arten
   kommen gestaffelt dazu — alles ab Welle 1 wäre unlesbar, und der
   Spieler soll jede Art einmal einzeln kennenlernen. */
const AB_WELLE = {
  schlurfer: 1, balg: 1, hetzer: 2, aaskraehe: 3,
  speier: 6, waechter: 7, knochenritter: 8, hauptmann: 99
};

export function artenInWelle(welle) {
  return GEGNER.filter((g) => !g.elite && (AB_WELLE[g.id] ?? 1) <= welle);
}

/* ── Der zweite Hauptmann ────────────────────────────────────────────

   Janniks Ansage vom 05.09.2026: „Eine Hauptmannswelle muss anders
   aussehen, nicht nur schwerer sein." Ein zweiter `hauptmann` mit mehr
   Leben wäre genau das Falsche — derselbe Kampf, nur länger.

   Deshalb bekommt der Hauptmann ab der **zweiten** Bosswelle
   Gesellschaft: abwechselnd der Gebeinfürst (Steigerung des
   Knochenritters, Nahkampf, kaum zu verschieben) und der Vielfraß
   (Steigerung des Speiers, hält Abstand und spuckt) — zwei eigene
   Silhouetten, zwei eigene Kämpfe, `spiel/katalog/gegner.mjs`. Die
   allererste Bosswelle bleibt bewusst bei ihm allein: Sie ist die
   Einführung, und wer zwei Bosse sieht, bevor er den ersten kennt,
   lernt nichts daraus.

   Welcher der beiden es ist, folgt der Wellenzahl selbst, **nicht**
   dem Würfel — dieselbe Regel wie bei `schwankt` in
   `spiel/gegner-verhalten.mjs`: Wo sich etwas aus dem Zustand ergibt,
   muss man nicht würfeln, und jede zusätzliche Ziehung im Kern
   verschiebt jede spätere im ganzen Lauf (siehe `spiel/zufall.mjs`).

   `hauptmann` bleibt in **jeder** Bosswelle dabei, der zweite kommt
   nur dazu — `werkzeuge/pruefe-katalog.mjs` (außerhalb dieser Aufgabe)
   prüft an festen Wellen, dass „hauptmann" im Bauplan steht, und diese
   Prüfung darf nicht rot werden. */
const ZWEITER_HAUPTMANN = ["gebeinfuerst", "vielfrass"];

/* Der wievielte Bosskampf ist das, gezählt ab 1? Nur für Bosswellen
   sinnvoll — dort ist die Division immer glatt, weil `istElitewelle`
   das schon geprüft hat. */
export function elitewellenIndex(welle, modus) {
  return welle / (modus?.elitewelleJede ?? 4);
}

/* Der Bauplan einer Welle: eine Liste von Einträgen
   `{ art, zeit }` — welche Art wann erscheint. Die Zeit ist über die
   Welle verteilt, mit einem ruhigen Anfang: Wer in Sekunde 0 von acht
   Gegnern umstellt wird, hat nichts entschieden.

   Rein rechnend, ohne Weltzustand — deshalb einzeln prüfbar. */
export function baueWelle(welle, spielerzahl, zufall, modus) {
  const budget = budgetDerWelle(welle, spielerzahl, modus);
  const dauer = dauerDerWelle(welle, modus);
  const arten = artenInWelle(welle);
  const plan = [];
  let rest = budget;

  if (istElitewelle(welle, modus)) {
    const anzahl = Math.max(1, Math.floor(spielerzahl / 2));
    for (let i = 0; i < anzahl; i++) {
      plan.push({ art: "hauptmann", zeit: dauer * 0.25 + i * 1.5 });
    }

    const eliteIndex = elitewellenIndex(welle, modus);
    if (eliteIndex >= 2) {
      const zweiterId = ZWEITER_HAUPTMANN[(eliteIndex - 2) % ZWEITER_HAUPTMANN.length];
      for (let i = 0; i < anzahl; i++) {
        plan.push({ art: zweiterId, zeit: dauer * 0.55 + i * 1.5 });
      }
    }
  }

  /* Bezahlbare Arten teurer zuerst prüfen, damit das Budget nicht
     ausschließlich in Schlurfer fließt. Die Ziehung bleibt zufällig —
     sonst sähe jede Welle 7 gleich aus. */
  let schutz = 0;
  while (rest > 0 && schutz++ < 4000) {
    const bezahlbar = arten.filter((g) => g.kosten <= rest);
    if (bezahlbar.length === 0) break;
    const art = zufall.ausListe(bezahlbar);
    const schwarm = art.schwarm ?? 1;
    /* Der Anfang ist ruhig: Die Wurzel drückt die frühen Zeitpunkte
       zusammen und streut die späten. */
    const anteil = Math.sqrt(zufall.zahl());
    const zeit = anteil * dauer * 0.86;
    for (let i = 0; i < schwarm && rest > 0; i++) {
      plan.push({ art: art.id, zeit: zeit + i * 0.12 });
      rest -= art.kosten;
    }
  }

  plan.sort((a, b) => a.zeit - b.zeit);
  return { welle, dauer, budget, plan };
}
