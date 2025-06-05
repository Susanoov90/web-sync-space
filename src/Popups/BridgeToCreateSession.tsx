// src/Popups/BridgeToCreateSession.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SelectTab from "../TabLogic/SelectTab";
import type { Tab } from "../types/Tab";
import { Button } from "@mui/material";

export default function BridgeToCreateSession() {
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedTab?.url) return;

    // 1) On prépare un ID de session (ici on le génère côté React, 
    //    mais vous pouvez aussi attendre que SessionCreated l'écrive dans Firebase)
    const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 2) On envoie le rôle + sessionId DANS la page hôte :
    chrome.scripting.executeScript(
      {
        target: { tabId: selectedTab.id! }, // ID de l’onglet hôte choisi par l’utilisateur
        func: (sessionId: string) => {
          // Ce code s’exécutera **dans le contexte de la page** (ex. commons.wikimedia.org)
          sessionStorage.setItem("websync-role", "host");
          sessionStorage.setItem("websync-session", sessionId);
        },
        args: [newSessionId],
      },
      () => {
        console.log("✅ Rôle + sessionId injectés dans l’onglet hôte :", newSessionId);

        // 3) Ensuite, on injecte host-content.js (le vrai content script qui enverra scroll / clic / highlight)
        chrome.runtime.sendMessage(
          { type: "inject-host" },
          (res) => {
            console.log("✅ host-content.js injecté :", res);
          }
        );
      }
    );

    // 4) On redirige le user vers la page SessionCreated pour stocker l’ID dans Firebase
    navigate("/created", { state: { selectedTab, newSessionId } });
  };

  return (
    <>
      <p>Hold on... You're almost ready!</p>
      <SelectTab onSelectTab={(tab) => setSelectedTab(tab)} />
      <br />
      <Button
        disabled={!selectedTab}
        onClick={handleContinue}
        variant="contained"
      >
        CREATE SESSION
      </Button>
    </>
  );
}
