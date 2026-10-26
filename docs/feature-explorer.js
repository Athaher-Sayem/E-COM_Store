/* Offline documentation only: no requests, analytics, account data, or browser persistence. */
(() => {
  document.documentElement.classList.add('js');
  const features = [...document.querySelectorAll('[data-feature]')];
  const search = document.getElementById('feature-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  let area = 'all';
  function updateFeatures() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const feature of features) {
      const visible = (area === 'all' || feature.dataset.area === area)
        && feature.textContent.toLocaleLowerCase().includes(query);
      feature.hidden = !visible;
      if (visible) count++;
    }
    document.getElementById('feature-count').textContent = `${count} of ${features.length} feature groups`;
    document.getElementById('empty-features').hidden = count > 0;
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === area));
  }
  for (const filter of filters) filter.addEventListener('click', () => {
    area = filter.dataset.filter;
    updateFeatures();
  });
  search.addEventListener('input', updateFeatures);
  document.getElementById('reset-filters').addEventListener('click', () => {
    area = 'all';
    search.value = '';
    updateFeatures();
    search.focus();
  });
  document.getElementById('feature-controls').hidden = false;

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(tab) {
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
      document.getElementById(candidate.getAttribute('aria-controls')).hidden = !selected;
    }
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
      else if (event.key === 'Home') target = tabs[0];
      else if (event.key === 'End') target = tabs[tabs.length - 1];
      if (target) { event.preventDefault(); selectTab(target); target.focus(); }
    });
  }
  selectTab(tabs[0]);

  const treeFolders = [...document.querySelectorAll('.project-tree details')];
  const treeButton = document.getElementById('toggle-folders');
  function updateTreeButton() {
    treeButton.textContent = treeFolders.every(folder => folder.open) ? 'Collapse all folders' : 'Expand all folders';
  }
  treeButton.hidden = false;
  treeButton.addEventListener('click', () => {
    const open = !treeFolders.every(folder => folder.open);
    for (const folder of treeFolders) folder.open = open;
    updateTreeButton();
  });
  for (const folder of treeFolders) folder.addEventListener('toggle', updateTreeButton);

  for (const button of document.querySelectorAll('[data-copy]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      const value = document.getElementById(button.dataset.copy).textContent;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
        status.textContent = `${button.dataset.copyName} copied.`;
      } catch {
        status.textContent = 'Clipboard access is unavailable. Select and copy the command manually.';
      }
    });
  }
  updateFeatures();
  document.getElementById('script-fallback').hidden = true;
})();
