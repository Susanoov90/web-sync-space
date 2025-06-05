"use strict";
// src/contents/client-content.ts
Object.defineProperty(exports, "__esModule", { value: true });
var firebase_1 = require("./firebase");
var database_1 = require("firebase/database");
/**
 * Récupérer le sessionId et le rôle depuis sessionStorage
 */
var sessionId = sessionStorage.getItem("websync-session");
var role = sessionStorage.getItem("websync-role");
/**
 * Fonctions utilitaires pour trouver un élément par XPath
 * et pour faire un flash visuel sur l’élément
 */
function getElementByXPath(xpath) {
    var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
}
function flashElement(el) {
    el.style.outline = "2px solid red";
    setTimeout(function () {
        el.style.outline = "";
    }, 1000);
}
/**
 * Si on est dans le rôle client ET qu’on a un sessionId valide,
 * on branche le listener Firebase onChildAdded.
 */
if (role === "client" && sessionId) {
    console.log("[WebSyncSpace] client-content.ts injecté ✅");
    console.log("📌 Client Mode, sessionId =", sessionId);
    var eventsRef = (0, database_1.ref)(firebase_1.db, "sessions/".concat(sessionId, "/events"));
    (0, database_1.onChildAdded)(eventsRef, function (snapshot) {
        var event = snapshot.val();
        if (!event)
            return;
        console.log("🎯 [client] Événement reçu :", event);
        switch (event.type) {
            case "scroll":
                console.log("📥 [client] Scroll appliqué :", event.data.scrollY);
                window.scrollTo({ top: event.data.scrollY, behavior: "smooth" });
                break;
            case "click":
                console.log("📥 [client] Click reçu, xpath =", event.data.xpath);
                var el = getElementByXPath(event.data.xpath);
                if (el) {
                    console.log("✅ Élément trouvé pour le click :", el);
                    flashElement(el);
                }
                else {
                    console.warn("❌ [client] Élément introuvable pour le click (xpath) :", event.data.xpath);
                }
                break;
            case "highlight":
                console.log("📥 [client] Texte surligné reçu :", event.data.text);
                alert("\uD83D\uDFE8 L\u2019h\u00F4te a surlign\u00E9 : \"".concat(event.data.text, "\""));
                break;
            default:
                console.warn("❓ [client] Type d’événement inconnu :", event.type);
        }
    });
}
else {
    console.warn("⛔ [client-content] Rôle ou sessionId non défini.");
}
