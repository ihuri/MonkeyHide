(() => {
  const STYLE_ID = "__ext_element_hider_styles__";
  const BANNER_ID = "__ext_element_hider_banner__";
  const MODAL_ID = "__ext_element_hider_modal__";
  const HIGHLIGHT_CLASS = "__ext_element_hider_highlight__";

  let isPicking = false;
  let hoveredElement = null;

  function normalizeDomain(hostname) {
    return (hostname || "").trim().toLowerCase().replace(/^www\./, "");
  }

  function extractSelectorString(item) {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "object" && typeof item.selector === "string") {
      return item.selector.trim();
    }
    return "";
  }

  const currentDomain = normalizeDomain(window.location.hostname);

  // Aplica os seletores salvos injetando uma tag <style> com display: none !important
  function applyHiddenElements(sitesData) {
    let styleEl = document.getElementById(STYLE_ID);

    if (!currentDomain || !sitesData) {
      if (styleEl) styleEl.textContent = "";
      return;
    }

    const siteConfig = sitesData[currentDomain];
    if (
      !siteConfig ||
      siteConfig.enabled === false ||
      !Array.isArray(siteConfig.selectors) ||
      siteConfig.selectors.length === 0
    ) {
      if (styleEl) styleEl.textContent = "";
      return;
    }

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }

    const validSelectors = siteConfig.selectors
      .map(extractSelectorString)
      .filter((s) => s !== "");

    if (validSelectors.length === 0) {
      styleEl.textContent = "";
      return;
    }

    styleEl.textContent = validSelectors
      .map((sel) => `${sel} { display: none !important; }`)
      .join("\n");
  }

  // Carrega regras iniciais
  function loadAndApply() {
    chrome.storage.local.get(["sites"], (result) => {
      const sites = result.sites || {};
      applyHiddenElements(sites);
      chrome.runtime.sendMessage({ action: "SYNC_ICON" }).catch(() => {});

      const updateTitleIfNeeded = () => {
        const pageTitle = (document.title || "").trim();
        if (currentDomain && sites[currentDomain] && pageTitle && !sites[currentDomain].title) {
          sites[currentDomain].title = pageTitle;
          chrome.storage.local.set({ sites });
        }
      };

      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", updateTitleIfNeeded, { once: true });
      } else {
        updateTitleIfNeeded();
      }
    });
  }

  loadAndApply();

  // Atualiza automaticamente se o storage mudar
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.sites) {
      applyHiddenElements(changes.sites.newValue || {});
    }
  });

  // Gera um seletor CSS único e legível para o elemento clicado
  function generateSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";

    if (el.id && !/^\d/.test(el.id)) {
      const escapedId = CSS.escape(el.id);
      if (document.querySelectorAll(`#${escapedId}`).length === 1) {
        return `#${escapedId}`;
      }
    }

    const path = [];
    let current = el;

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      let selector = current.nodeName.toLowerCase();

      if (current.id && !/^\d/.test(current.id)) {
        const escapedId = CSS.escape(current.id);
        selector = `#${escapedId}`;
        path.unshift(selector);
        break;
      } else {
        const classes = Array.from(current.classList)
          .filter((c) => c !== HIGHLIGHT_CLASS && c.trim() !== "" && !c.includes(":"))
          .slice(0, 2);

        if (classes.length > 0) {
          selector += "." + classes.map((c) => CSS.escape(c)).join(".");
        }

        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (child) => child.nodeName === current.nodeName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
      }

      path.unshift(selector);
      const candidate = path.join(" > ");
      try {
        if (document.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      } catch (e) {
        // Continua subindo na árvore
      }

      current = current.parentElement;
    }

    return path.join(" > ");
  }

  function createBanner() {
    removeBanner();
    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.innerHTML = `
      <span>🙈 <strong>MonkeyHide:</strong> Clique no elemento que deseja esconder</span>
      <kbd>ESC para cancelar</kbd>
    `;
    document.documentElement.appendChild(banner);
  }

  function removeBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
  }

  function removeModal() {
    const existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
  }

  function clearHighlight() {
    if (hoveredElement) {
      hoveredElement.classList.remove(HIGHLIGHT_CLASS);
      hoveredElement = null;
    }
  }

  function showDescriptionModal(selector) {
    removeModal();

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="__ext_modal_title__">🙈 MonkeyHide — Esconder elemento</div>
      <div class="__ext_modal_selector__"></div>
      <input
        type="text"
        class="__ext_modal_input__"
        placeholder="Descrição opcional (ex: Banner do topo)"
      />
      <div class="__ext_modal_actions__">
        <button type="button" class="__ext_modal_btn_cancel__">Cancelar</button>
        <button type="button" class="__ext_modal_btn_save__">Esconder</button>
      </div>
    `;

    modal.querySelector(".__ext_modal_selector__").textContent = selector;
    const input = modal.querySelector(".__ext_modal_input__");
    const cancelBtn = modal.querySelector(".__ext_modal_btn_cancel__");
    const saveBtn = modal.querySelector(".__ext_modal_btn_save__");

    const confirmSave = () => {
      const description = input.value.trim();
      removeModal();
      saveSelectorForCurrentSite(selector, description);
    };

    cancelBtn.addEventListener("click", () => {
      removeModal();
    });

    saveBtn.addEventListener("click", confirmSave);

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        confirmSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        removeModal();
      }
    });

    document.documentElement.appendChild(modal);
    setTimeout(() => input.focus(), 10);
  }

  function onMouseOver(e) {
    if (!isPicking) return;
    const target = e.target;
    if (
      !target ||
      target.id === BANNER_ID ||
      target.closest(`#${BANNER_ID}`) ||
      target.id === MODAL_ID ||
      target.closest(`#${MODAL_ID}`)
    ) {
      return;
    }

    if (hoveredElement !== target) {
      clearHighlight();
      hoveredElement = target;
      hoveredElement.classList.add(HIGHLIGHT_CLASS);
    }
  }

  function onClick(e) {
    if (!isPicking) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = hoveredElement || e.target;
    stopPicker();

    if (!target || target === document.body || target === document.documentElement) {
      return;
    }

    const selector = generateSelector(target);
    if (!selector) return;

    showDescriptionModal(selector);
  }

  function onKeyDown(e) {
    if (!isPicking) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      stopPicker();
    }
  }

  function saveSelectorForCurrentSite(selector, description = "") {
    if (!currentDomain) return;

    chrome.storage.local.get(["sites"], (result) => {
      const sites = result.sites || {};
      const pageTitle = (document.title || "").trim();

      if (!sites[currentDomain]) {
        sites[currentDomain] = {
          title: pageTitle || currentDomain,
          enabled: true,
          selectors: []
        };
      } else if (pageTitle) {
        sites[currentDomain].title = pageTitle;
      }

      const existingIndex = sites[currentDomain].selectors.findIndex(
        (item) => extractSelectorString(item) === selector
      );

      const newEntry = {
        selector,
        description: description.trim()
      };

      if (existingIndex === -1) {
        sites[currentDomain].selectors.push(newEntry);
      } else if (description.trim()) {
        sites[currentDomain].selectors[existingIndex] = newEntry;
      }

      chrome.storage.local.set({ sites });
    });
  }

  function startPicker() {
    if (isPicking) return;
    removeModal();
    isPicking = true;
    createBanner();
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function stopPicker() {
    isPicking = false;
    clearHighlight();
    removeBanner();
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "START_PICKER") {
      startPicker();
      sendResponse({ ok: true });
    }
    return true;
  });
})();
