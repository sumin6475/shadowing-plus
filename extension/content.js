(() => {
  const HOST_ID = "shadowing-plus-extension-host";
  const PANEL_WIDTH_KEY = "spPanelWidth";
  const PANEL_MODE_KEY = "spPanelMode";
  const CLOSED_KEY = "spPanelClosed";
  let host, root, panel, list, status, selectedWord, wordEntry = null, wordLoading = false, wordError = "", phraseSelection = null, phrases = [], mode = "side";
  let width = 360, closed = false, activeTab = "subtitles", currentIndex = -1;
  let cues = [], saved = [], prepared = false, preparing = false, prepareError = "", prepareProgress = 0, prepareStage = "", prepareJobId = null, preparePoll = null, lastCaption = "", pendingCue = null, captionTimer = null, abLoop = null, observer, timeListener;

  const $ = (selector, parent = root) => parent.querySelector(selector);
  const escapeHtml = (value) => value.replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
  const video = () => document.querySelector("#movie_player video") || document.querySelector("video");
  const videoId = () => new URL(location.href).searchParams.get("v") || location.pathname.match(/\/shorts\/([^/?]+)/)?.[1] || "";
  const videoTitle = () => document.querySelector("h1 yt-formatted-string")?.textContent?.trim() || document.title.replace(" - YouTube", "");
  const storage = (keys) => chrome.storage.local.get(keys);

  function inject() {
    if (document.getElementById(HOST_ID)) return;
    host = document.createElement("div"); host.id = HOST_ID; document.documentElement.append(host);
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${styles}</style><section class="sp-panel" aria-label="Shadowing Plus learning panel"></section>`;
    panel = $(".sp-panel");
    panel.addEventListener("click", onClick); panel.addEventListener("pointerdown", startResize); panel.addEventListener("mouseup", capturePhraseSelection);
    render(); position();
    window.addEventListener("resize", position); window.addEventListener("yt-navigate-finish", resetForNavigation);
    timeListener = () => { updateCurrentCue(); enforceAbLoop(); };
    video()?.addEventListener("timeupdate", timeListener);
  }

  async function hydrate() {
    const data = await storage([PANEL_WIDTH_KEY, PANEL_MODE_KEY, CLOSED_KEY, "spSaved"]);
    width = Math.max(280, Math.min(520, data[PANEL_WIDTH_KEY] || 360)); mode = data[PANEL_MODE_KEY] || "side"; closed = !!data[CLOSED_KEY]; saved = data.spSaved || [];
    inject(); if (closed) host.style.display = "none"; loadPreparedVideo();
  }

  function position() {
    if (!panel || closed) return;
    const player = document.querySelector("#movie_player"); const rect = player?.getBoundingClientRect();
    const canSitBeside = mode === "side" && rect && innerWidth >= rect.right + width + 32 && innerWidth >= 1180;
    panel.classList.toggle("sp-dock", !canSitBeside);
    panel.style.width = `${width}px`;
    if (canSitBeside) { panel.style.top = `${Math.max(72, rect.top)}px`; panel.style.left = `${rect.right + 16}px`; panel.style.right = "auto"; }
    else { panel.style.top = "72px"; panel.style.right = "16px"; panel.style.left = "auto"; }
  }

  function render() {
    if (!panel) return;
    panel.innerHTML = `<header><strong>Shadowing <i>+</i></strong><nav>${tab("subtitles", "Subtitles")}${tab("words", "Words")}${tab("saved", "Saved")}${tab("phrases", "Phrases")}</nav><button data-action="app" title="Open Shadowing Plus">⌂</button><button data-action="settings" title="Settings">⚙</button><button data-action="mode" title="Toggle panel position">↗</button><button data-action="close" title="Close">×</button></header><main>${body()}</main><p class="status" aria-live="polite"></p><footer><button data-action="prev">‹</button><button data-action="repeat">↻</button><button data-action="next">›</button><button data-action="ab" class="${abLoop ? "active" : ""}">A–B ${abLoop?.end ? "on" : abLoop ? "set B" : ""}</button></footer><div class="resize" title="Resize panel"></div>`;
    list = $(".cue-list"); status = $(".status"); scrollCurrentIntoView();
  }
  const tab = (id, label) => `<button class="tab ${activeTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
  function body() {
    if (activeTab === "words") return wordBody();
    if (activeTab === "phrases") return phraseBody();
    if (activeTab === "saved") return `<div class="cue-list">${saved.filter((item) => item.youtubeId === videoId()).length ? saved.filter((item) => item.youtubeId === videoId()).map((item) => `<button class="cue saved-cue" data-seek="${item.startTime}"><span>${escapeHtml(item.text)}</span><small>${escapeHtml(item.translation || "번역 없음")}</small></button>`).join("") : `<p class="empty">저장한 문장이 없습니다.</p>`}</div>`;
    if (preparing) return `<div class="empty"><b>Preparing this video…</b><br>${escapeHtml(prepareStage || "Starting")}${prepareProgress ? ` · ${prepareProgress}%` : ""}<div class="progress"><i style="width:${prepareProgress}%"></i></div><small>You can keep watching while this finishes.</small></div>`;
    if (!prepared) return `<div class="empty"><b>Prepare this video</b><br>Build complete subtitles and natural Korean translations using the full video context.<small class="estimate">Estimated translation cost: ${estimateCost()}</small><button class="prepare" data-action="prepare">Prepare video</button>${prepareError ? `<small class="prepare-error">${escapeHtml(prepareError)}</small>` : ""}</div>`;
    if (!cues.length) return `<div class="empty"><b>No captions found.</b><br>This video does not have usable subtitles.</div>`;
    const selection = phraseSelection ? `<div class="phrase-picker"><span>Selected: <b>${escapeHtml(phraseSelection.text)}</b></span><button data-action="save-phrase">Save phrase</button><button data-action="clear-phrase" title="Clear selection">×</button></div>` : "";
    return `${selection}<div class="cue-list">${cues.map((cue, index) => `<button class="cue ${index === currentIndex ? "current" : ""}" data-index="${index}"><span>${wordButtons(cue.text)}</span><small>${cue.translation ? escapeHtml(cue.translation) : index === currentIndex ? "한국어 번역을 불러오는 중…" : ""}</small><em data-save="${index}">${cue.saved ? "Saved" : "Save"}</em></button>`).join("")}</div>`;
  }
  function wordBody() {
    if (!selectedWord) return `<div class="words empty">Select a word in a subtitle to look it up.</div>`;
    if (wordLoading) return `<div class="words"><b>${escapeHtml(selectedWord)}</b><p class="word-muted">Looking up definition…</p></div>`;
    if (wordError) return `<div class="words"><b>${escapeHtml(selectedWord)}</b><p class="word-error">${escapeHtml(wordError)}</p></div>`;
    if (!wordEntry) return `<div class="words"><b>${escapeHtml(selectedWord)}</b></div>`;
    const meanings = (wordEntry.meanings || []).map((meaning) => `<section class="word-meaning"><strong>${escapeHtml(meaning.partOfSpeech || "Definition")}</strong>${meaning.definitions.map((definition) => `<p>${escapeHtml(definition.definition)}${definition.example ? `<small>“${escapeHtml(definition.example)}”</small>` : ""}</p>`).join("")}</section>`).join("");
    return `<div class="words"><b>${escapeHtml(wordEntry.word || selectedWord)}</b>${wordEntry.phonetic ? `<span class="word-phonetic">/${escapeHtml(wordEntry.phonetic).replace(/^\/+|\/+$/g, "")}/</span>` : ""}${meanings || `<p class="word-muted">No definition was found.</p>`}</div>`;
  }
  function phraseBody() {
    if (!phrases.length) return `<div class="empty"><b>Your Phrase Bank is empty.</b><br>Select a phrase in one subtitle, then choose <em>Save phrase</em>. We will explain what it means in this video context.</div>`;
    return `<div class="phrase-list"><button class="phrase-open" data-action="open-phrases">Open Phrase Bank ↗</button>${phrases.map((item) => `<article class="phrase-card"><b>${escapeHtml(item.text)}</b><span class="phrase-kind">${escapeHtml((item.kind || "phrase").replace(/_/g, " "))}</span>${item.status === "ready" ? `<p>${escapeHtml(item.meaning_ko || "")}</p><small>${escapeHtml(item.usage_note || "")}</small>` : `<small class="word-muted">${item.status === "failed" ? "Explanation unavailable." : "Explaining phrase…"}</small>`}</article>`).join("")}</div>`;
  }
  function wordButtons(text) { return escapeHtml(text).replace(/([A-Za-z][A-Za-z'-]*)/g, '<mark data-word="$1">$1</mark>'); }

  function onClick(event) {
    const el = event.target.closest("button,mark,em"); if (!el) return;
    const action = el.dataset.action;
    if (window.getSelection()?.toString().trim()) return;
    if (el.dataset.tab) { activeTab = el.dataset.tab; if (activeTab === "phrases") loadPhrases(); render(); return; }
    if (el.dataset.word) { selectedWord = el.dataset.word; activeTab = "words"; lookupWord(selectedWord); render(); return; }
    if (el.dataset.index !== undefined) { seek(cues[Number(el.dataset.index)]?.start); return; }
    if (el.dataset.seek) { seek(Number(el.dataset.seek)); return; }
    if (el.dataset.save !== undefined) { saveCue(Number(el.dataset.save)); return; }
    if (action === "prev") selectRelative(-1); if (action === "next") selectRelative(1); if (action === "repeat") seek(cues[currentIndex]?.start);
    if (action === "ab") toggleAb(); if (action === "mode") { mode = mode === "side" ? "dock" : "side"; chrome.storage.local.set({ [PANEL_MODE_KEY]: mode }); position(); }
    if (action === "prepare") prepareVideo();
    if (action === "save-phrase") savePhrase();
    if (action === "clear-phrase") { phraseSelection = null; render(); }
    if (action === "close") { closed = true; chrome.storage.local.set({ [CLOSED_KEY]: true }); host.style.display = "none"; }
    if (action === "app") chrome.runtime.sendMessage({ type: "sp:open-app" });
    if (action === "open-phrases") chrome.runtime.sendMessage({ type: "sp:open-phrases" });
    if (action === "settings") chrome.runtime.sendMessage({ type: "sp:open-options" });
  }
  function capturePhraseSelection() {
    window.setTimeout(() => {
      if (activeTab !== "subtitles") return;
      const selection = window.getSelection(); const text = selection?.toString().replace(/\s+/g, " ").trim() || "";
      if (!text || text.length > 240) return;
      const toElement = (node) => node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const startCue = toElement(selection.anchorNode)?.closest?.(".cue");
      const endCue = toElement(selection.focusNode)?.closest?.(".cue");
      if (!startCue || startCue !== endCue || !root.contains(startCue)) return;
      const cueIndex = Number(startCue.dataset.index);
      const cue = cues[cueIndex];
      if (!cue?.id || !cue.text.toLowerCase().includes(text.toLowerCase())) return;
      phraseSelection = { text, cueIndex }; render(); selection.removeAllRanges();
    }, 0);
  }
  function lookupWord(word) {
    wordLoading = true; wordError = ""; wordEntry = null;
    chrome.runtime.sendMessage({ type: "sp:dictionary", word }, (result) => {
      if (word !== selectedWord) return;
      wordLoading = false;
      if (chrome.runtime.lastError || !result?.ok) wordError = result?.error || "Unable to load the definition.";
      else wordEntry = result;
      if (activeTab === "words") render();
    });
  }
  function loadPhrases() {
    chrome.runtime.sendMessage({ type: "sp:phrases" }, (result) => {
      if (chrome.runtime.lastError || !result?.ok) { setStatus(result?.error || "Connect your account to load Phrase Bank."); return; }
      phrases = result.items || []; if (activeTab === "phrases") render();
    });
  }
  function savePhrase() {
    const selection = phraseSelection; const cue = selection && cues[selection.cueIndex];
    if (!selection || !cue?.id) { setStatus("Select text from one prepared subtitle first."); return; }
    setStatus("Explaining phrase…");
    chrome.runtime.sendMessage({ type: "sp:save-phrase", payload: { segmentId: cue.id, text: selection.text } }, (result) => {
      if (chrome.runtime.lastError || !result?.ok) { setStatus(result?.error || "Unable to save phrase."); return; }
      const item = result.item; if (item) phrases = [item, ...phrases.filter((phrase) => phrase.id !== item.id)];
      phraseSelection = null; setStatus(result.alreadySaved ? "Already in Phrase Bank." : item?.status === "ready" ? "Saved to Phrase Bank." : "Saved. Explanation will be available shortly.");
      activeTab = "phrases"; render();
    });
  }

  function seek(time) { const v = video(); if (!v || typeof time !== "number") return; v.currentTime = Math.max(0, time); v.play().catch(() => {}); }
  function selectRelative(delta) { const next = Math.max(0, Math.min(cues.length - 1, currentIndex + delta)); if (cues[next]) seek(cues[next].start); }
  function toggleAb() { const time = video()?.currentTime || 0; abLoop = !abLoop ? { start: time, end: null } : !abLoop.end ? { ...abLoop, end: time > abLoop.start ? time : null } : null; render(); }
  function enforceAbLoop() { const v = video(); if (v && abLoop?.end && v.currentTime >= abLoop.end) v.currentTime = abLoop.start; }

  function observeCaptions() {
    observer?.disconnect(); const player = document.querySelector("#movie_player") || document.body;
    observer = new MutationObserver(recordCaption); observer.observe(player, { subtree: true, childList: true, characterData: true }); recordCaption();
  }
  function captionText() { return [...document.querySelectorAll("#movie_player .ytp-caption-segment")].map((node) => node.textContent?.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim(); }
  function recordCaption() {
    const text = captionText(); const v = video(); if (!text || !v || text === lastCaption) return;
    lastCaption = text;
    const now = v.currentTime;
    // YouTube updates rolling captions once per word. Keep folding those DOM
    // changes into one pending sentence, then commit only after the text has
    // been stable briefly (or the spoken phrase actually changes).
    if (!pendingCue) {
      pendingCue = { text, start: now, end: now + .4, lastSeen: now };
    } else if (isRollingContinuation(pendingCue.text, text)) {
      pendingCue.text = text;
      pendingCue.end = Math.max(pendingCue.start + .4, now + .4);
      pendingCue.lastSeen = now;
    } else {
      commitPendingCue();
      pendingCue = { text, start: now, end: now + .4, lastSeen: now };
    }
    if (captionTimer) window.clearTimeout(captionTimer);
    captionTimer = window.setTimeout(commitPendingCue, 850);
  }
  function isRollingContinuation(previous, next) {
    const a = previous.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || [];
    const b = next.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || [];
    if (!a.length || !b.length) return false;
    const oldText = a.join(" "), newText = b.join(" ");
    if (newText.includes(oldText) || oldText.includes(newText)) return true;
    const previousWords = new Set(a), shared = b.filter((word) => previousWords.has(word)).length;
    return shared / Math.min(a.length, b.length) >= .65;
  }
  function commitPendingCue() {
    if (captionTimer) { window.clearTimeout(captionTimer); captionTimer = null; }
    const cue = pendingCue; pendingCue = null;
    if (!cue || cue.text.length < 2) return;
    const prior = cues.at(-1);
    if (prior) prior.end = Math.max(prior.start + .4, cue.start);
    cues.push({ text: cue.text, start: cue.start, end: cue.end, translation: "", saved: false });
    if (cues.length > 160) cues.shift();
    currentIndex = cues.length - 1;
    translateCue(cues.at(-1));
    render();
  }
  function translateCue(cue) { chrome.runtime.sendMessage({ type: "sp:translation", text: cue.text }, (result) => { if (chrome.runtime.lastError || !result?.ok) { if (cue === cues[currentIndex]) setStatus(result?.error || "번역을 사용하려면 계정을 연결하세요."); return; } cue.translation = result.translation; if (cue === cues[currentIndex] || activeTab === "subtitles") render(); }); }
  function updateCurrentCue() { const time = video()?.currentTime ?? 0; const index = cues.findLastIndex((cue) => time >= cue.start && time <= cue.end + .35); if (index !== -1 && index !== currentIndex) { currentIndex = index; render(); } }
  function setStatus(message) { if (status) status.textContent = message; }
  function loadPreparedVideo() {
    const id = videoId(); if (!id) return;
    chrome.runtime.sendMessage({ type: "sp:load-prepared", youtubeId: id }, (result) => {
      if (chrome.runtime.lastError || !result?.ok || !result.prepared) return;
      prepared = true; preparing = false; prepareError = "";
      cues = result.segments.map((segment) => ({ id: segment.id, text: segment.text, start: segment.start_time, end: segment.end_time, translation: segment.translation || "", saved: !!segment.saved }));
      saved = cues.filter((cue) => cue.saved).map((cue) => ({ youtubeId: id, text: cue.text, translation: cue.translation, startTime: cue.start, endTime: cue.end }));
      updateCurrentCue(); render();
    });
  }
  function prepareVideo() {
    if (preparing) return;
    preparing = true; prepareError = ""; render();
    chrome.runtime.sendMessage({ type: "sp:prepare", url: location.href }, (result) => {
      if (chrome.runtime.lastError || !result?.ok) {
        preparing = false; prepareError = result?.error || "Unable to prepare this video."; render(); return;
      }
      if (result.cached) { loadPreparedVideo(); return; }
      prepareJobId = result.jobId; pollPreparation();
    });
  }
  function pollPreparation() {
    if (!prepareJobId) return;
    chrome.runtime.sendMessage({ type: "sp:job", jobId: prepareJobId }, (result) => {
      if (chrome.runtime.lastError || !result?.ok) { preparing = false; prepareError = result?.error || "Unable to check preparation progress."; render(); return; }
      prepareProgress = result.progress || 0; prepareStage = result.stage || result.status || "Preparing"; render();
      if (result.status === "ready") { preparing = false; prepareJobId = null; loadPreparedVideo(); return; }
      if (result.status === "failed") { preparing = false; prepareError = result.error || "Video preparation failed."; render(); return; }
      preparePoll = window.setTimeout(pollPreparation, 1000);
    });
  }
  function estimateCost() {
    const minutes = Math.max(1, Math.ceil((video()?.duration || 0) / 60));
    // gpt-4o-mini estimate: transcript/context input + Korean output. The
    // final invoice is tracked from actual token usage in Settings.
    const inputTokens = minutes * 420 + 1_500, outputTokens = minutes * 230 + 250;
    const usd = inputTokens * 0.15 / 1e6 + outputTokens * 0.60 / 1e6;
    return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
  }
  function scrollCurrentIntoView() { $(".cue.current")?.scrollIntoView({ block: "center" }); }
  async function saveCue(index) { const cue = cues[index]; if (!cue) return; const payload = { youtubeId: videoId(), title: videoTitle(), text: cue.text, translation: cue.translation, startTime: cue.start, endTime: cue.end };
    chrome.runtime.sendMessage({ type: "sp:save", payload }, async (result) => { if (chrome.runtime.lastError || !result?.ok) { setStatus(result?.error || "저장하려면 계정을 연결하세요."); return; } cue.saved = true; saved = [...saved.filter((item) => !(item.youtubeId === payload.youtubeId && item.startTime === payload.startTime)), payload]; await chrome.storage.local.set({ spSaved: saved }); render(); }); }
  function startResize(event) { if (!event.target.classList.contains("resize")) return; event.preventDefault(); const startX = event.clientX, startWidth = width; const move = (e) => { width = Math.max(280, Math.min(520, startWidth + (startX - e.clientX))); position(); }; const end = () => { chrome.storage.local.set({ [PANEL_WIDTH_KEY]: width }); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", end); }
  function resetForNavigation() { if (captionTimer) window.clearTimeout(captionTimer); if (preparePoll) window.clearTimeout(preparePoll); cues = []; saved = []; phrases = []; phraseSelection = null; prepared = false; preparing = false; prepareError = ""; prepareProgress = 0; prepareStage = ""; prepareJobId = null; lastCaption = ""; pendingCue = null; currentIndex = -1; setTimeout(() => { position(); render(); loadPreparedVideo(); }, 700); }
  chrome.runtime.onMessage.addListener((message) => { if (message.type === "sp:toggle") { closed = !closed; host.style.display = closed ? "none" : "block"; chrome.storage.local.set({ [CLOSED_KEY]: closed }); if (!closed) position(); } });

  const styles = `:host{all:initial}.sp-panel{position:fixed;z-index:2147483647;box-sizing:border-box;height:min(720px,calc(100vh - 96px));display:flex;flex-direction:column;background:#101114;color:#f5f5f7;border:1px solid #36373d;border-radius:12px;box-shadow:0 18px 52px #0008;font:13px/1.45 Arial,sans-serif;overflow:hidden}.sp-panel.sp-dock{height:calc(100vh - 96px)}*{box-sizing:border-box}header{height:46px;display:flex;align-items:center;gap:7px;padding:0 10px;border-bottom:1px solid #303137;background:#18191d}header strong{letter-spacing:-.2px;white-space:nowrap}header i{color:#eb604a;font-style:normal}nav{display:flex;gap:1px;flex:1;margin-left:8px;overflow:hidden}button{font:inherit;color:inherit;border:0;background:transparent;cursor:pointer}header>button{font-size:17px;opacity:.8;padding:4px}header>button:hover{opacity:1}.tab{height:46px;padding:0 6px;color:#b5b6bd;font-weight:700;border-bottom:2px solid transparent;white-space:nowrap}.tab.active{color:#fff;border-color:#e95740}main{min-height:0;flex:1;overflow:auto;background:#111216}.cue-list{padding:8px}.cue{position:relative;width:100%;display:block;text-align:left;padding:10px 34px 9px 10px;margin-bottom:5px;border-radius:7px;background:#1a1b20;color:#dedfe5;transition:.12s}.cue:hover{background:#25262d}.cue.current{background:#2e2430;box-shadow:inset 3px 0 #e95740}.cue span{display:block;font-weight:650;user-select:text}.cue small{display:block;margin-top:4px;color:#abaeb8;font-size:12px}.cue em{position:absolute;right:9px;top:10px;color:#e9a092;font-size:11px;font-style:normal;opacity:.75}.cue:hover em{opacity:1}mark{color:#fff;background:none;text-decoration:underline dotted #85858c;text-underline-offset:3px;cursor:pointer}.empty,.words{padding:22px 16px;color:#b0b2ba}.prepare{display:block;margin-top:16px;padding:9px 11px;border-radius:7px;background:#e95740;color:#fff;font-weight:700}.estimate,.prepare-error{display:block;margin-top:12px;color:#f3a394}.progress{height:7px;margin:14px 0;border-radius:99px;background:#303137;overflow:hidden}.progress i{display:block;height:100%;border-radius:99px;background:#e95740;transition:width .25s}.words b{display:block;font-size:22px;color:#fff;margin-bottom:3px}.word-phonetic,.word-muted{display:block;margin:0 0 16px;color:#aeb2bd}.word-meaning{padding:13px 0;border-top:1px solid #2b2d33}.word-meaning strong{color:#f2a293;text-transform:capitalize}.word-meaning p{margin:7px 0 0;color:#e2e3e8;line-height:1.5}.word-meaning small{display:block;margin-top:4px;color:#9296a1;font-style:italic}.word-error{color:#f19a88}.phrase-picker{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:7px;padding:8px 10px;background:#2e2430;border-bottom:1px solid #5d3c45}.phrase-picker span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e6e1e4}.phrase-picker b{color:#fff}.phrase-picker button,.phrase-open{padding:5px 7px;border-radius:5px;background:#e95740;color:#fff;font-size:11px;font-weight:700;white-space:nowrap}.phrase-picker button:last-child{background:transparent;color:#c9c5cc;font-size:15px}.phrase-list{padding:9px}.phrase-open{display:block;margin:3px 0 10px;background:#292a30;text-align:left}.phrase-card{padding:11px;margin-bottom:6px;border-radius:7px;background:#1a1b20}.phrase-card>b{display:block;font-size:14px;color:#fff}.phrase-kind{display:inline-block;margin-top:5px;padding:2px 5px;border-radius:99px;background:#332936;color:#e9a092;font-size:10px;text-transform:capitalize}.phrase-card p{margin:9px 0 3px;color:#eeeef2;font-size:13px}.phrase-card small{display:block;color:#aeb2ba;font-size:11px;line-height:1.45}.status{padding:0 12px 8px;color:#f1a497;font-size:11px}footer{height:44px;display:flex;gap:4px;align-items:center;padding:6px 9px;border-top:1px solid #303137;background:#18191d}footer button{min-width:31px;border-radius:6px;padding:5px 7px;background:#292a30;font-weight:700}footer button:hover,footer button.active{background:#884237}.resize{position:absolute;top:0;left:0;width:7px;height:100%;cursor:ew-resize}.saved-cue small{color:#df9c90}`;
  hydrate();
})();
