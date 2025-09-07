import { useState } from 'react';
import TextField from '@mui/material/TextField';

type BgOk = { ok: true } & Record<string, unknown>;
type BgErr = { ok: false; error?: string };
type BgResp<T> = (BgOk & T) | BgErr;

function bg<T extends object = object>(msg: unknown): Promise<BgResp<T>> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (resp) => resolve(resp as BgResp<T>)));
}

export default function JoinSession() {
  const [code, setCode]   = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const sessionId = code.trim().toUpperCase();
    if (!sessionId) { setError("Saisis un code."); return; }
    setBusy(true);
    try {
      // 1) Vérifier l’existence via background
      const r = await bg<{ exists: boolean; sharedURL?: string }>({
        type: "wrtc-check-session",
        sessionId
      });
      if (!r.ok) throw new Error(r.error || "check failed");
      if (!r.exists) { setError("Aucune session active pour ce code."); return; }

      // 2) Ouvrir la page Viewer plein écran
      const viewerUrl = chrome.runtime.getURL(`index.html#/viewer?code=${encodeURIComponent(sessionId)}`);
      chrome.tabs.create({ url: viewerUrl });

      // 3) Mémoriser pour Resume
      chrome.storage.local.set({ websync: { role: "viewer", sessionId } });
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p>Enter the join code of the session</p>
      <TextField
        hiddenLabel
        id="textfieldCustom"
        variant="filled"
        size="small"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        slotProps={{
          input: {
            style: { color: 'white', backgroundColor: '#333' },
          },
        }}
      />
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
      <div>
        <button onClick={handleSubmit} disabled={busy}>
          {busy ? "..." : "SUBMIT"}
        </button>
      </div>
    </>
  );
}
