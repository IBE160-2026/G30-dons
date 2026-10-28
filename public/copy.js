// AD-16: the "Kopier lenke" buttons. No inline JS; the read-only field is the fallback.
(() => {
  'use strict';

  function fallback(input) {
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
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.textContent = 'Kopiert!';
        clearTimeout(Number(button.dataset.timer));
        button.dataset.timer = String(
          setTimeout(() => {
            button.textContent = button.dataset.label;
          }, 2000),
        );
      },
      () => {
        fallback(input);
      },
    );
  });
})();
