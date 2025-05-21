if (sessionStorage.getItem("websync-role") === "host") {
    console.log("[WebSyncSpace] host-content.ts injecté ✅");
    window.addEventListener("scroll", function () {
        chrome.runtime.sendMessage({
            type: "scroll",
            value: window.scrollY,
            data: {
                scrollY: window.scrollY
            }
        });
    });
    var lastURL_1 = location.href;
    setInterval(function () {
        if (location.href !== lastURL_1) {
            lastURL_1 = location.href;
            chrome.runtime.sendMessage({
                type: "url",
                data: {
                    href: lastURL_1
                }
            });
        }
    }, 500);
}
