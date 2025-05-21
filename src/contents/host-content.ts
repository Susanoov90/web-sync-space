if (sessionStorage.getItem("websync-role") === "host") {
console.log("[WebSyncSpace] host-content.ts injecté ✅");

window.addEventListener("scroll", () => {
  chrome.runtime.sendMessage({
    type: "scroll",
    value: window.scrollY,
    data: {
      scrollY: window.scrollY
    }
  });
});


let lastURL = location.href;
setInterval(() => {
  if (location.href !== lastURL) {
    lastURL = location.href;
    chrome.runtime.sendMessage({
      type: "url",
      data: {
        href: lastURL
      }
    });
  }
}, 500);
}
