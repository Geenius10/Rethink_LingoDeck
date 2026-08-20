
const STORAGE_KEY="rethink.lingodeck.clean.v1";

const seedData={
  theme:"light",
  route:"home",
  folders:[],
  cards:[],
  history:[],
  learnDirection:"mixed",
  activeLearningMs:0,
  sessionStartedAt:Date.now(),
  activeFolderId:null
};

let state=loadState();
let route="home";
let activeFolder=state.activeFolderId||null;
let learnQueue=[];
let learnIndex=0;
let revealed=false;
let mixedDirectionByCard={};

const view=document.getElementById("view");
const modal=document.getElementById("modal");
const modalBody=document.getElementById("modalBody");
const backupInput=document.getElementById("backupInput");

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    return parsed?{...seedData,...parsed,sessionStartedAt:Date.now()}:structuredClone(seedData);
  }catch{return structuredClone(seedData)}
}
function commitActiveTime(){
  const now=Date.now();
  state.activeLearningMs=(state.activeLearningMs||0)+Math.max(0,now-(state.sessionStartedAt||now));
  state.sessionStartedAt=now;
}
function saveState(){
  commitActiveTime();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function learningClock(){return (state.activeLearningMs||0)+Math.max(0,Date.now()-(state.sessionStartedAt||Date.now()))}
function folderById(id){return state.folders.find(f=>f.id===id)}
function setActiveFolder(id){
  activeFolder=id||null;
  state.activeFolderId=activeFolder;
  saveState();
}

function dueCards(folderId=null){
  const clock=learningClock();
  return state.cards.filter(c=>(!folderId||c.folderId===folderId)&&(c.dueLearningMs||0)<=clock);
}
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg;el.classList.add("show");
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),1700);
}
function setTheme(){
  document.body.classList.toggle("dark",state.theme==="dark");
  document.querySelector('meta[name="theme-color"]').setAttribute("content",state.theme==="dark"?"#0f0d12":"#f5f1f8");
}
function pageTitle(){
  return route==="home"?"LingoDeck":route==="cards"?"Deine Lernkarten":route==="learn"?"Lernen":"Dein Lernstand";
}
function render(){
  setTheme();
  document.getElementById("pageTitle").textContent=pageTitle();
  document.getElementById("themeToggle").style.display=route==="home"?"":"none";
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.route===route));
  view.innerHTML=route==="home"?homeView():route==="cards"?cardsView():route==="learn"?learnView():statsView();
  bindView();
}
function homeView(){
  const due=dueCards().length,total=state.cards.length,secure=state.cards.filter(c=>(c.box||1)>=4).length;
  return `
    <section class="hero">
      <div class="brand-kicker">HEUTE LERNEN</div>
      <h2 class="${due===1?"single":""}">${due===0?"Alles geschafft.":due===1?"Eine Karte wartet auf dich.":`${due} Karten warten auf dich.`}</h2>
      <p>${due?"Starte eine kurze Lernrunde oder öffne zuerst einen Sprachordner.":"Du kannst neue Karten anlegen oder eine Sprache frei wiederholen."}</p>
      <div class="actions">
        <button class="primary" data-action="learn-all">Lernrunde starten</button>
        <button class="secondary" data-action="new-card">Neue Karte</button>
      </div>
    </section>
    <div class="stats-grid">
      <div class="stat"><strong>${total}</strong><span>Karten</span></div>
      <div class="stat"><strong>${secure}</strong><span>Sicher</span></div>
      <div class="stat"><strong>${state.folders.length}</strong><span>Sprachen</span></div>
    </div>
    <section class="section">
      <div class="section-head">
        <div><h3>Sprachordner</h3><p>Langes Drücken zum Bearbeiten.</p></div>
        <button class="small-plus" data-action="new-folder" aria-label="Ordner hinzufügen">＋</button>
      </div>
      ${state.folders.length?`<div class="folder-list">${state.folders.map(folderRow).join("")}</div>`:
      `<div class="empty-state"><div class="empty-icon"></div><h3>Noch kein Sprachordner</h3><p>Lege zuerst eine Sprache an.</p><button class="primary" data-action="new-folder">Ordner hinzufügen</button></div>`}
    </section>`;
}
function folderRow(f){
  const count=state.cards.filter(c=>c.folderId===f.id).length,due=dueCards(f.id).length;
  return `<div class="folder-row" data-folder-long="${f.id}">
    <button class="folder-main" data-open-folder="${f.id}">
      <span class="folder-flag">${esc(f.flag||"🌐")}</span>
      <span class="folder-copy"><strong>${esc(f.name)}</strong><small>${count} ${count===1?"Karte":"Karten"} · ${due?`${due} fällig`:"nichts fällig"}</small></span>
      <span class="chevron">›</span>
    </button>
    <button class="folder-learn" data-learn-folder="${f.id}">Lernen</button>
  </div>`;
}
function cardsView(){
  const f=activeFolder?folderById(activeFolder):null;
  return `<section>
    <div class="section-head">
      <div><div class="brand-kicker">${f?"SPRACHORDNER":"ALLE SPRACHEN"}</div><h2>${f?`${esc(f.flag||"🌐")} ${esc(f.name)}`:"Deine Karten"}</h2></div>
      <div class="actions">${activeFolder?`<button class="text-button" data-action="all-folders">Alle</button>`:""}<button class="small-plus" data-action="new-card" aria-label="Karte hinzufügen">＋</button></div>
    </div>
    <input id="cardSearch" class="search" placeholder="Wörter oder Sätze durchsuchen …">
    <div class="filters">
      <button class="chip ${!activeFolder?"active":""}" data-filter="">Alle</button>
      ${state.folders.map(f=>`<button class="chip ${activeFolder===f.id?"active":""}" data-filter="${f.id}" data-folder-chip="${f.id}">${esc(f.flag||"🌐")} ${esc(f.name)}</button>`).join("")}
    </div>
    <div id="cardList" class="card-list">${cardRows(filteredCards(""))}</div>
  </section>`;
}
function filteredCards(q){
  q=q.toLowerCase().trim();
  return state.cards.filter(c=>(!activeFolder||c.folderId===activeFolder)&&(!q||`${c.front} ${c.back} ${c.note||""}`.toLowerCase().includes(q)));
}
function cardRows(cards){
  if(!cards.length)return `<div class="empty-state"><div class="empty-icon"></div><h3>Noch keine Karten</h3><p>Füge ein Wort oder einen ganzen Satz hinzu.</p><button class="primary" data-action="new-card">Karte hinzufügen</button></div>`;
  return cards.map(c=>{
    const f=folderById(c.folderId);
    return `<button class="card-row" data-preview="${c.id}">
      <span class="folder-flag">${esc(f?.flag||"🌐")}</span>
      <span class="card-row-copy"><strong>${esc(c.front)}</strong><small>${esc(c.back)}</small></span>
      <span class="badge">Box ${c.box||1}</span><span class="chevron">›</span>
    </button>`;
  }).join("");
}
function ensureLearnQueue(){
  if(learnQueue.length)return;
  let pool=dueCards(activeFolder);
  if(!pool.length)pool=state.cards.filter(c=>!activeFolder||c.folderId===activeFolder);
  learnQueue=pool.map(c=>c.id).sort(()=>Math.random()-.5);
  learnIndex=0;revealed=false;mixedDirectionByCard={};
}
function sideData(card){
  const f=folderById(card.folderId),mode=state.learnDirection||"mixed";
  const frontLang=f?.frontLabel||"Vorderseite",backLang=f?.backLabel||"Rückseite";
  let direction=mode;
  if(mode==="mixed"){
    direction=mixedDirectionByCard[card.id]||(mixedDirectionByCard[card.id]=Math.random()<.5?"front":"back");
  }
  if(direction==="back")return {front:card.back,back:card.front,frontLang:backLang,backLang:frontLang};
  return {front:card.front,back:card.back,frontLang,backLang};
}
function directionShort(){return state.learnDirection==="front"?"V → R":state.learnDirection==="back"?"R → V":"🔀 Zufall"}
function learnView(){
  ensureLearnQueue();
  const card=state.cards.find(c=>c.id===learnQueue[learnIndex]);
  if(!card)return `<div class="empty-state"><div class="empty-icon"></div><h3>Noch keine Karten</h3><p>Lege zuerst eine Karte an.</p><button class="primary" data-action="new-card">Karte hinzufügen</button></div>`;
  const side=sideData(card),pct=Math.round((learnIndex/Math.max(1,learnQueue.length))*100);
  return `<section>
    <div class="learn-meta"><button class="direction-chip" data-action="direction">${directionShort()}</button><span class="badge">${learnIndex+1} / ${learnQueue.length}</span></div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <button class="flashcard" data-action="flip">
      <div class="flashcard-inner ${revealed?"flipped":""}">
        <div class="flash-face front"><span class="card-language">${esc(side.frontLang)}</span><div class="flash-text">${esc(side.front)}</div>${card.note?`<div class="flash-note">${esc(card.note)}</div>`:""}</div>
        <div class="flash-face back"><span class="card-language">${esc(side.backLang)}</span><div class="flash-text">${esc(side.back)}</div>${card.note?`<div class="flash-note">${esc(card.note)}</div>`:""}</div>
      </div>
    </button>
    <div class="tap-hint">${revealed?"Nochmals antippen zum Umdrehen":"Karte antippen"}</div>
    ${revealed?`<div class="rating">
      <button class="rate" data-rate="0"><b>↺</b>Nochmal</button>
      <button class="rate" data-rate="1"><b>↓</b>Schwer</button>
      <button class="rate" data-rate="2"><b>↑</b>Gut</button>
      <button class="rate" data-rate="3"><b>✓</b>Leicht</button>
    </div>`:""}
  </section>`;
}
function statsView(){
  const reviews=state.history.length,good=state.history.filter(h=>h.rating>=2).length,accuracy=reviews?Math.round(good/reviews*100):0,total=Math.max(1,state.cards.length);
  return `<section>
    <div class="stats-grid">
      <div class="stat"><strong>${state.cards.length}</strong><span>Karten</span></div>
      <div class="stat"><strong>${reviews}</strong><span>Bewertungen</span></div>
      <div class="stat"><strong>${accuracy}%</strong><span>Gut / leicht</span></div>
    </div>
    <div class="panel section"><h3>Lernstand</h3>${[1,2,3,4,5].map(box=>{const n=state.cards.filter(c=>(c.box||1)===box).length;return `<div class="bar-row"><span>Box ${box}</span><div class="bar"><span style="width:${n/total*100}%"></span></div><b>${n}</b></div>`}).join("")}</div>
    <div class="panel section"><h3>Backup</h3><p style="color:var(--muted);font-size:13px">Extern in Dateien/iCloud sichern oder wieder laden.</p>
      <div class="backup-row"><button class="secondary" data-action="backup-save">Extern sichern</button><button class="secondary" data-action="backup-load">Backup laden</button></div>
      <div class="danger-zone"><button class="danger" data-action="delete-data">Daten löschen</button></div>
    </div>
  </section>`;
}
function bindLongPress(el,fn){
  let t,moved=false;
  const start=()=>{moved=false;clearTimeout(t);t=setTimeout(()=>{if(!moved)fn()},550)};
  const cancel=()=>clearTimeout(t);
  el.addEventListener("touchstart",start,{passive:true});
  el.addEventListener("touchmove",()=>{moved=true;cancel()},{passive:true});
  el.addEventListener("touchend",cancel);el.addEventListener("touchcancel",cancel);
  el.addEventListener("contextmenu",e=>e.preventDefault());
}
function bindView(){
  document.querySelectorAll("[data-action]").forEach(el=>el.onclick=()=>doAction(el.dataset.action));
  document.querySelectorAll("[data-open-folder]").forEach(el=>el.onclick=()=>{setActiveFolder(el.dataset.openFolder);route="cards";render()});
  document.querySelectorAll("[data-learn-folder]").forEach(el=>el.onclick=()=>{setActiveFolder(el.dataset.learnFolder);learnQueue=[];route="learn";render()});
  document.querySelectorAll("[data-filter]").forEach(el=>el.onclick=()=>{setActiveFolder(el.dataset.filter||null);render()});
  document.querySelectorAll("[data-preview]").forEach(el=>el.onclick=()=>openPreview(el.dataset.preview));
  document.querySelectorAll("[data-rate]").forEach(el=>el.onclick=()=>rateCard(Number(el.dataset.rate)));
  document.querySelectorAll("[data-folder-long]").forEach(el=>bindLongPress(el,()=>openFolderModal(el.dataset.folderLong)));
  document.querySelectorAll("[data-folder-chip]").forEach(el=>bindLongPress(el,()=>openFolderModal(el.dataset.folderChip)));
  const search=document.getElementById("cardSearch");
  if(search)search.oninput=()=>{document.getElementById("cardList").innerHTML=cardRows(filteredCards(search.value));document.querySelectorAll("[data-preview]").forEach(el=>el.onclick=()=>openPreview(el.dataset.preview));document.querySelectorAll("[data-action]").forEach(el=>el.onclick=()=>doAction(el.dataset.action))}
}
function doAction(a){
  if(a==="learn-all"){setActiveFolder(null);learnQueue=[];route="learn";render()}
  if(a==="new-folder")openFolderModal();
  if(a==="new-card")openCardModal();
  if(a==="all-folders"){setActiveFolder(null);render()}
  if(a==="flip"){revealed=!revealed;render()}
  if(a==="direction")openDirectionModal();
  if(a==="backup-save")exportBackup();
  if(a==="backup-load")backupInput.click();
  if(a==="delete-data")openDeleteModal();
}

function enableModalFieldNavigation(){
  const fields=[...modalBody.querySelectorAll("input, textarea, select")].filter(el=>!el.disabled);
  fields.forEach((field,index)=>{
    field.addEventListener("pointerdown",()=>{
      if(document.activeElement!==field){
        requestAnimationFrame(()=>field.focus({preventScroll:false}));
      }
    });
    field.addEventListener("keydown",e=>{
      if(e.key!=="Enter")return;
      if(field.tagName==="TEXTAREA" && !e.metaKey && !e.ctrlKey) return;
      const next=fields[index+1];
      if(next){
        e.preventDefault();
        next.focus();
      }
    });
  });
}
function openFolderModal(editId=null,onSaved=null){
  const old=editId?folderById(editId):null;
  modalBody.innerHTML=`<div class="modal-head"><div><div class="brand-kicker">${old?"ORDNER BEARBEITEN":"NEUER SPRACHORDNER"}</div><h2>${old?"Ordner bearbeiten":"Sprache anlegen"}</h2></div><button type="button" class="modal-close" data-close>×</button></div>
    <label>Name<input id="folderName" enterkeyhint="next" value="${esc(old?.name||"")}" placeholder="z. B. Italienisch" required></label>
    <label>Symbol / Flagge<input id="folderFlag" enterkeyhint="next" value="${esc(old?.flag||"")}" placeholder="z. B. 🇮🇹"></label>
    <label>Vorderseite<input id="folderFront" enterkeyhint="next" value="${esc(old?.frontLabel||"")}" placeholder="z. B. Deutsch"></label>
    <label>Rückseite<input id="folderBack" enterkeyhint="done" value="${esc(old?.backLabel||"")}" placeholder="z. B. Italienisch"></label>
    <div class="modal-actions split">${old?`<button type="button" class="danger" id="deleteFolder">Löschen</button>`:"<span></span>"}<div class="modal-actions-right"><button type="button" class="secondary" data-close>Abbrechen</button><button type="submit" class="primary">Speichern</button></div></div>`;
  modalBody.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal.close());
  if(old)document.getElementById("deleteFolder").onclick=()=>{const n=state.cards.filter(c=>c.folderId===old.id).length;if(confirm(n?`Ordner und ${n} ${n===1?"Karte":"Karten"} löschen?`:"Ordner löschen?")){state.cards=state.cards.filter(c=>c.folderId!==old.id);state.folders=state.folders.filter(f=>f.id!==old.id);if(activeFolder===old.id)setActiveFolder(null);saveState();modal.close();render();toast("Ordner gelöscht")}};
  modalBody.onsubmit=e=>{e.preventDefault();const name=document.getElementById("folderName").value.trim();if(!name)return;let id;
    if(old){old.name=name;old.flag=document.getElementById("folderFlag").value.trim();old.frontLabel=document.getElementById("folderFront").value.trim();old.backLabel=document.getElementById("folderBack").value.trim();id=old.id}
    else{id=uid();state.folders.push({id,name,flag:document.getElementById("folderFlag").value.trim(),frontLabel:document.getElementById("folderFront").value.trim(),backLabel:document.getElementById("folderBack").value.trim()})}
    saveState();modal.close();render();toast(old?"Ordner gespeichert":"Ordner angelegt");if(onSaved)setTimeout(()=>onSaved(id),0)};
  enableModalFieldNavigation();
  modal.showModal();
}
function openCardModal(editId=null,draft=null){
  if(!state.folders.length){openFolderModal(null,id=>openCardModal(editId,{folderId:id,front:"",back:"",note:""}));toast("Lege zuerst einen Sprachordner an");return}
  const old=editId?state.cards.find(c=>c.id===editId):null;
  const d=draft||{folderId:old?.folderId||activeFolder||state.folders[0].id,front:old?.front||"",back:old?.back||"",note:old?.note||""};
  modalBody.innerHTML=`<div class="modal-head"><div><div class="brand-kicker">${old?"KARTE BEARBEITEN":"NEUE KARTE"}</div><h2>${old?"Karte bearbeiten":"Karte hinzufügen"}</h2></div><button type="button" class="modal-close" data-close>×</button></div>
    <label>Sprache / Ordner<div class="folder-select-row"><select id="cardFolder">${state.folders.map(f=>`<option value="${f.id}" ${d.folderId===f.id?"selected":""}>${esc(f.flag||"🌐")} ${esc(f.name)}</option>`).join("")}</select><button type="button" id="folderPlus" class="folder-plus">＋</button></div></label>
    <label>Vorderseite<textarea id="cardFront" enterkeyhint="next" placeholder="z. B. Wie geht es dir?" required>${esc(d.front)}</textarea></label>
    <label>Rückseite<textarea id="cardBack" enterkeyhint="next" placeholder="z. B. How are you?" required>${esc(d.back)}</textarea></label>
    <label>Notiz <span style="font-weight:400">(optional)</span><input id="cardNote" enterkeyhint="done" value="${esc(d.note)}" placeholder="z. B. Aussprache oder Grammatikhinweis"></label>
    <div class="modal-actions split">${old?`<button type="button" class="danger" id="deleteCard">Löschen</button>`:"<span></span>"}<div class="modal-actions-right"><button type="button" class="secondary" data-close>Abbrechen</button><button type="submit" class="primary">Speichern</button></div></div>`;
  modalBody.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal.close());
  document.getElementById("folderPlus").onclick=()=>{const now={folderId:document.getElementById("cardFolder").value,front:document.getElementById("cardFront").value,back:document.getElementById("cardBack").value,note:document.getElementById("cardNote").value};modal.close();openFolderModal(null,id=>openCardModal(editId,{...now,folderId:id}))};
  if(old)document.getElementById("deleteCard").onclick=()=>{if(confirm("Diese Karte wirklich löschen?")){state.cards=state.cards.filter(c=>c.id!==old.id);saveState();modal.close();learnQueue=[];render();toast("Karte gelöscht")}};
  modalBody.onsubmit=e=>{e.preventDefault();const front=document.getElementById("cardFront").value.trim(),back=document.getElementById("cardBack").value.trim();if(!front||!back)return;
    const payload={folderId:document.getElementById("cardFolder").value,front,back,note:document.getElementById("cardNote").value.trim()};
    if(old)Object.assign(old,payload);else state.cards.push({id:uid(),...payload,box:1,dueLearningMs:learningClock(),reviews:0,correct:0});
    saveState();modal.close();learnQueue=[];render();toast("Karte gespeichert")};
  enableModalFieldNavigation();
  modal.showModal();
}
function openPreview(id){
  const c=state.cards.find(x=>x.id===id);if(!c)return;
  const f=folderById(c.folderId);
  modalBody.innerHTML=`<div class="modal-head"><div><div class="brand-kicker">${esc(f?.flag||"🌐")} ${esc(f?.name||"")}</div><h2>Karte ansehen</h2></div><button type="button" class="modal-close" data-close>×</button></div>
    <button type="button" class="preview-card" id="previewFlip"><div class="preview-inner"><div class="preview-side"><span class="card-language">${esc(f?.frontLabel||"Vorderseite")}</span><strong>${esc(c.front)}</strong></div><div class="preview-side back"><span class="card-language">${esc(f?.backLabel||"Rückseite")}</span><strong>${esc(c.back)}</strong></div></div></button>
    <div class="modal-actions"><button type="button" class="secondary" id="editPreview">Bearbeiten</button><button type="button" class="primary" data-close>Fertig</button></div>`;
  modalBody.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal.close());
  document.getElementById("previewFlip").onclick=()=>document.querySelector(".preview-inner").classList.toggle("flipped");
  document.getElementById("editPreview").onclick=()=>{modal.close();openCardModal(id)};
  modal.showModal();
}
function openDirectionModal(){
  modalBody.innerHTML=`<div class="modal-head"><div><div class="brand-kicker">LERNRICHTUNG</div><h2>Richtung wählen</h2></div><button type="button" class="modal-close" data-close>×</button></div>
    <div class="direction-options">
      <button type="button" class="direction-option ${state.learnDirection==="front"?"active":""}" data-direction="front"><strong>Vorderseite → Rückseite</strong><small>V → R</small></button>
      <button type="button" class="direction-option ${state.learnDirection==="back"?"active":""}" data-direction="back"><strong>Rückseite → Vorderseite</strong><small>R → V</small></button>
      <button type="button" class="direction-option ${state.learnDirection==="mixed"?"active":""}" data-direction="mixed"><strong>🔀 Zufall</strong><small>Zufällige Richtungswahl</small></button>
    </div>`;
  modalBody.querySelector("[data-close]").onclick=()=>modal.close();
  modalBody.querySelectorAll("[data-direction]").forEach(b=>b.onclick=()=>{state.learnDirection=b.dataset.direction;saveState();mixedDirectionByCard={};revealed=false;modal.close();render()});
  modal.showModal();
}
function rateCard(rating){
  const c=state.cards.find(x=>x.id===learnQueue[learnIndex]);if(!c)return;
  const intervals=[2*60e3,10*60e3,45*60e3,3*60*60e3],delta=[-2,-1,1,2];
  c.reviews=(c.reviews||0)+1;if(rating>=2)c.correct=(c.correct||0)+1;c.box=Math.max(1,Math.min(5,(c.box||1)+delta[rating]));c.dueLearningMs=learningClock()+intervals[rating];
  state.history.push({cardId:c.id,rating,at:Date.now(),learningClock:learningClock()});if(state.history.length>500)state.history=state.history.slice(-500);
  saveState();learnIndex++;revealed=false;
  if(learnIndex>=learnQueue.length){learnQueue=[];route="home";toast("Lernrunde geschafft")}
  render();
}
async function exportBackup(){
  const data=JSON.stringify({...state,sessionStartedAt:Date.now()},null,2),name=`RETHINK-LingoDeck-Backup-${new Date().toISOString().slice(0,10)}.json`,file=new File([data],name,{type:"application/json"});
  try{if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({title:"RETHINK. LingoDeck Backup",files:[file]});return}}catch(e){if(e?.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function openDeleteModal(){
  modalBody.innerHTML=`<div class="modal-head"><div><div class="brand-kicker">DATEN LÖSCHEN</div><h2>Was möchtest du löschen?</h2></div><button type="button" class="modal-close" data-close>×</button></div>
    <button type="button" class="delete-choice" id="deleteProgress"><strong>Nur Lernfortschritt</strong><small>Karten und Ordner bleiben erhalten.</small></button>
    <button type="button" class="delete-choice" id="deleteAll"><strong>Karten + Fortschritt</strong><small>Alle Ordner, Karten und Lernstände werden gelöscht.</small></button>`;
  modalBody.querySelector("[data-close]").onclick=()=>modal.close();
  document.getElementById("deleteProgress").onclick=()=>{if(confirm("Nur den Lernfortschritt zurücksetzen?")){const clock=learningClock();state.cards.forEach(c=>{c.box=1;c.reviews=0;c.correct=0;c.dueLearningMs=clock});state.history=[];state.activeLearningMs=0;state.sessionStartedAt=Date.now();saveState();modal.close();render();toast("Lernfortschritt zurückgesetzt")}};
  document.getElementById("deleteAll").onclick=()=>{if(confirm("Wirklich alle Karten, Ordner und Lernstände löschen?")){state={...structuredClone(seedData),theme:state.theme,sessionStartedAt:Date.now()};localStorage.setItem(STORAGE_KEY,JSON.stringify(state));activeFolder=null;state.activeFolderId=null;learnQueue=[];route="home";modal.close();render();toast("Alle Daten gelöscht")}};
  modal.showModal();
}
backupInput.onchange=async()=>{const file=backupInput.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.folders)||!Array.isArray(parsed.cards))throw 0;state={...seedData,...parsed,sessionStartedAt:Date.now()};activeFolder=state.activeFolderId&&state.folders.some(f=>f.id===state.activeFolderId)?state.activeFolderId:null;state.activeFolderId=activeFolder;saveState();learnQueue=[];render();toast("Backup geladen")}catch{alert("Dieses Backup konnte nicht gelesen werden.")}backupInput.value=""};
document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
  const target=tab.dataset.route;

  // A repeated tap on the active tab no longer resets selections.
  // The last selected card folder/filter and learning direction stay active.
  if(route!==target){
    route=target;

    // Only start a fresh queue when entering Learn from another tab.
    // The selected folder and learnDirection are intentionally preserved.
    if(target==="learn"){
      learnQueue=[];
      learnIndex=0;
      revealed=false;
      mixedDirectionByCard={};
    }
  }

  render();
  window.scrollTo({top:0,behavior:"smooth"});
});
document.getElementById("themeToggle").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";saveState();render()};
document.addEventListener("visibilitychange",()=>{if(document.hidden)saveState();else state.sessionStartedAt=Date.now()});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
render();
