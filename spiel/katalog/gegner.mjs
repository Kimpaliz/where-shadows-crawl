/* [Aufgabe: Katalog] Die Gegner — Daten, kein Verhalten.

   Jede Art braucht eine eigene **Silhouette**, nicht nur eine andere
   Farbe: Von oben sieht man Kopf und Schultern, keine Gesichter
   (docs/SPIEL.md 2). Deshalb trägt jeder Eintrag `sprite` und `radius`
   als Teil seiner Identität und nicht als Darstellungsdetail.

   ── Die Felder ─────────────────────────────────────────────────────

   `leben`     auf Welle 1; wächst mit der Welle, siehe `lebenInWelle`
   `tempo`     Bildpunkte je Sekunde
   `schaden`   was eine Berührung kostet
   `radius`    für Treffer und für das Auseinanderdrängen
   `wucht`     wie schwer er zurückzustoßen ist (1 = normal, 0 = gar nicht)
   `gold`      Grabgold, das er fallen lässt
   `wissen`    Erfahrung für den Töter
   `kosten`    was er aus dem Wellenbudget nimmt — die einzige Zahl,
               die Wellen ausbalanciert
   `verhalten` `laeuft` geradewegs, `schwankt` in Bögen,
               `speit` bleibt auf Abstand und schießt

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/wellen.mjs` (kauft aus diesem Katalog ein),
   `spiel/welt.mjs` (setzt sie), `spiel/bewegung.mjs` (bewegt sie).
   Importiert selbst nichts. */

export const GEGNER = [
  {
    id: "schlurfer", name: "Schlurfer",
    leben: 8, tempo: 26, schaden: 4, radius: 5, wucht: 1,
    gold: 5, wissen: 1, kosten: 1, verhalten: "laeuft",
    text: "Langsam, zahlreich, und irgendwann steht er doch vor dir."
  },
  {
    id: "balg", name: "Balg",
    leben: 4, tempo: 52, schaden: 3, radius: 3, wucht: 1.6,
    gold: 4, wissen: 1, kosten: 1, verhalten: "schwankt", schwarm: 4,
    text: "Kommt nie allein."
  },
  {
    id: "hetzer", name: "Hetzer",
    leben: 14, tempo: 62, schaden: 6, radius: 4, wucht: 1.2,
    gold: 9, wissen: 2, kosten: 3, verhalten: "laeuft",
    text: "Schneller als du. Immer."
  },
  {
    id: "aaskraehe", name: "Aaskraehe",
    leben: 9, tempo: 74, schaden: 5, radius: 4, wucht: 1.8,
    gold: 9, wissen: 2, kosten: 3, verhalten: "schwankt",
    text: "Fliegt Bogen. Trifft man schlecht."
  },
  {
    id: "speier", name: "Speier",
    leben: 22, tempo: 30, schaden: 7, radius: 6, wucht: 0.9,
    gold: 14, wissen: 3, kosten: 5, verhalten: "speit",
    abstand: 90, abklingzeit: 2.2, geschosstempo: 110,
    text: "Bleibt weg und spuckt. Man muss zu ihm."
  },
  {
    id: "waechter", name: "Waechter",
    leben: 70, tempo: 22, schaden: 10, radius: 8, wucht: 0.35,
    gold: 23, wissen: 4, kosten: 8, verhalten: "laeuft",
    text: "Steht im Weg und bleibt stehen."
  },
  {
    id: "knochenritter", name: "Knochenritter",
    leben: 120, tempo: 34, schaden: 13, radius: 8, wucht: 0.2,
    gold: 40, wissen: 6, kosten: 14, verhalten: "laeuft",
    text: "Rüstung, die noch hält. Der Mann darin nicht mehr."
  },
  {
    id: "hauptmann", name: "Hauptmann der Nacht",
    leben: 170, tempo: 24, schaden: 9, radius: 13, wucht: 0.05,
    gold: 160, wissen: 30, kosten: 0, verhalten: "laeuft", elite: true,
    text: "Er führt sie. Er fällt zuletzt."
  }
];

export const GEGNER_NACH_ID = new Map(GEGNER.map((g) => [g.id, g]));

/* Gegner werden mit der Welle zäher — aber **nicht** mit der Zahl der
   Spieler (docs/SPIEL.md 4.4: mehr Gegner, nicht zähere). Die Zahl 0,22
   ist gemessen, nicht geraten: siehe `werkzeuge/balance.mjs`. */
/* Endlos heisst, dass der Lauf irgendwann endet — sonst ist es kein
   Modus, sondern ein Bildschirmschoner. Mit 0,30 kamen die Laeufe, die
   die fruehe Klippe ueberstanden, bis Welle **130**; das sind zwei
   Stunden, in denen nichts mehr passiert. */
export const LEBEN_JE_WELLE = 0.55;
export const SCHADEN_JE_WELLE = 0.09;

/* ── Warum auch das Tempo wachsen muss ──────────────────────────────

   Gemessen am 05.09.2026, beim Bau der Endloswellen: **Jede** Gegnerart
   ist langsamer als der Spieler — von 28 % (Wächter) bis 95 %
   (Aaskrähe) —, und daran änderte die Welle nichts. Lebenspunkte
   wuchsen, Schaden wuchs, Tempo nicht.

   Die Folge war kein Balanceproblem, sondern ein Loch: **Wer sauber
   ausweicht, ist unsterblich.** Der Prüfstand lief 130 Wellen lang
   ohne einen Kratzer und wurde nur von der Notbremse gestoppt. Für
   einen Menschen gilt das abgeschwächt — man wird in die Enge
   getrieben —, aber für einen guten Spieler steigt die Gefahr sonst nie.

   Deshalb wachsen die Gegner auch im Tempo, **mit Deckel**: Ohne ihn
   wäre die Aaskrähe bei Welle 100 siebenmal so schnell und flöge durch
   die Trefferprüfung hindurch. Mit dem Deckel bei 1,9 überholen Hetzer
   und Aaskrähe den Spieler ab Welle 15 und sind ab 31 endgültig
   schneller. Ab da läuft man nicht mehr weg — man kämpft oder fällt. */
export const TEMPO_JE_WELLE = 0.030;
export const TEMPO_DECKEL = 1.9;

export function tempoInWelle(art, welle) {
  return art.tempo * Math.min(TEMPO_DECKEL, 1 + TEMPO_JE_WELLE * (welle - 1));
}

export function lebenInWelle(art, welle) {
  return Math.round(art.leben * (1 + LEBEN_JE_WELLE * (welle - 1)));
}

export function schadenInWelle(art, welle) {
  return art.schaden * (1 + SCHADEN_JE_WELLE * (welle - 1));
}
