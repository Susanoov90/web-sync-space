chrome.runtime.onInstalled.addListener(() => {
  console.log("[WebSyncSpace] Extension installée");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  console.log("[Background] Message reçu :", message);

  // 🔁 1. Relais des messages (scroll / url) vers les autres onglets
  if (message.type === "scroll" || message.type === "url") {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id && tab.id !== tabId) {
          chrome.tabs.sendMessage(tab.id, message);
        }
      }
    });
    sendResponse({ status: "relayed" });
    return true;
  }

  // 💉 2. Injection dynamique du host
  if (message.type === "inject-host" && tabId) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["host-content.js"]
    }, () => {
      console.log("[Background] host-content.js injecté !");
      sendResponse({ status: "host injected" });
    });
    return true;
  }

  // 💉 3. Injection dynamique du client
  if (message.type === "inject-client" && tabId) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["client-content.js"]
    }, () => {
      console.log("[Background] client-content.js injecté !");
      sendResponse({ status: "client injected" });
    });
    return true;
  }

  // ❌ 4. Si message inconnu
  sendResponse({ status: "nothing done" });
  return true;
});
