(() => {
  const { notes = [], categories = [] } = window.KNOWLEDGE_DATA || {};
  const $ = (id) => document.getElementById(id);
  const els = {
    home: $("homeView"), reader: $("readerView"), homeCategories: $("homeCategories"), topCategories: $("topCategories"),
    homeSearch: $("homeSearch"), readerSearch: $("readerSearch"), tree: $("chapterTree"), detail: $("detail"), readerPanel: document.querySelector(".reader-panel"),
    stats: $("heroStats"),
    searchModal: $("searchModal"), searchClose: $("searchClose"), searchBackdrop: $("searchBackdrop")
  };
  const savedId = localStorage.getItem("qifan-last-note");
  const state = { selectedId: notes.some((n) => n.id === savedId) ? savedId : notes[0]?.id, openCategory: "", query: "" };
  const categoryCopy = {
    "读书知识": "提炼书籍、文章和课程中的模型、方法与行动建议。",
    "情绪沟通课程": "理解情绪机制，沉淀可直接使用的表达与关系边界。",
    "饭局社交攻略": "围绕真实场景整理判断、流程、话术和复盘方法。",
    "资治通鉴解读": "复盘历史事件、人物选择、权力结构与现实启发。"
  };

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function stripInline(value) { return String(value || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1"); }
  function selectedNote() { return notes.find((note) => note.id === state.selectedId) || notes[0]; }
  function noteText(note) {
    return [note.title, note.categoryLabel, note.question, note.summary, ...(note.themes || []), ...(note.tags || []), ...(note.sections || []).flatMap((s) => [s.title, s.content])].join(" ").toLowerCase();
  }
  function visibleNotes() {
    const query = state.query.trim().toLowerCase();
    return query ? notes.filter((note) => noteText(note).includes(query)) : notes;
  }
  function categoryStorageKey(category) { return `qifan-last-note:${category}`; }
  function scrollStorageKey(id) { return `qifan-scroll:${id}`; }
  function categoryLastNote(category) {
    const saved = localStorage.getItem(categoryStorageKey(category));
    return notes.find((note) => note.id === saved && note.categoryLabel === category) || notes.find((note) => note.categoryLabel === category);
  }
  function slug(value, index) { return `section-${index}-${String(value || "").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-").slice(0, 28)}`; }
  function normalizePath(path) {
    const out = [];
    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") out.length && out[out.length - 1] !== ".." ? out.pop() : out.push("..");
      else out.push(part);
    }
    return out.join("/");
  }
  function resolveAsset(src, note) {
    if (/^https?:\/\//.test(src) || src.startsWith("/")) return src;
    const base = (note.notePath || "").split("/").slice(0, -1).join("/");
    return normalizePath(`${base}/${src}`);
  }
  function renderMarkdown(markdown, note) {
    const lines = String(markdown || "").split(/\r?\n/);
    let html = "", listType = null, tableRows = [];
    const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
    const flushTable = () => {
      if (!tableRows.length) return;
      const header = tableRows[0] || [];
      const body = tableRows.slice(1).filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ""))));
      html += `<div class="md-table-wrap"><table class="md-table"><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      tableRows = [];
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { closeList(); flushTable(); continue; }
      if (line.startsWith("|") && line.endsWith("|")) { closeList(); tableRows.push(line.slice(1, -1).split("|").map((cell) => stripInline(cell.trim()))); continue; }
      const image = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (image) { closeList(); flushTable(); html += `<figure><img src="${escapeHtml(resolveAsset(image[2], note))}" alt="${escapeHtml(image[1])}"><figcaption class="muted">${escapeHtml(image[1])}</figcaption></figure>`; continue; }
      if (line.startsWith("### ")) { closeList(); flushTable(); html += `<h4>${escapeHtml(stripInline(line.slice(4)))}</h4>`; continue; }
      if (line.startsWith("- ")) { flushTable(); if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; } html += `<li>${escapeHtml(stripInline(line.slice(2)))}</li>`; continue; }
      const ordered = line.match(/^\d+\.\s+(.+)$/);
      if (ordered) { flushTable(); if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; } html += `<li>${escapeHtml(stripInline(ordered[1]))}</li>`; continue; }
      closeList(); flushTable(); html += `<p>${escapeHtml(stripInline(line))}</p>`;
    }
    closeList(); flushTable(); return html;
  }

  function renderHome() {
    const themeCount = new Set(notes.flatMap((note) => note.themes || [])).size;
    els.stats.textContent = `${categories.length} 个知识领域 · ${notes.length} 篇内容 · ${themeCount} 个主题`;
    const counts = new Map(); notes.forEach((note) => counts.set(note.categoryLabel, (counts.get(note.categoryLabel) || 0) + 1));
    els.topCategories.insertAdjacentHTML("afterbegin", categories.map((category) => `<button type="button" data-home-category="${escapeHtml(category.label)}">${escapeHtml(category.label)}</button>`).join(""));
    els.homeCategories.innerHTML = categories.map((category, index) => { const last = categoryLastNote(category.label); return `<button class="home-category" style="--stagger:${index}" data-category="${escapeHtml(category.label)}"><small>0${index + 1} / ${counts.get(category.label) || 0} 篇</small><i>→</i><h3>${escapeHtml(category.label)}</h3><p>${escapeHtml(categoryCopy[category.label] || category.description || "浏览这个分类下的全部知识内容。")}</p><span class="category-progress">上次读到 · ${escapeHtml(last?.order || "从头开始")}</span></button>`; }).join("");
    els.homeCategories.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => openCategory(button.dataset.category)));
    els.topCategories.querySelectorAll("[data-home-category]").forEach((button) => button.addEventListener("click", () => openCategory(button.dataset.homeCategory)));
  }
  function renderTree() {
    const visible = visibleNotes();
    const activeCategory = selectedNote()?.categoryLabel || state.openCategory;
    const groups = categories.filter((category) => category.label === activeCategory).map((category) => ({ category, items: visible.filter((note) => note.categoryLabel === category.label) })).filter((group) => group.items.length);
    if (!groups.length) { els.tree.innerHTML = '<div class="empty">没有找到相关文章</div>'; return; }
    els.tree.innerHTML = groups.map(({ category, items }) => `<section class="tree-group open" data-category="${escapeHtml(category.label)}"><div class="tree-heading"><span>${escapeHtml(category.label)}</span><small>${items.length} 篇</small></div><div class="tree-notes">${items.map((note) => `<button class="tree-note ${note.id === state.selectedId ? "active" : ""}" data-id="${escapeHtml(note.id)}"><span>${escapeHtml(note.order || "--")}</span><span>${escapeHtml(note.title)}</span></button>`).join("")}</div></section>`).join("");
    els.tree.querySelectorAll(".tree-note").forEach((button) => button.addEventListener("click", () => openArticle(button.dataset.id)));
  }
  function renderDetail() {
    const note = selectedNote(); if (!note) return;
    const sections = note.sections || [];
    const words = sections.reduce((sum, section) => sum + String(section.content || "").length, 0);
    const readTime = Math.max(1, Math.ceil(words / 420));
    const themeHtml = (note.themes || []).map((item) => `<span class="theme-chip">${escapeHtml(item)}</span>`).join("");
    const tagHtml = (note.tags || []).map((item) => `<span class="tag-chip">${escapeHtml(item)}</span>`).join("");
    const taxonomyHtml = themeHtml || tagHtml ? `<div class="reader-taxonomy">${themeHtml ? `<div><strong>主题</strong><span>${themeHtml}</span></div>` : ""}${tagHtml ? `<div><strong>标签</strong><span>${tagHtml}</span></div>` : ""}</div>` : "";
    els.detail.innerHTML = `<div class="reader-kicker">${escapeHtml(note.categoryLabel)} / ${escapeHtml(note.order || "KNOWLEDGE")}</div><h1 class="reader-title">${escapeHtml(note.title)}</h1><div class="reader-meta"><span>${escapeHtml(note.date || "知识卡片")}</span><span>${escapeHtml(note.type || "阅读")}</span><span>${readTime} 分钟阅读</span></div>${taxonomyHtml}${sections.map((section, index) => `<section class="content-section" id="${slug(section.title, index)}"><h3>${escapeHtml(section.title)}</h3>${renderMarkdown(section.content, note)}</section>`).join("")}`;
    els.detail.classList.remove("is-entering");
    void els.detail.offsetWidth;
    els.detail.classList.add("is-entering");
    requestAnimationFrame(() => {
      const savedTop = Number(localStorage.getItem(scrollStorageKey(note.id))) || 0;
      els.readerPanel?.scrollTo({ top: savedTop });
      if (window.matchMedia("(max-width: 760px)").matches) window.scrollTo({ top: savedTop });
    });
  }
  function openReader() { document.body.className = "reader-view"; els.reader.setAttribute("aria-hidden", "false"); renderTree(); renderDetail(); }
  function showHome() { document.body.className = "home-view"; els.reader.classList.remove("article-open"); els.reader.setAttribute("aria-hidden", "true"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openCategory(category) { const last = categoryLastNote(category); state.query = ""; els.readerSearch.value = ""; if (last) openArticle(last.id); }
  function openArticle(id) { const note = notes.find((item) => item.id === id); if (!note) return; state.selectedId = id; state.openCategory = note.categoryLabel; localStorage.setItem("qifan-last-note", id); localStorage.setItem(categoryStorageKey(note.categoryLabel), id); openReader(); els.reader.classList.add("article-open"); renderTree(); }
  function openSearch() { els.searchModal.classList.add("open"); els.searchModal.setAttribute("aria-hidden", "false"); document.body.classList.add("search-open"); requestAnimationFrame(() => els.homeSearch.focus()); }
  function closeSearch() { els.searchModal.classList.remove("open"); els.searchModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("search-open"); $("navSearch").focus(); }
  function submitHomeSearch() { const query = els.homeSearch.value.trim(); state.query = query; const first = visibleNotes()[0]; if (!first) return; state.selectedId = first.id; state.openCategory = first.categoryLabel; els.readerSearch.value = query; closeSearch(); openReader(); }

  $("brandHome").addEventListener("click", showHome); $("backHome").addEventListener("click", showHome);
  $("continueReading").addEventListener("click", () => openArticle(state.selectedId));
  $("navSearch").addEventListener("click", openSearch);
  els.searchClose.addEventListener("click", closeSearch);
  els.searchBackdrop.addEventListener("click", closeSearch);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && els.searchModal.classList.contains("open")) closeSearch(); });
  els.homeSearch.addEventListener("keydown", (event) => { if (event.key === "Enter") submitHomeSearch(); });
  els.readerSearch.addEventListener("input", (event) => { state.query = event.target.value; renderTree(); });
  $("mobileBack").addEventListener("click", () => els.reader.classList.remove("article-open"));
  els.readerPanel?.addEventListener("scroll", () => { if (document.body.classList.contains("reader-view")) localStorage.setItem(scrollStorageKey(state.selectedId), String(Math.round(els.readerPanel.scrollTop))); }, { passive:true });
  window.addEventListener("scroll", () => { if (document.body.classList.contains("reader-view") && window.matchMedia("(max-width: 760px)").matches) localStorage.setItem(scrollStorageKey(state.selectedId), String(Math.round(window.scrollY))); }, { passive:true });
  renderHome();
})();
