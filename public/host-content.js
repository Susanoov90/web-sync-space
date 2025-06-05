"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// --- host-content.ts ---
/* Ce fichier sera injecté DANS la page web (ex. commons.wikimedia.org),
   après avoir fixé sessionStorage.role="host" et sessionStorage.session="ABCD12" */
var firebase_1 = require("./firebase"); // (Attention : à bundler / compiler en plain JS)
var database_1 = require("firebase/database");
var sessionId = sessionStorage.getItem("websync-session");
var role = sessionStorage.getItem("websync-role");
console.log("[host-content] démarrage – role=", role, "sessionId=", sessionId);
if (role === "host" && sessionId) {
    console.log("[WebSyncSpace] host-content.ts injecté ✅");
    console.log("📌 Session ID :", sessionId);
    window.addEventListener("scroll", function () {
        sendEvent("scroll", { scrollY: window.scrollY });
    });
    document.addEventListener("click", function (e) {
        var target = e.target;
        var xpath = getXPath(target);
        sendEvent("click", { xpath: xpath });
    });
    document.addEventListener("mouseup", function () {
        var selection = window.getSelection();
        var text = selection === null || selection === void 0 ? void 0 : selection.toString();
        if (text) {
            sendEvent("highlight", { text: text });
        }
    });
}
else {
    console.warn("⛔ Rôle 'host' ou sessionId non défini dans sessionStorage.");
}
function sendEvent(type, data) {
    (0, database_1.push)((0, database_1.ref)(firebase_1.db, "sessions/".concat(sessionId, "/events")), {
        type: type,
        data: data,
        timestamp: Date.now()
    });
    console.log("\uD83D\uDCE4 ".concat(type, " envoy\u00E9 :"), data);
}
function getXPath(el) {
    if (el.id)
        return "//*[@id=\"".concat(el.id, "\"]");
    if (el === document.body)
        return "/html/body";
    var ix = Array.from(el.parentNode.childNodes)
        .filter(function (node) { return node.nodeName === el.nodeName; })
        .indexOf(el);
    return "".concat(getXPath(el.parentNode), "/").concat(el.nodeName, "[").concat(ix + 1, "]");
}
