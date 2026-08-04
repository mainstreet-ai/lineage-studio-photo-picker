(function () {
  var STORED_HASH = 'b01f51cfd8b5816a9642c8897c7cfda1086aa9259ba34d042cba67df8dd2ef84';

  function sha256Hex(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function showGate(onOk) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#22405f;display:flex;align-items:center;justify-content:center;z-index:999;font-family:Georgia,serif;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:10px;padding:32px;max-width:340px;width:90%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)">' +
      '<h2 style="color:#22405f;margin:0 0 14px">The Lineage Studio</h2>' +
      '<p style="margin:0 0 16px;color:#444">Enter the admin passcode</p>' +
      '<input type="password" id="lsPass" style="width:100%;padding:10px;font-size:16px;border:2px solid #cbb78a;border-radius:6px;box-sizing:border-box" autofocus>' +
      '<p id="lsErr" style="color:#a33;font-weight:bold;min-height:20px;margin:10px 0 0"></p>' +
      '<button id="lsGo" style="margin-top:8px;background:#2e8b57;color:#fff;border:none;border-radius:24px;padding:10px 24px;font-size:15px;cursor:pointer;font-family:inherit">Enter</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = document.getElementById('lsPass');
    var err = document.getElementById('lsErr');
    var go = document.getElementById('lsGo');

    function attempt() {
      sha256Hex(input.value).then(function (hash) {
        if (hash === STORED_HASH) {
          sessionStorage.setItem('lsAdminOk', '1');
          overlay.remove();
          onOk();
        } else {
          err.textContent = 'Incorrect passcode';
          input.value = '';
          input.focus();
        }
      });
    }

    go.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
  }

  window.ADMIN_AUTH = {
    check: function (onOk) {
      if (sessionStorage.getItem('lsAdminOk') === '1') {
        onOk();
      } else {
        showGate(onOk);
      }
    }
  };
})();
