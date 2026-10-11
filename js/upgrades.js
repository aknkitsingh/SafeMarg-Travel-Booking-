/* SafeMarg upgrades: booking email, real pay QR, thank-you card. Add-on file. */
(function () {
  var C = window.SM_CONFIG || {}, $ = function (id) { return document.getElementById(id); };
  var txt = function (id) { var e = $(id); return e ? e.textContent.trim() : ""; };

  /* 1. Past dates band */
  document.addEventListener("DOMContentLoaded", function () {
    var d = $("departDate");
    if (d) d.min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  });

  /* 2. Scan & pay QR: apni image, warna amount wala UPI QR */
  function renderPayQr() {
    var box = $("upiQr"); if (!box) return;
    var amt = txt("paySumTotal").replace(/[^\d]/g, "") || "0";
    var line = $("smPayAmt");
    if (!line) { line = document.createElement("div"); line.id = "smPayAmt"; line.className = "sm-payamt"; box.parentNode.insertBefore(line, box.nextSibling); }
    line.textContent = "Pay ₹" + Number(amt).toLocaleString("en-IN");
    function dynamic() {
      if (!C.UPI_ID || !window.QRCode) return;
      box.innerHTML = "";
      new QRCode(box, { text: "upi://pay?pa=" + C.UPI_ID + "&pn=" + encodeURIComponent(C.PAYEE_NAME || "SafeMarg") + "&am=" + amt + "&cu=INR&tn=SafeMarg%20booking", width: 170, height: 170 });
    }
    if (C.PAY_QR_IMAGE) {
      var img = new Image(); img.alt = "Scan to pay"; img.className = "sm-payqr";
      img.onload = function () { box.innerHTML = ""; box.appendChild(img); };
      img.onerror = dynamic; img.src = C.PAY_QR_IMAGE;
    } else dynamic();
  }
  var origPay = window.setPayMethod;
  window.setPayMethod = function (m) { origPay(m); if (m === "upi") renderPayQr(); };
  var origPromo = window.applyPromo;
  window.applyPromo = function () { origPromo(); var u = $("upiMethod"); if (u && u.style.display !== "none") renderPayQr(); };

  /* 3. Thank-you card with owner photo */
  function thankCard() {
    if ($("smThanks")) $("smThanks").remove();
    var t = document.querySelector("#view-confirm .eticket"); if (!t) return;
    var first = (txt("etName") || "Traveller").split(" ")[0];
    var c = document.createElement("div"); c.id = "smThanks"; c.className = "sm-thanks";
    var av = document.createElement("div"); av.className = "sm-avatar";
    var img = new Image(); img.alt = C.OWNER_NAME || "SafeMarg";
    img.onerror = function () { av.textContent = (C.OWNER_NAME || "S").charAt(0); };
    img.src = C.OWNER_PHOTO || ""; av.appendChild(img);
    var m = document.createElement("div");
    var h = document.createElement("b"); h.textContent = "Thank you, " + first + "! 🎉";
    var p = document.createElement("p"); p.textContent = "Your booking is confirmed. Safe travels! — " + (C.OWNER_NAME || "Team SafeMarg");
    m.appendChild(h); m.appendChild(p); c.appendChild(av); c.appendChild(m);
    t.parentNode.insertBefore(c, t);
  }

  /* 4. Booking notification to Gmail (FormSubmit, no backend) */
  var sent = {};
  function notify() {
    var pnr = txt("pnrOut"), st = $("smMailStatus");
    if (!pnr || sent[pnr]) return; sent[pnr] = 1;
    if (!C.NOTIFY_EMAIL) { if (st) st.textContent = ""; return; }
    var f = function (id) { var e = $(id); return e ? e.value : ""; };
    var data = {
      _subject: "New SafeMarg booking " + pnr, _template: "table", _captcha: "false",
      PNR: pnr, Passenger: txt("etName"), Phone: f("paxPhone"), Email: f("paxEmail"),
      Mode: txt("etModeOut"), Route: txt("etRoute"), Seat: txt("etSeat"),
      Departs: txt("etDepart"), Amount: txt("etAmount"), Time: new Date().toLocaleString("en-IN")
    };
    fetch("https://formsubmit.co/ajax/" + encodeURIComponent(C.NOTIFY_EMAIL), {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (st) st.textContent = String(j.success) === "true" ? "✓ Booking details sent to the SafeMarg team" : "Ticket ready (notification email could not be sent)";
    }).catch(function () { if (st) st.textContent = "Ticket ready (notification email could not be sent)"; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var v = $("view-confirm"); if (!v) return;
    new MutationObserver(function () {
      if (v.classList.contains("active")) setTimeout(function () { thankCard(); notify(); }, 350);
    }).observe(v, { attributes: true, attributeFilter: ["class"] });
  });
})();

/* ---------- Pro polish: live route, popular routes, filter, confetti, dark memory, demo autofill ---------- */
(function () {
  var C = window.SM_CONFIG || {}, $ = function (id) { return document.getElementById(id); };
  function curMode() { var t = document.querySelector(".mode-tab.active"); return t ? t.dataset.mode : "flight"; }

  /* live route label on the search card */
  function updRoute() {
    var f = $("fromCity"), t = $("toCity"), l = $("routeLabel");
    if (f && t && l && f.value && t.value) window.updateRouteLabel(f.value, t.value, curMode());
  }

  /* popular routes */
  var ROUTES = [["New Delhi", "Mumbai"], ["Ludhiana", "Chandigarh"], ["Amritsar", "New Delhi"], ["Bengaluru", "Goa"], ["Jaipur", "Udaipur"], ["Kolkata", "Patna"]];
  function pick(sel, name) {
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.indexOf(name) === 0) { sel.selectedIndex = i; return; }
  }
  function chips() {
    var box = $("smChips"); if (!box) return;
    ROUTES.forEach(function (r) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sm-chip"; b.textContent = r[0] + " → " + r[1];
      b.onclick = function () {
        var ic = $("intlCheck"); if (ic && ic.checked) { ic.checked = false; window.toggleIntl(); }
        var f = $("fromCity"), t = $("toCity"); pick(f, r[0]); pick(t, r[1]);
        f.dispatchEvent(new Event("change", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true }));
        updRoute(); window.scrollTo({ top: 0, behavior: "smooth" });
      };
      box.appendChild(b);
    });
  }

  /* results filter: Safety 90+ and result count */
  function applyFilter() {
    var list = $("flightList"), cb = $("smSafe90"); if (!list || !cb) return;
    var shown = 0, cards = list.children;
    Array.prototype.forEach.call(cards, function (c) {
      var m = /Safety\s+(\d+)/.exec(c.textContent), ok = !cb.checked || (m && +m[1] >= 90);
      c.style.display = ok ? "" : "none"; if (ok) shown++;
    });
    var n = $("smCount"); if (n) n.textContent = "Showing " + shown + " of " + cards.length + " trips";
  }
  function filterUi() {
    var list = $("flightList"); if (!list || $("smSafe90")) return;
    var bar = document.createElement("div"); bar.className = "sm-filter";
    bar.innerHTML = '<label><input type="checkbox" id="smSafe90"> Safety Score 90+ only</label><span id="smCount" class="mono"></span>';
    list.parentNode.insertBefore(bar, list);
    $("smSafe90").addEventListener("change", applyFilter);
    new MutationObserver(applyFilter).observe(list, { childList: true });
  }

  /* confetti */
  function confetti() {
    var w = document.createElement("div"); w.className = "sm-confetti";
    var col = ["#2E6FF2", "#E8763C", "#1F9D6C", "#F2C94C", "#D64545"];
    for (var i = 0; i < 46; i++) {
      var s = document.createElement("i");
      s.style.left = Math.random() * 100 + "%"; s.style.background = col[i % 5];
      s.style.animationDelay = Math.random() * .6 + "s"; s.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      w.appendChild(s);
    }
    document.body.appendChild(w); setTimeout(function () { w.remove(); }, 4200);
  }

  /* demo autofill on payment page */
  function demoBtn() {
    var card = document.querySelector("#view-pay .pay-card"), h = card && card.querySelector("h3");
    if (!h || $("smDemo")) return;
    var b = document.createElement("button");
    b.id = "smDemo"; b.type = "button"; b.className = "sm-demo"; b.textContent = "⚡ Fill demo details";
    b.onclick = function () {
      var v = { paxName: C.OWNER_NAME || "Demo User", paxPhone: "9876543210", paxEmail: C.NOTIFY_EMAIL || "demo@example.com",
        cardNum: "4242424242424242", cardExp: "12/30", cardCvv: "123" };
      Object.keys(v).forEach(function (id) { var e = $(id); if (e) { e.value = v[id]; e.dispatchEvent(new Event("input", { bubbles: true })); } });
    };
    h.parentNode.insertBefore(b, h);
  }

  function destinationFilters() {
    var filters = document.querySelectorAll("[data-destination-filter]");
    var cards = document.querySelectorAll("#smDestinations .sm-destination-card");
    var count = $("smRegionCount");
    if (!filters.length || !cards.length || !count) return;

    Array.prototype.forEach.call(filters, function (button) {
      var region = button.dataset.destinationFilter;
      var total = Array.prototype.filter.call(cards, function (card) {
        return region === "all" || card.dataset.region === region;
      }).length;
      var badge = button.querySelector("span");
      if (badge) badge.textContent = total;
      button.addEventListener("click", function () {
        var visible = 0;
        Array.prototype.forEach.call(filters, function (item) {
          var active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        Array.prototype.forEach.call(cards, function (card) {
          card.hidden = region !== "all" && card.dataset.region !== region;
          if (!card.hidden) visible++;
        });
        count.textContent = "Showing " + visible + " of " + cards.length + " places";
      });
    });
    filters[0].click();
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* dark mode remembered */
    var dt = $("darkToggle");
    try { if (localStorage.getItem("sm_dark") === "1") { document.body.classList.add("dark"); document.documentElement.style.colorScheme = "dark"; } } catch (e) {}
    if (dt) dt.addEventListener("click", function () { try { localStorage.setItem("sm_dark", document.body.classList.contains("dark") ? "1" : "0"); } catch (e) {} });

    chips(); demoBtn(); destinationFilters();
    ["fromCity", "toCity"].forEach(function (id) { var s = $(id); if (s) s.addEventListener("change", updRoute); });
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".mode-tab,#intlRow,#swapCities")) setTimeout(updRoute, 150);
    });
    setTimeout(updRoute, 120);

    var vr = $("view-results"), vc = $("view-confirm");
    if (vr) new MutationObserver(function () { if (vr.classList.contains("active")) { filterUi(); applyFilter(); } }).observe(vr, { attributes: true, attributeFilter: ["class"] });
    if (vc) new MutationObserver(function () { if (vc.classList.contains("active")) confetti(); }).observe(vc, { attributes: true, attributeFilter: ["class"] });
  });
})();
