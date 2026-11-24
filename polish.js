/* One entrance system, reversible accordions and shared hover feedback. */
(() => {
  const reduced = () => document.documentElement.classList.contains('motion-off') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entranceTargets = [...document.querySelectorAll('.welcome-heading,.welcome-options>button,.welcome-answer,.section-heading,.about-copy,.about-visual,.steps>li,.field figure,.faq-intro,.questions>details,.contact-copy,.contact-form,.explorer-tabs>button,.explorer-panel,.footer-top')];
  const groups = ['.welcome-options>button','.steps>li','.questions>details','.explorer-tabs>button','.field figure'];
  groups.forEach(selector => document.querySelectorAll(selector).forEach((element,i) => element.style.setProperty('--arrival-delay',`${Math.min(i,3)*95}ms`)));
  let entrances;
  if ('IntersectionObserver' in window) {
    entrances = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('soft-pending');
        entry.target.classList.remove('soft-repeat');
        entry.target.classList.add('soft-arrived');
        // Reveal slightly ahead of the viewport and keep visited content readable.
        // Re-hiding on every return created blank areas during navigation.
        entrances.unobserve(entry.target);
      }
    }),{threshold:0,rootMargin:'0px 0px 80px 0px'});
    entranceTargets.forEach(element => {
      element.classList.add('soft-reveal');
      const bounds=element.getBoundingClientRect();
      if (!reduced() && (bounds.top > innerHeight - 32 || bounds.bottom < 0)) element.classList.add('soft-pending');
      entrances.observe(element);
    });
  }
  document.addEventListener('focusin',event => {
    const pending=event.target.closest('.soft-pending');
    if(pending){pending.classList.remove('soft-pending');pending.classList.add('soft-arrived');}
  });

  const accordions=[...document.querySelectorAll('.questions details')].map(detail=>({detail,summary:detail.querySelector('summary'),animation:null,targetOpen:detail.open,version:0}));
  function settle(state){
    state.version++;
    state.animation?.cancel();state.animation=null;
    state.detail.open=state.targetOpen;
    state.detail.classList.toggle('is-expanded',state.targetOpen);
    state.detail.classList.remove('faq-animating');
  }
  accordions.forEach(state=>{
    state.summary.addEventListener('click',event=>{
      event.preventDefault();
      const start=state.detail.getBoundingClientRect().height;
      state.targetOpen=!state.targetOpen;
      const version=++state.version;
      state.animation?.cancel();
      state.detail.classList.toggle('is-expanded',state.targetOpen);
      if(reduced()){settle(state);return;}
      state.detail.open=true;
      const end=state.targetOpen?state.detail.getBoundingClientRect().height:state.summary.getBoundingClientRect().height+2;
      state.detail.classList.add('faq-animating');
      state.animation=state.detail.animate([{height:`${start}px`},{height:`${end}px`}],{duration:state.targetOpen?460:340,easing:'cubic-bezier(.22,1,.36,1)'});
      state.animation.onfinish=()=>{if(state.version===version)settle(state);};
    });
  });
  addEventListener('resize',()=>accordions.forEach(settle),{passive:true});
  document.addEventListener('site-motion-change',event=>{
    if(event.detail.paused){
      entranceTargets.forEach(element=>element.classList.remove('soft-pending'));
      accordions.forEach(settle);
    }
  });

  const pointer=matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.welcome-options>button,.questions details,.explorer-tabs button,.steps li,.contact-form').forEach(surface=>{
    let frame=0,point;
    surface.addEventListener('pointermove',event=>{
      if(reduced()||!pointer.matches)return;
      point={x:event.clientX,y:event.clientY};
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;const rect=surface.getBoundingClientRect();
        surface.style.setProperty('--glow-x',`${point.x-rect.left}px`);
        surface.style.setProperty('--glow-y',`${point.y-rect.top}px`);
      });
    },{passive:true});
  });
})();
