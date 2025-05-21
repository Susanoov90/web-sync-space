chrome.runtime.onInstalled.addListener(function () {
    console.log("[WebSyncSpace] Extension installée");
});
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var _a;
    var tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
    console.log("[Background] Message reçu :", message);
    // 🔁 1. Relais des messages (scroll / url) vers les autres onglets
    if (message.type === "scroll" || message.type === "url") {
        chrome.tabs.query({}, function (tabs) {
            for (var _i = 0, tabs_1 = tabs; _i < tabs_1.length; _i++) {
                var tab = tabs_1[_i];
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
            target: { tabId: tabId },
            files: ["host-content.js"]
        }, function () {
            console.log("[Background] host-content.js injecté !");
            sendResponse({ status: "host injected" });
        });
        return true;
    }
    // 💉 3. Injection dynamique du client
    if (message.type === "inject-client" && tabId) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["client-content.js"]
        }, function () {
            console.log("[Background] client-content.js injecté !");
            sendResponse({ status: "client injected" });
        });
        return true;
    }
    // ❌ 4. Si message inconnu
    sendResponse({ status: "nothing done" });
    return true;
});
