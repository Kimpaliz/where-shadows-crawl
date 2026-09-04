# Die zweite Vorlage: *Death Must Die*

> Janniks Nachtrag, wörtlich: *„'Death Must Die' ist auch eine gute
> danmaku vorlage! das hart ein tolles loot, ausrüstungs und
> fortschritts system"*

Diese Datei ist keine Wunschliste. Sie zerlegt die zweite Vorlage in
ihre Bauteile, benennt **den einen Konflikt** mit der ersten, und
sortiert das Ergebnis in eine Reihenfolge. Was daraus gebaut wird,
entscheidet Jannik — siehe die Tabelle am Ende.

---

## 1 · Was *Death Must Die* mechanisch ist

Fünf Bauteile, und nur zwei davon hat Brotato auch:

| # | Bauteil | hat Brotato? |
| --- | --- | --- |
| 1 | **Danmaku** — dichte, angekündigte Geschossmuster, vor allem von Bossen | nein |
| 2 | **Beute mit Zufallseigenschaften** — Ausrüstung fällt mit gewürfelten Werten und Seltenheitsstufen | nein |
| 3 | **Ausrüstungsplätze** — Helm, Rüstung, Ringe; man vergleicht und tauscht mitten im Lauf | nein |
| 4 | **Götter und Segen** — man wählt einen Gott, und die Aufstiegskarten kommen aus dessen Vorrat, in Stufen | halb: Brotatos Figuren, aber ohne Vorrat |
| 5 | **Fortschritt zwischen den Läufen** | ja, in Brotato auch |

Bauteil 1 passt **hervorragend**: *Death Must Die* ist buchstäblich
„der Spieler läuft nur, die Waffen schlagen von selbst" plus dichte
Muster zum Ausweichen. Das ist Bauteil 2 aus `SPIEL.md` in seiner
schärfsten Form — kein Widerspruch, sondern eine Steigerung.

---

## 2 · Der eine Konflikt

**Brotatos Bau kommt aus dem Laden. Death-Must-Dies Bau kommt aus dem
Boden.**

| | woher die Macht kommt | was die Entscheidung ist |
| --- | --- | --- |
| Brotato | Krämer, gegen Gold | *Wofür gebe ich das Wenige aus?* |
| Death Must Die | Beute, gewürfelt | *Was davon ziehe ich an?* |

Naiv nebeneinandergestellt entstehen **zwei Wirtschaften, die
nichts voneinander wissen** — und die schnellere macht die andere
bedeutungslos. Fällt genug Ausrüstung, ist der Krämer Zierde. Ist der
Krämer stark genug, hebt man die Beute nicht mal auf.

**Der Ausweg ist, ihnen verschiedene Aufgaben zu geben:**

> **Der Krämer ist die verlässliche Quelle. Die Beute ist die
> überraschende.**
> Gold kauft, was man **geplant** hat — Waffen. Beute gibt, was man
> **nicht** geplant hat — Ausrüstung mit gewürfelten Eigenschaften.

Und eine harte Grenze dazu: **Ausrüstung darf nie um die sechs
Waffenplätze konkurrieren.** Sonst stirbt eines der beiden Systeme,
und zwar unbemerkt — man merkt nur, dass man immer dasselbe tut.

---

## 3 · Was jedes Bauteil kostet

Gemessen am Bestand, nicht geschätzt: Die rechte Spalte sagt, was es
**schon gibt**.

| Bauteil | was neu gebaut werden muss | was schon da ist |
| --- | --- | --- |
| **Götter und Segen** | Karten bekommen einen Vorrat und Stufen statt eines flachen Topfes | `spiel/stufen.mjs` zieht bereits vier Karten aus gewichteten Werten — **die kleinste Änderung von allen** |
| **Zufallseigenschaften** | ein Erzeuger: Grundstück + 1–4 Eigenschaften, Seltenheit bestimmt die Zahl | `katalog/gegenstaende.mjs` hat schon Stücke mit Werten **und Nachteilen**; heute stehen die Zahlen nur fest |
| **Ausrüstungsplätze** | ein Platzmodell (Kopf, Leib, Hand, Ring) und eine Vergleichsansicht | `spiel/werte.mjs` rechnet bereits alles aus einer Wertetabelle; heute werden gekaufte Stücke aber **dauerhaft** eingerechnet und nie wieder abgezogen |
| **Beute, die fällt** | Falltabelle je Gegner, und ein Aufheben, das nicht Gold ist | `spiel/beute.mjs` hat den ganzen Sog- und Aufhebemechanismus |
| **Danmaku-Muster** | ein Mustersystem (Emitter mit Zeitplan) und eine **Ankündigung** vor dem Schuss | `spiel/kampf.mjs` hat Geschosse samt `feindlich`-Kennzeichen; der Speier schießt bereits |
| **Fortschritt zwischen Läufen** | Speichern im Browser, und etwas, das sich freischalten lässt | nichts — es gibt heute keinen Spielstand |

---

## 4 · Die Reihenfolge, und warum

**1 · Götter und Segen.** Zuerst, weil es am billigsten ist und am
meisten verändert, wie sich ein Lauf **anfühlt**. Die Kartenwahl gibt
es schon; sie braucht nur einen Besitzer und Stufen. Danach heißt ein
Lauf nicht mehr „ich habe zufällig Schaden gezogen", sondern „ich
spiele den Gott der Asche".

**2 · Zufallseigenschaften auf den vorhandenen Fundstücken.** *Vor*
der fallenden Beute — nicht danach. Dann verkauft der Krämer schon
gewürfelte Ausrüstung, und die ganze Eigenschaften-Maschinerie ist
erprobt, **bevor** es Beute gibt. Ein Erzeuger, der erst zusammen mit
einem Fallsystem zum ersten Mal läuft, bringt zwei ungeprüfte Systeme
auf einmal.

**3 · Ausrüstungsplätze.** Jetzt nötig, denn ohne Plätze kann man
Ausrüstung nur ansammeln, nicht **tauschen** — und Tauschen ist die
Entscheidung, um die es geht. Zugleich der Punkt, an dem
`gegenstaende` von „dauerhaft eingerechnet" auf „an- und ablegbar"
umgebaut wird.

**4 · Beute, die fällt.** Erst jetzt ist ein Fund etwas wert, weil es
Plätze gibt, in die er passt, und Eigenschaften, die ihn
unterscheiden.

**5 · Danmaku-Muster für die Hauptleute.** Die meiste Arbeit, und die
größte Änderung am Gefühl. Sie lohnt sich, wenn der Hauptmann etwas
fallen lässt, wofür man ihn bekämpfen will.

**6 · Fortschritt zwischen den Läufen.** Zuletzt — er lohnt sich erst,
wenn ein Lauf es wert ist, wiederholt zu werden.

---

## 5 · Zwei Warnungen

**Danmaku zu viert wird schnell unlesbar.** In *Death Must Die* spielt
einer. Vier Spieler in einem Bannkreis, jeder mit sechs
selbstschießenden Waffen, dazu dichte Bossmuster — das ist bald ein
Bildschirm, auf dem niemand mehr sein eigenes Geschoss findet.
Empfehlung: Muster **nur** von Hauptleuten, und die Dichte wächst
**unterlinear** mit der Spielerzahl. Und: eigene Geschosse gedämpft,
feindliche hell — sonst sucht man sich zu Tode.

**Ein Muster ohne Ankündigung ist Willkür.** Das Angenehme an Danmaku
ist, dass man es kommen sieht und sich entscheidet. Ein Boss, der ohne
Vorwarnung feuert, produziert Tode, die niemand hätte vermeiden können
— und das liest sich als kaputt, nicht als schwer. Jedes Muster
braucht ein halbes bis ganzes Sekündchen sichtbare Vorbereitung.

---

## 6 · Was Jannik entscheiden muss

| # | Frage | Empfehlung |
| --- | --- | --- |
| 1 | Krämer **und** fallende Beute nebeneinander, mit getrennten Aufgaben? | ja — der Krämer verkauft Waffen, die Beute gibt Ausrüstung |
| 2 | Wie viele **Ausrüstungsplätze**? | vier: Kopf, Leib, Hand, Ring. Genug zum Abwägen, wenig genug zum Überblicken |
| 3 | **Götter** statt der heutigen freien Kartenwahl? | ja, und als Erstes — es ist die billigste Änderung mit der größten Wirkung |
| 4 | **Danmaku nur für Hauptleute** oder auch für normale Gegner? | nur Hauptleute; alles andere wird zu viert unlesbar |
| 5 | **Fortschritt zwischen den Läufen** — schon jetzt oder später? | später; erst muss ein Lauf gut sein |
| 6 | Bleibt der Lauf bei **zwölf Wellen**? | mit Ausrüstung und Göttern eher fünfzehn bis zwanzig — aber erst messen |

Die sechs offenen Fragen aus [SPIEL.md](SPIEL.md) 10 gelten weiter;
diese hier kommen dazu und ersetzen keine davon.
