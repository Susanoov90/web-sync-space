import { useEffect, useMemo, useRef, useState } from "react";

/** ---- Types ---- */
type BgOk = { ok: true } & Record<string, unknown>;
type BgErr = { ok: false; error?: string };
type BgResp<T> = (BgOk & T) | BgErr;

type OfferResp = { exists: boolean; offer?: RTCSessionDescriptionInit };
type CandsResp = { candidates?: Array<{ key: string } & RTCIceCandidateInit> };

function bg<T extends object = object>(msg: unknown): Promise<BgResp<T>> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (resp) => resolve(resp as BgResp<T>)));
}

/** Hash param helper for index.html#/viewer?code=... */
function useHashQueryParam(name: string): string {
  return useMemo(() => {
    const hash = window.location.hash || "";
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const sp = new URLSearchParams(q);
    return sp.get(name) ?? "";
  }, [name]);
}

function genViewerId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function ViewerTab(): JSX.Element {
  const hashCode = useHashQueryParam("code");
  const [sessionId, setSessionId] = useState<string>(hashCode);
  const [viewerId] = useState<string>(genViewerId());

  // fallback Resume (if needed)
  useEffect(() => {
    if (sessionId) return;
    chrome.storage.local.get(["websync"], (res) => {
      const ws = res?.websync as { role?: string; sessionId?: string } | undefined;
      if (ws?.sessionId) setSessionId(ws.sessionId);
    });
  }, [sessionId]);

  const [status, setStatus] = useState<string>("Ready");
  const [err, setErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const offerIcePollId = useRef<number | null>(null);
  const seenOfferIce = useRef<Set<string>>(new Set());

  useEffect(() => {
    void connect();
    return () => { void cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function connect(): Promise<void> {
    if (!sessionId) { setErr("Missing session code."); return; }
    if (connecting || connected) return;

    setConnecting(true);
    setErr(null);
    setStatus("Registering…");

    try {
      const reg = await bg<{}>({ type: "wrtc-register-viewer", sessionId, viewerId });
      if (!reg.ok) throw new Error(reg.error || "register failed");

      setStatus("Waiting for offer…");
      let offer: RTCSessionDescriptionInit | undefined;
      for (let i = 0; i < 30; i++) {
        const r = await bg<OfferResp>({ type: "wrtc-get-offer-v", sessionId, viewerId });
        if (!r.ok) throw new Error(r.error || "wrtc-get-offer-v failed");
        if (r.exists && r.offer) { offer = r.offer; break; }
        await new Promise((res) => setTimeout(res, 800));
      }
      if (!offer) { setErr("No offer for this viewer."); setConnecting(false); return; }

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;

      pc.ontrack = (ev: RTCTrackEvent) => {
        const stream = ev.streams[0];
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
      };

      pc.onicecandidate = async (ev: RTCPeerConnectionIceEvent) => {
        const cand: RTCIceCandidate | null = ev.candidate;
        if (!cand) return;
        const init: RTCIceCandidateInit = cand.toJSON ? cand.toJSON() : {
          candidate: cand.candidate,
          sdpMid: cand.sdpMid ?? undefined,
          sdpMLineIndex: cand.sdpMLineIndex ?? undefined,
          usernameFragment: (cand as any).usernameFragment,
        };
        const rr = await bg<{}>({ type: "wrtc-add-answer-cand-v", sessionId, viewerId, candidate: init });
        if (!rr.ok) console.warn("add-answer-cand-v failed:", rr.error);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      setStatus("Creating answer…");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const ansInit: RTCSessionDescriptionInit = { type: answer.type, sdp: answer.sdp ?? "" };
      const setAns = await bg<{}>({ type: "wrtc-set-answer-v", sessionId, viewerId, answer: ansInit });
      if (!setAns.ok) throw new Error(setAns.error || "wrtc-set-answer-v failed");

      startOfferIcePolling();

      setConnected(true);
      setStatus("Connected");
      await bg<{}>({ type: "wrtc-viewer-status", sessionId, viewerId, status: "connected" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "Failed to join.");
      await cleanup();
    } finally {
      setConnecting(false);
    }
  }

  function startOfferIcePolling(): void {
    seenOfferIce.current.clear();
    if (offerIcePollId.current) window.clearInterval(offerIcePollId.current);
    offerIcePollId.current = window.setInterval(async () => {
      try {
        const r = await bg<CandsResp>({ type: "wrtc-list-offer-cands-v", sessionId, viewerId });
        if (!r.ok || !r.candidates || !pcRef.current) return;
        for (const c of r.candidates) {
          if (!c?.key || seenOfferIce.current.has(c.key)) continue;
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            seenOfferIce.current.add(c.key);
          } catch (err) {
            console.warn("addIceCandidate(offer,v) error:", err);
          }
        }
      } catch (err) {
        console.warn("offer ICE polling v error:", err);
      }
    }, 800);
  }

  async function cleanup(): Promise<void> {
    if (offerIcePollId.current) { window.clearInterval(offerIcePollId.current); offerIcePollId.current = null; }
    try { pcRef.current?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} }); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    if (sessionId && viewerId) {
      await bg<{}>({ type: "wrtc-viewer-status", sessionId, viewerId, status: "left" });
    }
  }

  return (
    <div style={{ padding: 16, color: "#eee", background: "#121212", minHeight: "100vh" }}>
      <h2 style={{ margin: "0 0 8px" }}>Viewer — WebSyncSpace</h2>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Session: <b>{sessionId || "—"}</b> &nbsp;|&nbsp; ViewerId: <b>{viewerId}</b>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => void connect()} disabled={connecting || connected}>
          {connecting ? "..." : connected ? "Connected" : "Join"}
        </button>
      </div>

      {err && <div style={{ color: "tomato", marginBottom: 8 }}>{err}</div>}
      <div style={{ marginBottom: 8 }}>Status: {status}</div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: "min(95vw, 1280px)", maxHeight: "80vh", background: "#000", borderRadius: 8 }}
      />
    </div>
  );
}
