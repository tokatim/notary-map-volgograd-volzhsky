(function(root){
'use strict';
const stop=new Set(['улица','ул','проспект','просп','пр','кт','пркт','переулок','пер','проезд','прд','шоссе','ш','бульвар','бул','бр','площадь','пл','набережная','наб','им','имени','генерала','маршала','капитана','лейтенанта','сержанта','академика','полковника','композитора','дивизии','в','и','г','город','д','дом','рф','россия','область','волгоградская']);
const suffixes=['скими','ского','скому','ской','ская','скую','ские','ских','ском','ному','ного','ный','ная','ной','ную','ные','ных','нем','няя','ней','нюю','ний','ого','ому','ая','ою','ую','ые','ый','ое','ий','ие','ей','ой','ых','их'];
const norm=s=>String(s).toLowerCase().replaceAll('ё','е').normalize('NFC');
function stem(s){for(const e of suffixes)if(s.endsWith(e)&&s.length-e.length>=3)return s.slice(0,-e.length);return s}
function tokens(s){return (norm(s).replace(/(\d+)\s*-\s*(?:го|ая|ое|ой|й|я|х)(?=\s|$|[.,])/gu,'$1').match(/[а-яa-z]+|\d+/gu)||[]).filter(s=>!stop.has(s)&&!['волгоград','волжский'].includes(s)).map(stem)}
function house(s){return norm(s).replace(/корпус|корп\.?/gu,'к').replace(/строение|стр\.?/gu,'с').replace(/\s+|[.,№]/gu,'').replace(/[acekmoptxy]/gu,c=>({'a':'а','c':'с','e':'е','k':'к','m':'м','o':'о','p':'р','t':'т','x':'х','y':'у'})[c])}
function kind(s){s=norm(s);for(const [name,pattern] of [['проспект',/(?:^|\s)(?:проспект|просп\.?|пр-?кт|пр-т)(?=\s|$)/u],['переулок',/(?:^|\s)(?:переулок|пер\.?)(?=\s|$)/u],['проезд',/(?:^|\s)(?:проезд|пр-д)(?=\s|$)/u],['шоссе',/(?:^|\s)(?:шоссе|ш\.)(?=\s|$)/u],['улица',/(?:^|\s)(?:улица|ул\.?)(?=\s|$)/u],['площадь',/(?:^|\s)(?:площадь|пл\.)(?=\s|$)/u],['бульвар',/(?:^|\s)(?:бульвар|б-р)(?=\s|$)/u],['набережная',/(?:^|\s)(?:набережная|наб\.)(?=\s|$)/u]])if(pattern.test(s))return name;return ''}
function parse(query,city){
 let s=norm(query).replace(/(?:^|\s)(?:квартира|кв|офис)\.?\s*\d+.*$/u,'').trim();
 s=s.replace(/волгоградская\s+область/gu,' ');
 const specified=/(?:^|[^а-я])волгоград(?=$|[^а-я])/u.test(s)?0:(/(?:^|[^а-я])волжский(?=$|[^а-я])/u.test(s)?1:null);
 if(specified!==null&&city!==null&&city!==specified)return {error:'Город в адресе не совпадает с выбранным городом.'};
 s=s.replace(/волгоград|волжский/gu,' ').replace(/[,;№]/gu,' ').trim();
 const m=s.match(/(?:^|\s)(?:д(?:ом)?\.?\s*)?(\d+\s*[а-яa-z]?(?:\s*\/\s*\d+[а-яa-z]?)?(?:\s*(?:корпус|корп\.?|к\.?|строение|стр\.?)\s*\d+[а-яa-z]?)?)\s*$/u);
 let h='';if(m){h=house(m[1]);s=s.slice(0,m.index).trim()}
 return {city:specified??city,words:tokens(s),house:h,kind:kind(s)};
}
function create(data){
 const streetTokens=data.streets.map(s=>s.aliases.map(tokens));
 const byStreet=data.streets.map(()=>[]);data.addresses.forEach((r,i)=>byStreet[r[0]].push(i));
 function search(query,city=null){
  const q=parse(query,city);if(q.error)return {...q,items:[]};if(!q.words.length)return {items:[],message:'Введите название улицы и номер дома.'};
  const selected=[];
  data.streets.forEach((s,i)=>{if(q.city!==null&&s.city!==q.city)return;if(q.kind&&kind(s.name)&&q.kind!==kind(s.name))return;const hit=streetTokens[i].some(ts=>q.words.every(w=>ts.some(t=>t===w||t.startsWith(w))));if(hit)selected.push(i)});
  const exact=[],near=[];
  for(const si of selected)for(const i of byStreet[si]){const r=data.addresses[i],h=house(r[1]);if(!q.house||h===q.house)exact.push(i);else if(h.startsWith(q.house))near.push(i)}
  const sort=(i,j)=>data.streets[data.addresses[i][0]].city-data.streets[data.addresses[j][0]].city||data.streets[data.addresses[i][0]].name.localeCompare(data.streets[data.addresses[j][0]].name,'ru')||data.addresses[i][1].localeCompare(data.addresses[j][1],'ru',{numeric:true});
  exact.sort(sort);near.sort(sort);
  if(q.house&&!exact.length)return {items:near.slice(0,12),exact:false,total:near.length,message:'Точный адрес не найден в подготовленной базе. Похожие номера ниже — это другие адреса.'};
  return {items:exact.slice(0,15),exact:!!q.house,total:exact.length,message:exact.length?'Выберите адрес из списка.':'Улица не найдена в подготовленной базе. Проверьте город и написание.'};
 }
 return {search,parse};
}
root.NotarySearch={create,parse,house,tokens};
if(typeof module!=='undefined')module.exports=root.NotarySearch;
})(typeof window!=='undefined'?window:globalThis);
