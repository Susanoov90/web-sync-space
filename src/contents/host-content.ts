import { db } from "../firebase";
import { ref, push } from "firebase/database";

const sessionId = sessionStorage.getItem("websync-session");
if (sessionStorage.getItem("websync-role") === "host" && sessionId) {
  console.log("[WebSyncSpace] host-content.ts injecté ✅");

  const sendEvent = (type: string, data: any) => {
    push(ref(db, `sessions/${sessionId}/events`), {
      type,
      data,
      timestamp: Date.now()
    });
  };

  window.addEventListener("scroll", () => {
    sendEvent("scroll", { scrollY: window.scrollY });
  });

  document.addEventListener("click", (e) => {
    const xpath = getXPath(e.target as HTMLElement);
    sendEvent("click", { xpath });
  });

  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const text = selection?.toString();
    if (text?.length) {
      sendEvent("highlight", { text });
    }
  });
}

// ✅ En dehors du bloc `if`
function getXPath(el: HTMLElement): string {
  if (el.id) return `//*[@id="${el.id}"]`;
  if (el === document.body) return "/html/body";
  const ix = Array.from(el.parentNode!.childNodes)
    .filter((node) => node.nodeName === el.nodeName)
    .indexOf(el);
  return `${getXPath(el.parentNode as HTMLElement)}/${el.nodeName}[${ix + 1}]`;
}
