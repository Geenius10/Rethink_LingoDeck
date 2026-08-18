
const D = window.NIHONGO_DATA;
const DAY = 86400000;
const settings = JSON.parse(localStorage.getItem("nc_pwa_settings") || '{"goal":20,"newLimit":10,"romaji":true,"autoAudio":false,"level":"N5","theme":"light"}');
let progress = JSON.parse(localStorage.getItem("nc_pwa_progress") || "{}");
let stats = JSON.parse(localStorage.getItem("nc_pwa_stats") || '{"reviews":0,"correct":0,"streak":0,"lastStudy":null,"days":{}}');
let custom = JSON.parse(localStorage.getItem("nc_pwa_custom") || "[]");
const CONTENT_VERSION="6.0.0";
let cards = [...D.buildCards(), ...custom];
let mode="Karteikarten", queue=[], idx=0, current=null, selectedLevel=settings.level||"N5", libraryLevel="Alle";
let deferredPrompt=null;

const $ = id => document.getElementById(id);
const tday = () => new Date().toISOString().slice(0,10);
function save(){
  localStorage.setItem("nc_pwa_settings",JSON.stringify(settings));
  localStorage.setItem("nc_pwa_progress",JSON.stringify(progress));
  localStorage.setItem("nc_pwa_stats",JSON.stringify(stats));
  localStorage.setItem("nc_pwa_custom",JSON.stringify(custom));
}
function pf(id){ if(!progress[id]) progress[id]={reps:0,due:0,interval:0,ease:2.4,mastered:false,again:0,hard:0,good:0,easy:0}; return progress[id]; }
function due(c){const p=pf(c.id);return p.reps>0&&p.due<=Date.now();}
function fresh(c){return pf(c.id).reps===0;}
function levelAllowed(c){
  if(c.level==="Kana"||c.level==="Eigene") return true;
  const order=["N5","N4","N3","N2","N1"];
  return order.indexOf(c.level)<=order.indexOf(selectedLevel);
}
function toast(x){const e=$("toast");e.textContent=x;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1500);}
function updateStreak(){
  const t=tday(); if(stats.lastStudy===t)return;
  if(stats.lastStudy){const d=(new Date(t+"T12:00:00")-new Date(stats.lastStudy+"T12:00:00"))/DAY;stats.streak=d===1?stats.streak+1:1;}
  else stats.streak=1;
  stats.lastStudy=t;
}
function studied(){updateStreak();stats.days[tday()]=(stats.days[tday()]||0)+1;save();}
function section(id){
  document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".navbtn").forEach(x=>x.classList.toggle("active",x.dataset.t===id));
  if(id==="library")renderLibrary();
  if(id==="progress")renderProgress();
  if(id==="path")renderFullPath();
  if(id==="settings")renderSettings();
}
document.querySelectorAll(".navbtn").forEach(x=>x.onclick=()=>section(x.dataset.t));
$("settingsBtn").onclick=()=>section("settings");

function weakScore(c){
  const p=pf(c.id);
  if(!p.reps) return 0;
  return (p.again*4 + p.hard*2) - (p.easy*0.5) + Math.max(0,3-p.interval);
}
function weakest(){
  return cards.filter(c=>pf(c.id).reps>0).sort((a,b)=>weakScore(b)-weakScore(a)).slice(0,15);
}
function renderHome(){
  const available=cards.filter(levelAllowed);
  const d=available.filter(due).length;
  const n=Math.min(available.filter(fresh).length,settings.newLimit);
  const l=Object.values(progress).filter(x=>x.reps>0).length;
  const done=stats.days[tday()]||0,pct=Math.min(100,Math.round(done/settings.goal*100));
  $("due").textContent=d;$("fresh").textContent=n;$("streak").textContent=stats.streak||0;$("learned").textContent=l;
  $("daybar").style.width=pct+"%";$("goalText").textContent=`${done} / ${settings.goal} Karten`;
  $("heroTitle").textContent=pct>=100?"Tagesziel geschafft":d?`${d} Wiederholungen sind fällig`:"Zeit für neue Karten";
  $("heroText").textContent=pct>=100?"Für heute reicht es. Morgen geht es weiter.":`Aktives Niveau: ${selectedLevel}. Bekanntes zuerst, dann wenige neue Karten.`;
  const w=weakest();
  $("weaknessText").textContent=w.length?`Aktuell besonders üben: ${w.slice(0,5).map(c=>c.front).join(" · ")}`:"Noch keine Daten. Nach den ersten Wiederholungen priorisiert die App unsichere Karten automatisch.";
  renderMiniPath();
}
const PATH=[
  ["Kana","Hiragana und Katakana vollständig","Kana"],
  ["N5","Grundlagen für Alltag, Reisen und einfache Sätze","N5"],
  ["N4","mehr Wortschatz, Verbformen und Satzverknüpfungen","N4"],
  ["N3","mittleres Niveau, abstraktere Alltagssprache","N3"],
  ["N2","fortgeschrittene Grammatik und formeller Wortschatz","N2"],
  ["N1","sehr fortgeschrittene Ausdrücke und Strukturen","N1"]
];
function renderMiniPath(){
  $("miniPath").innerHTML=PATH.map((s,i)=>{
    const relevant=cards.filter(c=>s[2]==="Kana"?c.level==="Kana":c.level===s[2]);
    const learned=relevant.filter(c=>pf(c.id).reps>0).length;
    const pct=relevant.length?Math.round(learned/relevant.length*100):0;
    return `<div class="lesson"><div class="flex space"><div><b>${i+1}. ${s[0]}</b><div class="sub">${s[1]}</div></div><span class="badge">${pct}%</span></div><div class="progress" style="margin-top:10px"><i style="width:${pct}%"></i></div></div>`;
  }).join("");
}

function renderLessons(){
  if(!$("lessonList")) return;
  $("lessonList").innerHTML=D.LESSONS.filter(l=>l.level===selectedLevel).map((l,i)=>`
    <button class="lesson full" data-lesson="${l.id}" style="text-align:left">
      <div class="flex space"><div><b>${i+1}. ${l.title}</b><div class="sub">${l.summary}</div></div><span class="badge">${l.level}</span></div>
    </button>`).join("");
  $("lessonList").querySelectorAll("[data-lesson]").forEach(b=>b.onclick=()=>showLesson(b.dataset.lesson));
}
function showLesson(id){
  const l=D.LESSONS.find(x=>x.id===id); if(!l)return;
  $("lessonDetail").innerHTML=`<div class="panel">
    <div class="flex space"><b>${l.title}</b><span class="badge">${l.level}</span></div>
    <p>${l.explanation}</p>
    ${l.examples.map(e=>`<div class="rowcard"><b>${e[0]}</b><div class="sub">${e[1]}</div></div>`).join("")}
    <div class="panel" style="background:var(--accent-soft);margin-top:10px"><b>Merke</b><div style="margin-top:5px">${l.tip}</div></div>
  </div>`;
  $("lessonDetail").scrollIntoView({behavior:"smooth",block:"start"});
}

function renderFullPath(){
  renderMiniPathInto("fullPath");
  renderLessons();
  const count=cards.filter(c=>c.level===selectedLevel).length;
  const learnedCount=cards.filter(c=>c.level===selectedLevel&&pf(c.id).reps>0).length;
  const p=$("fullPath").previousElementSibling;
  if(p && p.classList.contains("muted")){
    p.textContent=`Aktives Niveau: ${selectedLevel}. ${learnedCount} von ${count} Karten bereits gelernt.`;
  }
}
function renderMiniPathInto(id){
  $(id).innerHTML=PATH.map((s,i)=>`<div class="lesson"><div class="flex space"><div><b>${i+1}. ${s[0]}</b><div class="sub">${s[1]}</div></div>${s[2]===selectedLevel?'<span class="badge">aktiv</span>':''}</div></div>`).join("");
}

function renderLevels(id, active, setter){
  const levels=["N5","N4","N3","N2","N1"];
  $(id).innerHTML=levels.map(l=>`<button class="levelbtn ${l===active?"active":""}" data-l="${l}">${l}</button>`).join("");
  $(id).querySelectorAll("button").forEach(b=>b.onclick=()=>setter(b.dataset.l));
}
function setSelectedLevel(l){selectedLevel=l;settings.level=l;save();renderLevels("levels",selectedLevel,setSelectedLevel);renderHome();if($("path").classList.contains("active"))renderFullPath();startMode();}
function setLibraryLevel(l){libraryLevel=l;renderLevels("libraryLevels",libraryLevel,setLibraryLevel);renderLibrary();}

function renderModes(){
  const m=["Karteikarten","Quiz","Hören","Schreiben","Schwächen"];
  $("modes").innerHTML=m.map(x=>`<button class="chip ${x===mode?"active":""}" data-m="${x}">${x}</button>`).join("");
  $("modes").querySelectorAll("button").forEach(b=>b.onclick=()=>{mode=b.dataset.m;renderModes();startMode();});
}
function view(id){["flashMode","quizMode","listenMode","writeMode","weakMode"].forEach(x=>$(x).style.display="none");$(id).style.display="block";}
function recQueue(){
  const pool=cards.filter(levelAllowed);
  const a=pool.filter(due).sort((x,y)=>weakScore(y)-weakScore(x));
  const b=pool.filter(fresh).slice(0,settings.newLimit);
  return [...a,...b].slice(0,settings.goal);
}
function startMode(){
  if(mode==="Karteikarten"){view("flashMode");queue=recQueue();if(!queue.length)queue=cards.filter(levelAllowed).slice().sort(()=>Math.random()-.5).slice(0,settings.goal);idx=0;showCard();}
  if(mode==="Quiz"){view("quizMode");nextQuiz();}
  if(mode==="Hören"){view("listenMode");nextListen();}
  if(mode==="Schreiben"){view("writeMode");nextWrite();}
  if(mode==="Schwächen"){view("weakMode");nextWeak();}
}
function showCard(){
  current=queue[idx];$("flashcard").classList.remove("flipped");$("answers").style.display="none";$("showAnswer").style.display="block";
  if(!current){$("front").textContent="完了";$("counter").textContent="Session beendet.";return;}
  $("front").textContent=current.front;$("backjp").textContent=current.front;
  $("reading").textContent=settings.romaji?current.reading:(current.reading||"").split("·")[0];
  $("meaning").textContent=current.meaning;$("example").textContent=current.example||"";$("exampleDe").textContent=current.exampleDe||"";
  $("meta1").textContent=current.deck+(current.level?` · ${current.level}`:"");$("meta2").textContent=$("meta1").textContent;$("counter").textContent=`${idx+1} / ${queue.length}`;
  if(settings.autoAudio)setTimeout(()=>speakIt(current.front),200);
}
function flip(){if(!current)return;$("flashcard").classList.add("flipped");$("answers").style.display="grid";$("showAnswer").style.display="none";}
$("flashcard").onclick=()=>{if(!$("flashcard").classList.contains("flipped"))flip();};$("showAnswer").onclick=flip;
function speakIt(t){if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="ja-JP";u.rate=.82;speechSynthesis.speak(u);}
$("speak").onclick=e=>{e.stopPropagation();if(current)speakIt(current.front);};
document.querySelectorAll(".answer").forEach(b=>b.onclick=()=>{
  if(!current)return;const g=b.dataset.g,p=pf(current.id);stats.reviews++;p[g]=(p[g]||0)+1;if(g!=="again")stats.correct++;p.reps++;
  if(g==="again"){p.interval=0;p.due=Date.now()+60000;p.ease=Math.max(1.3,p.ease-.2);p.mastered=false;}
  if(g==="hard"){p.interval=Math.max(1,p.interval?Math.round(p.interval*1.35):1);p.due=Date.now()+p.interval*DAY;p.ease=Math.max(1.3,p.ease-.15);}
  if(g==="good"){p.interval=p.interval?Math.max(2,Math.round(p.interval*p.ease)):1;p.due=Date.now()+p.interval*DAY;p.mastered=p.interval>=14;}
  if(g==="easy"){p.ease+=.15;p.interval=p.interval?Math.max(4,Math.round(p.interval*p.ease*1.35)):4;p.due=Date.now()+p.interval*DAY;p.mastered=p.interval>=14;}
  studied();idx++;showCard();renderHome();
});
function choiceSet(c){
  const o=cards.filter(x=>levelAllowed(x)&&x.deck===c.deck&&x.id!==c.id).sort(()=>Math.random()-.5).slice(0,3);
  return [...o,c].sort(()=>Math.random()-.5);
}
let quizCard=null;
function nextQuiz(){
  const p=cards.filter(c=>levelAllowed(c)&&["Vokabeln","Kanji","Grammatik","Hiragana","Katakana"].includes(c.deck));quizCard=p[Math.floor(Math.random()*p.length)];
  $("quizMeta").textContent=quizCard.deck;$("quizPrompt").textContent=quizCard.front;
  $("quizChoices").innerHTML=choiceSet(quizCard).map(c=>`<button class="choice" data-id="${c.id}">${c.meaning}</button>`).join("");
  $("quizChoices").querySelectorAll(".choice").forEach(b=>b.onclick=()=>{const ok=b.dataset.id===quizCard.id;b.classList.add(ok?"ok":"no");stats.reviews++;if(ok)stats.correct++;studied();setTimeout(nextQuiz,650);});
}
let listenCard=null;
function nextListen(){
  const p=cards.filter(c=>levelAllowed(c)&&["Vokabeln","Hiragana","Katakana"].includes(c.deck));listenCard=p[Math.floor(Math.random()*p.length)];
  $("listenChoices").innerHTML=choiceSet(listenCard).map(c=>`<button class="choice" data-id="${c.id}">${c.meaning}</button>`).join("");
  $("listenChoices").querySelectorAll(".choice").forEach(b=>b.onclick=()=>{const ok=b.dataset.id===listenCard.id;b.classList.add(ok?"ok":"no");stats.reviews++;if(ok)stats.correct++;studied();setTimeout(nextListen,650);});
  setTimeout(()=>speakIt(listenCard.front),200);
}
$("playListen").onclick=()=>listenCard&&speakIt(listenCard.front);
let writeCard=null;
function nextWrite(){
  const p=cards.filter(c=>levelAllowed(c)&&["Hiragana","Katakana","Vokabeln","Kanji"].includes(c.deck));writeCard=p[Math.floor(Math.random()*p.length)];
  $("writeMeaning").textContent=writeCard.meaning;$("writeInput").value="";$("writeFeedback").textContent="";
}
$("checkWrite").onclick=()=>{
  const ok=$("writeInput").value.trim()===writeCard.front;$("writeFeedback").textContent=ok?"Richtig ✓":`Lösung: ${writeCard.front} · ${writeCard.reading}`;
  stats.reviews++;if(ok)stats.correct++;studied();setTimeout(nextWrite,900);
};
let weakCard=null;
function nextWeak(){
  const pool=weakest().filter(levelAllowed);weakCard=(pool.length?pool:cards.filter(levelAllowed))[Math.floor(Math.random()*(pool.length||cards.filter(levelAllowed).length))];
  $("weakPrompt").textContent=weakCard.front;$("weakMeaning").textContent="";$("weakSolution").textContent="";
}
$("weakReveal").onclick=()=>{$("weakMeaning").textContent=weakCard.meaning;$("weakSolution").textContent=`${weakCard.reading||""}${weakCard.example?" · "+weakCard.example:""}`;};
$("weakNext").onclick=nextWeak;

function renderLibrary(){
  const q=$("search").value.trim().toLowerCase(),f=$("filter").value;
  const a=cards.filter(c=>(f==="all"||c.deck===f)&&(libraryLevel==="Alle"||c.level===libraryLevel||c.level==="Kana"||c.level==="Eigene")&&(!q||[c.front,c.reading,c.meaning,c.example,c.exampleDe].join(" ").toLowerCase().includes(q)));
  $("libraryList").innerHTML=a.slice(0,180).map(c=>`<div class="rowcard"><div class="flex space"><div><b style="font-size:21px">${c.front}</b><div class="sub">${c.reading||""}</div></div><span class="badge">${c.deck}${c.level?" · "+c.level:""}</span></div><div style="margin-top:6px">${c.meaning}</div><div class="sub" style="margin-top:5px">${c.example||""}${c.exampleDe?" – "+c.exampleDe:""}</div></div>`).join("")||'<div class="panel muted">Keine Karten gefunden.</div>';
}
$("filter").onchange=renderLibrary;$("search").oninput=renderLibrary;
function renderKana(k="h"){
  const a=k==="h"?D.HIRAGANA:D.KATAKANA;$("kanaGrid").innerHTML=a.map(x=>`<div class="kana"><b>${x[0]}</b><small>${x[1]}</small></div>`).join("");
  $("hira").classList.toggle("active",k==="h");$("kata").classList.toggle("active",k==="k");
}
$("hira").onclick=()=>renderKana("h");$("kata").onclick=()=>renderKana("k");

function renderProgress(){
  $("reviews").textContent=stats.reviews;$("accuracy").textContent=stats.reviews?Math.round(stats.correct/stats.reviews*100)+"%":"–";
  $("mastered").textContent=Object.values(progress).filter(x=>x.mastered).length;$("pstreak").textContent=stats.streak||0;
  const levels=["Kana","N5","N4","N3","N2","N1"];
  $("levelProgress").innerHTML=levels.map(l=>{
    const cs=cards.filter(c=>l==="Kana"?c.level==="Kana":c.level===l), learned=cs.filter(c=>pf(c.id).reps>0).length,p=cs.length?Math.round(learned/cs.length*100):0;
    return `<div style="margin:9px 0"><div class="flex space"><span>${l}</span><span class="sub">${learned}/${cs.length}</span></div><div class="progress" style="margin-top:5px"><i style="width:${p}%"></i></div></div>`;
  }).join("");
}
function applyTheme(){
  document.documentElement.dataset.theme=settings.theme||"light";
}
function renderSettings(){
  $("goal").value=settings.goal;
  $("newLimit").value=settings.newLimit;
  $("romajiToggle").classList.toggle("on",settings.romaji);
  $("audioToggle").classList.toggle("on",settings.autoAudio);
  $("themeLight").classList.toggle("active",(settings.theme||"light")==="light");
  $("themeDark").classList.toggle("active",settings.theme==="dark");
}
$("goal").onchange=e=>{settings.goal=+e.target.value;save();renderHome();};$("newLimit").onchange=e=>{settings.newLimit=+e.target.value;save();renderHome();};
$("romajiToggle").onclick=()=>{settings.romaji=!settings.romaji;save();renderSettings();};$("audioToggle").onclick=()=>{settings.autoAudio=!settings.autoAudio;save();renderSettings();};
$("themeLight").onclick=()=>{settings.theme="light";applyTheme();save();renderSettings();};
$("themeDark").onclick=()=>{settings.theme="dark";applyTheme();save();renderSettings();};
$("reset").onclick=()=>{if(confirm("Lernfortschritt wirklich zurücksetzen? Eigene Karten bleiben erhalten.")){progress={};stats={reviews:0,correct:0,streak:0,lastStudy:null,days:{}};save();renderHome();renderProgress();toast("Zurückgesetzt");}};
$("addBtn").onclick=()=>section("addCard");$("cancelCard").onclick=()=>section("library");
$("saveCard").onclick=()=>{
  const f=$("newFront").value.trim(),m=$("newMeaning").value.trim();if(!f||!m){toast("Japanisch und Bedeutung fehlen");return;}
  custom.push({id:"c-"+Date.now(),deck:$("newDeck").value,level:$("newLevel").value,front:f,reading:$("newReading").value.trim(),meaning:m,example:$("newExample").value.trim(),exampleDe:""});
  cards=[...D.buildCards(),...custom];save();["newFront","newReading","newMeaning","newExample"].forEach(id=>$(id).value="");toast("Karte gespeichert");section("library");
};

$("verbsBtn").onclick=()=>{$("toolContent").innerHTML=D.VERBS.map(v=>`<div class="toolcard"><b>${v.dict}</b> <span class="badge">${v.type}</span><div class="sub">${v.meaning}</div><div style="margin-top:8px">ます: ${v.masu} · Neg.: ${v.negative}<br>Vergangenheit: ${v.past} · て-Form: ${v.te}<br>Potential: ${v.potential}</div></div>`).join("");};

$("numbersBtn").onclick=()=>{
  const rows=[
    ["1–10","一 いち · 二 に · 三 さん · 四 よん · 五 ご · 六 ろく · 七 なな · 八 はち · 九 きゅう · 十 じゅう"],
    ["10–100","二十 にじゅう · 五十 ごじゅう · 百 ひゃく"],
    ["100–1000","三百 さんびゃく · 六百 ろっぴゃく · 八百 はっぴゃく · 千 せん"],
    ["1000–10.000","三千 さんぜん · 八千 はっせん · 一万 いちまん"],
    ["Uhrzeit","一時 いちじ · 四時 よじ · 七時 しちじ · 九時 くじ"],
    ["Minuten","一分 いっぷん · 三分 さんぷん · 六分 ろっぷん · 八分 はっぷん · 十分 じゅっぷん"],
    ["Alter","一歳 いっさい · 八歳 はっさい · 十歳 じゅっさい · 二十歳 はたち"]
  ];
  $("toolContent").innerHTML=rows.map(r=>`<div class="toolcard"><b>${r[0]}</b><div class="sub" style="margin-top:5px">${r[1]}</div></div>`).join("");
};

$("countersBtn").onclick=()=>{$("toolContent").innerHTML=D.COUNTERS.map(x=>`<div class="toolcard"><b>${x[0]} (${x[1]})</b><div>${x[2]}</div><div class="sub" style="margin-top:5px">${x[3]}</div></div>`).join("");};
$("confusionsBtn").onclick=()=>{$("toolContent").innerHTML=D.CONFUSIONS.map(x=>`<div class="toolcard"><div class="jp" style="font-size:38px">${x[0]}　${x[1]}</div><div class="sub">${x[2]} · bewusst nebeneinander vergleichen</div></div>`).join("");};

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),settings,progress,stats,custom},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="nihongo-cards-backup.json";a.click();URL.revokeObjectURL(a.href);
};
$("importInput").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const d=JSON.parse(await file.text());if(d.settings)Object.assign(settings,d.settings);if(d.progress)progress=d.progress;if(d.stats)stats=d.stats;if(Array.isArray(d.custom))custom=d.custom;cards=[...D.buildCards(),...custom];save();renderHome();renderSettings();toast("Lernstand importiert");}
  catch{toast("Import konnte nicht gelesen werden");}
};

$("startBtn").onclick=()=>{section("learn");mode="Karteikarten";renderModes();startMode();};

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.add("show");});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.remove("show");};
window.addEventListener("appinstalled",()=>toast("App installiert"));

applyTheme();
$("date").textContent=new Intl.DateTimeFormat("de-DE",{weekday:"long",day:"2-digit",month:"long"}).format(new Date());
renderModes();renderLevels("levels",selectedLevel,setSelectedLevel);renderLevels("libraryLevels","N5",setLibraryLevel);
const allBtn=document.createElement("button");allBtn.className="levelbtn";allBtn.textContent="Alle";allBtn.dataset.l="Alle";$("libraryLevels").prepend(allBtn);allBtn.onclick=()=>setLibraryLevel("Alle");libraryLevel="N5";
renderKana();renderLibrary();renderHome();renderProgress();renderSettings();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").then(reg=>{
    reg.addEventListener("updatefound",()=>{const nw=reg.installing;nw.addEventListener("statechange",()=>{if(nw.state==="installed"&&navigator.serviceWorker.controller)toast("Update verfügbar – App neu öffnen");});});
  }).catch(console.error));
}
