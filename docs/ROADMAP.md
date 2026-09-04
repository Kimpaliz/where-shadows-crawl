# Fahrplan

Jede Phase hat ein **Abnahmekriterium** — einen Satz, an dem sich ohne
Diskussion feststellen lässt, ob sie fertig ist. Eine Phase ohne
solchen Satz ist keine Phase, sondern eine Absichtserklärung.

Der Stand einer Phase steht **nicht hier** (Regel 14): Diese Datei
trägt die Begründung, nicht die Buchhaltung.

---

## Phase 1 — Götter und Segen

Die Aufstiegskarten kommen aus dem Vorrat eines gewählten Gottes statt
aus einem flachen Topf. Segen haben Stufen und greifen ineinander.

**Warum zuerst:** Die billigste der sechs Änderungen aus
[ZWEITE-VORLAGE.md](ZWEITE-VORLAGE.md) — `spiel/stufen.mjs` zieht
bereits vier Karten aus gewichteten Werten. Und die mit der größten
Wirkung darauf, wie sich ein Lauf anfühlt: Aus „ich habe zufällig
Schaden gezogen" wird „ich spiele den Gott der Asche".

**Fertig, wenn:** Zwei Läufe mit demselben Gott fühlen sich verwandt
an und zwei mit verschiedenen Göttern verschieden — gemessen daran,
dass ein Balancelauf je Gott einen erkennbar anderen Endbau erzeugt.

### Schritt 1.1 — Ein Gott als Kartenvorrat

Ein Gott ist eine Liste von Segen mit Gewichten. Die Kartenwahl zieht
daraus statt aus `WERTE`.

**Fertig, wenn:** `ziehKarten` bekommt einen Gott gereicht und zieht
nachweislich nur aus dessen Vorrat.

### Schritt 1.2 — Segen mit Stufen

Ein Segen lässt sich mehrfach nehmen und wird dabei stärker; höhere
Stufen erscheinen erst, wenn die niedrigere genommen wurde.

**Fertig, wenn:** Eine Stufe 3 kann nachweislich nicht als erste Karte
erscheinen.

### Schritt 1.3 — Gottwahl im Vorspiel

**Fertig, wenn:** Die Wahl steht auf dem Titelbild neben der
Spielerzahl und lässt sich mit derselben Achse und demselben Knopf
bedienen.

---

## Phase 2 — Zufallseigenschaften

Ein Fundstück ist nicht mehr eine feste Wertetabelle, sondern ein
Grundstück plus ein bis vier gewürfelte Eigenschaften. Die Seltenheit
bestimmt, wie viele.

**Warum vor der fallenden Beute:** So verkauft der Krämer schon
gewürfelte Ausrüstung, und der Erzeuger ist erprobt, **bevor** es ein
Fallsystem gibt. Zwei ungeprüfte Systeme auf einmal einzuführen ist
der sicherste Weg, keinen von beiden beurteilen zu können.

**Fertig, wenn:** Zwei Angebote desselben Grundstücks unterscheiden
sich nachweislich, und ein Balancelauf über 40 Läufe zeigt keine
Eigenschaft, die in mehr als der Hälfte aller Stücke vorkommt.

---

## Phase 3 — Ausrüstungsplätze

Vier Plätze (Kopf, Leib, Hand, Ring). Ausrüstung wird **angelegt**,
nicht dauerhaft eingerechnet — sie lässt sich also tauschen und
vergleichen.

**Warum jetzt:** Ohne Plätze kann man Ausrüstung nur ansammeln. Das
Tauschen ist die Entscheidung, um die es geht.

⚠️ **Der Umbau, der dabei passiert:** Heute rechnet
`spiel/laden.mjs` gekaufte Werte direkt und für immer in
`spieler.werte`. Das muss auf „Grundwerte plus angelegte Ausrüstung"
umgestellt werden. Der Umbau ist ohne sichtbare Änderung beweisbar:
Bei gleichem Besitz müssen dieselben Zahlen herauskommen.

**Fertig, wenn:** Ein Stück ablegen und wieder anlegen führt zu
**bitgleichen** Werten, und die Umstellung selbst ändert an einem
Balancelauf mit festen Saaten nichts.

---

## Phase 4 — Beute, die fällt

Hauptleute und seltene Gegner lassen Ausrüstung fallen statt nur Gold.

**Fertig, wenn:** Ein Hauptmann lässt nachweislich ein Stück fallen,
das sich von allem im Krämerangebot unterscheidet, und die
Aufsammelreichweite gilt dafür wie für Gold.

---

## Phase 5 — Danmaku für die Hauptleute

Angekündigte Geschossmuster. Ein halbes bis ganzes Sekündchen sichtbare
Vorbereitung, dann das Muster.

**Warum so spät:** Die meiste Arbeit, und sie lohnt sich erst, wenn
der Hauptmann etwas fallen lässt, wofür man ihn bekämpfen will.

⚠️ Dichte wächst **unterlinear** mit der Spielerzahl, und feindliche
Geschosse sind heller als eigene — sonst ist der Bildschirm zu viert
unlesbar.

**Fertig, wenn:** Jedes Muster hat eine sichtbare Ankündigung, und ein
Bildpunktvergleich belegt, dass feindliche Geschosse heller sind als
eigene.

---

## Phase 6 — Fortschritt zwischen den Läufen

Freischaltungen, die einen Lauf überdauern. Gespeichert im Browser.

**Warum zuletzt:** Er lohnt sich erst, wenn ein Lauf es wert ist,
wiederholt zu werden.

**Fertig, wenn:** Ein Spielstand übersteht das Schließen des Browsers,
und eine kaputte oder alte Fassung des Spielstands führt zu einem
sauberen Neuanfang statt zu einem Absturz.

---

## Jederzeit möglich, unabhängig von allem

- **Ton.** Es gibt keinen. Ausdrücklich nicht gefordert.
- **Weitere Waffen, Gegner, Fundstücke.** Je ein Eintrag im Katalog;
  ein neuer Gegner braucht zusätzlich ein Raster in
  `runtime/sprite-daten.js`, und die Prüfung besteht auf beidem.
- **Netz-Koop.** Die Entscheidung dazu steht in [SPIEL.md](SPIEL.md) 11
  und wartet auf Jannik.
