const profiles = [
 {name:'טפסנים',phase:'בונים את השלד',title:'טפסנים לעבודות\nהשלד שלכם.',description:'צריכים כוח אדם לטפסנות ביסודות, בעמודים או בתקרות? נבחן את שלב הביצוע, היקף העבודה ומספר העובדים הנדרש.',tags:['יסודות','עמודים וקורות','תקרות'],image:'yanai-formwork-1200.webp',srcset:'assets/yanai-formwork-640.webp 640w, assets/yanai-formwork-1200.webp 1200w',position:'50% 40%',alt:'תקריב טפסות קירות מתוך אתר הבנייה'},
 {name:'ברזלנים',phase:'החוזק שבפנים',title:'ברזלנים ליסודות,\nלעמודים ולקורות.',description:'עבודות ברזל לשלד המבנה. כוח אדם מקצועי לעבודות ביסודות, בעמודים ובקורות, לפי צורכי הפרויקט.',tags:['זיון בטון','עבודות שלד','יסודות'],image:'yanai-rebar-1200.webp',srcset:'assets/yanai-rebar-640.webp 640w, assets/yanai-rebar-1200.webp 1200w',position:'48% 50%',alt:'תקריב רשתות ברזל מתוך אתר הבנייה'},
 {name:'טייחים',phase:'מגיעים לגמר',title:'טייחים לעבודות\nפנים וחוץ.',description:'עבודות טיח פנים וחוץ. מתאימים את כוח האדם לסוג העבודה, למצב האתר ולהיקף הביצוע הנדרש.',tags:['טיח פנים','טיח חוץ','עבודות גמר'],image:'yanai-plastering-1080.webp',srcset:'assets/yanai-plastering-640.webp 640w, assets/yanai-plastering-1080.webp 1080w',position:'38% 72%',alt:'עובד ינאי במהלך עבודות טיח'},
 {name:'רצפים',phase:'הפרטים שעושים את ההבדל',title:'רצפים לעבודות\nריצוף וחיפוי.',description:'ריצוף וחיפוי בפורצלן ובאבן טבעית. מתחילים בהבנת החומרים, השטחים והעבודה הנדרשת בפרויקט שלכם.',tags:['ריצוף','חיפוי','אבן ופורצלן'],image:'yanai-tiling-1500.webp',srcset:'assets/yanai-tiling-640.webp 640w, assets/yanai-tiling-1500.webp 1500w',position:'60% 68%',alt:'עבודת ריצוף מתוך תמונות השטח של ינאי'}
];
const tradeTabs=[...document.querySelectorAll('[data-explore]')];
const tradePhoto=document.querySelector('#explorer-image');
const tradeImageSizes='(max-width: 600px) 90vw, 50vw';
const tradeImageCache=new Map();
let tradeImageRequest=0;
let finishTradeTransition=()=>{};
function prepareTradeImage(index,priority='low'){
 const existing=tradeImageCache.get(index);
 if(existing){if(priority==='high')existing.image.fetchPriority='high';return existing.ready;}
 const profile=profiles[index],image=new Image();
 image.decoding='async';image.fetchPriority=priority;
 const entry={image,ready:null};
 entry.ready=new Promise((resolve,reject)=>{
  image.onload=async()=>{
   try {if(image.decode)await image.decode();resolve(image);}
   catch(error){tradeImageCache.delete(index);reject(error);}
  };
  image.onerror=()=>{tradeImageCache.delete(index);reject(new Error('Trade image unavailable'));};
 });
 tradeImageCache.set(index,entry);
 // Match the visible image's responsive selection; don't fetch both resolutions.
 image.sizes=tradeImageSizes;image.srcset=profile.srcset||'';image.src=`assets/${profile.image}`;
 return entry.ready;
}
function idleTradeTask(task){
 if('requestIdleCallback' in window)requestIdleCallback(task,{timeout:2000});
 else setTimeout(task,500);
}
function warmTradeImages(){
 if(navigator.connection?.saveData)return;
 let index=0;
 function next(){
  if(index>=profiles.length)return;
  if(document.hidden){document.addEventListener('visibilitychange',resume);return;}
  const current=index++;
  prepareTradeImage(current).catch(()=>{}).finally(()=>idleTradeTask(next));
 }
 function resume(){if(!document.hidden){document.removeEventListener('visibilitychange',resume);idleTradeTask(next);}}
 idleTradeTask(next);
}
if(document.readyState==='complete')warmTradeImages();
else window.addEventListener('load',warmTradeImages,{once:true});
// Intent can promote a queued image without waiting for the background queue.
tradeTabs.forEach((tab,index)=>{
 const warm=()=>prepareTradeImage(index,'high').catch(()=>{});
 tab.addEventListener('pointerenter',warm,{passive:true});
 tab.addEventListener('focus',warm);
 tab.addEventListener('touchstart',warm,{passive:true});
});
async function showTradeImage(index){
 const request=++tradeImageRequest,profile=profiles[index];
 const frame=tradePhoto.parentElement;
 frame.setAttribute('aria-busy','true');
 try {
  const prepared=await prepareTradeImage(index,'high');
  if(request!==tradeImageRequest)return;
  // Freeze the decoded responsive candidate for this swap so the reveal cannot
  // run ahead of a second browser-selected request during a viewport change.
  finishTradeTransition();
  const previous=tradePhoto.cloneNode(false);
  previous.removeAttribute('id');previous.removeAttribute('srcset');
  previous.src=tradePhoto.currentSrc||tradePhoto.src;
  previous.alt='';previous.setAttribute('aria-hidden','true');
  previous.className='trade-photo-previous';
  previous.style.visibility=tradePhoto.style.visibility;
  frame.append(previous);
  let animations=[],wipe=null;
  const finish=()=>{animations.forEach(animation=>animation.cancel());previous.remove();wipe?.remove();tradePhoto.style.visibility='';};
  finishTradeTransition=finish;
  tradePhoto.style.visibility='hidden';
  tradePhoto.removeAttribute('srcset');
  tradePhoto.src=prepared.currentSrc||prepared.src;
  tradePhoto.alt=profile.alt;tradePhoto.style.objectPosition=profile.position||'50% 50%';
  if(tradePhoto.decode)await tradePhoto.decode();
  if(request!==tradeImageRequest)return;
  tradePhoto.style.visibility='';
  frame.setAttribute('aria-busy','false');
  if(!motionPreference.matches&&!siteMotionPaused&&tradePhoto.animate){
   // Reveal from physical left to right in every language. The outgoing image
   // also fades, preserving the crossfade beneath a slim moving reveal edge.
   wipe=document.createElement('span');
   wipe.className='trade-photo-wipe';wipe.setAttribute('aria-hidden','true');frame.append(wipe);
   const direction=document.documentElement.dir==='rtl'?1:-1;
   const timing={duration:620,easing:'cubic-bezier(.4,0,.2,1)'};
   animations=[
    tradePhoto.animate([{transform:`translateX(${direction*28}px) scale(1.035)`},{transform:'translateX(0) scale(1)'}],timing),
    previous.animate([{opacity:1,clipPath:'inset(0 0 0 0)'},{opacity:0,clipPath:'inset(0 0 0 100%)'}],timing),
    wipe.animate([{transform:'translateX(-100%)',opacity:0},{opacity:.85,offset:.15},{opacity:.85,offset:.8},{transform:'translateX(0)',opacity:0}],timing)
   ];
   animations[1].onfinish=finish;
  }else finish();
  document.dispatchEvent(new CustomEvent('trade-image-ready',{detail:{index}}));
 } catch {
  if(request!==tradeImageRequest)return;
  finishTradeTransition();
  tradePhoto.style.visibility='hidden';frame.setAttribute('aria-busy','false');
 }
}
function showTrade(index,focus=false){
 const profile=profiles[index];
 const prompts=['איזה אלמנט יוצקים, כמה עובדים דרושים ומתי רוצים להתחיל?','אילו עבודות ברזל מתוכננות ומה היקף כוח האדם הנדרש?','טיח פנים או חוץ, מה היקף העבודה ומתי האתר מוכן לכניסה?','מה סוג הריצוף או החיפוי, מה השטח ומה מועד ההתחלה הרצוי?'];
 document.querySelector('#explorer-hint').textContent='לקראת השיחה: '+prompts[index];
 tradeTabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
 const panel=document.querySelector('#trade-panel');panel.setAttribute('aria-labelledby',`trade-tab-${index}`);
 const title=document.querySelector('#explorer-title');title.replaceChildren();
 profile.title.split('\n').forEach((line,i)=>{if(i)title.append(document.createElement('br'));title.append(document.createTextNode(line+' '));});
 document.querySelector('#explorer-phase').textContent=profile.phase;
 document.querySelector('#explorer-description').textContent=profile.description;
 document.querySelector('#explorer-number').textContent=`0${index+1}`;
 showTradeImage(index);
 const tags=document.querySelector('#explorer-tags');tags.replaceChildren();profile.tags.forEach(text=>{const tag=document.createElement('span');tag.textContent=text;tags.append(tag);});
 const cta=document.querySelector('#explorer-cta');cta.dataset.trade=profile.name;cta.replaceChildren(document.createTextNode(`נדבר על ${profile.name} `));const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↙';cta.append(arrow);
 const content=document.querySelector('.explorer-content');content.classList.remove('changed');requestAnimationFrame(()=>content.classList.add('changed'));
 if(focus)tradeTabs[index].focus({preventScroll:true});
}
tradeTabs.forEach((tab,i)=>{tab.addEventListener('click',()=>showTrade(i));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft')next=(i+(document.documentElement.dir==='rtl'?1:3))%4;if(event.key==='ArrowRight')next=(i+(document.documentElement.dir==='rtl'?3:1))%4;if(event.key==='Home')next=0;if(event.key==='End')next=3;if(next!==undefined){event.preventDefault();showTrade(next,true);}});});
const video=document.querySelector('#hero-video');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let videoLoaded=false,visibleVideo=false,siteMotionPaused=false,playPending=false,videoFailed=false;
try { siteMotionPaused=sessionStorage.getItem('yanai-motion')==='reduced'; } catch {}
const conserveData=navigator.connection?.saveData===true;
const shouldPlayVideo=()=>visibleVideo&&!document.hidden&&!siteMotionPaused&&!motionPreference.matches&&!conserveData&&!videoFailed;
function syncVideoPlayback(){
 if(!shouldPlayVideo()){video.pause();return;}
 if(!videoLoaded){
  videoLoaded=true;
  // Once motion/data preferences permit playback, let the browser buffer ahead.
  video.preload='auto';
  video.querySelectorAll('source').forEach(source=>source.src=source.dataset.src);
  video.load();
 }
 if(playPending||!video.paused)return;
 playPending=true;
 video.play().catch(()=>{
  // Autoplay can be denied; the matching poster stays visible without a broken control.
 }).finally(()=>{
  playPending=false;
  // A visibility or motion change may occur while play() is still pending.
  if(!shouldPlayVideo())video.pause();
 });
}
document.addEventListener('site-motion-change',event=>{siteMotionPaused=event.detail.paused;if(siteMotionPaused)finishTradeTransition();syncVideoPlayback();});
new IntersectionObserver(([entry])=>{visibleVideo=entry.isIntersecting;syncVideoPlayback();},{threshold:.15}).observe(video);
document.addEventListener('visibilitychange',syncVideoPlayback);
motionPreference.addEventListener('change',()=>{if(motionPreference.matches)finishTradeTransition();syncVideoPlayback();});
video.addEventListener('error',()=>{videoFailed=true;video.pause();});
const viewer=document.querySelector('#photo-viewer');
document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{viewer.querySelector('img').src=button.dataset.photo;viewer.querySelector('img').alt=button.querySelector('img').alt;viewer.showModal();}));
viewer.querySelector('button').addEventListener('click',()=>viewer.close());
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
const mobileBar=document.querySelector('.mobile-contact');
const floatingContact=document.querySelector('.floating-contact');
let contactVisible=false,footerVisible=false,contactPositionFrame=0,contactTravel=224;
function measureContactTravel(){
 // Layout offsets ignore the film's entrance transform, keeping the slot stable.
 const layoutTop=element=>{let top=0;for(let node=element;node;node=node.offsetParent)top+=node.offsetTop;return top;};
 const actionTop=layoutTop(document.querySelector('.hero-actions-row'));
 const film=document.querySelector('.cinema-film');
 const filmBottom=layoutTop(film)+film.offsetHeight;
 const size=floatingContact.offsetHeight||48;
 const bottom=Number.parseFloat(getComputedStyle(floatingContact).bottom)||10;
 // Use the actual free space below the film, not an arbitrary viewport offset.
 // In the compact mobile hero the film is behind the headline. Park the
 // floating icon beside the secondary action, away from the service copy.
 const startTop=window.innerWidth<=600
  ?actionTop+document.querySelector('.hero-actions-row>.button').offsetHeight+10
  :(filmBottom+actionTop-size)/2;
 contactTravel=window.innerHeight-bottom-size-startTop;
 floatingContact.style.setProperty('--contact-start-offset',`${-contactTravel}px`);
 mobileBarState();
}
function positionFloatingContact(){
 contactPositionFrame=0;
 const progress=Math.min(1,Math.max(0,window.scrollY/500));
 // Only composited movement during scroll; the final position matches the dock icon.
 floatingContact.style.setProperty('--contact-float-offset',`${-contactTravel*(1-progress)}px`);
 floatingContact.style.setProperty('--contact-float-radius',`${24-12*progress}px`);
}
function mobileBarState(){
 const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
 const visible=window.scrollY>500&&!contactVisible&&!footerVisible&&!editing;
 mobileBar.classList.toggle('visible',visible);mobileBar.inert=!visible;
 floatingContact.inert=footerVisible||(window.innerWidth<=1000&&(contactVisible||editing));
 if(!contactPositionFrame)contactPositionFrame=requestAnimationFrame(positionFloatingContact);
 // The contact section already provides direct WhatsApp, phone and email links.
 // Keep floating controls away from fields, especially above a phone keyboard.
 document.body.classList.toggle('contact-in-view',contactVisible);
 document.body.classList.toggle('footer-in-view',footerVisible);
 document.body.classList.toggle('editing-form',editing);
}
new IntersectionObserver(entries=>{contactVisible=entries[0].isIntersecting;document.querySelector('#contact').classList.toggle('contact-visible',contactVisible);mobileBarState();},{threshold:0}).observe(document.querySelector('#contact'));
new IntersectionObserver(entries=>{footerVisible=entries[0].isIntersecting;mobileBarState();},{threshold:0}).observe(document.querySelector('footer'));
measureContactTravel();positionFloatingContact();
window.addEventListener('resize',measureContactTravel,{passive:true});
window.addEventListener('load',measureContactTravel,{once:true});
document.fonts?.ready.then(measureContactTravel);
document.addEventListener('site-language-change',measureContactTravel);
window.addEventListener('scroll',mobileBarState,{passive:true});document.addEventListener('focusin',mobileBarState);document.addEventListener('focusout',()=>requestAnimationFrame(mobileBarState));mobileBarState();

const steps=[...document.querySelectorAll('.steps li')];
const stepObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('step-active');});},{threshold:.65});steps.forEach(step=>stepObserver.observe(step));
