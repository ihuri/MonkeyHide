const currentSiteLabel = document.getElementById("currentSiteLabel");
const pickElementBtn = document.getElementById("pickElementBtn");
const siteInput = document.getElementById("siteInput");
const savedSitesSelect = document.getElementById("savedSitesSelect");
const descriptionInput = document.getElementById("descriptionInput");
const selectorInput = document.getElementById("selectorInput");
const addSelectorBtn = document.getElementById("addSelectorBtn");
const selectorsList = document.getElementById("selectorsList");
const emptyState = document.getElementById("emptyState");
const countBadge = document.getElementById("countBadge");
const clearSiteBtn = document.getElementById("clearSiteBtn");
const siteToggleWrapper = document.getElementById("siteToggleWrapper");
const siteEnabledToggle = document.getElementById("siteEnabledToggle");

let activeTabId = null;
let allSites = {};

function normalizeDomain(input) {
  if (!input) return "";
  let cleaned = input.trim().toLowerCase();
  try {
    if (cleaned.includes("://")) {
      cleaned = new URL(cleaned).hostname;
    } else {
      cleaned = cleaned.split("/")[0];
    }
  } catch (e) {
    cleaned = cleaned.split("/")[0];
  }
  return cleaned.replace(/^www\./, "");
}

function normalizeSelectorEntry(entry) {
  if (typeof entry === "string") {
    return { selector: entry, description: "" };
  }
  if (entry && typeof entry === "object") {
    return {
      selector: (entry.selector || "").trim(),
      description: (entry.description || "").trim()
    };
  }
  return { selector: "", description: "" };
}

function getSelectedDomain() {
  return normalizeDomain(siteInput.value);
}

function renderSavedSitesDropdown() {
  const currentSelected = getSelectedDomain();
  const domains = Object.keys(allSites).sort();

  savedSitesSelect.innerHTML = `<option value="">Sites salvos (${domains.length})</option>`;
  domains.forEach((domain) => {
    const count = allSites[domain]?.selectors?.length || 0;
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = `${domain} (${count})`;
    if (domain === currentSelected) {
      option.selected = true;
    }
    savedSitesSelect.appendChild(option);
  });
}

function renderSiteDetails() {
  const domain = getSelectedDomain();
  const logoEl = document.querySelector(".logo");
  selectorsList.innerHTML = "";

  if (
    !domain ||
    !allSites[domain] ||
    !Array.isArray(allSites[domain].selectors) ||
    allSites[domain].selectors.length === 0
  ) {
    emptyState.hidden = false;
    clearSiteBtn.hidden = true;
    siteToggleWrapper.hidden = !domain || !allSites[domain];
    countBadge.textContent = "0";
    if (domain && allSites[domain]) {
      siteEnabledToggle.checked = allSites[domain].enabled !== false;
    }
    if (logoEl) logoEl.textContent = "🐵";
    return;
  }

  const siteData = allSites[domain];
  const isEnabled = siteData.enabled !== false;
  emptyState.hidden = true;
  clearSiteBtn.hidden = false;
  siteToggleWrapper.hidden = false;
  siteEnabledToggle.checked = isEnabled;
  countBadge.textContent = String(siteData.selectors.length);
  if (logoEl) logoEl.textContent = isEnabled ? "🙈" : "🐵";

  siteData.selectors.forEach((rawEntry, index) => {
    const entry = normalizeSelectorEntry(rawEntry);
    const li = document.createElement("li");
    li.className = "selector-item";

    const infoDiv = document.createElement("div");
    infoDiv.className = "selector-info";

    if (entry.description) {
      const descEl = document.createElement("span");
      descEl.className = "selector-description";
      descEl.textContent = entry.description;
      infoDiv.appendChild(descEl);
    }

    const code = document.createElement("code");
    code.className = "selector-code";
    code.textContent = entry.selector;
    infoDiv.appendChild(code);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "selector-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-icon";
    editBtn.title = "Editar descrição";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      const newDesc = prompt(
        "Descrição opcional para este elemento:",
        entry.description || ""
      );
      if (newDesc !== null) {
        updateDescription(domain, index, newDesc.trim());
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-icon btn-remove";
    removeBtn.title = "Voltar a mostrar este elemento";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      removeSelector(domain, index);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(removeBtn);

    li.appendChild(infoDiv);
    li.appendChild(actionsDiv);
    selectorsList.appendChild(li);
  });
}

function saveSitesToStorage(callback) {
  chrome.storage.local.set({ sites: allSites }, () => {
    renderSavedSitesDropdown();
    renderSiteDetails();
    if (callback) callback();
  });
}

function addSelector(domain, selector, description = "") {
  if (!domain || !selector) return;

  if (!allSites[domain]) {
    allSites[domain] = {
      enabled: true,
      selectors: []
    };
  }

  const existingIndex = allSites[domain].selectors.findIndex(
    (item) => normalizeSelectorEntry(item).selector === selector
  );

  const newEntry = {
    selector,
    description: description.trim()
  };

  if (existingIndex === -1) {
    allSites[domain].selectors.push(newEntry);
  } else {
    allSites[domain].selectors[existingIndex] = newEntry;
  }

  saveSitesToStorage();
}

function updateDescription(domain, index, newDescription) {
  if (!allSites[domain] || !allSites[domain].selectors[index]) return;
  const current = normalizeSelectorEntry(allSites[domain].selectors[index]);
  allSites[domain].selectors[index] = {
    selector: current.selector,
    description: newDescription
  };
  saveSitesToStorage();
}

function removeSelector(domain, index) {
  if (!allSites[domain]) return;
  allSites[domain].selectors.splice(index, 1);

  if (allSites[domain].selectors.length === 0) {
    delete allSites[domain];
  }

  saveSitesToStorage();
}

// Eventos da interface
siteInput.addEventListener("input", () => {
  renderSavedSitesDropdown();
  renderSiteDetails();
});

savedSitesSelect.addEventListener("change", () => {
  if (savedSitesSelect.value) {
    siteInput.value = savedSitesSelect.value;
    renderSiteDetails();
  }
});

addSelectorBtn.addEventListener("click", () => {
  const domain = getSelectedDomain();
  const selector = selectorInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!domain) {
    siteInput.focus();
    return;
  }
  if (!selector) {
    selectorInput.focus();
    return;
  }

  siteInput.value = domain;
  addSelector(domain, selector, description);
  selectorInput.value = "";
  descriptionInput.value = "";
});

selectorInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addSelectorBtn.click();
  }
});

descriptionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (selectorInput.value.trim()) {
      addSelectorBtn.click();
    } else {
      selectorInput.focus();
    }
  }
});

siteEnabledToggle.addEventListener("change", () => {
  const domain = getSelectedDomain();
  if (!domain || !allSites[domain]) return;
  allSites[domain].enabled = siteEnabledToggle.checked;
  saveSitesToStorage();
});

clearSiteBtn.addEventListener("click", () => {
  const domain = getSelectedDomain();
  if (!domain || !allSites[domain]) return;
  delete allSites[domain];
  saveSitesToStorage();
});

pickElementBtn.addEventListener("click", async () => {
  if (!activeTabId) return;

  try {
    await chrome.tabs.sendMessage(activeTabId, { action: "START_PICKER" });
    window.close();
  } catch (err) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: activeTabId },
        files: ["content.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ["content.js"]
      });
      await chrome.tabs.sendMessage(activeTabId, { action: "START_PICKER" });
      window.close();
    } catch (injectErr) {
      alert("Não é possível selecionar elementos nesta página interna do navegador.");
    }
  }
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["sites"], (result) => {
    allSites = result.sites || {};

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && /^https?:\/\//i.test(tab.url)) {
        activeTabId = tab.id;
        const domain = normalizeDomain(tab.url);
        currentSiteLabel.textContent = domain;
        siteInput.value = domain;
      } else {
        currentSiteLabel.textContent = "Página interna do navegador";
        pickElementBtn.disabled = true;
      }

      renderSavedSitesDropdown();
      renderSiteDetails();
    });
  });
});
