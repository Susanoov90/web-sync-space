chrome.runtime.onInstalled.addListener(() => {
  console.log("[WebSyncSpace] Extension installée");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  console.log("[Background] Message reçu :", message);

  if (message.type === "inject-host" && tabId) {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["host-content.js"] // Ce fichier « final » (ES5, sans import) doit exister dans public/
      },
      () => {
        console.log("[Background] host-content.js injecté !");
        sendResponse({ status: "host injected" });
      }
    );
    return true; 
  }

  if (message.type === "inject-client" && tabId) {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["client-content.js"]
      },
      () => {
        console.log("[Background] client-content.js injecté !");
        sendResponse({ status: "client injected" });
      }
    );
    return true;
  }

  sendResponse({ status: "nothing done" });
  return true;
});
