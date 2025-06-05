// src/contents/client-content.ts

import { db } from "./firebase";
import { ref, onChildAdded } from "firebase/database";

/**
 * Récupérer le sessionId et le rôle depuis sessionStorage
 */
const sessionId = sessionStorage.getItem("websync-session");
const role = sessionStorage.getItem("websync-role");

/**
 * Fonctions utilitaires pour trouver un élément par XPath
 * et pour faire un flash visuel sur l’élément
 */
function getElementByXPath(xpath: string): HTMLElement | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue as HTMLElement | null;
}

function flashElement(el: HTMLElement) {
  el.style.outline = "2px solid red";
  setTimeout(() => {
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

  const eventsRef = ref(db, `sessions/${sessionId}/events`);

  onChildAdded(eventsRef, (snapshot) => {
    const event = snapshot.val();
    if (!event) return;

    console.log("🎯 [client] Événement reçu :", event);

    switch (event.type) {
      case "scroll":
        console.log("📥 [client] Scroll appliqué :", event.data.scrollY);
        window.scrollTo({ top: event.data.scrollY, behavior: "smooth" });
        break;

      case "click":
        console.log("📥 [client] Click reçu, xpath =", event.data.xpath);
        const el = getElementByXPath(event.data.xpath);
        if (el) {
          console.log("✅ Élément trouvé pour le click :", el);
          flashElement(el);
        } else {
          console.warn(
            "❌ [client] Élément introuvable pour le click (xpath) :",
            event.data.xpath
          );
        }
        break;

      case "highlight":
        console.log("📥 [client] Texte surligné reçu :", event.data.text);
        alert(`🟨 L’hôte a surligné : "${event.data.text}"`);
        break;

      default:
        console.warn("❓ [client] Type d’événement inconnu :", event.type);
    }
  });
} else {
  console.warn("⛔ [client-content] Rôle ou sessionId non défini.");
}
