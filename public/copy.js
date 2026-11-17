// AD-16, story 5.1 (D6): the "Kopier lenke" buttons. No inline JS. Copies the helper link and says
// «Lenken er kopiert» in the role="status" line; without clipboard access it opens «Vis lenken»
// and selects the read-only field, which is also the fallback without JavaScript.
(() => {
  'use strict';

  function announce(text) {
    var status = document.getElementById('copy-status');
    if (!status) return;
    // Clear first, so a second copy is announced again.
    status.textContent = '';
    setTimeout(() => {
      status.textContent = text;
    }, 50);
  }

  function fallback(input) {
    var details = input.closest ? input.closest('details') : null;
    if (details) details.open = true;
    input.focus();
    input.select();
  }

  document.addEventListener('click', (event) => {
    var target = event.target;
    var button = target?.closest ? target.closest('[data-copy]') : null;
    if (!button) return;
    var input = document.getElementById(button.getAttribute('data-copy'));
    if (!input) return;

    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      fallback(input);
      return;
    }
    navigator.clipboard.writeText(input.value).then(
      () => {
        announce('Lenken er kopiert');
      },
      () => {
        fallback(input);
      },
    );
  });
})();
