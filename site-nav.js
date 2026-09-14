/* Shared mobile navigation and product search. Product data stays in Google Sheets. */
(() => {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const toggle = nav.querySelector('.hamburger');
  const searchButton = nav.querySelector('button[aria-label="Search"]');
  const mobile = document.createElement('div');
  mobile.id = 'mobileNavigation';
  mobile.className = 'ml-mobile-menu';
  mobile.hidden = true;
  const links = document.createElement('ul');
  nav.querySelectorAll('.nav-links a').forEach(link => {
    const item = document.createElement('li');
    item.append(link.cloneNode(true));
    links.append(item);
  });
  mobile.append(links);
  nav.append(mobile);
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', mobile.id);
  toggle.setAttribute('aria-expanded', 'false');
  const setMenu = open => {
    mobile.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  };
  toggle.addEventListener('click', () => setMenu(mobile.hidden));
  mobile.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobile.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });
  const desktop = matchMedia('(min-width: 861px)');
  desktop.addEventListener('change', () => {
    if (desktop.matches) setMenu(false);
  });

  const dialog = document.createElement('dialog');
  dialog.className = 'ml-search';
  dialog.id = 'productSearch';
  dialog.setAttribute('aria-labelledby', 'mlSearchTitle');
  dialog.innerHTML = `
    <div class="ml-search-heading"><h2 id="mlSearchTitle">Find your occasion</h2>
      <button type="button" class="ml-search-close" aria-label="Close search">×</button></div>
    <form role="search" class="ml-search-form">
      <label for="mlSearchInput">Search our collections</label>
      <div class="ml-search-field"><input id="mlSearchInput" type="search" placeholder="Try a name, saree or colour" autocomplete="off" maxlength="200">
      <button type="submit">Search</button></div>
    </form>
    <p class="ml-search-status" role="status" aria-live="polite"></p>
    <button type="button" class="ml-search-retry" hidden>Try again</button>
    <ul class="ml-search-results" aria-label="Search results"></ul>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const status = dialog.querySelector('[role="status"]');
  const results = dialog.querySelector('.ml-search-results');
  const retry = dialog.querySelector('.ml-search-retry');
  let catalogue;
  let request = 0;
  let timer;
  let previousOverflow;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  async function search() {
    clearTimeout(timer);
    const current = ++request;
    const query = input.value.trim();
    results.replaceChildren();
    retry.hidden = true;
    if (!query) {
      status.textContent = 'Search by product name, collection, colour or description.';
      return;
    }
    status.textContent = 'Searching the collections…';
    try {
      if (!catalogue) {
        catalogue = fetchProducts().catch(error => { catalogue = undefined; throw error; });
      }
      const products = await catalogue;
      if (current !== request || !dialog.open) return;
      const terms = normalize(query).split(/\s+/);
      const matches = products.filter(product => {
        const text = normalize([product.id, product.name, product.collection, product.description,
          ...(product.colors || []), ...(product.sizes || [])].join(' '));
        return terms.every(term => text.includes(term));
      });
      status.textContent = matches.length
        ? `${matches.length} ${matches.length === 1 ? 'product' : 'products'} found.`
        : 'No products found. Try another name, collection or colour.';
      matches.forEach(product => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `product-template.html?id=${encodeURIComponent(product.id)}`;
        const name = document.createElement('strong');
        name.textContent = product.name;
        const details = document.createElement('span');
        details.textContent = `${product.collection} · ${formatRs(product.price)}`;
        link.append(name, details);
        item.append(link);
        results.append(item);
      });
    } catch (error) {
      if (current !== request || !dialog.open) return;
      status.textContent = 'We couldn’t load the collections. Please try again.';
      retry.hidden = false;
    }
  }
  searchButton.type = 'button';
  searchButton.setAttribute('aria-haspopup', 'dialog');
  searchButton.setAttribute('aria-controls', dialog.id);
  searchButton.addEventListener('click', () => {
    setMenu(false);
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    input.focus();
    search();
  });
  dialog.querySelector('.ml-search-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    ++request;
    clearTimeout(timer);
    document.body.style.overflow = previousOverflow;
    searchButton.focus();
  });
  input.addEventListener('input', () => {
    ++request;
    clearTimeout(timer);
    timer = setTimeout(search, 180);
  });
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); search(); });
  retry.addEventListener('click', search);
})();
