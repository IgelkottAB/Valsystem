// ======================================================
// IGELKOTTS VALSYSTEM
// LEKVAL – EJ GILTIGT I ALLMÄNNA VAL
// ======================================================

const PARTIER_KEY = "partier";
const VALJARE_KEY = "valjare";
const ROSTER_KEY = "roster";
const VALLokal_KEY = "vallokalStangd";

// ------------------------------------------------------
// DATA
// ------------------------------------------------------

let partier = JSON.parse(localStorage.getItem(PARTIER_KEY) || "[]");
let valjare = JSON.parse(localStorage.getItem(VALJARE_KEY) || "[]");
let roster = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]");
let vallokalStangd =
  localStorage.getItem(VALLokal_KEY) === "true";

let aktuellValjare = null;
let aktuellRost = [];
let resultatKlart = false;


// ------------------------------------------------------
// SPARA
// ------------------------------------------------------

function spara() {
  localStorage.setItem(PARTIER_KEY, JSON.stringify(partier));
  localStorage.setItem(VALJARE_KEY, JSON.stringify(valjare));
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  localStorage.setItem(VALLokal_KEY, vallokalStangd);
}


// ------------------------------------------------------
// SKYDDA TEXT
// ------------------------------------------------------

function skydda(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ------------------------------------------------------
// VISA SEKTION
// ------------------------------------------------------

function visa(id) {
  document.querySelectorAll(".sektion").forEach(sektion => {
    sektion.style.display = "none";
  });

  const vald = document.getElementById(id);

  if (vald) {
    vald.style.display = "block";
  }

  if (id === "partier") {
    visaPartier();
  }

  if (id === "utskrift") {
    visaUtskrift();
  }

  if (id === "rostning") {
    uppdateraStatus();
  }

  if (id === "resultat") {
    visaResultat();
  }
}


// ------------------------------------------------------
// PARTIER
// ------------------------------------------------------

function laggTillParti() {
  const namnInput = document.getElementById("partinamn");
  const symbolInput = document.getElementById("symbol");
  const valtypInput = document.getElementById("valtyp");

  const namn = namnInput?.value.trim();
  const symbol = symbolInput?.value.trim();
  const valtyp = valtypInput?.value;

  if (!namn) {
    alert("Skriv ett partinamn.");
    return;
  }

  if (!valtyp) {
    alert("Välj vilken typ av val partiet ska delta i.");
    return;
  }

  partier.push({
    id: Date.now(),
    namn: namn,
    symbol: symbol || "",
    valtyp: valtyp
  });

  spara();

  namnInput.value = "";
  symbolInput.value = "";

  visaPartier();
}


// ------------------------------------------------------
// TA BORT PARTI
// ------------------------------------------------------

function taBortParti(id) {
  const parti = partier.find(p => p.id === id);

  if (!parti) {
    return;
  }

  if (
    !confirm(
      `Ta bort partiet "${parti.namn}"?\n\nDetta tar bort partiet från lekvalet.`
    )
  ) {
    return;
  }

  partier = partier.filter(p => p.id !== id);

  spara();
  visaPartier();
}


// ------------------------------------------------------
// VISA PARTIER OCH VÄLJARE
// ------------------------------------------------------

function visaPartier() {
  const container = document.getElementById("partilista");

  if (container) {
    if (partier.length === 0) {
      container.innerHTML = "<p>Inga partier tillagda ännu.</p>";
    } else {
      container.innerHTML = partier
        .map(
          p => `
            <div class="parti">
              <strong>${skydda(p.symbol)} ${skydda(p.namn)}</strong>
              <span> – ${skydda(p.valtyp)}</span>
              <button
                type="button"
                onclick="taBortParti(${p.id})">
                Ta bort
              </button>
            </div>
          `
        )
        .join("");
    }
  }

  const valjarlista = document.getElementById("valjarlista");

  if (valjarlista) {
    if (valjare.length === 0) {
      valjarlista.innerHTML = "<p>Inga väljare registrerade ännu.</p>";
    } else {
      valjarlista.innerHTML = valjare
        .map(
          v => `
            <div class="valjare">
              <strong>${skydda(v.namn)}</strong><br>
              Lånekod/valjarkod:
              <strong>${skydda(v.kod)}</strong><br>
              Status:
              ${v.rostat ? "✅ Har röstat" : "🕐 Har inte röstat"}
              <br>

              <button
                type="button"
                onclick="taBortValjare('${skydda(v.kod)}')"
                ${v.rostat ? "disabled" : ""}>
                Ta bort väljare
              </button>
            </div>
          `
        )
        .join("");
    }
  }
}


// ------------------------------------------------------
// LÄGG TILL VÄLJARE
// ------------------------------------------------------

function laggTillValjare() {
  const namnInput = document.getElementById("valjarnamn");
  const kodInput = document.getElementById("valjarkod");

  const namn = namnInput?.value.trim();
  const kod = kodInput?.value.trim();

  if (!namn) {
    alert("Skriv väljarnas namn.");
    return;
  }

  if (!kod) {
    alert("Skriv eller skanna en valjarkod.");
    return;
  }

  if (valjare.some(v => v.kod === kod)) {
    alert("Den valjarkoden finns redan.");
    return;
  }

  valjare.push({
    id: Date.now(),
    namn: namn,
    kod: kod,
    rostat: false
  });

  spara();

  namnInput.value = "";
  kodInput.value = "";

  visaPartier();

  const status = document.getElementById("valjarstatus");

  if (status) {
    status.textContent =
      `Väljaren ${namn} är registrerad.`;
  }
}


// ------------------------------------------------------
// TA BORT VÄLJARE
// ------------------------------------------------------

function taBortValjare(kod) {
  const valjareIndex = valjare.findIndex(v => v.kod === kod);

  if (valjareIndex === -1) {
    alert("Väljaren hittades inte.");
    return;
  }

  const v = valjare[valjareIndex];

  if (v.rostat) {
    alert(
      "Den här väljaren har redan röstat och kan därför inte tas bort."
    );
    return;
  }

  if (aktuellValjare && aktuellValjare.kod === kod) {
    alert(
      "Den här väljaren håller på att rösta och kan inte tas bort just nu."
    );
    return;
  }

  if (
    !confirm(
      `Ta bort väljaren "${v.namn}"?\n\nDet går inte att ångra.`
    )
  ) {
    return;
  }

  valjare.splice(valjareIndex, 1);

  spara();
  visaPartier();

  const status = document.getElementById("valjarstatus");

  if (status) {
    status.textContent =
      `Väljaren ${v.namn} har tagits bort.`;
  }
}


// ------------------------------------------------------
// STRECKKOD – VÄLJARE
// ------------------------------------------------------

function skannaValjare() {
  const input = document.getElementById("valjarkod");

  if (!input) {
    return;
  }

  input.focus();
}


// ------------------------------------------------------
// STRECKKOD – VALSEDEL
// ------------------------------------------------------

function skannaValsedel() {
  const input = document.getElementById("valsedel");

  if (!input) {
    return;
  }

  input.focus();
}


// ------------------------------------------------------
// UTSKRIFT
// ------------------------------------------------------

function visaUtskrift() {
  const meddelande =
    document.getElementById("utskriftsmeddelande");

  if (meddelande) {
    meddelande.textContent =
      "Välj vad du vill skriva ut.";
  }
}


// ------------------------------------------------------
// BYGG UTSKRIFT
// ------------------------------------------------------

function byggUtskrift(kort, perSida, klass) {
  const utskriftsyta =
    document.getElementById("utskriftsyta");

  if (!utskriftsyta) {
    return;
  }

  utskriftsyta.innerHTML = "";

  for (let i = 0; i < kort.length; i += perSida) {
    const sida = document.createElement("div");

    sida.className = `utskriftssida ${klass}`;

    const grupp = kort.slice(i, i + perSida);

    grupp.forEach(item => {
      const kortElement = document.createElement("div");

      kortElement.className = "utskriftskort";

      kortElement.innerHTML = item;

      sida.appendChild(kortElement);
    });

    utskriftsyta.appendChild(sida);
  }
}


// ------------------------------------------------------
// SKRIV UT VALSEDLAR
// ------------------------------------------------------

function skrivUtValsedlar() {
  const typer = [
    "Riksdag",
    "Region",
    "Kommun"
  ];

  const kort = [];

  typer.forEach(typ => {
    const partierForTyp =
      partier.filter(p => p.valtyp === typ);

    partierForTyp.forEach(p => {
      kort.push(`
        <div class="valsedel">
          <h2>LEKVAL</h2>
          <h3>${skydda(typ)}</h3>

          <div class="valsedel-parti">
            ${skydda(p.symbol)}
            ${skydda(p.namn)}
          </div>

          <p>Markera ditt val.</p>

          <div class="ruta"></div>

          <small>
            EJ GILTIGT I ALLMÄNNA VAL
          </small>
        </div>
      `);
    });
  });

  if (kort.length === 0) {
    alert("Det finns inga partier att skriva ut.");
    return;
  }

  byggUtskrift(kort, 2, "a5");

  window.print();
}


// ------------------------------------------------------
// SKRIV UT VALKORT
// ------------------------------------------------------

function skrivUtValkort() {
  const kort = valjare.map(v => `
    <div class="valkort">
      <h2>LEKVAL</h2>

      <h3>VALKORT</h3>

      <p>
        Namn:
        <strong>${skydda(v.namn)}</strong>
      </p>

      <p>
        Kod:
        <strong>${skydda(v.kod)}</strong>
      </p>

      <div class="streckkod">
        <svg
          class="barcode"
          data-kod="${skydda(v.kod)}">
        </svg>
      </div>

      <small>
        EJ GILTIGT I ALLMÄNNA VAL
      </small>
    </div>
  `);

  if (kort.length === 0) {
    alert("Det finns inga väljare att skriva ut.");
    return;
  }

  byggUtskrift(kort, 8, "a7");

  if (typeof JsBarcode !== "undefined") {
    document
      .querySelectorAll(".barcode")
      .forEach(svg => {
        const kod = svg.dataset.kod;

        try {
          JsBarcode(svg, kod, {
            format: "CODE128",
            displayValue: true,
            width: 1.5,
            height: 40
          });
        } catch (fel) {
          console.error(
            "Kunde inte skapa streckkod:",
            fel
          );
        }
      });
  }

  window.print();
}


// ------------------------------------------------------
// KONTROLLERA OM ALLA VALTYPER HAR PARTIER
// ------------------------------------------------------

function allaValtyperHarPartier() {
  const typer = [
    "Riksdag",
    "Region",
    "Kommun"
  ];

  return typer.every(typ =>
    partier.some(p => p.valtyp === typ)
  );
}


// ------------------------------------------------------
// STARTA RÖSTNING
// ------------------------------------------------------

function startaRostning() {
  if (vallokalStangd) {
    alert("Vallokalen är stängd.");
    return;
  }

  if (!allaValtyperHarPartier()) {
    alert(
      "Det måste finnas minst ett parti för Riksdag, Region och Kommun."
    );
    return;
  }

  const kodInput =
    document.getElementById("skannaValjare");

  const kod =
    kodInput?.value.trim();

  if (!kod) {
    alert("Skanna eller skriv väljarkoden.");
    return;
  }

  const v =
    valjare.find(x => x.kod === kod);

  if (!v) {
    alert("Väljaren hittades inte.");
    return;
  }

  if (v.rostat) {
    alert("Den här väljaren har redan röstat.");
    return;
  }

  aktuellValjare = v;
  aktuellRost = [];

  const status =
    document.getElementById("roststatus");

  if (status) {
    status.textContent =
      `Väljare: ${v.namn}. Skanna valsedlarna.`;
  }

  visaRostningsVal();
}


// ------------------------------------------------------
// VISA RÖSTNINGSVAL
// ------------------------------------------------------

function visaRostningsVal() {
  const container =
    document.getElementById("rostningsalternativ");

  if (!container) {
    return;
  }

  const typer = [
    "Riksdag",
    "Region",
    "Kommun"
  ];

  container.innerHTML = typer
    .map(
      typ => `
        <div class="rostningsgrupp">
          <h3>${typ}</h3>

          <select
            onchange="valjParti('${typ}', this.value)">
            <option value="">
              Välj parti
            </option>

            ${partier
              .filter(p => p.valtyp === typ)
              .map(
                p => `
                  <option value="${p.id}">
                    ${skydda(p.symbol)}
                    ${skydda(p.namn)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      `
    )
    .join("");
}


// ------------------------------------------------------
// VÄLJ PARTI
// ------------------------------------------------------

function valjParti(typ, partiId) {
  if (!partiId) {
    aktuellRost =
      aktuellRost.filter(r => r.typ !== typ);

    uppdateraRostStatus();
    return;
  }

  const parti =
    partier.find(p => String(p.id) === String(partiId));

  if (!parti) {
    return;
  }

  aktuellRost =
    aktuellRost.filter(r => r.typ !== typ);

  aktuellRost.push({
    typ: typ,
    partiId: parti.id,
    partiNamn: parti.namn
  });

  uppdateraRostStatus();
}


// ------------------------------------------------------
// UPPDATERA RÖSTSTATUS
// ------------------------------------------------------

function uppdateraRostStatus() {
  const status =
    document.getElementById("roststatus");

  if (!status) {
    return;
  }

  const antal =
    aktuellRost.length;

  status.textContent =
    `Val gjorda: ${antal} av 3.`;

  const knapp =
    document.getElementById("klarMedValjare");

  if (knapp) {
    knapp.disabled =
      antal !== 3;
  }
}


// ------------------------------------------------------
// KLAR MED VÄLJARE
// ------------------------------------------------------

function klarMedValjare() {
  if (!aktuellValjare) {
    alert("Ingen väljare är aktiv.");
    return;
  }

  if (aktuellRost.length !== 3) {
    alert(
      "Välj ett parti för Riksdag, Region och Kommun."
    );
    return;
  }

  const tid =
    new Date().toISOString();

  aktuellRost.forEach(r => {
    roster.push({
      id: Date.now() + Math.random(),
      valjareId: aktuellValjare.id,
      valjareKod: aktuellValjare.kod,
      valjareNamn: aktuellValjare.namn,
      typ: r.typ,
      partiId: r.partiId,
      partiNamn: r.partiNamn,
      tid: tid
    });
  });

  aktuellValjare.rostat = true;

  spara();

  const namn =
    aktuellValjare.namn;

  aktuellValjare = null;
  aktuellRost = [];

  const status =
    document.getElementById("roststatus");

  if (status) {
    status.textContent =
      `${namn} har röstat klart.`;
  }

  const input =
    document.getElementById("skannaValjare");

  if (input) {
    input.value = "";
  }

  const container =
    document.getElementById("rostningsalternativ");

  if (container) {
    container.innerHTML = "";
  }

  uppdateraStatus();
  visaPartier();
}


// ------------------------------------------------------
// STÄNG VALLOKAL
// ------------------------------------------------------

function stangVallokal() {
  if (vallokalStangd) {
    alert("Vallokalen är redan stängd.");
    return;
  }

  if (
    !confirm(
      "Stäng vallokalen?\n\n" +
      "Ingen ny väljare kan rösta förrän vallokalen öppnas igen."
    )
  ) {
    return;
  }

  vallokalStangd = true;

  aktuellValjare = null;
  aktuellRost = [];

  spara();

  uppdateraStatus();
}


// ------------------------------------------------------
// ÖPPNA VALLOKAL IGEN
// ------------------------------------------------------

function oppnaVallokal() {
  if (!vallokalStangd) {
    alert("Vallokalen är redan öppen.");
    return;
  }

  if (
    !confirm(
      "Öppna vallokalen igen?\n\n" +
      "Redan registrerade röster behålls."
    )
  ) {
    return;
  }

  vallokalStangd = false;
  resultatKlart = false;

  aktuellValjare = null;
  aktuellRost = [];

  const diagram =
    document.getElementById("diagram");

  if (diagram) {
    diagram.innerHTML = "";
  }

  spara();
  uppdateraStatus();

  const status =
    document.getElementById("rostningsstatus");

  if (status) {
    status.textContent =
      "Vallokalen är öppen igen.";
  }
}


// ------------------------------------------------------
// STATUS
// ------------------------------------------------------

function uppdateraStatus() {
  const status =
    document.getElementById("rostningsstatus");

  if (status) {
    if (vallokalStangd) {
      status.textContent =
        "🔴 Vallokalen är stängd.";
    } else {
      status.textContent =
        "🟢 Vallokalen är öppen.";
    }
  }

  let oppnaKnapp =
    document.getElementById("oppnaVallokalKnapp");

  const sida =
    document.getElementById("rostning");

  if (sida) {
    if (!oppnaKnapp) {
      oppnaKnapp =
        document.createElement("button");

      oppnaKnapp.id =
        "oppnaVallokalKnapp";

      oppnaKnapp.type =
        "button";

      oppnaKnapp.textContent =
        "Öppna vallokalen igen";

      oppnaKnapp.onclick =
        oppnaVallokal;

      sida.appendChild(oppnaKnapp);
    }

    oppnaKnapp.style.display =
      vallokalStangd ? "inline-block" : "none";
  }

  // ----------------------------------------------------
  // ÅTERSTÄLL ALLT-KNAPP
  // ----------------------------------------------------

  let aterstallKnapp =
    document.getElementById("aterstallAlltKnapp");

  if (sida) {
    if (!aterstallKnapp) {
      aterstallKnapp =
        document.createElement("button");

      aterstallKnapp.id =
        "aterstallAlltKnapp";

      aterstallKnapp.type =
        "button";

      aterstallKnapp.textContent =
        "⚠️ Återställ ALLT";

      aterstallKnapp.onclick =
        aterstallAllt;

      sida.appendChild(aterstallKnapp);
    }

    aterstallKnapp.style.display =
      "inline-block";
  }
}


// ------------------------------------------------------
// ÅTERSTÄLL ALLT
// ------------------------------------------------------

function aterstallAllt() {
  const godkann =
    confirm(
      "⚠️ VARNING – ÅTERSTÄLL ALLT ⚠️\n\n" +

      "Detta kommer att radera ALLT i lekvalet:\n\n" +

      "• Alla partier\n" +
      "• Alla väljare\n" +
      "• Alla röster\n" +
      "• Alla resultat\n" +
      "• Vallokalens status\n" +
      "• Alla sparade valuppgifter\n\n" +

      "Det går INTE att ångra.\n\n" +

      "Vill du verkligen radera ALLT?"
    );

  if (!godkann) {
    return;
  }

  // Radera ALLA kända uppgifter.
  localStorage.removeItem(PARTIER_KEY);
  localStorage.removeItem(VALJARE_KEY);
  localStorage.removeItem(ROSTER_KEY);
  localStorage.removeItem(VALLokal_KEY);

  // Töm även aktuella variabler.
  partier = [];
  valjare = [];
  roster = [];

  vallokalStangd = false;

  aktuellValjare = null;
  aktuellRost = [];

  resultatKlart = false;

  // Töm diagram.
  const diagram =
    document.getElementById("diagram");

  if (diagram) {
    diagram.innerHTML = "";
  }

  // Töm utskriftsområde.
  const utskrift =
    document.getElementById("utskriftsyta");

  if (utskrift) {
    utskrift.innerHTML = "";
  }

  // Töm röstningsalternativ.
  const rostningsalternativ =
    document.getElementById("rostningsalternativ");

  if (rostningsalternativ) {
    rostningsalternativ.innerHTML = "";
  }

  // Töm eventuella formulärfält.
  [
    "partinamn",
    "symbol",
    "valjarnamn",
    "valjarkod",
    "skannaValjare",
    "skannaValsedel"
  ].forEach(id => {
    const input =
      document.getElementById(id);

    if (input) {
      input.value = "";
    }
  });

  alert(
    "✅ ALLT har återställts!\n\n" +
    "Lekvalet är nu helt tomt och redo att börja om."
  );

  // Ladda om sidan för att garantera
  // att allt börjar från noll.
  location.reload();
}


// ------------------------------------------------------
// RESULTAT
// ------------------------------------------------------

function visaResultat() {
  const diagram =
    document.getElementById("diagram");

  if (!diagram) {
    return;
  }

  if (roster.length === 0) {
    diagram.innerHTML =
      "<p>Det finns inga röster ännu.</p>";
    return;
  }

  const typer = [
    "Riksdag",
    "Region",
    "Kommun"
  ];

  diagram.innerHTML = "";

  typer.forEach(typ => {
    const rosterForTyp =
      roster.filter(r => r.typ === typ);

    const rubrik =
      document.createElement("h3");

    rubrik.textContent =
      typ;

    diagram.appendChild(rubrik);

    const resultat = {};

    rosterForTyp.forEach(r => {
      if (!resultat[r.partiNamn]) {
        resultat[r.partiNamn] = 0;
      }

      resultat[r.partiNamn]++;
    });

    const lista =
      document.createElement("div");

    Object.entries(resultat)
      .sort((a, b) => b[1] - a[1])
      .forEach(([namn, antal]) => {
        const rad =
          document.createElement("div");

        const procent =
          rosterForTyp.length > 0
            ? Math.round(
                (antal / rosterForTyp.length) * 100
              )
            : 0;

        rad.innerHTML = `
          <strong>${skydda(namn)}</strong>
          – ${antal} röster (${procent}%)
          <div
            style="
              width:${procent}%;
              min-height:20px;
              margin:4px 0 10px;
              background:currentColor;
            ">
          </div>
        `;

        lista.appendChild(rad);
      });

    diagram.appendChild(lista);
  });
}


// ------------------------------------------------------
// EXPORTERA RESULTAT
// ------------------------------------------------------

function exporteraResultat() {
  const data = {
    information:
      "Igelkotts Valsystem – LEKVAL – EJ GILTIGT I ALLMÄNNA VAL",

    datum:
      new Date().toISOString(),

    partier:
      partier,

    valjare:
      valjare,

    roster:
      roster
  };

  const json =
    JSON.stringify(data, null, 2);

  const blob =
    new Blob(
      [json],
      { type: "application/json" }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "igelkotts-valsystem-resultat.json";

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {
    visaPartier();
    uppdateraStatus();
  }
);
