/* Branded, accessible pickers. Native selects remain as no-JS/form fallbacks. */
(() => {
  const translate = text => window.YanaiI18n?.t(text) || text;
  const pickers = [];
  const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  function enhance(select, heading, isLanguage = false) {
    if (!select || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'choice-trigger';
    trigger.id = `${select.id}-trigger`;
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('translate', 'no');
    if (isLanguage) {
      const globe = select.parentElement.querySelector('svg');
      trigger.append(globe.cloneNode(true));
      globe.hidden = true; globe.style.display = 'none';
      select.parentElement.classList.add('enhanced');
    }
    const value = document.createElement('span');
    value.className = 'choice-value'; value.dir = 'auto';
    trigger.append(value);
    trigger.insertAdjacentHTML('beforeend', chevron);
    select.after(trigger);

    const dialog = document.createElement('dialog');
    dialog.id = `${select.id}-dialog`;
    dialog.className = 'choice-dialog';
    dialog.setAttribute('translate', 'no');
    dialog.setAttribute('aria-labelledby', `${select.id}-heading`);
    trigger.setAttribute('aria-controls', dialog.id);
    const header = document.createElement('div'); header.className = 'choice-header';
    const title = document.createElement('h2'); title.id = `${select.id}-heading`;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'choice-close'; close.textContent = '×';
    header.append(title, close);
    const list = document.createElement('div'); list.className = 'choice-options';
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', title.id);
    dialog.append(header, list); document.body.append(dialog);
    const options = [...select.options].map(option => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'choice-option';
      button.setAttribute('role', 'option'); button.dataset.value = option.value;
      const label = document.createElement('span'); label.dir = 'auto';
      if (isLanguage) label.lang = option.lang || option.value;
      const mark = document.createElement('span'); mark.className = 'choice-check';
      mark.setAttribute('aria-hidden', 'true'); mark.textContent = '✓';
      button.append(label, mark); list.append(button);
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        sync(); dialog.close();
      });
      return {option, button, label};
    });

    function sync() {
      title.textContent = translate(heading);
      close.setAttribute('aria-label', translate('סגירה'));
      value.textContent = select.selectedOptions[0]?.textContent || '';
      if (isLanguage) value.lang = select.value;
      trigger.setAttribute('aria-label', `${translate(heading)}: ${value.textContent}`);
      options.forEach(({option, button, label}) => {
        label.textContent = option.textContent;
        const selected = select.value === option.value;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
    }
    trigger.addEventListener('click', () => {
      document.querySelector('.menu-toggle[aria-expanded="true"]')?.click();
      sync(); dialog.showModal();
      document.documentElement.classList.add('choice-open');
      trigger.setAttribute('aria-expanded', 'true');
      list.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('choice-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus({preventScroll:true});
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    list.addEventListener('keydown', event => {
      const index = options.findIndex(item => item.button === document.activeElement);
      if (index < 0) return;
      const rtl = document.documentElement.dir === 'rtl';
      let next;
      if (event.key === 'ArrowDown') next = index + 2;
      if (event.key === 'ArrowUp') next = index - 2;
      if (event.key === 'ArrowRight') next = index + (rtl ? -1 : 1);
      if (event.key === 'ArrowLeft') next = index + (rtl ? 1 : -1);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = options.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        // Focus previews an option; Enter/Space confirms and closes the dialog.
        options[(next + options.length) % options.length].button.focus();
      }
    });
    select.classList.add('ui-native-select'); select.hidden = true;
    select.addEventListener('change', sync);
    sync(); pickers.push({sync});
  }

  enhance(document.querySelector('#language-select'), 'שפה', true);
  enhance(document.querySelector('#trade'), 'איזה מקצוע דרוש?');
  enhance(document.querySelector('#project-stage'), 'שלב הפרויקט');
  const syncAll = () => pickers.forEach(picker => picker.sync());
  document.addEventListener('site-language-change', syncAll);
  // Existing service CTAs set the native select's value before reaching the form.
  document.addEventListener('click', event => {
    if (event.target.closest('[data-trade]')) queueMicrotask(syncAll);
  });
  document.querySelector('#contact-form')?.addEventListener('reset', () => setTimeout(syncAll, 0));

  // The original WhatsApp control docks here: one link, no duplicate/crossfade.
  const mobileContact = document.querySelector('.mobile-contact');
  if (document.querySelector('.floating-contact') && mobileContact) {
    const slot = document.createElement('span');
    slot.className = 'mobile-whatsapp-slot';
    slot.setAttribute('aria-hidden', 'true');
    mobileContact.append(slot);
  }
})();

// Native mailto stays intact; copying is an explicit fallback if no mail app opens.
(() => {
  const email = document.querySelector('#contact-email');
  const copy = document.querySelector('#copy-email');
  const feedback = document.querySelector('#email-feedback');
  if (!email || !copy || !feedback) return;
  const show = text => {
    feedback.textContent = window.YanaiI18n?.t(text) || text;
    feedback.hidden = false;
  };
  copy.hidden = false;
  email.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    show('אם לא נפתחה אפליקציית דואר, אפשר להעתיק את הכתובת.');
  });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email.textContent.trim());
      show('כתובת האימייל הועתקה.');
    } catch {
      show('ההעתקה לא זמינה. אפשר לסמן ולהעתיק את הכתובת.');
    }
  });
})();
