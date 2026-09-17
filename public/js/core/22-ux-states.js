/* State indikator UX (presentasional saja — tidak mengubah logic/data/API).
   - .net-banner  : tampil saat perangkat offline (event browser)
   - .progress-top: tampil saat window.markBusy(true) dipanggil kode lain
*/
(function () {
  'use strict';

  function banner() {
    var el = document.getElementById('netBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'netBanner';
      el.className = 'net-banner';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.textContent = 'Kamu sedang offline — perubahan tersimpan di perangkat.';
      document.body.appendChild(el);
    }
    return el;
  }

  function bar() {
    var el = document.getElementById('progressTop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'progressTop';
      el.className = 'progress-top';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function apply() {
    banner();
    document.body.classList.toggle('is-offline', navigator.onLine === false);
  }

  window.addEventListener('online', apply);
  window.addEventListener('offline', apply);

  /* ui94: chart dashboard digambar dengan geometri berbeda di layar HP.
     Saat lebar melewati breakpoint (mis. rotasi layar), gambar ulang view aktif. */
  var lastNarrow = null;
  function watchNarrow() {
    var now = typeof isNarrowLayout === 'function' ? isNarrowLayout() : false;
    if (lastNarrow === null) { lastNarrow = now; return; }
    if (now === lastNarrow) return;
    lastNarrow = now;
    if (typeof activeView !== 'undefined' && activeView === 'dashboard' && typeof renderShell === 'function') {
      renderShell();
    }
  }
  window.addEventListener('resize', watchNarrow);
  window.addEventListener('orientationchange', watchNarrow);

  window.markBusy = function (on) {
    bar();
    document.body.classList.toggle('is-busy', !!on);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
