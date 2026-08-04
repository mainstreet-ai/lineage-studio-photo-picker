(function () {
  var qs = new URLSearchParams(window.location.search);
  var clientSlug = qs.get('client');
  var app = document.getElementById('app');

  if (!clientSlug) {
    app.innerHTML = '<div id="loading">No client specified. Use a link like ?client=wiles.</div>';
    return;
  }

  var CONFIG = null;
  var selected = {}; // number -> {number, frameId}
  var flatPhotos = []; // ordered list for lightbox nav
  var lbIndex = -1;

  fetch('clients/' + encodeURIComponent(clientSlug) + '/config.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('Config not found for client "' + clientSlug + '"');
      return r.json();
    })
    .then(function (cfg) {
      CONFIG = cfg;
      init();
    })
    .catch(function (err) {
      app.innerHTML = '<div id="loading">Could not load this album (' + escapeHtml(err.message) + '). Please double-check the link.</div>';
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    document.title = CONFIG.displayTitle || (CONFIG.clientName + ' - Photo Selection');
    var headerHtml = '<h1>' + escapeHtml(CONFIG.displayTitle || '') + '</h1>';
    (CONFIG.intro || []).forEach(function (p) {
      headerHtml += '<p>' + escapeHtml(p) + '</p>';
    });
    document.getElementById('headerContent').innerHTML = headerHtml;

    flatPhotos = [];
    var html = '';
    (CONFIG.sections || []).forEach(function (sec) {
      html += '<div class="sec">' + escapeHtml(sec.title) + '</div><div class="grid">';
      (sec.photos || []).forEach(function (p) {
        flatPhotos.push(p);
        html += photoCardHtml(p);
      });
      html += '</div>';
    });
    app.innerHTML = html;
    updateCounter();
  }

  function photoCardHtml(p) {
    var isSel = !!selected[p.number];
    return '<div class="card' + (isSel ? ' sel' : '') + '" id="card' + p.number + '">' +
      '<img src="' + encodeURI('clients/' + clientSlug + '/' + p.file) + '" onclick="PICKER.openLb(' + p.number + ')">' +
      '<div class="cap"><span class="num">#' + p.number + '</span>' +
      '<button class="sbtn" onclick="PICKER.toggle(' + p.number + ')">' + (isSel ? '✓ Selected' : 'Select') + '</button></div></div>';
  }

  function findPhoto(number) {
    for (var i = 0; i < flatPhotos.length; i++) {
      if (flatPhotos[i].number === number) return flatPhotos[i];
    }
    return null;
  }

  function toggle(number) {
    var p = findPhoto(number);
    if (!p) return;
    if (selected[number]) {
      delete selected[number];
    } else {
      selected[number] = { number: p.number, frameId: p.frameId || null };
    }
    var card = document.getElementById('card' + number);
    if (card) {
      card.outerHTML = photoCardHtml(p);
    }
    if (lbIndex >= 0 && flatPhotos[lbIndex].number === number) {
      updateLbSelBtn();
    }
    updateCounter();
  }

  function updateCounter() {
    var n = Object.keys(selected).length;
    document.getElementById('c').textContent = n;
    document.getElementById('sendBtn').disabled = n === 0;
  }

  function openLb(number) {
    lbIndex = flatPhotos.findIndex(function (p) { return p.number === number; });
    renderLb();
    document.getElementById('lb').style.display = 'flex';
  }

  function renderLb() {
    var p = flatPhotos[lbIndex];
    document.getElementById('lbimg').src = encodeURI('clients/' + clientSlug + '/' + p.file);
    document.getElementById('lbn').textContent = '#' + p.number;
    updateLbSelBtn();
  }

  function updateLbSelBtn() {
    var p = flatPhotos[lbIndex];
    var btn = document.getElementById('lbsel');
    var isSel = !!selected[p.number];
    btn.textContent = isSel ? '✓ Selected' : 'Select';
    btn.className = isSel ? 'lbsel' : '';
  }

  function lbStep(dir) {
    lbIndex = (lbIndex + dir + flatPhotos.length) % flatPhotos.length;
    renderLb();
  }

  function lbToggle() {
    toggle(flatPhotos[lbIndex].number);
  }

  function closeLb() {
    document.getElementById('lb').style.display = 'none';
  }

  function selectionList() {
    return Object.keys(selected)
      .map(function (k) { return selected[k]; })
      .sort(function (a, b) { return a.number - b.number; });
  }

  function showSubmitScreen() {
    var list = selectionList();
    if (list.length === 0) return;
    var out = document.getElementById('out');
    out.innerHTML = '<h2>Sending your picks…</h2><p>Please wait a moment.</p>';
    out.style.display = 'block';

    fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: CONFIG.clientSlug,
        clientName: CONFIG.clientName,
        selections: list
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Server responded with an error');
        return r.json().catch(function () { return {}; });
      })
      .then(function () {
        out.innerHTML = '<h2>Thank you!</h2>' +
          '<p>Your picks have been sent. ' + list.length + ' photo' + (list.length === 1 ? '' : 's') + ' selected:</p>' +
          '<div class="listbox">' + list.map(function (s) { return '#' + s.number; }).join(', ') + '</div>' +
          '<p>You can close this page now.</p>' +
          '<button class="act" onclick="PICKER.closeOut()">Back to photos</button>';
      })
      .catch(function () {
        out.innerHTML = '<h2>Hmm, that didn\'t go through</h2>' +
          '<p class="err">We could not send your picks automatically. Please copy this list and send it directly:</p>' +
          '<div class="listbox">' + list.map(function (s) { return '#' + s.number; }).join(', ') + '</div>' +
          '<button class="act" onclick="PICKER.closeOut()">Back to photos</button>';
      });
  }

  function closeOut() {
    document.getElementById('out').style.display = 'none';
  }

  window.PICKER = {
    toggle: toggle,
    openLb: openLb,
    lbStep: lbStep,
    lbToggle: lbToggle,
    closeLb: closeLb,
    showSubmitScreen: showSubmitScreen,
    closeOut: closeOut
  };
})();
