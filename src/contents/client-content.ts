import { db } from "../firebase";
import { ref, onChildAdded } from "firebase/database";

if (sessionStorage.getItem("websync-role") === "client") {
  console.log("[WebSyncSpace] client-content.ts injecté ✅");

  const sessionId = sessionStorage.getItem("websync-session");
  if (!sessionId) {
    console.warn("❌ Aucun sessionId trouvé");
  }

  const eventRef = ref(db, `sessions/${sessionId}/events`);

  onChildAdded(eventRef, (snapshot) => {
    const event = snapshot.val();
    if (!event) return;

    switch (event.type) {
      case "scroll":
        window.scrollTo({ top: event.data.scrollY, behavior: "smooth" });
        break;

      case "click":
        const el = getElementByXPath(event.data.xpath);
        if (el) flashElement(el);
        break;

      case "highlight":
        alert(`🟨 L’hôte a surligné : "${event.data.text}"`);
        break;
    }
  });

  function getElementByXPath(xpath: string): HTMLElement | null {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue as HTMLElement | null;
  }

  function flashElement(el: HTMLElement) {
    el.style.outline = "2px solid red";
    setTimeout(() => el.style.outline = "", 1000);
  }
}
