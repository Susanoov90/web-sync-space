chrome.runtime.onInstalled.addListener(function () {
    console.log("[WebSyncSpace] Extension installée");
});
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var _a;
    var tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
    console.log("[Background] Message reçu :", message);
    if (message.type === "inject-host" && tabId) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["host-content.js"] // Ce fichier « final » (ES5, sans import) doit exister dans public/
        }, function () {
            console.log("[Background] host-content.js injecté !");
            sendResponse({ status: "host injected" });
        });
        return true;
    }
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
    sendResponse({ status: "nothing done" });
    return true;
});
