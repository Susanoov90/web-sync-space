// sessionStorage.removeItem("websync-role");
// if (!sessionStorage.getItem("websync-role")) {
//   const isHost = confirm("Est-ce que cet onglet est l’hôte (host) ?");
//   sessionStorage.setItem("websync-role", isHost ? "host" : "client");
//   chrome.runtime.sendMessage({
//     type: isHost ? "inject-host" : "inject-client"
//   }, (response) => {
//     console.log("[RoleSelector] Injection déclenchée :", response);
//   });
// }
