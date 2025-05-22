"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var firebase_1 = require("../firebase");
var database_1 = require("firebase/database");
if (sessionStorage.getItem("websync-role") === "host") {
    console.log("[WebSyncSpace] host-content.ts injecté ✅");
    var sessionId_1 = sessionStorage.getItem("websync-session");
    if (!sessionId_1) {
        console.warn("❌ Aucun sessionId trouvé");
    }
    var sendEvent_1 = function (type, data) {
        (0, database_1.push)((0, database_1.ref)(firebase_1.db, "sessions/".concat(sessionId_1, "/events")), {
            type: type,
            data: data,
            timestamp: Date.now()
        });
    };
    // 🔄 Scroll
    window.addEventListener("scroll", function () {
        sendEvent_1("scroll", { scrollY: window.scrollY });
    });
    // 🖱️ Clic
    document.addEventListener("click", function (e) {
        var target = e.target;
        var xpath = getXPath(target);
        sendEvent_1("click", { xpath: xpath });
    });
    // 🟨 Surlignage
    document.addEventListener("mouseup", function () {
        var selection = window.getSelection();
        var text = selection === null || selection === void 0 ? void 0 : selection.toString();
        if (text === null || text === void 0 ? void 0 : text.length) {
            sendEvent_1("highlight", { text: text });
        }
    });
    // Utilitaire : générer un XPath unique pour un élément
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
}
