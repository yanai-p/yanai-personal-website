/* Local, reviewed catalogs. User input is never sent to a translation service. */
(() => {
  'use strict';
  const {source, locales} = window.YanaiLocales;
  const supported = ['he', 'th', 'hi', 'si', 'zh-CN', 'ro', 'uz', 'en'];
  const root = document.documentElement;
  const selector = document.querySelector('#language-select');
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const lookup = new Map(source.map((value, index) => [normalize(value), index]));
  const reverse = new Map();
  Object.values(locales).forEach(values => values.forEach((value, i) => {
    if (!reverse.has(normalize(value))) reverse.set(normalize(value), source[i]);
  }));
  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  const attributes = ['aria-label', 'alt', 'title', 'placeholder', 'content'];
  const excluded = 'script,style,noscript,[translate="no"]';
  let language = 'he';

  function t(value, params = {}) {
    const key = normalize(value);
    const index = lookup.get(key);
    let result = index === undefined ? value : language === 'he' ? source[index] : locales[language][index];
    return result.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  }

  function canonical(value) {
    const key = normalize(value);
    return lookup.has(key) ? key : reverse.get(key) || key;
  }

  function translated(value) {
    const key = normalize(value);
    let result = t(key);
    if (result === key && /[\u0590-\u05ff]/.test(key)) {
      let match;
      if ((match = key.match(/^נדבר על (.+)\. אפשר לשנות את הבחירה כאן למטה\.$/))) {
        result = t('נדבר על {trade}. אפשר לשנות את הבחירה כאן למטה.', {trade:t(match[1])});
      } else if ((match = key.match(/^נדבר על (.+)$/))) {
        result = t('נדבר על {trade}', {trade:t(match[1])});
      } else if ((match = key.match(/^לקראת השיחה: (.+)$/))) {
        result = t('לקראת השיחה: {prompt}', {prompt:t(match[1])});
      } else if ((match = key.match(/^(.*?)\s*([←↙])$/))) {
        result = t(match[1]) + ' ' + (language === 'he' ? match[2] : match[2] === '←' ? '→' : '↘');
      }
    }
    // Preserve spaces between inline text nodes, icons and emphasized words.
    return (value.match(/^\s*/)?.[0] || '') + result + (value.match(/\s*$/)?.[0] || '');
  }

  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest(excluded + ',textarea') || !node.nodeValue.trim()) return;
    const value = node.nodeValue;
    let record = textRecords.get(node);
    if (!record || value !== record.rendered) {
      const base = canonical(value);
      record = {source:(value.match(/^\s*/)?.[0] || '') + base + (value.match(/\s*$/)?.[0] || ''), rendered:value};
      textRecords.set(node, record);
    }
    const next = translated(record.source);
    record.rendered = next;
    if (value !== next) node.nodeValue = next;
  }

  function updateAttributes(element) {
    if (element.closest(excluded)) return;
    let records = attributeRecords.get(element);
    if (!records) { records = {}; attributeRecords.set(element, records); }
    attributes.forEach(name => {
      if (!element.hasAttribute(name)) return;
      const value = element.getAttribute(name);
      let record = records[name];
      if (!record || value !== record.rendered) record = records[name] = {source:canonical(value), rendered:value};
      const next = translated(record.source);
      record.rendered = next;
      if (value !== next) element.setAttribute(name, next);
    });
  }

  function translateTree(element) {
    if (element.nodeType === Node.TEXT_NODE) { updateText(element); return; }
    if (element.nodeType !== Node.ELEMENT_NODE || element.closest(excluded)) return;
    updateAttributes(element);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.nodeType === Node.TEXT_NODE) updateText(walker.currentNode);
      else updateAttributes(walker.currentNode);
    }
  }

  // Option values are business data, independent of the displayed language.
  document.querySelectorAll('#trade option').forEach(option => {
    if (!option.hasAttribute('value')) option.value = option.textContent;
  });

  const observer = new MutationObserver(mutations => {
    // Disconnect while applying our own changes to avoid observer feedback loops.
    observer.disconnect();
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') updateText(mutation.target);
      else if (mutation.type === 'attributes') updateAttributes(mutation.target);
      else mutation.addedNodes.forEach(translateTree);
    }
    observe();
  });
  function observe() {
    observer.observe(root, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attributes});
  }

  function setLanguage(next, persist = true) {
    if (!supported.includes(next)) return;
    observer.disconnect();
    language = next;
    root.lang = next;
    root.dir = next === 'he' ? 'rtl' : 'ltr';
    selector.value = next;
    translateTree(root);
    document.querySelectorAll('.photo-open').forEach(button => button.dataset.zoomLabel = t('מבט מקרוב ↗'));
    if (persist) {
      try { localStorage.setItem('yanai-language', next); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('lang', next);
      history.replaceState(null, '', url);
    }
    observe();
    document.dispatchEvent(new CustomEvent('site-language-change', {detail:{language:next}}));
    // Recalculate scroll effects and section positions after text reflows.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  window.YanaiI18n = {t, setLanguage, get language() { return language; }};
  selector.addEventListener('change', () => setLanguage(selector.value));
  let initial = new URL(location.href).searchParams.get('lang');
  if (!supported.includes(initial)) {
    try { initial = localStorage.getItem('yanai-language'); } catch {}
  }
  setLanguage(supported.includes(initial) ? initial : 'he', false);
})();
