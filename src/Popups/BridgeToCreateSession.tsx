import { useState } from "react";
import { Button } from "@mui/material";
import SelectTab from "../TabLogic/SelectTab";
import type { Tab } from "../types/Tab";

type BgOk = { ok: true } & Record<string, unknown>;
type BgErr = { ok: false; error?: string };
type BgResp<T> = (BgOk & T) | BgErr;

function bg<T extends object = object>(msg: unknown): Promise<BgResp<T>> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (resp) => resolve(resp as BgResp<T>)));
}

export default function BridgeToCreateSession() {
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedTab?.id || !selectedTab?.url) return;
    setBusy(true); setErr(null);

    try {
      // 1) Génère le code
      const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 2) Crée la session côté Firebase (meta)
      const r = await bg<{}>({ type: "wrtc-init-session", sessionId: newSessionId, sharedURL: selectedTab.url });
      if (!r.ok) throw new Error(r.error || "wrtc-init-session failed");

      // 3) Mémorise pour Resume
      await chrome.storage.local.set({ websync: { role: "host", sessionId: newSessionId, tabId: selectedTab.id } });

      // 4) Ouvre la page plein écran Host
      const url = chrome.runtime.getURL(`index.html#/host?code=${newSessionId}&tabId=${selectedTab.id}`);
      chrome.tabs.create({ url });
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la création de la session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p>Hold on... You're almost ready!</p>
      <SelectTab onSelectTab={(tab) => setSelectedTab(tab)} />
      <br />
      {err && <p style={{ color: "tomato" }}>{err}</p>}
      <Button
        disabled={!selectedTab || busy}
        onClick={handleContinue}
        variant="contained"
      >
        {busy ? "..." : "CREATE SESSION"}
      </Button>
    </>
  );
}
