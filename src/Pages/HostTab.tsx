// src/Pages/HostTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import ShareCodeButton from "../Button/ShareCodeButton";

/** ---- Types & helpers ---- */
type BgOk = { ok: true } & Record<string, unknown>;
type BgErr = { ok: false; error?: string };
type BgResp<T> = (BgOk & T) | BgErr;

type ViewerListResp = { ids: string[]; infos?: Record<string, { status?: string }> };
type AnswerResp = { exists: boolean; answer?: RTCSessionDescriptionInit };
type CandsResp = { candidates?: Array<{ key: string } & RTCIceCandidateInit> };

function bg<T extends object = object>(msg: unknown): Promise<BgResp<T>> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (resp) => resolve(resp as BgResp<T>)));
}

/** Read ?param inside the hash: index.html#/host?code=...&tabId=... */
function useHashQueryParam(name: string): string {
  return useMemo(() => {
    const hash = window.location.hash || "";
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const sp = new URLSearchParams(q);
    return sp.get(name) ?? "";
  }, [name]);
}

/**
 * Capture a specific tab using tabCapture.getMediaStreamId + getUserMedia
 * Note: 'chromeMediaSource' constraints are non-standard -> cast to any.
 */
async function captureTabById(tabId: number): Promise<MediaStream> {
  const streamId: string = await new Promise((resolve, reject) => {
    (chrome.tabCapture as unknown as {
      getMediaStreamId(
        opts: { targetTabId?: number; consumerTabId?: number },
        cb: (id?: string) => void
      ): void;
    }).getMediaStreamId({ targetTabId: tabId }, (id?: string) => {
      if (chrome.runtime.lastError || !id) {
        reject(new Error(chrome.runtime.lastError?.message || "getMediaStreamId failed"));
      } else {
        resolve(id);
      }
    });
  });

  // Build non-standard Chrome constraints
  const constraints: any = {
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

type PcBundle = {
  pc: RTCPeerConnection;
  seenAnsIce: Set<string>;
  ansIcePollId: number | null;
  answerPollId: number | null;
};

export default function HostTab(): JSX.Element {
  // 1) Try to read from hash
  const hashCode  = useHashQueryParam("code");
  const hashTabId = useHashQueryParam("tabId");

  // 2) Hold the effective values (fallback to storage if hash empty)
  const [sessionId, setSessionId] = useState<string>(hashCode);
  const [tabId, setTabId] = useState<number | null>(hashTabId ? parseInt(hashTabId, 10) : null);

  // Load fallback from storage if needed (when opened via Resume)
  useEffect(() => {
    if (sessionId && tabId !== null && Number.isFinite(tabId)) return;
    chrome.storage.local.get(["websync"], (res) => {
      const ws = res?.websync as { role?: string; sessionId?: string; tabId?: number } | undefined;
      if (ws?.sessionId && !sessionId) setSessionId(ws.sessionId);
      if (typeof ws?.tabId === "number" && (tabId === null || !Number.isFinite(tabId))) setTabId(ws.tabId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [status, setStatus] = useState<string>("Ready");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const [viewerIds, setViewerIds] = useState<string[]>([]);
  const [viewerInfos, setViewerInfos] = useState<Record<string, { status?: string }>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pcs = useRef<Map<string, PcBundle>>(new Map());
  const viewersPollId = useRef<number | null>(null);

  useEffect(() => {
    const onBeforeUnload = () => { void stopSharing(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSharing(): Promise<void> {
    if (!sessionId) { setErr("Missing session code."); return; }
    if (tabId === null || !Number.isFinite(tabId)) { setErr("Missing tabId."); return; }
    if (isSharing || busy) return;
    setBusy(true); setErr(null); setStatus("Capturing tab…");

    try {
      // ✅ Correct capture flow using getMediaStreamId
      const stream = await captureTabById(tabId);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      if (viewersPollId.current) window.clearInterval(viewersPollId.current);
      viewersPollId.current = window.setInterval(pollViewers, 800);

      setIsSharing(true);
      setStatus("Waiting for viewers…");
    } catch (e: any) {
      setErr(e?.message || "Failed to start");
      await stopSharing();
    } finally {
      setBusy(false);
    }
  }

  async function pollViewers(): Promise<void> {
    const r = await bg<ViewerListResp>({ type: "wrtc-list-viewers", sessionId });
    if (!r.ok || !r.ids) return;
    setViewerIds(r.ids);
    if (r.infos) setViewerInfos(r.infos);

    for (const vid of r.ids) {
      if (!pcs.current.has(vid)) {
        await setupPcForViewer(vid);
      }
    }
  }

  async function setupPcForViewer(viewerId: string): Promise<void> {
    const stream = streamRef.current;
    if (!stream) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    const control = pc.createDataChannel("control");
    control.onopen = () => console.log("[host] control channel open for", viewerId);

    pc.onicecandidate = async (ev: RTCPeerConnectionIceEvent) => {
      const cand: RTCIceCandidate | null = ev.candidate;
      if (!cand) return;
      const init: RTCIceCandidateInit = cand.toJSON ? cand.toJSON() : {
        candidate: cand.candidate,
        sdpMid: cand.sdpMid ?? undefined,
        sdpMLineIndex: cand.sdpMLineIndex ?? undefined,
        usernameFragment: (cand as any).usernameFragment,
      };
      const rr = await bg<{}>({ type: "wrtc-add-offer-cand-v", sessionId, viewerId, candidate: init });
      if (!rr.ok) console.warn("add-offer-cand-v failed:", rr.error);
    };

    stream.getTracks().forEach((t: MediaStreamTrack) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    {
      const r = await bg<{}>({ type: "wrtc-set-offer-v", sessionId, viewerId, offer });
      if (!r.ok) console.warn("wrtc-set-offer-v failed for", viewerId, r.error);
    }

    pcs.current.set(viewerId, { pc, seenAnsIce: new Set(), ansIcePollId: null, answerPollId: null });

    const bundle = pcs.current.get(viewerId)!;
    bundle.answerPollId && window.clearInterval(bundle.answerPollId);
    bundle.answerPollId = window.setInterval(async () => {
      const res = await bg<AnswerResp>({ type: "wrtc-get-viewer-answer", sessionId, viewerId });
      if (!res.ok) return;
      if (res.exists && res.answer && pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(res.answer));
        bundle.ansIcePollId && window.clearInterval(bundle.ansIcePollId);
        bundle.ansIcePollId = window.setInterval(() => pollViewerAnswerCands(viewerId), 800);
      }
    }, 800);
  }

  async function pollViewerAnswerCands(viewerId: string): Promise<void> {
    const bundle = pcs.current.get(viewerId);
    if (!bundle) return;
    const { pc, seenAnsIce } = bundle;

    const r = await bg<CandsResp>({ type: "wrtc-list-viewer-answer-cands", sessionId, viewerId });
    if (!r.ok || !r.candidates) return;

    for (const c of r.candidates) {
      if (!c?.key || seenAnsIce.has(c.key)) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        seenAnsIce.add(c.key);
      } catch (e) {
        console.warn("addIceCandidate(answer,v) error:", e);
      }
    }
  }

  async function stopSharing(): Promise<void> {
    if (viewersPollId.current) { window.clearInterval(viewersPollId.current); viewersPollId.current = null; }
    pcs.current.forEach((b) => {
      b.answerPollId && window.clearInterval(b.answerPollId);
      b.ansIcePollId && window.clearInterval(b.ansIcePollId);
      try { b.pc.close(); } catch {}
    });
    pcs.current.clear();
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;

    setIsSharing(false);
    setStatus("Stopped");
  }

  const connectedCount = viewerIds.filter((id) => viewerInfos[id]?.status === "connected").length;

  return (
    <div style={{ padding: 16, color: "#eee", background: "#121212", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 8px" }}>Host — WebSyncSpace</h2>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Session: <b>{sessionId || "—"} <ShareCodeButton sessionCode={sessionId} /></b> &nbsp;|&nbsp; TabId: <b>{Number.isFinite(tabId ?? NaN) ? tabId : "—"}</b>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => void startSharing()} disabled={busy || isSharing}>
          {busy ? "..." : "Start sharing"}
        </button>
        <button onClick={() => void stopSharing()} disabled={!isSharing}>Stop</button>
      </div>

      <div style={{ marginBottom: 8 }}>Status: {status}</div>
      {err && <div style={{ color: "tomato", marginBottom: 8 }}>{err}</div>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "min(90vw, 1200px)", maxHeight: "70vh", background: "#000", borderRadius: 8, display: "block", marginBottom: 12 }}
      />

      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Viewers: {connectedCount} / {viewerIds.length}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {viewerIds.map((id) => (
          <li key={id} style={{ border: "1px solid #333", borderRadius: 6, padding: "6px 8px" }}>
            <span style={{ fontFamily: "monospace" }}>{id}</span>
            <span style={{ marginLeft: 8, opacity: 0.8 }}>status:</span>{" "}
            <b>{viewerInfos[id]?.status ?? "joining"}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
