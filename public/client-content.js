if (sessionStorage.getItem("websync-role") === "client") {
    console.log("[WebSyncSpace] client-content.ts injecté ✅");
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.type === "scroll") {
            window.scrollTo({
                top: message.data.scrollY,
                behavior: "smooth"
            });
        }
        if (message.type === "url") {
            if (location.href !== message.data.href) {
                location.href = message.data.href;
            }
        }
        sendResponse({ received: true });
        return true;
    });
}
