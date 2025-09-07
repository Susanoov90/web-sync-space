// src/Popups/Welcome.tsx
import { useEffect, useState } from "react";
import WelcomeButton from "../Button/WelcomeButton";
import "./Welcome.css";

type SavedCtx =
  | { role: "host"; sessionId: string; sharedURL?: string }
  | { role: "client"; sessionId: string };

type StoredShape = { websync?: SavedCtx };

// Helpers promisifiés typés
function getLocal<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (res) => resolve((res as any)[key] as T | undefined));
  });
}
function setLocal<T extends object>(obj: T): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()));
}
function clearLocal(key: string): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove(key, () => resolve()));
}

export default function Welcome(): JSX.Element {
  const [saved, setSaved] = useState<SavedCtx | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      // Essaie lecture directe "websync" (SavedCtx) ou envelope { websync: SavedCtx }
      const raw = await getLocal<StoredShape | SavedCtx>("websync");
      const val =
        raw && typeof raw === "object" && "role" in (raw as any)
          ? (raw as SavedCtx)
          : (raw as StoredShape | undefined)?.websync;

      if (val && val.sessionId && (val.role === "host" || val.role === "client")) {
        setSaved(val);
      }
      setChecking(false);
    })();
  }, []);

  const onResume = async (): Promise<void> => {
    if (!saved) return;
    const code = saved.sessionId;
    const path = saved.role === "host" ? "host" : "viewer";
    const url = chrome.runtime.getURL(`index.html#/${path}?code=${encodeURIComponent(code)}`);
    chrome.tabs.create({ url });
    window.close();
  };

  const onForget = async (): Promise<void> => {
    await clearLocal("websync");
    setSaved(null);
  };

  // Option: bouton "Remember current choice" (non obligatoire)
  const rememberAs = async (role: "host" | "client"): Promise<void> => {
    // Utilitaire si tu veux tester rapidement la reprise
    const code = prompt("Enter session code to remember")?.trim();
    if (!code) return;
    await setLocal<SavedCtx>({ role, sessionId: code });
    setSaved({ role, sessionId: code });
  };

  return (
    <>
      {/* Bloc reprise si session sauvegardée */}
      {!checking && saved && (
        <div className="welcome-resume">
          <div className="welcome-resume__title">
            Resume {saved.role === "host" ? "Host" : "Viewer"} session
          </div>
          <div className="welcome-resume__subtitle">
            Code: <b>{saved.sessionId}</b>
          </div>
          <div className="welcome-resume__actions">
            <button onClick={onResume} className="welcome-resume__btn resume">Resume</button>
            <button onClick={onForget} className="welcome-resume__btn forget">Forget</button>
          </div>
        </div>
      )}

      <p>Co navigate, Sharing your screens to many person as easy !</p>
      <div className="welcome-buttons">
        <WelcomeButton content="Create a sharing session" linkTo="/create-session" />
        <WelcomeButton content="Join an existing sharing session" linkTo="/join-session" />
      </div>

      {/* (facultatif) Outils de test pour mémoriser rapidement */}
      {/* <div style={{ marginTop: 10, opacity: 0.6 }}>
        <button onClick={() => void rememberAs("host")}>Remember as Host…</button>
        <button onClick={() => void rememberAs("client")} style={{ marginLeft: 8 }}>
          Remember as Client…
        </button>
      </div> */}
    </>
  );
}
