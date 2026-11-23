(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('apex.kit.theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = stored || (prefersDark ? 'dark' : 'light');

  function sync() {
    const dark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.textContent = dark ? '☀' : '☾';
    });
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('apex.kit.theme', root.dataset.theme);
      sync();
      document.dispatchEvent(new CustomEvent('apex:theme'));
    });
  });

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  sync();
})();
