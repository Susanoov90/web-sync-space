// // src/host-content.ts
// (function () {
//   const role = sessionStorage.getItem("websync-role");
//   const sessionId = sessionStorage.getItem("websync-session");
//   if (role !== "host" || !sessionId) {
//     console.warn("[host-content] rôle/session manquant"); 
//     return;
//   }

//   // Throttle simple (~33 fps)
//   const throttle = (fn: (...a: any[]) => void, ms: number) => {
//     let last = 0;
//     return (...args: any[]) => {
//       const now = performance.now();
//       if (now - last >= ms) { last = now; fn(...args); }
//     };
//   };

//   // Envoi d'un event vers le background → RTDB
//   const send = (evType: string, data: any) =>
//     chrome.runtime.sendMessage({ type: "wss-event", sessionId, evType, data });

//   // Preuve de vie fiable : mirroring du scroll
//   window.addEventListener(
//     "scroll",
//     throttle(() => {
//       send("scroll", { x: window.scrollX, y: window.scrollY });
//     }, 30),
//     { passive: true }
//   );

//   // Clic “naïf” (coordonnées)
//   document.addEventListener(
//     "click",
//     (e) => {
//       const ce = e as MouseEvent;
//       send("click", { x: ce.clientX, y: ce.clientY });
//     },
//     true
//   );

//   // (optionnel) surlignage texte → debug
//   document.addEventListener("mouseup", () => {
//     const text = String(window.getSelection()?.toString() || "").trim();
//     if (text) send("highlight", { text });
//   });

//   console.debug("[host-content] prêt, session:", sessionId);
// })();
