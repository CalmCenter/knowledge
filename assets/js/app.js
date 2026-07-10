(() => {
const { notes = [], categories = [] } = window.KNOWLEDGE_DATA || {};
const state = { category:"全部", topic:"全部", query:"", selectedId:notes[0]?.id || null, focusMode:false };
const searchInput=document.getElementById("search"),categoriesEl=document.getElementById("categories"),topicsEl=document.getElementById("topics"),cardsEl=document.getElementById("cards"),detailEl=document.getElementById("detail"),railToggle=document.getElementById("railToggle"),railNoteCount=document.getElementById("railNoteCount"),railTopicCount=document.getElementById("railTopicCount"),railCategory=document.getElementById("railCategory"),railOrder=document.getElementById("railOrder");
const isMobile=()=>window.matchMedia("(max-width: 760px)").matches;
function enterReadingMode(){if(isMobile()) document.body.classList.add("reading-mode");}
function exitReadingMode(){document.body.classList.remove("reading-mode");}
function applyFocusMode(){document.body.classList.toggle("focus-mode",state.focusMode&&!isMobile());}
function exitFocusMode(){state.focusMode=false; applyFocusMode();}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function categoryFiltered(){return notes.filter(n=>state.category==="全部"||n.categoryLabel===state.category);}
function topicCounts(){const m=new Map(); for(const n of categoryFiltered()) for(const t of n.topics) m.set(t,(m.get(t)||0)+1); return m;}
function allTopics(){return Array.from(topicCounts().keys()).sort((a,b)=>a.localeCompare(b,"zh-CN"));}
function flatQa(qa){return Object.values(qa || {}).flat(2).join(" ");}
function searchableText(n){const conceptText=(n.concepts||[]).flat().join(" "); return [n.title,n.categoryLabel,n.question,n.summary,(n.topics||[]).join(" "),(n.argument||[]).join(" "),conceptText,(n.points||[]).join(" "),(n.connections||[]).join(" "),(n.boundaries||[]).join(" "),(n.actions||[]).join(" "),n.scene,n.goal,(n.judgement||[]).join(" "),(n.flow||[]).join(" "),(n.scripts||[]).join(" "),(n.review||[]).join(" "),(n.sections||[]).map(s=>`${s.title} ${s.content}`).join(" "),flatQa(n.qa)].join(" ").toLowerCase();}
function filteredNotes(){const q=state.query.trim().toLowerCase(); return categoryFiltered().filter(n=>(state.topic==="全部"||(n.topics||[]).includes(state.topic))&&(!q||searchableText(n).includes(q)));}
function renderCategories(){const counts=new Map(); for(const n of notes) counts.set(n.categoryLabel,(counts.get(n.categoryLabel)||0)+1); const items=[{label:"全部", count:notes.length},...categories.map(c=>({label:c.label,count:counts.get(c.label)||0}))]; categoriesEl.innerHTML=items.map(item=>`<button class="category-button ${state.category===item.label?"active":""}" data-category="${escapeHtml(item.label)}"><span>${escapeHtml(item.label)}</span><span class="muted">${item.count}</span></button>`).join(""); categoriesEl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{state.category=b.dataset.category; state.topic="全部"; state.selectedId=filteredNotes()[0]?.id||null; exitReadingMode(); exitFocusMode(); render();}));}
function renderTopics(){const counts=topicCounts(); const visibleTotal=categoryFiltered().length; const items=[["全部",visibleTotal],...allTopics().map(t=>[t,counts.get(t)])]; topicsEl.innerHTML=items.map(([t,c])=>`<button class="topic-button ${state.topic===t?"active":""}" data-topic="${escapeHtml(t)}"><span>${escapeHtml(t)}</span><span class="muted">${c}</span></button>`).join(""); document.getElementById("noteCount").textContent=notes.length; document.getElementById("topicCount").textContent=counts.size; topicsEl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{state.topic=b.dataset.topic; state.selectedId=filteredNotes()[0]?.id||null; exitReadingMode(); exitFocusMode(); render();}));}
function renderCardTags(topics){const visible=(topics||[]).slice(0,3); const extra=(topics||[]).length-visible.length; return `${visible.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}${extra?`<span class="tag tag-more">+${extra}</span>`:""}`;}
function renderCards(){const visible=filteredNotes(); if(!visible.length){cardsEl.innerHTML='<div class="empty">没有匹配的卡片</div>'; detailEl.innerHTML='<div class="empty">换个分类、主题或关键词试试</div>'; return;} if(!visible.some(n=>n.id===state.selectedId)) state.selectedId=visible[0].id; cardsEl.innerHTML=visible.map(n=>`<button class="card ${state.selectedId===n.id?"active":""}" data-id="${n.id}"><div class="card-title">${n.order?`<span class="order">${escapeHtml(n.order)}</span>`:""}<span>${escapeHtml(n.title)}</span></div><div class="meta"><span>${escapeHtml(n.categoryLabel)}</span><span>${escapeHtml(n.date)}</span><span>${escapeHtml(n.type)}</span></div><div class="summary">${escapeHtml(n.question||n.summary)}</div><div class="tags">${renderCardTags(n.topics)}</div></button>`).join(""); cardsEl.querySelectorAll(".card").forEach(c=>c.addEventListener("click",()=>{state.selectedId=c.dataset.id; render(); enterReadingMode(); if(isMobile()){requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));}}));}
function section(title,body){return `<section class="content-section"><h3>${title}</h3>${body}</section>`;}
function list(items){return `<ul>${(items||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("")}</ul>`;}
function ordered(items){return `<ol>${(items||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("")}</ol>`;}
function concepts(items){return (items||[]).map(([name,meaning,example])=>`<div class="concept"><strong>${escapeHtml(name)}</strong><div>${escapeHtml(meaning)}</div><div class="muted">例子：${escapeHtml(example)}</div></div>`).join("");}
function qaGroups(groups){return Object.entries(groups||{}).map(([name,items])=>`<div class="qa-group"><h4>${escapeHtml(name)}</h4>${items.map(([q,a])=>`<div class="qa"><strong>${escapeHtml(q)}</strong><div>${escapeHtml(a)}</div></div>`).join("")}</div>`).join("");}
function normalizePath(path){
  const out=[];
  for(const part of path.split("/")){
    if(!part||part===".") continue;
    if(part===".."){
      if(out.length && out[out.length-1] !== "..") out.pop();
      else out.push("..");
    } else out.push(part);
  }
  return out.join("/");
}
function resolveAsset(src,n){
  if(/^https?:\/\//.test(src)||src.startsWith("/")) return src;
  const base=(n.notePath||"").split("/").slice(0,-1).join("/");
  return normalizePath(`${base}/${src}`);
}
function renderMarkdown(md,n){
  const lines=String(md||"").split(/\r?\n/);
  let html="", listType=null, tableRows=[];
  function closeList(){ if(listType){ html+=`</${listType}>`; listType=null; } }
  function isTableLine(line){ return line.startsWith("|") && line.endsWith("|") && line.includes("|"); }
  function parseTableRow(line){ return line.slice(1,-1).split("|").map(cell=>stripInline(cell.trim())); }
  function isSeparatorRow(row){ return row.every(cell=>/^:?-{3,}:?$/.test(cell.replace(/\s+/g,""))); }
  function flushTable(){
    if(!tableRows.length) return;
    const header=tableRows[0]||[];
    const body=tableRows.slice(1).filter(row=>!isSeparatorRow(row));
    html+=`<div class="md-table-wrap"><table class="md-table"><thead><tr>${header.map(cell=>`<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    tableRows=[];
  }
  for(const raw of lines){
    const line=raw.trim();
    if(!line){ closeList(); flushTable(); continue; }
    if(isTableLine(line)){ closeList(); tableRows.push(parseTableRow(line)); continue; }
    const img=line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if(img){ closeList(); flushTable(); html+=`<figure><img src="${escapeHtml(resolveAsset(img[2],n))}" alt="${escapeHtml(img[1])}" style="max-width:100%;border-radius:8px;border:1px solid var(--color-line)"><figcaption class="muted">${escapeHtml(img[1])}</figcaption></figure>`; continue; }
    if(line.startsWith("### ")){ closeList(); flushTable(); html+=`<h4>${escapeHtml(stripInline(line.slice(4)))}</h4>`; continue; }
    if(line.startsWith("- ")){
      flushTable();
      if(listType!=="ul"){ closeList(); html+="<ul>"; listType="ul"; }
      html+=`<li>${escapeHtml(stripInline(line.slice(2)))}</li>`; continue;
    }
    const orderedMatch=line.match(/^\d+\.\s+(.+)$/);
    if(orderedMatch){
      flushTable();
      if(listType!=="ol"){ closeList(); html+="<ol>"; listType="ol"; }
      html+=`<li>${escapeHtml(stripInline(orderedMatch[1]))}</li>`; continue;
    }
    closeList(); flushTable();
    html+=`<p>${escapeHtml(stripInline(line))}</p>`;
  }
  closeList(); flushTable();
  return html;
}
function stripInline(v){return String(v||"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/`([^`]+)`/g,"$1");}
function renderGenericDetail(n){return (n.sections||[]).map(s=>section(escapeHtml(s.title),renderMarkdown(s.content,n))).join("");}
function renderRail(){const n=notes.find(x=>x.id===state.selectedId)||filteredNotes()[0]; railNoteCount.textContent=notes.length; railTopicCount.textContent=topicCounts().size; railCategory.textContent=state.category==="全部"?"全部":state.category.slice(0,2); railOrder.textContent=n?.order||"---"; railToggle.textContent=state.focusMode?"展开":"压缩";}
function renderDetail(){const n=notes.find(x=>x.id===state.selectedId)||filteredNotes()[0]; if(!n)return; const body=renderGenericDetail(n); const focusText=state.focusMode?"展开导航":"压缩导航"; detailEl.innerHTML=`<div class="reader-header"><div class="reader-toolbar"><button class="reader-back" type="button">返回列表</button><button class="focus-toggle" type="button" aria-pressed="${state.focusMode?"true":"false"}">${focusText}</button></div><h2 class="reader-title">${n.order?`<span class="order">${escapeHtml(n.order)}</span> `:""}${escapeHtml(n.title)}</h2><div class="meta reader-meta"><span>${escapeHtml(n.categoryLabel)}</span><span>${escapeHtml(n.date)}</span><span>${escapeHtml(n.type)}</span><span>${(n.topics||[]).map(escapeHtml).join(" / ")}</span></div></div>${body}`; detailEl.querySelector(".reader-back")?.addEventListener("click",()=>{exitReadingMode(); requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));}); detailEl.querySelector(".focus-toggle")?.addEventListener("click",()=>{state.focusMode=!state.focusMode; applyFocusMode(); renderDetail(); renderRail();});}
function render(){renderCategories(); renderTopics(); renderCards(); renderDetail(); renderRail();}
searchInput.addEventListener("input",e=>{state.query=e.target.value; state.selectedId=filteredNotes()[0]?.id||null; exitReadingMode(); exitFocusMode(); render();});
window.addEventListener("resize",()=>{if(!isMobile()) exitReadingMode(); applyFocusMode();});
railToggle?.addEventListener("click",()=>{state.focusMode=false; applyFocusMode(); renderDetail(); renderRail();});
render();
})();
