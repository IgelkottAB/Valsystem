```javascript
let partier = JSON.parse(localStorage.getItem("partier") || "[]");
let valjare = JSON.parse(localStorage.getItem("valjare") || "[]");
let roster = JSON.parse(localStorage.getItem("roster") || "[]");
let vallokalStangd = localStorage.getItem("vallokalStangd") === "true";

let aktuellValjare = null;
let aktuellRost = [];
let resultatKlart = false;

const typer = ["Riksdag", "Region", "Kommun"];

function spara() {
  localStorage.setItem("partier", JSON.stringify(partier));
  localStorage.setItem("valjare", JSON.stringify(valjare));
  localStorage.setItem("roster", JSON.stringify(roster));
  localStorage.setItem("vallokalStangd", String(vallokalStangd));
}

function skydda(text) {
  return String(text).replace(/[&<>"']/g, tecken => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[tecken]);
}

function kodForParti(p) {
  return p.typ.toUpperCase() + "-" + p.id;
}

function visa(id) {
  document.querySelectorAll(".sida").forEach(sida => {
    sida.classList.add("dold");
  });

  const sida = document.getElementById(id);
  if (sida) sida.classList.remove("dold");

  if (id === "partier") visaPartier();
  if (id === "resultat") visaResultat();
  if (id === "rostning") uppdateraStatus();
}

function laggTillParti() {
  const namn = document.getElementById("partinamn").value.trim();
  const symbol = document.getElementById("symbol").value.trim() || "★";
  const typ = document.getElementById("valtyp").value;

  if (!namn) {
    alert("Skriv partiets namn först!");
    return;
  }

  if (vallokalStangd) {
    alert("Vallokalen är stängd.");
    return;
  }

  if (partier.some(p =>
    p.namn.toLowerCase() === namn.toLowerCase() && p.typ === typ
  )) {
    alert("Partiet finns redan för den valtypen.");
    return;
  }

  const id = "P" + Math.random().toString(36).slice(2, 9).toUpperCase();

  partier.push({ id, namn, symbol, typ });
  spara();

  document.getElementById("partinamn").value = "";
  visaPartier();
}

function taBortParti(id) {
  if (vallokalStangd) {
    alert("Vallokalen är stängd.");
    return;
  }

  if (confirm("Ta bort partiet?")) {
    partier = partier.filter(p => p.id !== id);
    spara();
    visaPartier();
  }
}

function laggTillValjare() {
  const namn = document.getElementById("valjarnamn").value.trim();
  const kod = document.getElementById("valjarkod").value.trim()
    .toUpperCase().replace(/[^A-Z0-9-]/g, "");

  if (!namn || !kod) {
    alert("Fyll i namn och kortkod!");
    return;
  }

  if (vallokalStangd) {
    alert("Vallokalen är stängd.");
    return;
  }

  if (valjare.some(v => v.kod === kod)) {
    alert("Den kortkoden används redan.");
    return;
  }

  valjare.push({ namn, kod, rostat: false });
  spara();

  document.getElementById("valjarnamn").value = "";
  document.getElementById("valjarkod").value = "";

  visaPartier();
}

/* SKAPA RIKTIGA CODE 128-STRECKKODER */

function streckkodHtml(kod) {
  return `
    <svg class="streckkod-svg"
         data-streckkod="${skydda(kod)}"
         role="img"
         aria-label="Streckkod ${skydda(kod)}"></svg>
  `;
}

function skapaStreckkoder(rot = document) {
  const element = rot.querySelectorAll("svg[data-streckkod]");

  if (typeof window.JsBarcode !== "function") {
    element.forEach(svg => {
      const text = document.createElement("p");
      text.textContent =
        "Streckkodsbiblioteket kunde inte laddas. Kod: " +
        svg.getAttribute("data-streckkod");
      svg.replaceWith(text);
    });

    return;
  }

  element.forEach(svg => {
    const kod = svg.getAttribute("data-streckkod");

    try {
      window.JsBarcode(svg, kod, {
        format: "CODE128",
        displayValue: true,
        font: "monospace",
        fontSize: 14,
        textMargin: 3,
        height: 48,
        margin: 5,
        width: 2,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (fel) {
      svg.outerHTML =
        `<p>Fel vid skapande av streckkod: ${skydda(kod)}</p>`;
    }
  });
}

function visaPartier() {
  const lista = document.getElementById("partilista");

  if (lista) {
    lista.innerHTML = partier.map(p => `
      <div class="partikort">
        <div class="partisymbol">${skydda(p.symbol)}</div>
        <strong>${skydda(p.namn)}</strong>
        <p>${skydda(p.typ)}</p>
        <button type="button"
          onclick="taBortParti('${skydda(p.id)}')">
          Ta bort
        </button>
      </div>
    `).join("");
  }

  const valjarlista = document.getElementById("valjarlista");

  if (valjarlista) {
    valjarlista.innerHTML = valjare.map(v => `
      <div class="valjarkort">
        <strong>${skydda(v.namn)}</strong>
        ${streckkodHtml(v.kod)}
        <p>${v.rostat ? "Har röstat" : "Inte röstat"}</p>
      </div>
    `).join("");

    skapaStreckkoder(valjarlista);
  }
}

/* SKRIV UT VALSEDLAR */

function skrivUtValsedlar() {
  if (partier.length === 0) {
    alert("Lägg till partier först!");
    return;
  }

  const valnamn =
    document.getElementById("valnamn").value.trim() || "Lekval";

  const yta = document.getElementById("utskriftsyta");

  yta.innerHTML = partier.map(p => `
    <article class="utskriftskort">
      <p class="varning">LEKVAL – EJ OFFICIELL VALSEDEL</p>
      <h2>${skydda(valnamn)}</h2>
      <div class="partisymbol">${skydda(p.symbol)}</div>
      <h2>${skydda(p.namn)}</h2>
      <p>${skydda(p.typ)}</p>
      <p>Klipp ut längs kanten</p>
      ${streckkodHtml(kodForParti(p))}
      <small>Valsedelns kod – lekval</small>
    </article>
  `).join("");

  skapaStreckkoder(yta);
  skrivUt();
}

/* SKRIV UT VALKORT */

function skrivUtValkort() {
  if (valjare.length === 0) {
    alert("Skapa valkort först!");
    return;
  }

  const valnamn =
    document.getElementById("valnamn").value.trim() || "Lekval";

  const yta = document.getElementById("utskriftsyta");

  yta.innerHTML = valjare.map(v => `
    <article class="utskriftskort">
      <p class="varning">LEKVAL – VALKORT</p>
      <h2>${skydda(valnamn)}</h2>
      <p>Väljare:</p>
      <h2>${skydda(v.namn)}</h2>
      ${streckkodHtml(v.kod)}
      <small>Visa kortet för valförrättaren</small>
    </article>
  `).join("");

  skapaStreckkoder(yta);
  skrivUt();
}

function skrivUt() {
  document.body.classList.add("skrivut");
  window.print();

  setTimeout(() => {
    document.body.classList.remove("skrivut");
  }, 1200);
}

/* RÖSTNING */

function valjValjare() {
  if (vallokalStangd) {
    document.getElementById("valjarstatus").textContent =
      "Vallokalen är stängd.";
    return;
  }

  const kod = document.getElementById("skannaValjare")
    .value.trim().toUpperCase();

  const v = valjare.find(x => x.kod.toUpperCase() === kod);

  if (!v) {
    aktuellValjare = null;
    aktuellRost = [];

    document.getElementById("valjarstatus").textContent =
      "Valkortet hittades inte.";
    return;
  }

  if (v.rostat) {
    aktuellValjare = null;
    aktuellRost = [];

    document.getElementById("valjarstatus").textContent =
      "Valkortet är redan registrerat som röstat.";
    return;
  }

  aktuellValjare = v;
  aktuellRost = [];

  document.getElementById("valjarstatus").textContent =
    "Valkort godkänt. Skanna valsedlarna.";

  document.getElementById("skannaValjare").value = "";
  document.getElementById("skannaValsedel").focus();
}

function registreraRost() {
  if (vallokalStangd || !aktuellValjare) {
    document.getElementById("roststatus").textContent =
      "Skanna ett giltigt valkort först.";
    return;
  }

  const kod = document.getElementById("skannaValsedel")
    .value.trim().toUpperCase();

  const parti = partier.find(p =>
    kodForParti(p).toUpperCase() === kod
  );

  if (!parti) {
    document.getElementById("roststatus").textContent =
      "Valsedeln kunde inte hittas.";
    return;
  }

  if (aktuellRost.some(r => r.typ === parti.typ)) {
    document.getElementById("roststatus").textContent =
      "En valsedel för " + parti.typ.toLowerCase() +
      " har redan skannats.";
    return;
  }

  aktuellRost.push({
    typ: parti.typ,
    partiId: parti.id
  });

  document.getElementById("skannaValsedel").value = "";

  const saknas = typer.filter(typ =>
    !aktuellRost.some(r => r.typ === typ)
  );

  document.getElementById("roststatus").textContent =
    saknas.length
      ? "Valsedel registrerad. Återstår: " + saknas.join(", ") + "."
      : "Alla tre valtyper är klara. Tryck på Klar med väljare.";
}

function klarMedValjare() {
  if (!aktuellValjare) {
    alert("Skanna ett giltigt valkort först.");
    return;
  }

  const saknasPartier = typer.filter(typ =>
    !partier.some(p => p.typ === typ)
  );

  if (saknasPartier.length > 0) {
    alert(
      "Lägg till minst ett parti för varje valtyp: " +
      saknasPartier.join(", ") + "."
    );
    return;
  }

  const saknasRoster = typer.filter(typ =>
    !aktuellRost.some(r => r.typ === typ)
  );

  if (saknasRoster.length > 0) {
    alert(
      "Skanna en valsedel för varje valtyp. Återstår: " +
      saknasRoster.join(", ") + "."
    );
    return;
  }

  roster.push(...aktuellRost);
  aktuellValjare.rostat = true;

  aktuellValjare = null;
  aktuellRost = [];

  spara();
  uppdateraStatus();
  visaPartier();

  document.getElementById("valjarstatus").textContent =
    "Klart. Nästa väljare kan komma fram.";

  document.getElementById("roststatus").textContent = "";
  document.getElementById("skannaValjare").focus();
}

/* VALLokalens STATUS */

function uppdateraStatus() {
  const status = document.getElementById("rostningsstatus");
  const knapp = document.getElementById("raknaKnapp");

  const antal = valjare.filter(v => v.rostat).length;

  if (status) {
    status.textContent =
      `${antal} av ${valjare.length} väljare har röstat. ` +
      (vallokalStangd
        ? "Vallokalen är stängd."
        : "Vallokalen är öppen.");
  }

  if (knapp) {
    knapp.disabled = !vallokalStangd;
  }
}

function stangVallokal() {
  if (confirm("Är du säker på att stänga vallokalen?")) {
    vallokalStangd = true;
    aktuellValjare = null;
    aktuellRost = [];

    spara();
    uppdateraStatus();
  }
}

/* RÖSTRÄKNING */

function raknaRoster() {
  if (!vallokalStangd) {
    alert("Stäng vallokalen innan du räknar rösterna.");
    return;
  }

  resultatKlart = true;
  visaResultat();
}

function visaResultat() {
  if (!resultatKlart) return;

  const diagram = document.getElementById("diagram");
  if (!diagram) return;

  let html = "";

  typer.forEach(typ => {
    const grupper = partier.filter(p => p.typ === typ);

    const antal = grupper.reduce((sum, p) => {
      return sum + roster.filter(r =>
        r.typ === typ && r.partiId === p.id
      ).length;
    }, 0);

    html += `<h3>${skydda(typ)} – ${antal} röster</h3>`;

    grupper.forEach(p => {
      const rost = roster.filter(r =>
        r.typ === typ && r.partiId === p.id
      ).length;

      const procent = antal
        ? Math.round(rost / antal * 100)
        : 0;

      html += `
        <div class="resultatrad">
          <strong>${skydda(p.symbol)} ${skydda(p.namn)}: ${rost}</strong>
          <div class="resultatbakgrund">
            <div class="resultatstapel"
              style="width:${procent}%"></div>
          </div>
          <small>${procent} %</small>
        </div>
      `;
    });
  });

  diagram.innerHTML = html;
}

/* SPARA RESULTAT TILL JSON-FIL */

function sparaResultat() {
  if (!vallokalStangd) {
    alert("Stäng vallokalen först.");
    return;
  }

  const resultat = {
    val: document.getElementById("valnamn").value,
    datum: new Date().toLocaleString("sv-SE"),
    markning: "LEKVAL – EJ GILTIGT I ALLMÄNNA VAL",
    antalValjare: valjare.length,
    antalSomRostat: valjare.filter(v => v.rostat).length,

    roster: typer.map(typ => ({
      valtyp: typ,
      partier: partier
        .filter(p => p.typ === typ)
        .map(p => ({
          parti: p.namn,
          roster: roster.filter(r =>
            r.typ === typ && r.partiId === p.id
          ).length
        }))
    }))
  };

  const fil = new Blob(
    [JSON.stringify(resultat, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  const url = URL.createObjectURL(fil);
  const lank = document.createElement("a");

  lank.href = url;
  lank.download = "lekval-resultat.json";

  document.body.appendChild(lank);
  lank.click();
  lank.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  visaPartier();
  uppdateraStatus();
});
```
