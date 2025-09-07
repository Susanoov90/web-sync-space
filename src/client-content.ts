// // src/client-content.ts
// (function () {
//   const role = sessionStorage.getItem("websync-role");
//   const sessionId = sessionStorage.getItem("websync-session");
//   if (role !== "client" || !sessionId) {
//     console.warn("[client-content] rôle/session manquant");
//     return;
//   }

//   // Reçoit les events relayés par le background (depuis RTDB)
//   chrome.runtime.onMessage.addListener((msg) => {
//     if (msg?.source !== "wss" || !msg.event) return;
//     const evt = msg.event;

//     switch (evt.type) {
//       case "scroll":
//         window.scrollTo({
//           left: evt.data?.x || 0,
//           top: evt.data?.y || 0,
//           behavior: "instant",
//         });
//         break;

//       case "click": {
//         // Rejoue un clic “naïf” à la position (limité mais OK pour POC)
//         const el = document.elementFromPoint(evt.data?.x, evt.data?.y);
//         if (el) {
//           el.dispatchEvent(
//             new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
//           );
//         }
//         break;
//       }

//       case "highlight":
//         console.log("🟨 Host highlight:", evt.data?.text);
//         break;

//       default:
//         console.warn("[client-content] event inconnu:", evt.type, evt);
//     }
//   });

//   console.debug("[client-content] prêt, session:", sessionId);
// })();
