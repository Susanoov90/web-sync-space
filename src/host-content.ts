// --- host-content.ts ---
/* Ce fichier sera injecté DANS la page web (ex. commons.wikimedia.org),
   après avoir fixé sessionStorage.role="host" et sessionStorage.session="ABCD12" */
import { db } from "./firebase";       // (Attention : à bundler / compiler en plain JS)
import { ref, push } from "firebase/database";

const sessionId = sessionStorage.getItem("websync-session")!;
const role = sessionStorage.getItem("websync-role");

console.log(
  "[host-content] démarrage – role=", role,
  "sessionId=", sessionId
);

if (role === "host" && sessionId) {
  console.log("[WebSyncSpace] host-content.ts injecté ✅");
  console.log("📌 Session ID :", sessionId);

  window.addEventListener("scroll", () => {
    sendEvent("scroll", { scrollY: window.scrollY });
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const xpath = getXPath(target);
    sendEvent("click", { xpath });
  });

  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const text = selection?.toString();
    if (text) {
      sendEvent("highlight", { text });
    }
  });
} else {
  console.warn("⛔ Rôle 'host' ou sessionId non défini dans sessionStorage.");
}

  function sendEvent(type: string, data: any) {
    push(ref(db, `sessions/${sessionId}/events`), {
      type,
      data,
      timestamp: Date.now()
    });
    console.log(`📤 ${type} envoyé :`, data);
  }

function getXPath(el: HTMLElement): string {
  if (el.id) return `//*[@id="${el.id}"]`;
  if (el === document.body) return "/html/body";
  const ix = Array.from(el.parentNode!.childNodes)
    .filter((node) => node.nodeName === el.nodeName)
    .indexOf(el);
  return `${getXPath(el.parentNode as HTMLElement)}/${el.nodeName}[${ix + 1}]`;
}
