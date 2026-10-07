// Myne screenshot kit: small custom elements so frames stay readable.
//   <i-c n="plus" s="28" w="1.75" c="#111114">   an icon from the app's set
//   <status-bar tone="dark|light">               9:41, signal, wifi, battery
//   <tab-bar on="phrases|studio|talk">           the native tab capsule
//   <listen-btn>                                 the 24pt speaker circle in phrase rows
(() => {
  if (location.search.includes("bare")) document.addEventListener("DOMContentLoaded", () => document.body.classList.add("bare"));
  const I = window.MYNE_ICONS || {};
  const svg = (s, body, extra = "") =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" ${extra}>${body}</svg>`;

  // SF Symbols the app gets from iOS; redrawn here on the same 24pt grid.
  const SF = {
    filter: `<path d="M3 6.6h18M6 12h12M9 17.4h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
    bookmarkFill: `<path d="M7 3.2h10a1.6 1.6 0 0 1 1.6 1.6v15.4a.7.7 0 0 1-1.1.57L12 16.9l-5.5 3.87a.7.7 0 0 1-1.1-.57V4.8A1.6 1.6 0 0 1 7 3.2z" fill="currentColor"/>`,
    bookmark: `<path d="M7 4h10a.9.9 0 0 1 .9.9v14.6L12 15.6l-5.9 3.9V4.9A.9.9 0 0 1 7 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
    grid: `<g fill="none" stroke="currentColor" stroke-width="1.55"><rect x="3.6" y="3.6" width="7.2" height="7.2" rx="2"/><rect x="13.2" y="3.6" width="7.2" height="7.2" rx="2"/><rect x="3.6" y="13.2" width="7.2" height="7.2" rx="2"/><rect x="13.2" y="13.2" width="7.2" height="7.2" rx="2"/></g>`,
    gridFill: `<g fill="currentColor"><rect x="3" y="3" width="8.2" height="8.2" rx="2"/><rect x="12.8" y="3" width="8.2" height="8.2" rx="2"/><rect x="3" y="12.8" width="8.2" height="8.2" rx="2"/><rect x="12.8" y="12.8" width="8.2" height="8.2" rx="2"/></g>`,
    micFill: `<rect x="8.6" y="2.4" width="6.8" height="12" rx="3.4" fill="currentColor"/><path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8v3.4M8.6 21.3h6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  };
  window.MYNE_SF = SF;

  class Icon extends HTMLElement {
    connectedCallback() {
      const n = this.getAttribute("n");
      const s = this.getAttribute("s") || 20;
      const w = this.getAttribute("w") || 1.8;
      const c = this.getAttribute("c");
      if (c) this.style.color = c;
      this.style.width = this.style.height = s + "px";
      if (SF[n]) {
        this.innerHTML = svg(s, SF[n]);
        return;
      }
      this.innerHTML = svg(
        s,
        `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${I[n] || ""}</g>`,
      );
    }
  }
  customElements.define("i-c", Icon);

  class StatusBar extends HTMLElement {
    connectedCallback() {
      this.className = "statusbar " + (this.getAttribute("tone") === "light" ? "light" : "");
      this.innerHTML = `
        <p class="time">9:41</p>
        <div class="sys">
          <svg width="19.5" height="13" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="0.9" fill="currentColor"/><rect x="5" y="5.4" width="3" height="6.6" rx="0.9" fill="currentColor"/><rect x="10" y="2.7" width="3" height="9.3" rx="0.9" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="0.9" fill="currentColor"/></svg>
          <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.5 0 4.7 1 6.3 2.6l1-1.1A10.3 10.3 0 0 0 8.5.8C5.700.8 3.100 1.900 1.200 3.800l1 1.100A8.800 8.800 0 0 1 8.500 2.300z" fill="currentColor"/><path d="M8.500 5.800c1.500 0 2.900.600 3.900 1.600l1-1.100a7 7 0 0 0-9.800 0l1 1.100c1-1 2.400-1.600 3.900-1.600z" fill="currentColor"/><path d="M8.500 9.200c.700 0 1.300.300 1.800.700L8.500 11.900 6.700 9.900c.5-.400 1.100-.700 1.800-.700z" fill="currentColor"/></svg>
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity="0.4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.500-1.100 1.500-2s-.700-1.700-1.500-2z" fill="currentColor" fill-opacity="0.45"/></svg>
        </div>`;
    }
  }
  customElements.define("status-bar", StatusBar);

  class TabBar extends HTMLElement {
    connectedCallback() {
      const on = this.getAttribute("on");
      const tab = (id, label, icon, iconOn) =>
        `<div class="tab ${on === id ? "on" : ""}"><div class="tabicon">${svg(id === "studio" ? 26 : id === "talk" ? 28 : 30, SF[on === id ? iconOn : icon])}</div><p>${label}</p></div>`;
      this.outerHTML = `<div class="tabfade"></div><div class="tabbar">${tab("phrases", "Phrases", "bookmark", "bookmarkFill")}${tab("studio", "Studio", "grid", "gridFill")}${tab("talk", "Talk", "micFill", "micFill")}</div>`;
    }
  }
  customElements.define("tab-bar", TabBar);

  class ListenBtn extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><rect x="0.5" y="0.5" width="23" height="23" rx="11.5" fill="#F2F2F7" fill-opacity="0.5"/><rect x="0.5" y="0.5" width="23" height="23" rx="11.5" stroke="#F2F2F7" fill="none"/><path d="${I._speaker_fill}" fill="#A6A7A3"/></svg>`;
    }
  }
  customElements.define("listen-btn", ListenBtn);
})();
