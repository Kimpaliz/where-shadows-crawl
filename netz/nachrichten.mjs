/* [Aufgabe: Koop] Was über die Leitung geht — und in welcher Form.

   ── Nur Eingaben, nie Weltzustand ───────────────────────────────────

   Der Regelkern ist gesät und rechnet in festen Schritten
   (`spiel/zufall.mjs`, `spiel/welt.mjs`). Zwei Rechner, die aus
   derselben Saat dieselben Eingaben verarbeiten, bekommen dieselbe
   Welt. Deshalb reisen hier **zwei Achsen und ein Knopf** je Spieler
   und Schritt — und nicht die Gegner, nicht die Geschosse, nicht die
   Beute.

   Der Unterschied ist nicht Feinschliff: Eine Welle mit achtzig
   Gegnern, sechzigmal je Sekunde verschickt, wären ein paar hundert
   Kilobyte je Sekunde. Eine Eingabe ist **drei Byte**.

   ── Warum die Achsen gepackt werden ─────────────────────────────────

   `-1 … 1` als Gleitkommazahl über JSON wären bis zu 20 Zeichen je
   Achse (`-0.7071067811865476`). Gepackt auf eine Stufe von 1/127 sind
   es drei Ziffern — und der Daumen kann ohnehin nicht feiner zielen.

   Wichtiger als die Ersparnis ist aber, dass das Packen **stabil**
   ist: Was einmal durch das Raster gegangen ist, ändert sich beim
   zweiten Mal nicht mehr. Wäre es das nicht, liefen die Rechner
   langsam auseinander — und zwar so langsam, dass man es erst nach
   Minuten an einem Gegner merkt, der nur bei einem steht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/verbindung.mjs` (verschickt die Zeichenketten),
   `netz/lockstep.mjs` (sortiert die Eingaben nach Tick),
   `werkzeuge/pruefe-netz.mjs` (prüft den Umlauf). */

/* 127 Stufen je Richtung. Mehr wäre für einen Daumen ohne Wirkung, und
   weniger würde man beim Schrägbewegen sehen. */
const STUFEN = 127;

/* Eine Eingabe in eine Zahl. 8 Bit je Achse, 1 Bit für den Knopf. */
export function packeEingabe(eingabe) {
  const grenze = (n) => Math.max(-STUFEN, Math.min(STUFEN, Math.round((Number(n) || 0) * STUFEN)));
  const qx = grenze(eingabe?.x) + STUFEN;
  const qy = grenze(eingabe?.y) + STUFEN;
  return (qx << 9) | (qy << 1) | (eingabe?.ausweichen ? 1 : 0);
}

/* Und zurück. Eine kaputte Zahl gibt eine stehende Figur statt eines
   Fehlers: Ein einzelnes verhagelter Paket darf keinen Lauf abbrechen. */
export function entpackeEingabe(zahl) {
  const n = Number(zahl);
  if (!Number.isFinite(n)) return { x: 0, y: 0, ausweichen: false };
  const qx = (n >> 9) & 0xff;
  const qy = (n >> 1) & 0xff;
  return {
    x: (qx - STUFEN) / STUFEN,
    y: (qy - STUFEN) / STUFEN,
    ausweichen: (n & 1) === 1
  };
}

/* Die stehende Figur — was ein Spieler bekommt, dessen Eingabe fehlt.
   Als eigene Funktion, damit „nichts gedrückt" an **einer** Stelle
   festgelegt ist und nicht in drei Modulen als Literal steht. */
export function ruhendeEingabe() {
  return { x: 0, y: 0, ausweichen: false };
}

/* Eine Nachricht wird JSON. Kein eigenes Binärformat: Der Gewinn wären
   ein paar Byte je Tick, der Preis ein Format, das man beim Suchen
   eines Fehlers nicht lesen kann. */
export function packe(nachricht) {
  return JSON.stringify(nachricht);
}

/* Was von außen kommt, ist erst einmal Text. Kaputte Daten geben
   `null`, statt zu werfen — ein Zeichenfehler auf der Leitung darf
   nicht das ganze Spiel abreißen. */
export function entpacke(text) {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== "object" || typeof o.art !== "string") return null;
    return o;
  } catch {
    return null;
  }
}
