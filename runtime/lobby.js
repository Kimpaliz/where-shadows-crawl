/* [Aufgabe: Koop] Die Lobby — aufmachen, Code vorlesen, beitreten.

   ── Warum als HTML und nicht auf der Leinwand ───────────────────────

   Der Rest des Spiels wird Bildpunkt für Bildpunkt gemalt
   (`runtime/zeichnen.js`), und das ist auch richtig so. Hier aber wird
   ein Code **getippt** — und ein Eingabefeld auf einer Leinwand
   nachzubauen hieße, Tastatur, Textmarke, Einfügen und vor allem die
   Bildschirmtastatur des Telefons selbst zu bauen. Das kann der
   Browser längst, und zwar besser: Er kennt die Zwischenablage, er
   kennt das Autovervollständigen, und er macht auf dem Telefon von
   selbst die Tastatur auf.

   Die Lobby steht deshalb **vor** dem Spiel, nicht darin. Sobald es
   losgeht, verschwindet sie, und ab da gibt es nur noch die Leinwand.

   ── Was hier bewusst nicht steht ────────────────────────────────────

   Keine Regel und keine Simulation. Diese Datei sammelt einen Namen
   und einen Code ein und reicht sie an `netz/sitzung.mjs` weiter; was
   daraus wird, entscheidet dort der Wirt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/sitzung.mjs` (Wirt und Gast), `netz/lobbycode.mjs` (prüft den
   getippten Code), `runtime/start.js` (übergibt an das Spiel),
   `index.html` (der Kasten `#lobby`). */

import { eroeffne, tritteBei, MAX_SPIELER } from "../netz/sitzung.mjs";
import { pruefeCode } from "../netz/lobbycode.mjs";
import { installierbar, beiAenderung as beiInstallAenderung, biteInstallieren } from "./installieren.js";

const NAME_SPEICHER = "wsc.name";

/* Ein Element mit Text und Eigenschaften — spart das immer gleiche
   Dreizeilen-Muster und hält die Aufbauten unten lesbar. */
function bau(art, eigenschaften = {}, kinder = []) {
  const e = document.createElement(art);
  for (const [schluessel, wert] of Object.entries(eigenschaften)) {
    if (schluessel === "text") e.textContent = wert;
    else if (schluessel === "klasse") e.className = wert;
    else if (schluessel.startsWith("bei")) e.addEventListener(schluessel.slice(3).toLowerCase(), wert);
    else e.setAttribute(schluessel, wert);
  }
  for (const k of kinder) e.appendChild(k);
  return e;
}

export function macheLobby({ beiStart }) {
  const kasten = document.getElementById("lobby");
  let sitzung = null;

  const zeige = () => kasten.removeAttribute("hidden");
  const verstecke = () => kasten.setAttribute("hidden", "");

  /* Der Installieren-Knopf horcht, weil die Zusage des Browsers
     **später** eintrifft als der Bildaufbau. Verlässt der Spieler das
     Bild, muss der Horcher mit — sonst schreibt er nach jedem Hin und
     Her in ein Element, das es nicht mehr gibt, und die Liste wächst
     bei jedem „ZURÜCK" um einen Eintrag. Deshalb hängt das Abmelden an
     `leere()`: der einen Stelle, an der ein Bild wirklich abgeräumt
     wird. */
  let loeseInstallHorcher = null;

  const leere = () => {
    loeseInstallHorcher?.();
    loeseInstallHorcher = null;
    while (kasten.firstChild) kasten.removeChild(kasten.firstChild);
  };

  const gemerkterName = () => {
    try { return localStorage.getItem(NAME_SPEICHER) || ""; } catch { return ""; }
  };
  const merkeName = (n) => {
    try { localStorage.setItem(NAME_SPEICHER, n); } catch { /* privates Fenster */ }
  };

  /* ── Bild 1: die Wahl ─────────────────────────────────────────── */

  function zeigeWahl(meldung = "") {
    leere();
    const namensfeld = bau("input", {
      id: "lobbyname", maxlength: "12", placeholder: "DEIN NAME",
      value: gemerkterName() || "JÄGER"
    });

    const meldungsfeld = bau("div", { id: "lobbymeldung", text: meldung });

    const nameJetzt = () => (namensfeld.value.trim().slice(0, 12) || "JÄGER");

    kasten.append(
      bau("h1", { text: "WHERE SHADOWS CRAWL" }),
      bau("p", { klasse: "matt", text: "Ein Rechner, ein Jäger. Alle anderen kommen über den Lobbycode dazu." }),
      namensfeld,
      bau("div", { klasse: "reihe" }, [
        bau("button", { text: "LOBBY AUFMACHEN", beiClick: () => { merkeName(nameJetzt()); starteWirt(nameJetzt()); } }),
        bau("button", { text: "EINER LOBBY BEITRETEN", beiClick: () => { merkeName(nameJetzt()); zeigeBeitritt(nameJetzt()); } })
      ]),
      bau("button", { text: "ALLEIN SPIELEN", beiClick: () => { verstecke(); beiStart({ saat: wuerfleSaat(), spielerzahl: 1, eigenerPlatz: 0, sitzung: null }); } }),
      baueInstallkasten(),
      meldungsfeld
    );
    zeige();
  }

  /* ── Der Installieren-Knopf ───────────────────────────────────────

     Er steht **unter** den drei Knöpfen, die zum Spielen führen: Wer
     hier ist, will meistens spielen und nicht installieren. Und er ist
     nur da, wenn der Browser die Installation wirklich anbietet — ein
     Knopf, der auf einem Rechner oder in Firefox nichts tut, wäre
     schlimmer als gar keiner (`runtime/installieren.js`). */
  function baueInstallkasten() {
    const knopf = bau("button", {
      id: "installknopf",
      text: "ALS APP INSTALLIEREN",
      beiClick: async () => {
        /* Der Klick **ist** die Nutzergeste, die der Browser verlangt —
           deshalb wird hier nichts vorher abgewartet. */
        const ausgang = await biteInstallieren();
        if (ausgang === "angenommen") return;   /* der Browser übernimmt */
        meldeInLobby(ausgang === "abgelehnt"
          ? "Nicht installiert. Du kannst einfach weiterspielen."
          : "Dein Browser bietet die Installation gerade nicht an.");
      }
    });

    const kastenchen = bau("div", { id: "installkasten" }, [
      knopf,
      bau("p", {
        klasse: "matt",
        text: "Dann liegt das Spiel als Symbol auf dem Startbildschirm und startet ohne Browserleiste, quer und im Vollbild."
      })
    ]);

    const richteAus = (jetzt) => { kastenchen.hidden = !jetzt; };
    richteAus(installierbar());
    /* Die Zusage des Browsers trifft oft erst ein, wenn dieses Bild
       schon steht. Ohne den Horcher bliebe der Knopf bis zum nächsten
       Bildwechsel verborgen. */
    loeseInstallHorcher = beiInstallAenderung(richteAus);

    return kastenchen;
  }

  /* ── Bild 2: beitreten ────────────────────────────────────────── */

  function zeigeBeitritt(name) {
    leere();
    const codefeld = bau("input", {
      id: "lobbycodefeld", maxlength: "8", placeholder: "CODE",
      autocapitalize: "characters", autocomplete: "off", spellcheck: "false"
    });
    const meldungsfeld = bau("div", { id: "lobbymeldung" });
    const knopf = bau("button", { text: "BEITRETEN" });

    const los = () => {
      const gepruef = pruefeCode(codefeld.value);
      if (!gepruef.gut) { meldungsfeld.textContent = gepruef.grund; return; }
      knopf.disabled = true;
      meldungsfeld.textContent = "";
      starteGast(gepruef.code, name);
    };
    knopf.addEventListener("click", los);
    codefeld.addEventListener("keydown", (e) => { if (e.key === "Enter") los(); });

    kasten.append(
      bau("h1", { text: "BEITRETEN" }),
      bau("p", { klasse: "matt", text: "Den Code eintippen, den der Gastgeber vorliest." }),
      codefeld,
      knopf,
      bau("button", { text: "ZURÜCK", beiClick: () => zeigeWahl() }),
      meldungsfeld
    );
    zeige();
    codefeld.focus();
  }

  /* ── Bild 3: warten ───────────────────────────────────────────── */

  function zeigeWarteraum(stand) {
    leere();
    const liste = bau("ul", { id: "lobbyliste" });
    const meldungsfeld = bau("div", { id: "lobbymeldung" });

    const kopf = stand.wirt
      ? [
        bau("h1", { text: "DEIN LOBBYCODE" }),
        bau("div", { id: "lobbycode", text: stand.code }),
        bau("p", { klasse: "matt", text: "Lies ihn deinen Freunden vor. Es gibt keine 0, O, 1, I und L — was du hörst, ist eindeutig." })
      ]
      : [
        bau("h1", { text: "IN DER LOBBY" }),
        bau("div", { id: "lobbycode", text: stand.code }),
        bau("p", { klasse: "matt", text: "Warte, bis der Gastgeber anfängt." })
      ];

    kasten.append(...kopf, liste);

    if (stand.wirt) {
      kasten.append(bau("button", {
        text: "ANFANGEN",
        beiClick: () => { if (sitzung?.starte(wuerfleSaat())) verstecke(); }
      }));
    }
    kasten.append(
      bau("button", { text: "LOBBY VERLASSEN", beiClick: () => { sitzung?.verlasse(); sitzung = null; zeigeWahl(); } }),
      meldungsfeld
    );
    zeige();
    male(stand);
  }

  /* Nur die Liste neu malen. Den ganzen Kasten neu zu bauen, sobald
     jemand kommt, würde dem Wirt den Knopf unter dem Finger wegziehen. */
  function male(stand) {
    const liste = document.getElementById("lobbyliste");
    if (!liste) return;
    while (liste.firstChild) liste.removeChild(liste.firstChild);
    for (const p of stand.plaetze ?? []) {
      const eigen = p.platz === stand.eigenerPlatz;
      liste.appendChild(bau("li", {
        text: `${p.wirt ? "★" : "·"} ${p.name}${eigen ? "  (du)" : ""}`,
        style: eigen ? "color:#e8b661" : ""
      }));
    }
    const frei = MAX_SPIELER - (stand.plaetze?.length ?? 0);
    /* „Plätze", nicht „Platze" — der Umlaut wandert beim Beugen mit.
       Am 05.09.2026 im Browser gesehen. */
    if (frei > 0) liste.appendChild(bau("li", {
      klasse: "matt", text: `noch ${frei} ${frei === 1 ? "Platz" : "Plätze"} frei`
    }));
  }

  function meldeInLobby(text) {
    const feld = document.getElementById("lobbymeldung");
    if (feld) feld.textContent = text;
  }

  /* ── Bild 4: es dauert ────────────────────────────────────────────

     Ein Wartebild **muss** eine Meldungszeile und einen Weg zurück
     haben. Am 05.09.2026 hatte es beides nicht — und weil jede Meldung
     nach `#lobbymeldung` schreibt, fiel jeder Fehler in ein Element,
     das es gerade nicht gab. Der Gast stand dann für immer vor
     „Suche die Lobby …", obwohl die Verbindung längst aufgegeben
     hatte. Ein Wartebild ohne Ausgang ist eine Sackgasse. */
  function zeigeWarten(titel, unterzeile) {
    leere();
    kasten.append(
      bau("h1", { text: titel }),
      bau("p", { klasse: "matt", text: unterzeile }),
      bau("button", { text: "ABBRECHEN", beiClick: () => { sitzung?.verlasse(); sitzung = null; zeigeWahl(); } }),
      bau("div", { id: "lobbymeldung" })
    );
    zeige();
  }

  /* ── Die zwei Wege hinein ─────────────────────────────────────── */

  let eingaengeVonAussen = null;

  async function starteWirt(name) {
    zeigeWarten("LOBBY WIRD AUFGEMACHT", "Einen Augenblick …");
    try {
      sitzung = await eroeffne({
        name,
        beiAenderung: (stand) => {
          if (document.getElementById("lobbycode")) male(stand);
          else zeigeWarteraum(stand);
        },
        beiEingaben: (platz, n) => eingaengeVonAussen?.(platz, n),
        beiStart: (los) => { verstecke(); beiStart({ ...los, sitzung }); },
        beiMeldung: meldeInLobby
      });
    } catch (fehler) {
      zeigeWahl(fehler.message);
    }
  }

  async function starteGast(code, name) {
    zeigeWarten("VERBINDEN", `Suche die Lobby ${code} …`);
    try {
      sitzung = await tritteBei({
        code, name,
        beiAenderung: (stand) => {
          if (document.getElementById("lobbyliste")) male(stand);
          else zeigeWarteraum(stand);
        },
        beiEingaben: (platz, n) => eingaengeVonAussen?.(platz, n),
        beiStart: (los) => { verstecke(); beiStart({ ...los, sitzung }); },
        beiMeldung: meldeInLobby
      });
    } catch (fehler) {
      zeigeWahl(fehler.message);
    }
  }

  /* Die Saat des Laufs. Bewusst hier gewürfelt und nicht im Regelkern:
     `spiel/` würfelt nie selbst (spiel/zufall.mjs). */
  function wuerfleSaat() {
    return (Math.random() * 0xffffffff) >>> 0;
  }

  return {
    zeigeWahl,
    verstecke,
    /* Der Lockstep hängt sich hier ein, um ankommende Eingaben zu
       bekommen — ohne dass die Lobby wüsste, was ein Tick ist. */
    setzeEingangsHorcher(f) { eingaengeVonAussen = f; }
  };
}
