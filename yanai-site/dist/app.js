const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'פתיחת תפריט');
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
  if(open)navigation.querySelector('a')?.focus({preventScroll:true});
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  const wasOpen=navigation.classList.contains('open');
  closeMenu();
  if(wasOpen){
    const target=document.querySelector(link.getAttribute('href'));
    if(target){target.tabIndex=-1;target.focus({preventScroll:true});}
  }
}));
matchMedia('(min-width:1001px)').addEventListener('change',closeMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
});
// Section entrances are coordinated by polish.js to avoid competing observers.
const header = document.querySelector('.header');
const headerSurface=header.querySelector('.header-surface');
const headerMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let headerSurfaceAnimation=null,headerCircle={top:12,right:16,bottom:12,left:300,radius:26};
if(typeof headerSurface.animate==='function')headerSurface.style.transition='none';
let lastHeaderScroll=Math.max(0,window.scrollY),headerDownTravel=0;
let anchorScrolling=false,anchorScrollTimer;
function beginAnchorScroll(){anchorScrolling=true;clearTimeout(anchorScrollTimer);anchorScrollTimer=setTimeout(()=>{anchorScrolling=false;},1800);}
function endAnchorScroll(){anchorScrolling=false;clearTimeout(anchorScrollTimer);}
window.addEventListener('scrollend',endAnchorScroll,{passive:true});
window.addEventListener('wheel',endAnchorScroll,{passive:true});
window.addEventListener('touchstart',endAnchorScroll,{passive:true});
let headerHeight=header.offsetHeight||86,headerKeyboardMode=true;
function measureHeaderLogo(){
 const image=header.querySelector('.brand img'),brand=header.querySelector('.brand');
 const box=header.getBoundingClientRect(),mark=image.getBoundingClientRect(),link=brand.getBoundingClientRect();
 const radius=(Math.max(image.offsetWidth,image.offsetHeight)||40)/2+6;
 const x=mark.left+mark.width/2-box.left,y=mark.top+mark.height/2-box.top;
 headerCircle={top:Math.max(0,y-radius),right:Math.max(0,box.width-x-radius),bottom:Math.max(0,box.height-y-radius),left:Math.max(0,x-radius),radius};
 header.style.setProperty('--logo-top',`${Math.max(0,y-radius)}px`);
 header.style.setProperty('--logo-right',`${Math.max(0,box.width-x-radius)}px`);
 header.style.setProperty('--logo-bottom',`${Math.max(0,box.height-y-radius)}px`);
 header.style.setProperty('--logo-left',`${Math.max(0,x-radius)}px`);
 header.style.setProperty('--logo-radius',`${radius}px`);
 header.style.setProperty('--logo-local-x',`${mark.left+mark.width/2-link.left}px`);
 const controls=[...header.querySelectorAll('.brand-label,.header-inner>nav,.language-picker,.header-cta,.menu-toggle')];
 const distances=controls.map(control=>{const rect=control.getBoundingClientRect();return rect.width&&rect.height?Math.abs(rect.left+rect.width/2-(box.left+x)):0;});
 const farthest=Math.max(1,...distances);
 controls.forEach((control,i)=>{
  const rect=control.getBoundingClientRect(),ratio=distances[i]/farthest;
  control.style.setProperty('--nav-close-delay',`${Math.round((1-ratio)*100)}ms`);
  const logoOnRight=headerCircle.left>headerCircle.right;
  const farInset=logoOnRight?headerCircle.left:headerCircle.right;
  const revealedEdge=logoOnRight?rect.left-box.left:box.right-rect.right;
  // The control appears when the expanding surface reaches its actual location.
  const covered=Math.max(0,Math.min(1,(revealedEdge-4)/Math.max(1,farInset)));
  const openDelay=rect.width&&rect.height?Math.min(320,(1-Math.pow(covered,.25))*500):0;
  control.style.setProperty('--nav-open-delay',`${Math.round(openDelay)}ms`);
  control.style.setProperty('--nav-shift',`${rect.left+rect.width/2<box.left+x?12:-12}px`);
 });
}
measureHeaderLogo();
window.addEventListener('load',measureHeaderLogo,{once:true});
document.fonts?.ready.then(measureHeaderLogo);
document.addEventListener('site-language-change',()=>requestAnimationFrame(measureHeaderLogo));

function setHeaderCollapsed(collapsed){
 if(header.classList.contains('header-hidden')===collapsed)return;
 const from=getComputedStyle(headerSurface).clipPath;
 const interrupted=!!headerSurfaceAnimation;
 headerSurfaceAnimation?.cancel();headerSurfaceAnimation=null;
 header.classList.toggle('header-hidden',collapsed);
 header.classList.toggle('header-returning',!collapsed);
 if(headerMotionPreference.matches||document.documentElement.classList.contains('motion-off')||typeof headerSurface.animate!=='function')return;
 const c=headerCircle,logoOnRight=c.left>c.right;
 const corner=Number.parseFloat(getComputedStyle(header).getPropertyValue('--nav-corner'))||14;
 const shape=(top,right,bottom,left,roundTop,roundBottom=roundTop)=>`inset(${top}px ${right}px ${bottom}px ${left}px round ${roundTop}px ${roundTop}px ${roundBottom}px ${roundBottom}px)`;
 const circle=shape(c.top,c.right,c.bottom,c.left,c.radius),expanded=shape(0,0,0,0,0,corner);
 const end=collapsed?circle:expanded;
 // Sample one continuous path: no stop/restart between the sweep and rounding.
 // The far edge leads, while height and the edge next to the logo settle later.
 const frames=interrupted?[{clipPath:from},{clipPath:end}]:Array.from({length:25},(_,i)=>{
  const t=i/24,s=t*t*(3-2*t);
  const far=collapsed?1-Math.pow(1-s,2.7):Math.pow(1-t,4);
  const near=collapsed?Math.pow(s,3):Math.pow(1-t,3);
  const vertical=collapsed?Math.pow(s,4):Math.pow(1-t,2);
  const round=collapsed?s*s:Math.pow(1-t,3);
  return {offset:t,clipPath:shape(c.top*vertical,c.right*(logoOnRight?near:far),c.bottom*vertical,c.left*(logoOnRight?far:near),c.radius*round,corner+(c.radius-corner)*round)};
 });
 if(!interrupted)frames[0].clipPath=from;
 const inset=(from.split('round')[0].match(/[-\d.]+(?=px)/g)||[]).map(Number);
 const current=inset.length===1?Array(4).fill(inset[0]):inset.length===2?[...inset,...inset]:inset.length===3?[...inset,inset[1]]:inset;
 const target=collapsed?[c.top,c.right,c.bottom,c.left]:[0,0,0,0];
 const remaining=current.length===4?Math.min(1,Math.max(...current.map((n,i)=>Math.abs(n-target[i])))/Math.max(1,c.left,c.right)):1;
 const animation=headerSurface.animate(frames,{duration:interrupted?Math.round(140+240*remaining):collapsed?480:500,easing:interrupted?'cubic-bezier(.22,1,.36,1)':'linear'});
 headerSurfaceAnimation=animation;
 animation.finished.then(()=>{if(headerSurfaceAnimation===animation)headerSurfaceAnimation=null;},()=>{});
}
function revealHeader(){setHeaderCollapsed(false);headerDownTravel=0;}
function stopHeaderAnimation(){headerSurfaceAnimation?.cancel();headerSurfaceAnimation=null;}
headerMotionPreference.addEventListener('change',()=>{if(headerMotionPreference.matches)stopHeaderAnimation();});
document.addEventListener('site-motion-change',event=>{if(event.detail.paused)stopHeaderAnimation();});

function updateHeaderScroll(){
 // Clamp elastic overscroll so bouncing at either edge cannot fake a direction change.
 const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 const y=Math.max(0,maxScroll?Math.min(window.scrollY,maxScroll):window.scrollY);
 const delta=y-lastHeaderScroll;lastHeaderScroll=y;
 header.classList.toggle('scrolled',y>20);
 if(window.innerWidth>1000){
  stopHeaderAnimation();header.classList.remove('header-hidden','header-returning');headerDownTravel=0;return;
 }
 const interacting=navigation.classList.contains('open')||document.querySelector('dialog[open]')||(headerKeyboardMode&&header.contains(document.activeElement));
 if(y<=Math.max(120,headerHeight*1.5)||delta<0||interacting||anchorScrolling){revealHeader();return;}
 if(delta>0){
  headerDownTravel+=delta;
  // Keep navigation available through a meaningful stretch of downward reading.
  if(headerDownTravel>=60)setHeaderCollapsed(true);
 }
}
header.addEventListener('focusin',revealHeader);
menuButton.addEventListener('click',revealHeader);
document.addEventListener('pointerdown',()=>{headerKeyboardMode=false;},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Tab')headerKeyboardMode=true;});
window.addEventListener('scroll',updateHeaderScroll,{passive:true});
window.addEventListener('resize',()=>{headerHeight=header.offsetHeight||86;lastHeaderScroll=Math.max(0,window.scrollY);revealHeader();measureHeaderLogo();updateHeaderScroll();},{passive:true});
window.addEventListener('pageshow',()=>{lastHeaderScroll=Math.max(0,window.scrollY);revealHeader();});
updateHeaderScroll();

// Land on useful content, not on the section's decorative top padding.
function goToContact(){
 closeMenu();beginAnchorScroll();revealHeader();
 const form=document.querySelector('#contact-form');
 const target=window.innerWidth<=1000?form:document.querySelector('.contact-grid');
 form.classList.remove('soft-pending');form.classList.add('soft-arrived');
 // Layout offsets stay stable while the entrance animation is still running.
 let top=0;for(let node=target;node;node=node.offsetParent)top+=node.offsetTop;
 const offset=header.offsetHeight+12;
 window.scrollTo({top:Math.max(0,top-offset),behavior:headerMotionPreference.matches||document.documentElement.classList.contains('motion-off')?'instant':'smooth'});
 form.focus({preventScroll:true});
}
let projectStageChosen=false;
const projectStage=document.querySelector('#project-stage');
projectStage.addEventListener('change',()=>{projectStageChosen=true;});
function suggestProjectStage(value){
 if(projectStageChosen)return;
 projectStage.value=value;projectStage.dispatchEvent(new Event('change',{bubbles:true}));
 // Only an explicit form selection is final; a later stage card may refine this suggestion.
 projectStageChosen=false;
}
document.querySelectorAll('[data-intent]').forEach(button=>button.addEventListener('click',()=>suggestProjectStage({foundation:'יסודות',structure:'שלד',finish:'גמר'}[button.dataset.intent])));
// Continuing is an explicit commitment to the card, even after a previous form edit.
document.querySelector('#welcome-next').addEventListener('click',()=>{
 const chosen=document.querySelector('[data-intent][aria-pressed="true"]');
 const value={foundation:'יסודות',structure:'שלד',finish:'גמר'}[chosen?.dataset.intent];
 if(!value)return;
 const hadExplicitFormChoice=projectStageChosen;
 projectStage.value=value;projectStage.dispatchEvent(new Event('change',{bubbles:true}));
 projectStageChosen=hadExplicitFormChoice;
});
document.querySelector('.build-next').addEventListener('click',()=>{
 const chapter=Number(document.querySelector('.build-story').dataset.chapter)||0;
 suggestProjectStage(['יסודות','שלד','גמר'][chapter]);
});
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');
 if(!link||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const hash=link.getAttribute('href');
 if(hash==='#contact'){event.preventDefault();history.pushState(null,'',hash);goToContact();return;}
 const sections={'#expertise':'.section-heading','#about':'.about-copy','#process':'.section-heading','#faq':'.faq-intro'};
 if(!sections[hash])return;
 const section=document.querySelector(hash),target=section.querySelector(sections[hash])||section;
 event.preventDefault();closeMenu();beginAnchorScroll();revealHeader();history.pushState(null,'',hash);
 section.querySelectorAll('.soft-pending').forEach(el=>{el.classList.remove('soft-pending');el.classList.add('soft-arrived');});
 let top=0;for(let node=target;node;node=node.offsetParent)top+=node.offsetTop;
 section.tabIndex=-1;section.focus({preventScroll:true});
 window.scrollTo({top:Math.max(0,top-header.offsetHeight-16),behavior:headerMotionPreference.matches||document.documentElement.classList.contains('motion-off')?'instant':'smooth'});
});
window.addEventListener('load',()=>{if(location.hash==='#contact')goToContact();},{once:true});
document.querySelectorAll('[data-trade]').forEach(link => {
  link.addEventListener('click', () => { document.querySelector('#trade').value = link.dataset.trade; });
});
document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.dialog).showModal());
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();
