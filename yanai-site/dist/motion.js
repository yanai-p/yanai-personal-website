/* Scroll is native. One scheduled frame updates only the visible scene. */
(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const toggle = document.querySelector('#motion-toggle');
  const scene = document.querySelector('.build-story');
  const stage = document.querySelector('.build-stage');
  const buildingArt = document.querySelector('.build-art');
  // Pause decorative site activity whenever the scene leaves the viewport.
  new IntersectionObserver(([entry]) => {
    scene.classList.toggle('scene-visible', entry.isIntersecting);
  }, {threshold: 0}).observe(scene);
  const layers = [...document.querySelectorAll('.building-level')];
  layers.forEach((layer,index)=>layer.style.setProperty('--floor-order',index));
  const chapters = [...document.querySelectorAll('button[data-chapter]')];
  const stories = [...document.querySelectorAll('.build-caption')];
  const line = document.querySelector('.reading-progress');
  const ribbon = document.querySelector('.kinetic-track');
  let ribbonTravel=140;
  function layoutRibbon(){
    const items=[...ribbon.children],compact=innerWidth<=600;
    const home=items.indexOf(ribbon.querySelector('[data-ribbon-home]'));
    // Anchor the middle repetition, leaving continuous words on both sides.
    // Center a complete pair on phones, and three words on wider screens.
    // Localized word widths are measured after fonts/language changes, not guessed.
    const first=items[home+(compact?0:2)],last=items[home+(compact?2:6)];
    const center=(first.offsetLeft+last.offsetLeft+last.offsetWidth)/2;
    const width=ribbon.parentElement.clientWidth;
    ribbon.style.marginLeft=`${width/2-center}px`;
    ribbonTravel=compact?Math.min(176,width*.44):Math.min(240,width*.16);
  }
  const intents = {
    foundation: { text:'נברר אילו עבודות מתוכננות, מה היקף כוח האדם ומתי נדרשת תחילת העבודה.', label:'ממשיכים עם הבחירה לטופס', href:'#contact', tab:0, trades:[['טפסנים',0],['ברזלנים',1]] },
    structure: { text:'בשלב השלד? בחרו את המקצוע שתרצו להכיר, ונראה מה אפשר לבנות יחד.', label:'ממשיכים עם הבחירה לטופס', href:'#contact', tab:0, trades:[['טפסנים',0],['ברזלנים',1]] },
    finish: { text:'מגיעים לפרטים שעושים את ההבדל. איזה מקצוע דרוש לכם עכשיו?', label:'ממשיכים עם הבחירה לטופס', href:'#contact', tab:2, trades:[['טייחים',2],['רצפים',3]] },
    advice: { text:'עוד לא סגורים על מה צריך? זה בסדר. מתחילים בשיחה, ומבינים יחד את הצעד הבא.', label:'בואו נתייעץ יחד', href:'#contact', tab:null }
  };
  let chosenIntent = null;
  document.querySelectorAll('[data-intent]').forEach(button => button.addEventListener('click', () => {
    chosenIntent = intents[button.dataset.intent];
    document.querySelectorAll('[data-intent]').forEach(option => option.setAttribute('aria-pressed',String(option === button)));
    document.querySelector('#welcome-answer').textContent = chosenIntent.text;
    const next = document.querySelector('#welcome-next');
    next.href = chosenIntent.href;
    next.classList.add('welcome-continue');
    const nextLabel=document.createElement('span');nextLabel.className='link-label';nextLabel.textContent=chosenIntent.label;
    const nextArrow=document.createElement('span');nextArrow.setAttribute('aria-hidden','true');nextArrow.textContent='←';
    next.replaceChildren(nextLabel,nextArrow);
    const choices=document.querySelector('#welcome-trades');choices.replaceChildren();choices.hidden=!chosenIntent.trades;
    document.querySelector('.welcome-answer').classList.toggle('has-trades',!!chosenIntent.trades);
    (chosenIntent.trades||[]).forEach(([name,index])=>{
      const link=document.createElement('a');link.href='#expertise';link.textContent=`${name} ↙`;
      link.addEventListener('click',()=>document.querySelector(`#trade-tab-${index}`).click());choices.append(link);
    });
    if (!paused) document.querySelector('.welcome-answer').animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'ease-out'});
  }));
  const tradeSelect = document.querySelector('#trade');
  function selectedTrade() {
    const note = document.querySelector('#selected-trade-note');
    note.hidden = !tradeSelect.value;
    note.textContent = tradeSelect.value ? `נדבר על ${tradeSelect.value}. אפשר לשנות את הבחירה כאן למטה.` : '';
  }
  tradeSelect.addEventListener('change',selectedTrade);
  document.querySelectorAll('[data-trade]').forEach(link => link.addEventListener('click',selectedTrade));
  let savedMotion=null;try{savedMotion=sessionStorage.getItem('yanai-motion');}catch{}
  let paused = preference.matches||savedMotion==='reduced', scheduled = false, manual = false, manualScrollOrigin = scrollY;
  let activeChapter=-1;
  const clamp = value => Math.max(0, Math.min(1, value));
  const chapterBar = document.querySelector('.build-chapters');
  const captionBox = document.querySelector('.build-captions');
  const buildNext = document.querySelector('.build-next');
  const mobileTrack = document.createElement('div');
  const mobileFrame = document.createElement('div');
  mobileTrack.className = 'build-mobile-track';
  mobileFrame.className = 'build-mobile-frame';
  mobileTrack.append(mobileFrame); mobileTrack.hidden = true;
  const homes = [chapterBar, buildingArt, captionBox, buildNext].map(node => {
    const marker = document.createComment('building responsive home');
    node.before(marker); return {node, marker};
  });
  stage.append(mobileTrack);
  let mobileScene = false, sceneTop = 0, sceneViewport = innerHeight, sceneMetricsDirty = true;
  // A small-viewport probe remains stable while browser toolbars expand/collapse.
  const viewportProbe = document.createElement('div');
  viewportProbe.className = 'build-viewport-probe'; viewportProbe.setAttribute('aria-hidden','true');
  document.body.append(viewportProbe);
  function layoutBuilding() {
    const compact = innerWidth <= 1000;
    if (compact !== mobileScene) {
      mobileScene = compact;
      scene.classList.toggle('build-mobile', compact);
      mobileTrack.hidden = !compact;
      if (compact) {
        mobileFrame.append(chapterBar, buildingArt, captionBox);
        mobileTrack.after(buildNext);
      } else homes.forEach(({node,marker}) => marker.after(node));
    }
    if (!compact) return;
    const stableHeight = viewportProbe.getBoundingClientRect().height || innerHeight;
    sceneViewport = stableHeight;
    sceneTop = document.querySelector('.header').getBoundingClientRect().height + 10;
    const bottomSpace = innerWidth <= 600 ? 86 : 24;
    const available = stableHeight - sceneTop - bottomSpace;
    // Keep the whole foundation inside the visible scene, including browser UI.
    mobileFrame.style.setProperty('--scene-art-height', `${Math.max(150, Math.min(340, available * .53))}px`);
  }

  function setChapter(index) {
    if(activeChapter===index)return;
    activeChapter=index;
    stage.style.setProperty('--build-progress', index / 2);
    scene.dataset.chapter = index;
    chapters.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    stories.forEach((story, i) => { story.hidden = i !== index; });
  }
  function paintBuilding(progress) {
    // Each chapter has its own physical state: footings, complete open frame,
    // then an opaque finished envelope. Floor count alone is not a finish stage.
    setChapter(progress < .22 ? 0 : progress < .70 ? 1 : 2);
  }
  function frame() {
    scheduled = false;
    if (sceneMetricsDirty) { sceneMetricsDirty = false; layoutBuilding(); layoutRibbon(); }
    const viewport = innerHeight;
    const total = document.documentElement.scrollHeight - viewport;
    // Read geometry together before DOM writes; SVG styles change only on a
    // chapter boundary, rather than invalidating its subtree on every scroll.
    const activeNavigation = readNavigation();
    const bounds = !paused ? scene.getBoundingClientRect() : null;
    const inScene = bounds && bounds.bottom > 0 && bounds.top < viewport;
    const artBounds = inScene ? buildingArt.getBoundingClientRect() : null;
    const ribbonBounds = !paused ? ribbon.parentElement.getBoundingClientRect() : null;
    line.style.transform = `scaleX(${total > 0 ? scrollY / total : 0})`;
    updateNavigation(activeNavigation);
    if (paused) return;
    if (!manual && inScene) {
      if (mobileScene) {
          // Follow the illustration through the viewport, without sticky positioning,
          // artificial scroll distance, timers, or interception of touch/wheel input.
          // The lower foundation remains visible before the first phase changes.
          const bottomSpace = innerWidth <= 600 ? 86 : 24;
          const end = sceneTop + artBounds.height * .35;
          const start = Math.max(end + 100, sceneViewport - bottomSpace - artBounds.height * .35);
          const center = artBounds.top + artBounds.height / 2;
          const progress = clamp((start - center) / (start - end));
          // Begin finishing while the chapter tabs are still comfortably visible.
          // Small dead bands keep toolbar changes / tiny scroll reversals stable.
          let next = progress < .33 ? 0 : progress < .58 ? 1 : 2;
          if (activeChapter === 0 && progress < .35) next = 0;
          if (activeChapter === 1 && progress > .31 && progress < .60) next = 1;
          if (activeChapter === 2 && progress > .56) next = 2;
          setChapter(next);
      } else {
      // Track the illustration, not the section heading. On mobile the heading
      // is far above the art; using it completed the building before it was seen.
      const start = viewport * .8;
      // Finish above the center reading position, leaving time for the facade
      // transition before the illustration reaches the fixed header.
      const end = -viewport * .075;
      const progress = clamp((start - artBounds.top) / Math.max(1, start - end));
      paintBuilding(progress);
      }
    }
    if (ribbonBounds && ribbonBounds.bottom > 0 && ribbonBounds.top < viewport) {
      // The complete word group sits on the reading line at the viewport center.
      // Travel is bounded across entry/exit, with native scroll controlling direction.
      const progress=clamp((viewport-ribbonBounds.top)/(viewport+ribbonBounds.height));
      ribbon.style.transform=`translate3d(${((.5-progress)*ribbonTravel).toFixed(2)}px,0,0)`;
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(frame); } }
  function updateMotion() {
    sceneMetricsDirty = true;
    root.classList.toggle('motion-off', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.disabled=preference.matches;
    toggle.querySelector('span').textContent = preference.matches ? 'התנועה מופחתת לפי הגדרות המכשיר' : paused ? 'הפעלת תנועה' : 'הפחתת תנועה';
    toggle.title=toggle.querySelector('span').textContent;
    document.dispatchEvent(new CustomEvent('site-motion-change', {detail:{paused}}));
    if (paused) { document.getAnimations().forEach(animation => animation.cancel()); if(!manual)paintBuilding(1); ribbon.style.transform = ''; }
    schedule();
  }
  toggle.addEventListener('click', () => { paused = !paused;savedMotion=paused?'reduced':'full';try{sessionStorage.setItem('yanai-motion',savedMotion);}catch{} updateMotion(); });
  preference.addEventListener('change', () => { paused = preference.matches||savedMotion==='reduced'; updateMotion(); });
  chapters.forEach((button, i) => {
    function select() { manual = true; manualScrollOrigin = scrollY; paintBuilding([.1,.5,1][i]); }
    button.addEventListener('click', select);
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowLeft') next = (i + (root.dir === 'rtl' ? 1 : chapters.length - 1)) % chapters.length;
      if (event.key === 'ArrowRight') next = (i + (root.dir === 'rtl' ? chapters.length - 1 : 1)) % chapters.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = chapters.length - 1;
      if (next !== undefined) { event.preventDefault(); chapters[next].click(); chapters[next].focus(); }
    });
  });
  addEventListener('scroll', () => {
    // A tap remains readable, then a deliberate scroll resumes the natural story.
    if (manual && Math.abs(scrollY - manualScrollOrigin) > 96) manual = false;
    schedule();
  }, {passive:true});
  function refreshSceneMetrics() { sceneMetricsDirty = true; schedule(); }
  addEventListener('resize', refreshSceneMetrics, {passive:true});
  window.visualViewport?.addEventListener('resize', refreshSceneMetrics, {passive:true});
  document.addEventListener('site-language-change', refreshSceneMetrics);
  document.fonts?.ready.then(refreshSceneMetrics);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });

  // Shared section entrances live in polish.js.
  document.querySelectorAll('.button,.explorer-tabs button').forEach(element => {
    element.addEventListener('pointermove', event => {
      if (paused || !finePointer.matches) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      element.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    }, {passive:true});
  });
  // The FAQ has interruptible opening and closing animations in polish.js.
  document.querySelectorAll('[data-explore]').forEach(button => button.addEventListener('click', () => {
    if (paused) return;
    const paths = button.querySelectorAll('path');
    paths.forEach(path => { path.setAttribute('pathLength','1'); path.animate([{strokeDasharray:1,strokeDashoffset:1},{strokeDasharray:1,strokeDashoffset:0}],{duration:420,easing:'ease-out'}); });
  }));
  const gallery = [...document.querySelectorAll('[data-photo]')].map(button => ({src:button.dataset.photo,alt:button.querySelector('img').alt}));
  const viewer = document.querySelector('#photo-viewer');
  let galleryIndex = 0;
  function galleryShow(index) {
    galleryIndex = (index + gallery.length) % gallery.length;
    viewer.querySelector('img').src = gallery[galleryIndex].src;
    viewer.querySelector('img').alt = gallery[galleryIndex].alt;
    viewer.querySelector('.gallery-caption').textContent = gallery[galleryIndex].alt;
    viewer.querySelector('.gallery-count').textContent = `${galleryIndex + 1} / ${gallery.length}`;
    if (!paused) viewer.querySelector('img').animate([{opacity:.25,transform:'scale(1.025)'},{opacity:1,transform:'scale(1)'}],{duration:400,easing:'ease-out'});
  }
  document.querySelectorAll('[data-photo]').forEach((button,index) => button.addEventListener('click', () => galleryShow(index)));
  viewer.querySelector('[data-gallery="next"]').addEventListener('click', () => galleryShow(galleryIndex + 1));
  viewer.querySelector('[data-gallery="previous"]').addEventListener('click', () => galleryShow(galleryIndex - 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); galleryShow(galleryIndex + (event.key === 'ArrowLeft' ? 1 : -1)); }
  });
  const navLinks = [...document.querySelectorAll('#navigation a')];
  const navSections = [...document.querySelectorAll('#expertise,#about,#process,#faq,#contact')];
  let previousNavigation = null;
  function readNavigation() {
    const readingLine = document.querySelector('.header').getBoundingClientRect().height + innerHeight * .18;
    let active = '';
    // DOM order, not IntersectionObserver callback arrival order, determines
    // the section. The underline therefore cannot bounce between two entries.
    navSections.forEach(section => { if (section.getBoundingClientRect().top <= readingLine) active = `#${section.id}`; });
    return active;
  }
  function updateNavigation(active) {
    if (active === previousNavigation) return;
    previousNavigation = active;
    navLinks.forEach(link => {
      if (link.hash === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  root.classList.add('experience-ready');
  updateMotion();
})();
