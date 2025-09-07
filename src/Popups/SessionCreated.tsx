// src/Popups/SessionCreated.tsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./SessionCreated.css";
import { Button, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { Tab } from "../types/Tab";

type LocationState = { selectedTab: Tab; newSessionId: string }; 

// Helper promisifié typé pour chrome.storage
function setLocalStorage<T extends object>(obj: T): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()));
}

export default function SessionCreated(): JSX.Element {
  const { state } = useLocation();
  const { selectedTab, newSessionId } = state as LocationState;

  const [opening, setOpening] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // Note: on n’importe plus Firebase ici, la signalisation se fera côté HostTab via background.
  // Ici on se contente d’ouvrir l’onglet dédié et de mémoriser la session.

  async function openHostTab(): Promise<void> {
    try {
      setErr(null);
      setOpening(true);

      // 1) Persister le contexte de session pour reprise (point #1)
      await setLocalStorage({
        websync: {
          role: "host" as const,
          sessionId: newSessionId,
          sharedURL: selectedTab?.url ?? "",
        },
      });

      // 2) Ouvrir l’onglet extension pleine page (route /host) — (point #3 et #4)
      const url = chrome.runtime.getURL(
        `index.html#/host?code=${encodeURIComponent(newSessionId)}`
      );
      chrome.tabs.create({ url });

      // 3) Optionnel: fermer la popup (UX)
      window.close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="contentSuccessCreateSession">
      <p>Votre session est active sous le code :</p>
      <div className="contentSuccessCreateSession--copyAndPasteZone">
        <code>{newSessionId}</code>
        <Tooltip title="Click to copy">
          <button
            className="contentSuccessCreateSession--copyAndPasteZone__buttonCopy"
            onClick={() => navigator.clipboard.writeText(newSessionId)}
            aria-label="Copy session code"
          >
            <ContentCopyIcon />
          </button>
        </Tooltip>
      </div>

      <div style={{ marginTop: 12 }}>
        <Button variant="contained" onClick={openHostTab} disabled={opening}>
          {opening ? "..." : "OPEN HOST TAB"}
        </Button>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Un nouvel onglet va s’ouvrir pour démarrer le partage en plein écran. Vous
        pourrez fermer cette fenêtre sans interrompre la session.
      </p>

      {err && <p style={{ color: "tomato" }}>{err}</p>}
    </div>
  );
}
