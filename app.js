/* Address matching is local. Yandex supplies the map, not the notary decision. */
(function(){
'use strict';
if(new URLSearchParams(window.location.search).get('embed')==='1')document.body.classList.add('embedded');
const data=window.NOTARY_DATA,geo=window.NOTARY_ZONES,config=window.NOTARY_CONFIG||{},engine=NotarySearch.create(data);
const $=id=>document.getElementById(id),svg=$('schematic'),sectionById=new Map(data.sections.map(s=>[s.number,s]));
let selected=null,currentAddress=null,map=null,placemark=null,polygons=[],viewBox=[...data.full],drag=null,debounce=null;
const norm=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const cityName=n=>n===0?'Волгоград':'Волжский';
function sectionStyle(n){const s=sectionById.get(n),yes=selected===n,dim=selected!==null&&!yes;return {fillColor:s.color,fillOpacity:yes?.48:dim?.1:.24,strokeColor:yes?'#01579b':s.color,strokeWidth:yes?3:1.5,strokeOpacity:dim?.36:.85}}
function updateView(){svg.setAttribute('viewBox',viewBox.join(' '));const scale=data.full[2]/viewBox[2];svg.classList.toggle('zoomed',scale>2.4);svg.querySelectorAll('.number').forEach(t=>{t.style.display=scale<1.6&&Number(t.dataset.area)<1.3?'none':'';t.style.fontSize=12/Math.max(1,Math.sqrt(scale))+'px'});svg.querySelectorAll('.road-label').forEach(t=>t.style.fontSize=10/Math.sqrt(scale)+'px');const marker=$('address-marker');if(marker)marker.setAttribute('r',Math.max(.6,viewBox[2]/110))}
function fitSvg(bounds){let[x,y,w,h]=bounds;w=Math.max(w,5);h=Math.max(h,5);viewBox=[x-w*.07,y-h*.07,w*1.14,h*1.14];updateView()}
function removeMarker(){const m=$('address-marker');if(m)m.remove();if(map&&placemark){map.geoObjects.remove(placemark);placemark=null}}
function clear(){selected=null;currentAddress=null;removeMarker();$('zone-card').hidden=true;$('result').hidden=true;svg.querySelectorAll('.zone').forEach(p=>p.classList.remove('selected','dimmed'));polygons.forEach(({n,p})=>p.options.set(sectionStyle(n)));}
function selectZone(n,fit=true,keepResult=false){const s=sectionById.get(n);if(!s)return;if(!keepResult){currentAddress=null;removeMarker();$('result').hidden=true}selected=n;svg.querySelectorAll('.zone').forEach(p=>{p.classList.toggle('selected',Number(p.dataset.section)===n);p.classList.toggle('dimmed',Number(p.dataset.section)!==n)});polygons.forEach(({n:pn,p})=>p.options.set(sectionStyle(pn)));$('zone-card').textContent=s.name;$('zone-card').hidden=false;if(fit){fitSvg(s.svgBounds);if(map)map.setBounds(s.bounds,{checkZoomRange:true,zoomMargin:50,duration:250})}}
function addressLabel(row){if(row[9])return row[9];const s=data.streets[row[0]];return cityName(s.city)+', '+s.name+', '+row[1]}
function showMarker(row){removeMarker();if(Number.isFinite(row[7])&&Number.isFinite(row[8])){const marker=document.createElementNS('http://www.w3.org/2000/svg','circle');marker.id='address-marker';marker.setAttribute('class','address-marker');marker.setAttribute('cx',row[7]);marker.setAttribute('cy',row[8]);svg.append(marker);fitSvg([row[7]-6,row[8]-6,12,12])}if(map){placemark=new ymaps.Placemark([row[2],row[3]],{hintContent:addressLabel(row)},{preset:'islands#redDotIcon'});map.geoObjects.add(placemark);map.setCenter([row[2],row[3]],16,{duration:250})}}
function appendNotaryContacts(card, sectionNumber) {
  const contact = (window.NOTARY_CONTACTS || {})[sectionNumber];
  if (!contact) return;
  const list = document.createElement('dl');
  list.className = 'result-contacts';
  if (contact.address) {
    const item = document.createElement('div');
    const label = document.createElement('dt');
    label.textContent = 'Адрес конторы';
    const value = document.createElement('dd');
    value.textContent = contact.address;
    item.append(label, value);
    list.append(item);
  }
  if (contact.phones && contact.phones.length) {
    const item = document.createElement('div');
    const label = document.createElement('dt');
    label.textContent = contact.phones.length > 1 ? 'Телефоны' : 'Телефон';
    const value = document.createElement('dd');
    for (const phone of contact.phones) {
      const text = typeof phone === 'string' ? phone : phone.label;
      let digits = String(text || '').replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (digits.length === 10) digits = '7' + digits;
      if (!/^7[0-9]{10}$/.test(digits)) {
        const unlinked = document.createElement('span');
        unlinked.textContent = text;
        value.append(unlinked);
        continue;
      }
      const link = document.createElement('a');
      link.href = 'tel:+' + digits;
      link.textContent = text;
      value.append(link);
    }
    item.append(label, value);
    list.append(item);
  }
  if (list.children.length) card.append(list);
}

function resolveAddress(i){const r=typeof i==='number'?data.addresses[i]:i,s=sectionById.get(r[4]);$('suggestions').replaceChildren();$('search-status').textContent='';$('yandex-search').hidden=true;$('address-input').value=addressLabel(r);if(s)selectZone(s.number,false,true);else clear();currentAddress=r;showMarker(r);const card=$('result');card.replaceChildren();card.hidden=false;card.className=r[5]&14||!s?'warning':'';
 const address=document.createElement('div');address.className='result-address';address.textContent=addressLabel(r);card.append(address);
 const number=document.createElement('div');number.className='result-number';number.textContent=s?(r[5]&14?'Предварительно · участок № '+s.number:'Участок № '+s.number):'Требуется уточнение';card.append(number);
 if(s){const name=document.createElement('div');name.className='result-name';name.textContent=s.notary;card.append(name)}
 if(s)appendNotaryContacts(card,s.number);
 const notes=[];if(r[9])notes.push('Местоположение адреса — Яндекс Карты.');if(!s)notes.push('Точка адреса находится вне нанесённых зон. Автоматически выбрать нотариуса нельзя.');else if(r[5]&12){notes.push('Адрес имеет противоречивую привязку. Показан участок по рабочему контуру; результат нужно уточнить.');if(r[6]&&r[6]!==r[4])notes.push('В перечне проверки также встречается участок № '+r[6]+'.')}else if(r[5]&2)notes.push('Результат определён по рабочей карте. Принадлежность этого адреса к перечню отдельно не подтверждена.');if(r[5]&1)notes.push('Адрес рядом с границей участка — рекомендуем сверить принадлежность.');
 if(notes.length){const note=document.createElement('p');note.className='result-note';note.textContent=notes.join(' ');card.append(note)}
}
function doSearch(submit=false){clearTimeout(debounce);const q=$('address-input').value.trim();if(!q){$('suggestions').replaceChildren();$('search-status').textContent='';$('yandex-search').hidden=true;return}const city=$('address-city').value,res=engine.search(q,city==='all'?null:Number(city));$('suggestions').replaceChildren();$('search-status').textContent=res.error||res.message||'';const parsed=engine.parse(q,city==='all'?null:Number(city));$('yandex-search').hidden=!map||!!parsed.error||!parsed.house;
 if(submit&&res.exact&&res.total===1){resolveAddress(res.items[0]);return}
 for(const i of res.items){const r=data.addresses[i],b=document.createElement('button');b.type='button';b.className='candidate';b.textContent=addressLabel(r);if(r[5]&8){const warning=document.createElement('small');warning.textContent='Есть несколько привязок адреса — требуется уточнение';b.append(warning)}b.onclick=()=>resolveAddress(i);$('suggestions').append(b)}
 if(res.total>res.items.length)$('search-status').textContent+=' Показаны первые '+res.items.length+' из '+res.total+'. Уточните улицу и номер.';
}
let remoteSearch=0;
$('yandex-search').onclick=async()=>{if(!map)return;const query=$('address-input').value.trim(),city=$('address-city').value,q=engine.parse(query,city==='all'?null:Number(city));if(q.error||!q.house)return;const requestId=++remoteSearch,button=$('yandex-search');button.disabled=true;$('suggestions').replaceChildren();$('result').hidden=true;$('search-status').textContent='Ищем точный адрес на Яндекс Картах…';try{const bounds=data.sections.map(s=>s.bounds),bbox=[[Math.min(...bounds.map(b=>b[0][0])),Math.min(...bounds.map(b=>b[0][1]))],[Math.max(...bounds.map(b=>b[1][0])),Math.max(...bounds.map(b=>b[1][1]))]];const text=q.city!==null&&!/(волгоград|волжский)/iu.test(query)?cityName(q.city)+', '+query:query;const response=await ymaps.geocode(text,{results:5,boundedBy:bbox,strictBounds:true});if(requestId!==remoteSearch||$('address-input').value.trim()!==query)return;const results=[];response.geoObjects.each(obj=>{const md=obj.properties.get('metaDataProperty.GeocoderMetaData')||{};const localities=obj.getLocalities(),foundCity=localities.includes('Волгоград')?0:localities.includes('Волжский')?1:null;if(md.kind!=='house'||md.precision!=='exact'||foundCity===null||(q.city!==null&&q.city!==foundCity)||NotarySearch.house(obj.getPremiseNumber()||'')!==q.house)return;const street=obj.getThoroughfare()||'',words=NotarySearch.tokens(street);if(!q.words.every(w=>words.some(t=>t===w||t.startsWith(w)||w.startsWith(t))))return;const coords=obj.geometry.getCoordinates(),hit=NotaryGeometry.lookup(coords[1],coords[0],geo.features),n=hit.sections.length===1?hit.sections[0]:0;results.push([-1,obj.getPremiseNumber(),coords[0],coords[1],n,2|(hit.nearBoundary?1:0)|(hit.sections.length>1?4:0),0,null,null,obj.getAddressLine()])});
 if(!results.length){$('search-status').textContent='Яндекс не подтвердил точный дом с указанным номером и литерой. Ближайший адрес не подставлен.';return}$('search-status').textContent='Яндекс нашёл адрес. Проверьте написание и выберите его:';for(const r of results){const b=document.createElement('button');b.className='candidate';b.textContent=r[9];b.onclick=()=>resolveAddress(r);$('suggestions').append(b)}
 }catch(error){console.warn('Yandex address search: '+String(error&&error.message||error).replace(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/gi,'[redacted]'));if(requestId===remoteSearch)$('search-status').textContent='Поиск Яндекса сейчас недоступен. Можно продолжить поиск по подготовленным адресам.'}finally{button.disabled=false}};
function fitCity(city){clear();const ss=data.sections.filter(s=>s.city===city);if(!ss.length)return;const bs=ss.map(s=>s.svgBounds),x=Math.min(...bs.map(b=>b[0])),y=Math.min(...bs.map(b=>b[1])),right=Math.max(...bs.map(b=>b[0]+b[2])),bottom=Math.max(...bs.map(b=>b[1]+b[3]));fitSvg([x,y,right-x,bottom-y]);if(map){const lo=[Math.min(...ss.map(s=>s.bounds[0][0])),Math.min(...ss.map(s=>s.bounds[0][1]))],hi=[Math.max(...ss.map(s=>s.bounds[1][0])),Math.max(...ss.map(s=>s.bounds[1][1]))];map.setBounds([lo,hi],{checkZoomRange:true,zoomMargin:35})}}
$('address-form').onsubmit=e=>{e.preventDefault();doSearch(true)};
$('address-input').oninput=()=>{remoteSearch++;clear();$('suggestions').replaceChildren();$('search-status').textContent='';$('yandex-search').hidden=true;clearTimeout(debounce);debounce=setTimeout(()=>doSearch(false),170)};
$('address-city').onchange=()=>{remoteSearch++;clear();doSearch(false);if($('address-city').value!=='all')fitCity(Number($('address-city').value))};
$('reset').onclick=clear;$('fit-vg').onclick=()=>fitCity(0);$('fit-vz').onclick=()=>fitCity(1);$('fit-all').onclick=()=>{clear();fitSvg(data.full);if(map)map.setBounds(polygons.reduce((b,{n})=>{const s=sectionById.get(n);return [[Math.min(b[0][0],s.bounds[0][0]),Math.min(b[0][1],s.bounds[0][1])],[Math.max(b[1][0],s.bounds[1][0]),Math.max(b[1][1],s.bounds[1][1])]]},[[90,180],[-90,-180]]),{checkZoomRange:true,zoomMargin:35})};
function svgPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
function zoom(f,p){const w=viewBox[2]*f;if(w<data.full[2]/500||w>data.full[2]*3)return;const x=p?p.x:viewBox[0]+viewBox[2]/2,y=p?p.y:viewBox[1]+viewBox[3]/2;viewBox=[x+(viewBox[0]-x)*f,y+(viewBox[1]-y)*f,w,viewBox[3]*f];updateView()}
$('zoom-in').onclick=()=>zoom(.75);$('zoom-out').onclick=()=>zoom(1.33);svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.18:1/1.18,svgPoint(e))},{passive:false});
svg.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,p:svgPoint(e),moved:false,target:e.target};svg.setPointerCapture(e.pointerId)};svg.onpointermove=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(drag.moved){const now=svgPoint(e);viewBox[0]+=drag.p.x-now.x;viewBox[1]+=drag.p.y-now.y;updateView()}};svg.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;svg.releasePointerCapture(e.pointerId);if(!d.moved){const zone=d.target.closest('.zone');if(zone)selectZone(Number(zone.dataset.section),false)}};svg.onpointercancel=()=>drag=null;
svg.querySelectorAll('.zone').forEach(p=>p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectZone(Number(p.dataset.section),false)}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){clear();$('suggestions').replaceChildren()}});
function mapFailed(){if(map)return;$('map-label').textContent='Подложка Яндекса недоступна · показана схема. Поиск адресов работает.';$('map-label').classList.remove('yandex')}
function initYandex(){try{map=new ymaps.Map('yandex-map',{center:[48.76,44.55],zoom:11,controls:['zoomControl','typeSelector','fullscreenControl']},{suppressMapOpenBlock:false});
 for(const f of geo.features){const n=f.properties.section_number,coords=f.geometry.coordinates.map(r=>r.map(p=>[p[1],p[0]]));const p=new ymaps.Polygon(coords,{hintContent:escape(sectionById.get(n).name),balloonContent:escape(sectionById.get(n).name)},sectionStyle(n));p.events.add('click',()=>selectZone(n,false));map.geoObjects.add(p);polygons.push({n,p})}
 $('yandex-map').hidden=false;$('schematic-wrap').hidden=true;document.querySelector('.schematic-zoom').hidden=true;map.container.fitToViewport();$('map-label').classList.add('yandex');$('map-label').textContent='Яндекс Карты';if(currentAddress)showMarker(currentAddress);else if(selected)selectZone(selected);else $('fit-all').click();
 }catch(error){map=null;mapFailed()}}
fitSvg(data.full);
if(config.yandexApiKey){const s=document.createElement('script');s.src='https://api-maps.yandex.ru/2.1/?apikey='+encodeURIComponent(config.yandexApiKey)+'&lang=ru_RU';s.async=true;s.onload=()=>{if(window.ymaps)ymaps.ready(initYandex,mapFailed);else mapFailed()};s.onerror=mapFailed;document.head.append(s);setTimeout(mapFailed,20000)}else mapFailed();
})();
