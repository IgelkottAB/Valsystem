
"use strict";

const typer = ["Riksdag", "Region", "Kommun"];

function hamtaLista(nyckel) {
  try {
    const data = JSON.parse(localStorage.getItem(nyckel) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let partier = hamtaLista("partier");
let valjare = hamtaLista("valjare");
let roster = hamtaLista("roster");
let vallokalStangd = localStorage.getItem("vallokalStangd") === "true";
let aktuellValjare = null;
let aktuellRost = [];
let resultatKlart = false;

function spara() {
  localStorage.setItem("partier", JSON.stringify(partier));
  localStorage.setItem("valjare", JSON.stringify(valjare));
  localStorage.setItem("roster", JSON.stringify(roster));
  localStorage.setItem("vallokalStangd", String(vallokalStangd));
}

function skydda(text) {
  return String(text ?? "").replace(/[&<>"']/g, tecken => ({
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

  if (!namn) return alert("Skriv partiets namn först!");
  if (vallokalStangd) return alert("Vallokalen är stängd.");

  if (partier.some(p =>
    p.namn.toLowerCase() === namn.toLowerCase() && p.typ === typ
  )) {
    return alert("Partiet finns redan för den valtypen.");
  }

  const id = "P" + Math.random().toString(36).slice(2, 9).toUpperCase();
  partier.push({ id, namn, symbol, typ });

  spara();
  document.getElementById("partinamn").value = "";
  visaPartier();
}

function taBortParti(id) {
  if (vallokalStangd) return alert("Vallokalen är stängd.");
  if (!confirm("Ta bort partiet?")) return;

  partier = partier.filter(p => p.id !== id);
  spara();
  visaPartier();
}

function laggTillValjare() {
  const namn = document.getElementById("valjarnamn").value.trim();
  const kod = document.getElementById("valjarkod").value
    .trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

  if (!namn || !kod) return alert("Fyll i namn och kortkod!");
  if (vallokalStangd) return alert("Vallokalen är stängd.");
  if (valjare.some(v => v.kod === kod)) {
    return alert("Den kortkoden används redan.");
  }

  valjare.push({ namn, kod, rostat: false });

  spara();
  document.getElementById("valjarnamn").value = "";
  document.getElementById("valjarkod").value = "";
  visaPartier();
}

function streckkodHtml(kod) {
  return `<svg class="streckkod-svg"
    data-streckkod="${skydda(kod)}"
    role="img" aria-label="Streckkod"></svg>`;
}

function skapaStreckkoder(rot = document) {
  rot.querySelectorAll("svg[data-streckkod]").forEach(svg => {
    const kod = svg.getAttribute("data-streckkod");

    if (typeof window.JsBarcode !== "function") {
      const text = document.createElement("p");
      text.textContent = "Streckkodskod: " + kod;
      svg.replaceWith(text);
      return;
    }

    try {
      window.JsBarcode(svg, kod, {
        format: "CODE128",
        displayValue: true,
        font: "monospace",
        fontSize: 11,
        textMargin: 2,
        height: 35,
        margin: 3,
        width: 1.5,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch {
      const text = document.createElement("p");
      text.textContent = "Streckkodskod: " + kod;
      svg.replaceWith(text);
    }
  });
}

function visaPartier() {
  const lista = document.getElementById("partilista");

  if (lista) {
    lista.innerHTML = partier.length
      ? partier.map(p => `
        <div class="partikort">
          <div class="partisymbol">${skydda(p.symbol)}</div>
          <strong>${skydda(p.namn)}</strong>
          <p>${skydda(p.typ)}</p>
          <p>Valsedelskod: <strong>${skydda(kodForParti(p))}</strong></p>
          <button type="button"
            onclick="taBortParti('${skydda(p.id)}')">Ta bort</button>
        </div>
      `).join("")
      : "<p>Inga partier tillagda ännu.</p>";
  }

  const valjarlista = document.getElementById("valjarlista");

  if (valjarlista) {
    valjarlista.innerHTML = valjare.length
      ? valjare.map(v => `
        <div class="valjarkort">
          <strong>${skydda(v.namn)}</strong>
          ${streckkodHtml(v.kod)}
          <p>Valkortskod: ${skydda(v.kod)}</p>
          <p>${v.rostat ? "Har röstat" : "Inte röstat"}</p>
          <button type="button"
            onclick="taBortValjare('${skydda(v.kod)}')"
            ${v.rostat ? "disabled" : ""}>Ta bort väljare</button>
        </div>
      `).join("")
      : "<p>Inga väljare skapade ännu.</p>";

    skapaStreckkoder(valjarlista);
  }
}

function taBortValjare(kod) {
  const v = valjare.find(x => x.kod === kod);
  if (!v) return alert("Väljaren hittades inte.");
  if (v.rostat) return alert("Väljaren har redan röstat och kan inte tas bort.");

  if (aktuellValjare && aktuellValjare.kod === kod) {
    return alert("Väljaren håller på att rösta. Avsluta först.");
  }

  if (!confirm(`Ta bort väljaren ${v.namn}?`)) return;

  valjare = valjare.filter(x => x.kod !== kod);
  spara();
  visaPartier();
  uppdateraStatus();
}

/* Utskrift */

function byggUtskrift(kort, antalPerSida, storlek) {
  const yta = document.getElementById("utskriftsyta");
  const meddelande = document.getElementById("utskriftsmeddelande");

  yta.replaceChildren();

  if (kort.length === 0) {
    if (meddelande) meddelande.textContent = "Det finns inget att skriva ut.";
    return false;
  }

  for (let i = 0; i < kort.length; i += antalPerSida) {
    const sida = document.createElement("div");
    sida.className = "utskriftssida " + storlek;
    sida.innerHTML = kort.slice(i, i + antalPerSida).join("");
    yta.appendChild(sida);
  }

  skapaStreckkoder(yta);

  if (meddelande) {
    meddelande.textContent = "Utskriften är förberedd.";
  }

  skrivUt();
  return true;
}

function skrivUtValsedlar() {
  if (partier.length === 0) return alert("Lägg till partier först!");

  const valnamn = document.getElementById("valnamn").value.trim() || "Lekval";
  const kort = [];

  partier.forEach(p => {
    for (let exemplar = 0; exemplar < 2; exemplar++) {
      kort.push(`
        <article class="utskriftskort">
          <p class="varning">LEKVAL – EJ GILTIG VALSEDEL</p>
          <h2>${skydda(valnamn)}</h2>
          <div class="partisymbol">${skydda(p.symbol)}</div>
          <h2>${skydda(p.namn)}</h2>
          <p>${skydda(p.typ)}</p>
          ${streckkodHtml(kodForParti(p))}
          <small>Valsedelns kod · Klipp längs kanten</small>
        </article>
      `);
    }
  });

  byggUtskrift(kort, 2, "a5");
}

function skrivUtValkort() {
  if (valjare.length === 0) return alert("Skapa valkort först!");

  const valnamn = document.getElementById("valnamn").value.trim() || "Lekval";
  const kort = valjare.map(v => `
    <article class="utskriftskort">
      <p class="varning">LEKVAL – VALKORT</p>
      <h2>${skydda(valnamn)}</h2>
      <p>Väljare:</p>
      <h2>${skydda(v.namn)}</h2>
      ${streckkodHtml(v.kod)}
      <small>Visa kortet för valförrättaren</small>
    </article>
  `);

  byggUtskrift(kort, 8, "a7");
}

function skrivUt() {
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}

/* Röstning */

function valjValjare() {
  if (vallokalStangd) {
    document.getElementById("valjarstatus").textContent = "Vallokalen är stängd.";
    return;
  }

  const kod = document.getElementById("skannaValjare").value.trim().toUpperCase();
  const v = valjare.find(x => String(x.kod).toUpperCase() === kod);

  if (!v) {
    aktuellValjare = null;
    aktuellRost = [];
    document.getElementById("valjarstatus").textContent = "Valkortet hittades inte.";
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

  const kod = document.getElementById("skannaValsedel").value.trim().toUpperCase();
  if (!kod) {
    document.getElementById("roststatus").textContent = "Skanna valsedelns streckkod först.";
    return;
  }

  const parti = partier.find(p => kodForParti(p).toUpperCase() === kod);

  if (!parti) {
    document.getElementById("roststatus").textContent =
      "Valsedeln kunde inte hittas. Kontrollera koden.";
    return;
  }

  if (aktuellRost.some(r => r.typ === parti.typ)) {
    document.getElementById("roststatus").textContent =
      "En valsedel för " + parti.typ.toLowerCase() + " har redan skannats.";
    return;
  }

  aktuellRost.push({ typ: parti.typ, partiId: parti.id });
  document.getElementById("skannaValsedel").value = "";

  const saknas = typer.filter(typ => !aktuellRost.some(r => r.typ === typ));

  document.getElementById("roststatus").textContent = saknas.length
    ? "Valsedel registrerad. Återstår: " + saknas.join(", ") + "."
    : "Alla tre valtyper är klara. Tryck på Klart med väljare.";
}

function klarMedValjare() {
  if (!aktuellValjare) return alert("Skanna ett giltigt valkort först.");

  const saknasPartier = typer.filter(typ => !partier.some(p => p.typ === typ));
  if (saknasPartier.length) {
    return alert("Lägg till minst ett parti för varje valtyp: " + saknasPartier.join(", ") + ".");
  }

  const saknasRoster = typer.filter(typ => !aktuellRost.some(r => r.typ === typ));
  if (saknasRoster.length) {
    return alert("Skanna en valsedel för varje valtyp. Återstår: " + saknasRoster.join(", ") + ".");
  }

  aktuellRost.forEach(r => {
    roster.push({
      typ: r.typ,
      partiId: r.partiId
    });
  });

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

/* Vallokalens status och knappar */

function uppdateraStatus() {
  const status = document.getElementById("rostningsstatus");
  const knapp = document.getElementById("raknaKnapp");
  const antal = valjare.filter(v => v.rostat).length;

  if (status) {
    status.textContent =
      `${antal} av ${valjare.length} väljare har röstat. ` +
      (vallokalStangd ? "Vallokalen är stängd." : "Vallokalen är öppen.");
  }

  if (knapp) knapp.disabled = !vallokalStangd;

  const rostningssida = document.getElementById("rostning");
  if (!rostningssida) return;

  let oppnaKnapp = document.getElementById("oppnaVallokalKnapp");

  if (!oppnaKnapp) {
    oppnaKnapp = document.createElement("button");
    oppnaKnapp.id = "oppnaVallokalKnapp";
    oppnaKnapp.type = "button";
    oppnaKnapp.textContent = "Öppna vallokalen igen";
    oppnaKnapp.onclick = oppnaVallokal;
    rostningssida.appendChild(oppnaKnapp);
  }

  oppnaKnapp.style.display = vallokalStangd ? "inline-block" : "none";

  let aterstallKnapp = document.getElementById("aterstallAlltKnapp");

  if (!aterstallKnapp) {
    aterstallKnapp = document.createElement("button");
    aterstallKnapp.id = "aterstallAlltKnapp";
    aterstallKnapp.type = "button";
    aterstallKnapp.textContent = "⚠️ ÅTERSTÄLL ALLT";
    aterstallKnapp.onclick = aterstallAllt;
    rostningssida.appendChild(aterstallKnapp);
  }
}

function stangVallokal() {
  if (vallokalStangd) return alert("Vallokalen är redan stängd.");
  if (!confirm("Är du säker på att stänga vallokalen?")) return;

  vallokalStangd = true;
  aktuellValjare = null;
  aktuellRost = [];

  spara();
  uppdateraStatus();
}

function oppnaVallokal() {
  if (!vallokalStangd) return alert("Vallokalen är redan öppen.");
  if (!confirm("Öppna vallokalen igen? Registrerade röster behålls.")) return;

  vallokalStangd = false;
  aktuellValjare = null;
  aktuellRost = [];
  resultatKlart = false;

  const diagram = document.getElementById("diagram");
  if (diagram) diagram.innerHTML = "";

  spara();
  uppdateraStatus();
}

/* Räkna och visa resultat */

function raknaRoster() {
  if (!vallokalStangd) return alert("Stäng vallokalen innan du räknar rösterna.");

  resultatKlart = true;
  visaResultat();
}

function visaResultat() {
  const diagram = document.getElementById("diagram");
  if (!diagram) return;

  if (!resultatKlart) {
    diagram.innerHTML = "<p>Stäng vallokalen och tryck på RÄKNA RÖSTERNA.</p>";
    return;
  }

  let html = "";

  typer.forEach(typ => {
    const grupper = partier.filter(p => p.typ === typ);
    const antal = grupper.reduce((sum, p) =>
      sum + roster.filter(r => r.typ === typ && r.partiId === p.id).length, 0
    );

    html += `<h3>${skydda(typ)} – ${antal} röster</h3>`;

    grupper.forEach(p => {
      const rost = roster.filter(r => r.typ === typ && r.partiId === p.id).length;
      const procent = antal ? Math.round(rost / antal * 100) : 0;

      html += `
        <div class="resultatrad">
          <strong>${skydda(p.symbol)} ${skydda(p.namn)}: ${rost}</strong>
          <div class="resultatbakgrund">
            <div class="resultatstapel" style="width:${procent}%"></div>
          </div>
          <small>${procent} %</small>
        </div>`;
    });
  });

  diagram.innerHTML = html || "<p>Inga partier finns ännu.</p>";
}

function sparaResultat() {
  if (!vallokalStangd) return alert("Stäng vallokalen först.");

  const resultat = {
    val: document.getElementById("valnamn").value,
    datum: new Date().toLocaleString("sv-SE"),
    markning: "LEKVAL – EJ GILTIGT I ALLMÄNNA VAL",
    antalValjare: valjare.length,
    antalSomRostat: valjare.filter(v => v.rostat).length,
    roster: typer.map(typ => ({
      valtyp: typ,
      partier: partier.filter(p => p.typ === typ).map(p => ({
        parti: p.namn,
        roster: roster.filter(r => r.typ === typ && r.partiId === p.id).length
      }))
    }))
  };

  const fil = new Blob([JSON.stringify(resultat, null, 2)], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(fil);
  const lank = document.createElement("a");
  lank.href = url;
  lank.download = "lekval-resultat.json";
  document.body.appendChild(lank);
  lank.click();
  lank.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* TOTAL ÅTERSTÄLLNING */

function aterstallAllt() {
  if (!confirm(
    "VARNING – ÅTERSTÄLL ALLT?\n\n" +
    "Alla partier, väljare och röster raderas.\n" +
    "Resultaten rensas och vallokalen öppnas igen.\n\n" +
    "Det går inte att ångra. Vill du fortsätta?"
  )) return;

  partier = [];
  valjare = [];
  roster = [];
  vallokalStangd = false;
  aktuellValjare = null;
  aktuellRost = [];
  resultatKlart = false;

  localStorage.removeItem("partier");
  localStorage.removeItem("valjare");
  localStorage.removeItem("roster");
  localStorage.removeItem("vallokalStangd");

  document.getElementById("diagram").innerHTML = "";
  document.getElementById("valjarstatus").textContent = "";
  document.getElementById("roststatus").textContent = "";
  document.getElementById("skannaValjare").value = "";
  document.getElementById("skannaValsedel").value = "";
  document.getElementById("utskriftsyta").innerHTML = "";
  document.getElementById("utskriftsmeddelande").textContent = "";

  document.getElementById("partinamn").value = "";
  document.getElementById("symbol").value = "🌳";
  document.getElementById("valjarnamn").value = "";
  document.getElementById("valjarkod").value = "";
  document.getElementById("valnamn").value = "Höstlovsvalet";

  visaPartier();
  uppdateraStatus();
  visa("partier");

  alert("Allt är återställt. Lekvalet börjar om från början.");
}

/* Starta sidan */

document.addEventListener("DOMContentLoaded", () => {
  visaPartier();
  uppdateraStatus();

  const kortFalt = document.getElementById("skannaValjare");
  const valsedelFalt = document.getElementById("skannaValsedel");

  kortFalt.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      valjValjare();
    }
  });

  valsedelFalt.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      registreraRost();
    }
  });
});
