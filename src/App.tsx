import "./App.css";
import { Routes, Route } from "react-router-dom";

// Popups existants
import Welcome from "./Popups/Welcome";
import JoinSession from "./Popups/JoinSession";
import CreateSession from "./Popups/SessionCreated";
import BridgeToCreateSession from "./Popups/BridgeToCreateSession";

// ✅ Nouveaux écrans plein écran
import HostTab from "./Pages/HostTab";
import ViewerTab from "./Pages/ViewerTab";

function App() {
  return (
    <Routes>
      {/* Flux popup (inchangé) */}
      <Route index element={<Welcome />} />
      <Route path="/join-session" element={<JoinSession />} />
      <Route path="/create-session" element={<BridgeToCreateSession />} />
      <Route path="/created" element={<CreateSession />} />

      {/* ✅ Pages plein écran (nouveau) */}
      <Route path="/host" element={<HostTab />} />
      <Route path="/viewer" element={<ViewerTab />} />
    </Routes>
  );
}

export default App;
