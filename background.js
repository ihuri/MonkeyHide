const ICON_HIDDEN = {
  16: "icons/icon16.png",
  32: "icons/icon32.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png"
};

const ICON_SMILE = {
  16: "icons/icon_smile_16.png",
  32: "icons/icon_smile_32.png",
  48: "icons/icon_smile_48.png",
  128: "icons/icon_smile_128.png"
};

function normalizeDomain(urlOrHostname) {
  if (!urlOrHostname) return "";
  try {
    if (urlOrHostname.includes("://")) {
      const parsed = new URL(urlOrHostname);
      if (!/^https?:$/i.test(parsed.protocol)) return "";
      return parsed.hostname.toLowerCase().replace(/^www\./, "");
    }
  } catch (e) {
    return "";
  }
  return urlOrHostname.trim().toLowerCase().replace(/^www\./, "");
}

function hasActiveHiddenElements(sites, domain) {
  if (!domain || !sites || !sites[domain]) return false;
  const siteConfig = sites[domain];
  if (siteConfig.enabled === false) return false;
  if (!Array.isArray(siteConfig.selectors) || siteConfig.selectors.length === 0) return false;
  return siteConfig.selectors.some((item) => {
    if (typeof item === "string") return item.trim() !== "";
    if (item && typeof item === "object" && typeof item.selector === "string") {
      return item.selector.trim() !== "";
    }
    return false;
  });
}

function updateIconForTab(tabId, url) {
  if (!tabId) return;
  const domain = normalizeDomain(url);

  chrome.storage.local.get(["sites"], (result) => {
    const sites = result.sites || {};
    const isHiding = hasActiveHiddenElements(sites, domain);

    chrome.action.setIcon({
      tabId,
      path: isHiding ? ICON_HIDDEN : ICON_SMILE
    }).catch(() => {
      // Ignora erro caso a aba tenha sido fechada
    });
  });
}

function updateAllActiveTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        updateIconForTab(tab.id, tab.url);
      }
    });
  });
}

// Quando o usuário troca de aba
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    updateIconForTab(tab.id, tab.url);
  });
});

// Quando uma aba muda de URL ou termina de carregar
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" || changeInfo.status === "complete" || changeInfo.url) {
    updateIconForTab(tabId, tab.url);
  }
});

// Quando as regras mudam no storage (ex: adicionou ou removeu elemento)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.sites) {
    updateAllActiveTabs();
  }
});

// Mensagem direta do content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "SYNC_ICON" && sender.tab && sender.tab.id) {
    updateIconForTab(sender.tab.id, sender.tab.url);
  }
});

// Ao instalar ou iniciar a extensão
chrome.runtime.onInstalled.addListener(() => {
  updateAllActiveTabs();
});

chrome.runtime.onStartup.addListener(() => {
  updateAllActiveTabs();
});
