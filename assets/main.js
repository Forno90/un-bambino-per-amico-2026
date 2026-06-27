/* Funzioni condivise del portale */

// Evidenzia la voce di menu attiva in base al file corrente
document.addEventListener("DOMContentLoaded", function () {
  var page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a").forEach(function (a) {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });

  // Toggle menu mobile
  var btn = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.main-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () { nav.classList.toggle("open"); });
  }

  // Countdown alla partenza: 19 luglio 2026
  var cd = document.getElementById("countdown");
  if (cd) {
    var target = new Date("2026-07-19T08:00:00");
    function tick() {
      var diff = target - new Date();
      if (diff <= 0) { cd.innerHTML = '<div class="box"><b>🎉</b><span>Si parte!</span></div>'; return; }
      var g = Math.floor(diff / 86400000);
      var o = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      cd.innerHTML =
        box(g, "Giorni") + box(o, "Ore") + box(m, "Minuti");
    }
    function box(n, l) { return '<div class="box"><b>' + n + '</b><span>' + l + '</span></div>'; }
    tick();
    setInterval(tick, 60000);
  }

  // Modulo "Invia info" — invio all'endpoint Cloudflare /api/contributi
  var form = document.getElementById("contrib-form");
  if (form) {
    var status = document.getElementById("form-status");
    var btn = form.querySelector(".btn-send");
    var btnLabel = btn ? btn.textContent : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "Invio in corso…";
      if (btn) { btn.disabled = true; btn.textContent = "Invio…"; }

      fetch(form.getAttribute("action"), {
        method: "POST",
        body: new FormData(form)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.success) {
            status.className = "form-status ok";
            status.textContent = "✅ Inviato! Grazie, Paolo ha ricevuto le informazioni.";
            form.reset();
          } else {
            status.className = "form-status err";
            status.textContent = "❌ " + ((data && data.message) || "Invio non riuscito. Riprova.");
          }
        })
        .catch(function () {
          status.className = "form-status err";
          status.textContent = "❌ Errore di connessione. Controlla la rete e riprova.";
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        });
    });
  }
});
