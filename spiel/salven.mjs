/* [Aufgabe: Regelkern] Wie eine Fernwaffe ihre Geschosse in die Welt legt.

   ── Janniks Ansage ─────────────────────────────────────────────────

   *„auch projektil angriffe sollen so aufgebaut werden das die angriffe
   mehrere projektile einplanen."*

   ── Was vorher war ─────────────────────────────────────────────────

   Gemessen schoss **jede der fünf Fernwaffen gleich**: ein Geschoss
   geradeaus aufs nächste Ziel. Unterschieden haben sie sich nur in
   `geschosstempo`, `reichweite` und `abklingzeit` — also in Zahlen,
   die man beim Spielen kaum auseinanderhält. Mehrere Geschosse gab es
   ausschließlich über den **Spielerwert** `zusatzgeschosse`, und der
   fächerte bei allen fünf Waffen identisch.

   Ein Wurfmesser und eine Armbrust sahen im Flug damit gleich aus,
   obwohl das eine geworfen und das andere geschossen wird.

   ── Die eine Regel, an der alles hängt ─────────────────────────────

   **Ein Salvenmuster ist kein Schadensmultiplikator.** Der Grundschaden
   eines Angriffs wird auf seine Geschosse **verteilt** — sonst wäre
   „drei statt eins" schlicht dreifacher Schaden, und die einzige
   sinnvolle Waffe wäre die mit den meisten Geschossen. Was ein Muster
   wirklich ändert, ist die **Trefferwahrscheinlichkeit und ihre Form**:
   ein Fächer trifft in der Breite, eine Folge trifft nach, ein
   gestreuter Wurf trifft ein Gedränge und verfehlt einen Einzelnen.

   Die zweite Regel folgt daraus: Die Verteilung geschieht über
   `anteilJeGeschoss()` **an einer Stelle**. Wer sie an der Waffe
   einträgt, hat zwei Wahrheiten über denselben Schaden.

   ── Zufall ─────────────────────────────────────────────────────────

   `streu` braucht Zufall, und der kommt **ausschließlich** aus
   `welt.zufall` — dem gesäten Strom, als Objekt mit `zahl()`
   übergeben. Ein `Math.random()` hier ließe zwei Rechner im Netz-Koop
   langsam auseinanderlaufen; man merkt es erst nach Minuten, wenn die
   Gegner an verschiedenen Stellen stehen.
   `werkzeuge/pruefe-kern.mjs` hält das fest.

   ⚠️ **Nur `streu` zieht.** Jede Ziehung verschiebt den Strom für alle
   danach — Wellenpläne, Beutewürfe, Truhen. Ein Muster, das „nur zur
   Sicherheit" würfelt, ändert damit still jede bisherige Messung.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/kampf.mjs` (ruft `richtungenDerSalve()`),
   `spiel/katalog/waffen.mjs` (jede Fernwaffe trägt ihr `salve`),
   `werkzeuge/pruefe-angriffe.mjs` (misst die Muster). */

/* Die fünf Formen. Mehr braucht es nicht — jede ist beim Spielen an
   einem Blick zu erkennen, und das ist der Zweck. */
export const FORMEN = ["einzeln", "faecher", "folge", "parallel", "streu", "ring"];

/* Der Fächerwinkel, wenn eine Waffe keinen eigenen nennt. Übernommen
   aus dem alten `FAECHER` in `kampf.mjs`, damit `zusatzgeschosse` sich
   genau wie vorher verhält. */
export const STANDARD_WINKEL = 0.16;

/* Wie viel Schaden ein einzelnes Geschoss trägt.

   Nicht `1 / anzahl`, sondern etwas mehr: Wäre die Summe genau eins,
   wäre jede mehrschüssige Waffe **schwächer** als eine einschüssige,
   weil eine Salve auch danebengeht — und niemand nähme sie. Der
   Aufschlag ist der Preis dafür.

   ── Warum je Form und nicht einmal für alle ────────────────────────

   Weil die Formen **unterschiedlich oft verfehlen**, und ein globaler
   Wert damit zwei verschiedene Dinge bezahlt:

   | Form | verfehlt | Aufschlag |
   | --- | --- | --- |
   | `folge`, `parallel` | fast nie — alle fliegen dieselbe Bahn | **0** |
   | `faecher`, `ring` | die äußeren gehen am Einzelziel vorbei | 0,20 |
   | `streu` | am meisten, der Kegel ist am breitesten | 0,30 |

   ⚠️ **Eine suchende Waffe bekommt nie einen Aufschlag**, egal welche
   Form. Ein Geschoss mit `suchend: true` dreht in `bewegeGeschosse()`
   auf sein Ziel ein (`p.vx += ((dx/d) * p.tempo - p.vx) * …`) und
   trifft; der Umweg ist dann reine Optik. Ohne diese Ausnahme bekäme
   der Bannstein — drei suchende Steine im Ring — dauerhaft **1,40×**
   statt 1,00× Grundschaden geschenkt, für ein Verfehlen, das bei ihm
   nicht stattfindet. Genau die Regel, die diese Datei in ihrem Kopf
   aufstellt, wäre damit an ihrer eigenen einzigen Ring-Waffe gebrochen.

   Der erste Anlauf hatte einen einzigen Wert von 0,34 für alle. Über
   40 Läufe je Spielerzahl gemessen: allein und zu zweit wurde das
   Spiel dadurch besser (10 → 5 und 15 → 10 Läufe ohne Ende), zu viert
   **schlechter** (16 → 19). Die Ursache steht in der Tabelle oben —
   Wurfmesser und Armbrust sind die häufigsten Waffen, und ausgerechnet
   sie bekamen einen Aufschlag für ein Verfehlen, das bei ihnen gar
   nicht stattfindet.

   Gemessen wird das nicht hier, sondern in `pruefe-balance.mjs` über
   ganze Läufe — eine Formel kann nur behaupten, dass sie stimmt. */
export const AUFSCHLAG_JE_FORM = {
  einzeln: 0,
  folge: 0,
  parallel: 0,
  faecher: 0.2,
  ring: 0.2,
  streu: 0.3
};

/* Der Wert für Formen, die oben nicht stehen. Bewusst der kleinste:
   Eine neue Form soll das Spiel nicht aus Versehen leichter machen,
   bevor jemand sie gemessen hat. */
export const SALVEN_AUFSCHLAG = 0;

export function anteilJeGeschoss(anzahl, form = "faecher", suchend = false) {
  if (anzahl <= 1) return 1;
  /* Wer sein Ziel findet, verfehlt nicht — siehe oben. */
  const auf = suchend ? 0 : (AUFSCHLAG_JE_FORM[form] ?? SALVEN_AUFSCHLAG);
  return (1 + auf * (anzahl - 1)) / anzahl;
}

/* Wie viele Geschosse eine Salve hat: was die Waffe vorsieht, plus was
   der Spieler sich erkauft hat. Die beiden addieren sich, sie
   multiplizieren nicht — sonst wäre `zusatzgeschosse` auf einer
   Vierfach-Waffe viermal so viel wert wie auf einer Einzelwaffe. */
export function geschosseDerSalve(salve, zusatz = 0) {
  return Math.max(1, (salve?.geschosse ?? 1) + zusatz);
}

function drehe(nx, ny, w) {
  const c = Math.cos(w), s = Math.sin(w);
  return [nx * c - ny * s, nx * s + ny * c];
}

/* Die Richtungen und Startversätze einer Salve.

   Gibt je Geschoss `{ rx, ry, laengs, quer }` zurück: `rx`/`ry` die
   Flugrichtung, `laengs` und `quer` der Startversatz **in der
   Flugrichtung und senkrecht dazu**, in Bildpunkten.

   ⚠️ **`folge` wurde bewusst als Versatz gebaut und nicht als
   Verzögerung.** „In 0,09 s das zweite Messer werfen" hätte eine
   Warteschlange gebraucht: einen neuen Zustand in der Welt, der über
   Wellenenden, Spielertode und den Netz-Koop hinweg stimmen muss.
   Zwei Messer, von denen das zweite 7 Bildpunkte weiter hinten
   startet, sehen im Flug **genauso** aus wie zwei nacheinander
   geworfene — sie treffen nur ein paar Hundertstel früher. Das ist
   der billigere Weg zum selben Bild, und er kann nicht auseinander
   laufen.

   ⚠️ **Bei genau einem Geschoss wird die Richtung unverändert
   durchgereicht** und nicht über den Winkel gerechnet. `cos(atan2(y,x))`
   ist nicht bitgleich zu `x / hypot(x,y)`, und der Unterschied im
   letzten Bit verschiebt über tausend Schritte die ganze Nacht — im
   Netz-Koop laufen zwei Rechner davon auseinander. Diese Zeile stand
   schon in `wirfSalve()` und ist beim Umzug hierher mitgekommen. */
export function richtungenDerSalve(nx, ny, anzahl, salve, zufall) {
  /* `zufall` ist der gesäte Strom aus `welt.zufall` — ein Objekt mit
     `zahl()`, kein nackter Funktionsaufruf. */
  const form = salve?.form ?? "faecher";
  const winkel = salve?.winkel ?? STANDARD_WINKEL;
  const raus = [];

  if (anzahl === 1) return [{ rx: nx, ry: ny, laengs: 0, quer: 0 }];

  for (let i = 0; i < anzahl; i++) {
    /* Von der Mitte aus nach beiden Seiten, damit die Salve um die
       Zielrichtung liegt und nicht daneben. */
    const mitte = i - (anzahl - 1) / 2;

    if (form === "folge") {
      /* Hintereinander, alle geradeaus. Ein Messerwerfer wirft zwei
         Messer nacheinander, nicht zwei nebeneinander — hier als
         Startversatz nach hinten, siehe oben. */
      raus.push({ rx: nx, ry: ny, laengs: -i * (salve?.abstand ?? 7), quer: 0 });
    } else if (form === "parallel") {
      /* Nebeneinander, alle in dieselbe Richtung — die Doppelarmbrust. */
      raus.push({ rx: nx, ry: ny, laengs: 0, quer: mitte * (salve?.abstand ?? 4) });
    } else if (form === "streu") {
      /* Zufällig im Kegel. Scherben eines zerplatzten Glases fliegen
         nicht in gleichen Abständen. */
      const w = (zufall.zahl() * 2 - 1) * (salve?.streuung ?? 0.34);
      const [rx, ry] = drehe(nx, ny, w);
      raus.push({ rx, ry, laengs: 0, quer: 0 });
    } else if (form === "ring") {
      /* Rundum, gleichmäßig. Der Bannstein sucht ohnehin sein Ziel —
         ein Ring sieht aus wie ein Schwarm und trifft trotzdem. */
      const [rx, ry] = drehe(nx, ny, (i / anzahl) * Math.PI * 2);
      raus.push({ rx, ry, laengs: 0, quer: 0 });
    } else {
      /* `faecher` und alles Unbekannte: gleichmäßig um die
         Zielrichtung. Das ist auch der Weg, den `zusatzgeschosse` auf
         einer Einzelwaffe nimmt. */
      const [rx, ry] = drehe(nx, ny, mitte * winkel);
      raus.push({ rx, ry, laengs: 0, quer: 0 });
    }
  }
  return raus;
}
