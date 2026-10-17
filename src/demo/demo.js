// Historical presentation only. Current predictions live in the React feature views.
(() => {
  document.querySelectorAll('form input, form select, form button, #retry-connection')
    .forEach(control => { control.disabled = true; });
  document.querySelector('form')?.addEventListener('submit', event => event.preventDefault());
})();
