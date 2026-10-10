/* SafeMarg extras: validation, seat-hold timer, loader, sort, My Bookings,
   ticket download, WhatsApp share, safety score breakdown.
   Add-on only; does not modify script.js. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var txt = function (id, d) {
    var el = $(id), v = el ? el.textContent.trim() : '';
    return v && v !== '—' ? v : d;
  };

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'sm-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2400);
    setTimeout(function () { t.remove(); }, 2900);
  }

  /* ---------- 1. Form validation ---------- */
  function clearErr(el) {
    el.classList.remove('sm-bad');
    var n = el.parentNode.querySelector('.sm-errmsg');
    if (n) n.remove();
  }
  function setErr(el, msg) {
    clearErr(el);
    if (!msg) return;
    el.classList.add('sm-bad');
    var s = document.createElement('small');
    s.className = 'sm-errmsg';
    s.textContent = msg;
    el.parentNode.appendChild(s);
  }
  function validate(isUpi) {
    var ok = true, first = null;
    function chk(id, test, msg) {
      var el = $(id);
      if (!el) return;
      if (test(el.value.trim())) { setErr(el, null); return; }
      setErr(el, msg);
      ok = false;
      if (!first) first = el;
    }
    chk('paxName', function (v) { return /^[A-Za-z][A-Za-z .'\-]+$/.test(v); }, 'Enter a valid name');
    chk('paxPhone', function (v) { return /^[6-9]\d{9}$/.test(v); }, 'Enter a 10-digit mobile number');
    chk('paxEmail', function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, 'Enter a valid email');
    if (isUpi) {
      var u = $('upiId');
      if (u && u.value.trim()) {
        chk('upiId', function (v) { return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v); }, 'UPI ID must look like name@bank');
      }
    } else {
      chk('cardNum', function (v) { return v.replace(/\s/g, '').length === 16; }, 'Enter a 16-digit card number');
      chk('cardExp', function (v) {
        var m = /^(0[1-9]|1[0-2])\/(\d\d)$/.exec(v);
        if (!m) return false;
        var d = new Date(), yy = d.getFullYear() % 100, mm = d.getMonth() + 1;
        var y = +m[2];
        return y > yy || (y === yy && +m[1] >= mm);
      }, 'Enter a valid expiry (MM/YY)');
      chk('cardCvv', function (v) { return /^\d{3}$/.test(v); }, 'Enter a 3-digit CVV');
    }
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#payBtn,#upiPayBtn');
    if (!b) return;
    if (!validate(b.id === 'upiPayBtn')) {
      e.stopPropagation();
      e.preventDefault();
      toast('Please check your details');
    }
  }, true);
  document.addEventListener('input', function (e) {
    if (e.target.classList && e.target.classList.contains('sm-bad')) clearErr(e.target);
  });

  /* ---------- 2. Search loader ---------- */
  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('#searchBtn'))) return;
    var o = document.createElement('div');
    o.className = 'sm-loader';
    o.innerHTML = '<div class="sm-spin"></div><p>Finding safe trips…</p>';
    document.body.appendChild(o);
    setTimeout(function () { o.remove(); }, 1000);
  });

  /* ---------- 3. Seat hold timer ---------- */
  var holdTimer = null;
  function startHold() {
    stopHold();
    var card = document.querySelector('#view-pay .summary-card');
    if (!card) return;
    var bar = $('smHold');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'smHold';
      bar.className = 'sm-hold';
      card.insertBefore(bar, card.firstChild);
    }
    var left = 300;
    function tick() {
      var m = Math.floor(left / 60), s = left % 60;
      bar.textContent = '⏱ Seat held for: ' + m + ':' + (s < 10 ? '0' : '') + s;
      bar.classList.toggle('low', left <= 60);
      if (left-- <= 0) {
        stopHold();
        toast('Time is up, seat released');
        if (typeof goStep === 'function') goStep('seats');
      }
    }
    tick();
    holdTimer = setInterval(tick, 1000);
  }
  function stopHold() { clearInterval(holdTimer); holdTimer = null; }

  /* ---------- 4. Results sort ---------- */
  function price(el) {
    var m = /₹\s*([\d,]+)/.exec(el.textContent);
    return m ? +m[1].replace(/,/g, '') : 0;
  }
  function score(el) {
    var m = /(?:safety|score)\D{0,12}(\d{2,3})/i.exec(el.textContent);
    return m ? +m[1] : 0;
  }
  function setupSort() {
    var list = $('flightList');
    if (!list) return;
    var sel = $('smSort');
    if (!sel) {
      sel = document.createElement('select');
      sel.id = 'smSort';
      sel.className = 'sm-sort';
      sel.innerHTML = '<option value="def">Sort: Default</option>' +
        '<option value="plo">Price: Low → High</option>' +
        '<option value="phi">Price: High → Low</option>' +
        '<option value="saf">Safety: High → Low</option>';
      list.parentNode.insertBefore(sel, list);
      sel.addEventListener('change', function () {
        var cards = Array.prototype.slice.call(list.children);
        cards.forEach(function (c, i) { if (c.dataset.o === undefined) c.dataset.o = i; });
        var v = sel.value;
        cards.sort(function (a, b) {
          if (v === 'plo') return price(a) - price(b);
          if (v === 'phi') return price(b) - price(a);
          if (v === 'saf') return score(b) - score(a);
          return a.dataset.o - b.dataset.o;
        });
        cards.forEach(function (c) { list.appendChild(c); });
      });
    }
    sel.value = 'def';
  }

  /* ---------- 5. My Bookings (localStorage) ---------- */
  function loadB() {
    try { return JSON.parse(localStorage.getItem('sm_bookings') || '[]'); } catch (e) { return []; }
  }
  function saveBooking() {
    var pnr = txt('pnrOut', '');
    if (!pnr) return;
    var all = loadB();
    if (all.some(function (b) { return b.pnr === pnr; })) return;
    all.unshift({
      pnr: pnr, name: txt('etName', '-'), route: txt('etRoute', '-'),
      seat: txt('etSeat', '-'), depart: txt('etDepart', '-'),
      amount: txt('etAmount', '-'), mode: txt('etModeOut', ''),
      at: new Date().toLocaleString('en-IN')
    });
    try { localStorage.setItem('sm_bookings', JSON.stringify(all.slice(0, 20))); } catch (e) {}
  }
  function modal(html) {
    var o = document.createElement('div');
    o.className = 'sm-overlay';
    o.innerHTML = '<div class="sm-modal"><button class="sm-x" aria-label="Close">&times;</button>' + html + '</div>';
    o.addEventListener('click', function (e) {
      if (e.target === o || e.target.classList.contains('sm-x')) o.remove();
    });
    document.body.appendChild(o);
    return o;
  }
  function saveAll(all) { try { localStorage.setItem('sm_bookings', JSON.stringify(all)); } catch (e) {} }
  function showBookings() {
    var all = loadB();
    var body = all.length ? all.map(function (b, i) {
      var x = b.status === 'cancelled';
      return '<div class="sm-bk' + (x ? ' cancelled' : '') + '"><b>' + esc(b.route) + '</b> <span>' + esc(b.mode) + (x ? ' · CANCELLED' : '') + '</span>' +
        '<div>' + esc(b.name) + ' · Seat ' + esc(b.seat) + ' · ' + esc(b.amount) + '</div>' +
        '<small>PNR ' + esc(b.pnr) + ' · ' + esc(b.at) + '</small>' +
        (x ? '' : '<button class="sm-cancel" data-i="' + i + '">Cancel booking</button>') + '</div>';
    }).join('') : '<p class="sm-empty">No bookings yet.</p>';
    var o = modal('<h3>My Bookings</h3>' + body +
      (all.length ? '<button class="sm-btn ghost" id="smClear">Clear all</button>' : ''));
    Array.prototype.forEach.call(o.querySelectorAll('.sm-cancel'), function (btn) {
      btn.onclick = function () {
        if (!confirm('Cancel this booking? A refund will be simulated (demo).')) return;
        all[+btn.dataset.i].status = 'cancelled';
        saveAll(all); o.remove(); showBookings();
        toast('Booking cancelled. Refund initiated (demo)');
      };
    });
    var c = o.querySelector('#smClear');
    if (c) c.onclick = function () {
      try { localStorage.removeItem('sm_bookings'); } catch (e) {}
      o.remove();
      toast('Bookings cleared');
    };
  }
  function addNavButton() {
    var right = document.querySelector('.nav-right');
    if (!right || $('myBookBtn')) return;
    var b = document.createElement('button');
    b.id = 'myBookBtn';
    b.className = 'login-btn';
    b.innerHTML = '<span>My Bookings</span>';
    b.onclick = showBookings;
    right.insertBefore(b, $('loginBtn') || right.firstChild);
  }

  /* ---------- 6. Ticket download / share / score breakdown ---------- */
  function addActions() {
    if ($('smActions')) return;
    var nb = document.querySelector('.new-search');
    if (!nb) return;
    var d = document.createElement('div');
    d.id = 'smActions';
    d.className = 'sm-actions';
    d.innerHTML = '<button class="sm-btn" id="smPrint">⬇ Download ticket (PDF)</button>' +
      '<button class="sm-btn wa" id="smWa">Share on WhatsApp</button>';
    nb.parentNode.insertBefore(d, nb);
    $('smPrint').onclick = function () { window.print(); };
    $('smWa').onclick = function () {
      var t = 'SafeMarg ticket ✅\nPassenger: ' + txt('etName', '-') + '\nRoute: ' + txt('etRoute', '-') +
        '\nSeat: ' + txt('etSeat', '-') + '\nDeparts: ' + txt('etDepart', '-') +
        '\nPNR: ' + txt('pnrOut', '-') + '\nTotal: ' + txt('etAmount', '-');
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    };
    var sc = $('scoreOut');
    if (sc) {
      sc.style.cursor = 'pointer';
      sc.title = 'Click to see breakdown';
      sc.onclick = showScore;
    }
  }
  function showScore() {
    var s = parseInt(txt('scoreOut', '90'), 10) || 90;
    var mode = txt('etModeOut', 'FLIGHT').toUpperCase();
    var L = {
      FLIGHT: ['Pilot & crew record', 'Aircraft maintenance', 'Weather & route risk', 'Airport safety'],
      TRAIN: ['Loco-pilot record', 'Track & signal health', 'Coach maintenance', 'Station safety'],
      BUS: ['Driver rating', 'Vehicle fitness', 'Road & route safety', 'Emergency readiness']
    }[mode] || ['Crew record', 'Vehicle condition', 'Route risk', 'Emergency readiness'];
    var off = [2, -3, 1, -2];
    var rows = L.map(function (l, i) {
      var v = Math.max(60, Math.min(100, s + off[i]));
      return '<div class="sm-row"><span>' + l + '</span><b>' + v + '</b>' +
        '<div class="sm-track"><i data-w="' + v + '"></i></div></div>';
    }).join('');
    var o = modal('<h3>Safety Score: ' + s + '</h3>' + rows +
      '<p class="sm-empty">This is a demo breakdown.</p>');
    setTimeout(function () {
      Array.prototype.forEach.call(o.querySelectorAll('i[data-w]'), function (i) { i.style.width = i.dataset.w + '%'; });
    }, 50);
  }

  /* ---------- wiring ---------- */
  function watch(id, fn) {
    var v = $(id);
    if (!v) return;
    new MutationObserver(function () { fn(v.classList.contains('active')); })
      .observe(v, { attributes: true, attributeFilter: ['class'] });
  }
  function init() {
    addNavButton();
    watch('view-pay', function (on) { if (on) startHold(); else stopHold(); });
    watch('view-results', function (on) { if (on) setupSort(); });
    watch('view-confirm', function (on) {
      if (!on) return;
      stopHold();
      setTimeout(function () { saveBooking(); addActions(); }, 300);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ---------- Searchable From / To places ---------- */
(function () {
  function setupPlaceSearch(selectId, label) {
    var select = document.getElementById(selectId);
    if (!select || select.dataset.searchReady === '1') return;
    select.dataset.searchReady = '1';
    var field = select.closest('.field');
    if (!field) return;

    var picker = document.createElement('div');
    picker.className = 'sm-place-picker';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'sm-place-search';
    input.placeholder = 'Search ' + label + ' city…';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Search ' + label + ' city');
    var icon = document.createElement('span');
    icon.className = 'sm-place-icon';
    icon.textContent = '⌕';
    var menu = document.createElement('div');
    menu.className = 'sm-place-menu';
    menu.setAttribute('role', 'listbox');
    picker.appendChild(input); picker.appendChild(icon); picker.appendChild(menu);
    select.style.display = 'none';
    field.appendChild(picker);

    function options() { return Array.prototype.slice.call(select.options); }
    function setDisplayFromSelect() {
      var o = select.options[select.selectedIndex];
      if (o) input.value = o.textContent;
    }
    function render(query) {
      var q = (query || '').trim().toLowerCase();
      menu.innerHTML = '';
      var matches = options().filter(function (o) {
        return !q || o.textContent.toLowerCase().indexOf(q) !== -1 || o.value.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 12);
      if (!matches.length) {
        var empty = document.createElement('div'); empty.className='sm-place-empty'; empty.textContent='No place found'; menu.appendChild(empty);
      } else {
        matches.forEach(function (o) {
          var b=document.createElement('button'); b.type='button'; b.className='sm-place-option';
          var parts=o.textContent.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
          var name=parts?parts[1]:o.textContent, code=parts&&parts[2]?parts[2]:o.value;
          b.innerHTML='<strong>'+name+'</strong><span class="sm-place-code">'+code+'</span>';
          b.addEventListener('mousedown',function(e){e.preventDefault();});
          b.addEventListener('click',function(){
            select.value=o.value; input.value=o.textContent; menu.classList.remove('open');
            select.dispatchEvent(new Event('change',{bubbles:true}));
          });
          menu.appendChild(b);
        });
      }
      menu.classList.add('open');
    }
    input.addEventListener('focus',function(){ render(input.value); });
    input.addEventListener('input',function(){ render(input.value); });
    input.addEventListener('keydown',function(e){
      if(e.key==='Escape'){menu.classList.remove('open');input.blur();}
      if(e.key==='Enter'){
        var first=menu.querySelector('.sm-place-option'); if(first){e.preventDefault();first.click();}
      }
    });
    select.addEventListener('change',setDisplayFromSelect);
    document.addEventListener('click',function(e){if(!picker.contains(e.target))menu.classList.remove('open');});
    setDisplayFromSelect();
  }

  function refreshPlaceInputs() {
    ['fromCity','toCity'].forEach(function(id){
      var s=document.getElementById(id), p=s&&s.parentNode.querySelector('.sm-place-search');
      if(s&&p){var o=s.options[s.selectedIndex]; p.value=o?o.textContent:'';}
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){ setupPlaceSearch('fromCity','departure'); setupPlaceSearch('toCity','destination'); refreshPlaceInputs(); },30);
    document.addEventListener('click',function(e){
      if(e.target.closest && (e.target.closest('.mode-tab') || e.target.closest('#intlRow') || e.target.closest('#swapCities'))){
        setTimeout(refreshPlaceInputs,80);
      }
    });
  });
})();
