"""Author the building's semantic SVG layers in the existing isometric scene."""
from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
path=root/'dist/index.html'
html=path.read_text(encoding='utf-8')
if 'data-building-phase="finish"' in html:
 raise SystemExit('The SVG layers are already installed; edit index.html/building.css directly.')

def polygon(points,cls):
 return '<polygon class="'+cls+'" points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in points)+'"/>'
def line(points,cls):
 return '<polyline class="'+cls+'" points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in points)+'"/>'
def ground(u,v):return (105+185*u+170*v,354+76*u-66*v)
def face(side,u,z):return (105+185*u,354+76*u-z) if side=='left' else (290+170*u,430-66*u-z)
def panel(side,u,width,z,height,cls):
 return polygon([face(side,u,z),face(side,u+width,z),face(side,u+width,z+height),face(side,u,z+height)],cls)

foundation=['<g class="building-foundation" data-building-phase="foundation">',
 polygon([(82,347),(273,273),(483,359),(291,446)],'foundation-excavation'),
 polygon([(82,347),(291,432),(483,359),(483,376),(291,452),(82,365)],'foundation-soil'),
 polygon([ground(0,0),ground(1,0),ground(1,1),ground(0,1)],'foundation-bed')]
for u in [0,.5,1]: foundation.append(line([ground(u,0),ground(u,1)],'foundation-beam'))
for v in [0,.5,1]: foundation.append(line([ground(0,v),ground(1,v)],'foundation-beam'))
for u in [0,.5,1]:
 for v in [0,.5,1]:
  x,y=ground(u,v)
  foundation.append(polygon([(x-16,y),(x,y-6),(x+16,y),(x,y+7)],'foundation-footing'))
  foundation.append(f'<path class="foundation-rebar" d="M{x-4} {y}v-30m8 30v-30m-11 6h14m-14 7h14m-14 7h14"/>')
foundation.append('</g>')

finish=['<g class="building-finish" data-building-phase="finish" stroke-linejoin="round">',
 '<g class="finish-envelope">',
 panel('left',0,1,0,295,'finish-wall finish-wall-left'),
 panel('right',0,1,0,295,'finish-wall finish-wall-right')]
# Opaque plaster faces, recessed glazing and continuous sill bands on both elevations.
for side in ['left','right']:
 for z in [55,117,179,241]:
  finish.append(line([face(side,0,z-5),face(side,1,z-5)],'finish-course'))
  for col,u in enumerate([.10,.40,.70]):
   finish.append('<g class="finish-window" style="--window-order:'+str((241-z)//62+col)+'">')
   finish.append(panel(side,u,.20,z+4,34,'window-reveal'))
   finish.append(panel(side,u+.015,.17,z+7,28,'window-pane'))
   finish.append(line([face(side,u+.10,z+7),face(side,u+.10,z+35)],'window-mullion'))
   finish.append(line([face(side,u+.02,z+9),face(side,u+.07,z+33)],'window-reflection'))
   finish.append(line([face(side,u-.015,z+2),face(side,u+.215,z+2)],'window-sill'))
   finish.append('</g>')
 # Ground-floor windows leave space for a full-height front entrance.
 for u in ([.10,.36] if side=='left' else [.10,.40,.70]):
  finish.append(panel(side,u,.18,10,33,'window-reveal'))
  finish.append(panel(side,u+.015,.15,13,27,'window-pane'))
finish += [panel('left',.66,.24,0,49,'entrance-frame'),panel('left',.68,.20,2,44,'entrance-glass'),
 line([face('left',.78,2),face('left',.78,46)],'entrance-mullion'),
 line([face('left',.76,17),face('left',.76,24)],'entrance-handle'),
 polygon([(223,351),(273,372),(252,381),(202,360)],'entrance-canopy'),
 polygon([(202,360),(252,381),(252,385),(202,364)],'canopy-edge'),
 polygon([(105,49),(275,-17),(460,60),(290,126)],'finish-roof'),
 polygon([(105,49),(290,126),(460,60),(460,70),(290,136),(105,59)],'finish-parapet'),
 polygon([(119,49),(275,-11),(446,60),(290,120)],'roof-inset'),
 line([(105,354),(290,430),(460,364)],'finish-plinth'),'</g>',
 '<g class="finish-landscape">',
 polygon([(220,405),(272,426),(248,438),(196,416)],'entrance-step'),
 polygon([(196,416),(248,438),(248,442),(196,420)],'step-riser'),
 polygon([(196,420),(248,442),(223,455),(171,432)],'entrance-paving'),
 line([(184,426),(236,448)],'paving-joint'),
 polygon([(316,432),(449,380),(468,389),(335,441)],'garden-bed'),
 polygon([(316,432),(335,441),(468,389),(468,395),(335,448),(316,439)],'garden-edge')]
for x,y in [(338,427),(367,416),(397,404),(426,393)]:
 finish.append(f'<g class="finish-plant"><ellipse cx="{x}" cy="{y}" rx="13" ry="7"/><ellipse cx="{x-3}" cy="{y-5}" rx="9" ry="8"/><path d="M{x} {y+3}v-12"/></g>')
finish+=['</g></g>']

html=html.replace('</g><g class="building-level">','</g>'+''.join(foundation)+'<g class="building-level">',1)
html=html.replace('<g class="site-people"',''.join(finish)+'<g class="site-people"',1)
# Structure is visibly open. Glazing belongs only to the completed envelope.
html=re.sub(r'<path class="glass"[^>]+/>','',html)
html=re.sub(r'<div class="hero-proof">.*?</button></div>','',html,count=1)
html=html.replace('נבדוק התאמה לפרויקט','בדקו התאמה לפרויקט')
html=html.replace('</head>','<link rel="stylesheet" href="building.css?v=20261112-build2">\n</head>')
html=html.replace('motion.js?v=20261112-i18n1','motion.js?v=20261112-build2')
html=html.replace('locales.js?v=20261112-i18n1','locales.js?v=20261112-build2')
path.write_text(html,encoding='utf-8')
p=root/'translations/he.json';values=json.loads(p.read_text(encoding='utf-8'));values[values.index('נבדוק התאמה לפרויקט')]='בדקו התאמה לפרויקט';p.write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Added foundation and completed envelope; removed hero photo card; updated CTA.')
