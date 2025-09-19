// src/Pages/ViewerTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/** ---- Config TURN/STUN ---- */
const FORCE_TURN_RELAY = false;     // true = toujours TURN (relay-only) ; false = STUN d'abord
const ICE_CACHE_TTL_MIN = 25;       // TTL cache ICE (minutes)

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

/* ----------------------------- */
/*   Twilio ICE helper (backend) */
/* ----------------------------- */
async function loadIceServers(): Promise<RTCIceServer[]> {
  // 1) cache (chrome.storage.local)
  try {
    const key = "wss_ice_cache";
    const cached: any = await new Promise((resolve) =>
      chrome.storage.local.get([key], (r) => resolve(r[key]))
    );
    if (cached?.iceServers && cached?.expiresAt && cached.expiresAt > Date.now()) {
      return cached.iceServers as RTCIceServer[];
    }
  } catch { /* ignore storage errors */ }

  // 2) fetch depuis ton backend (remplace l’URL en prod)
  const resp = await fetch("https://websyncspace-twilio-ice.com/ice", { method: "GET" });
  if (!resp.ok) throw new Error("Failed to fetch ICE servers");
  const data = await resp.json();
  const iceServers: RTCIceServer[] = (data.iceServers ?? data.ice_servers ?? [])
    .map((s: any) => ({ urls: s.urls || s.url, username: s.username, credential: s.credential }))
    .filter((s: any) => !!s.urls);

  // 3) cache TTL réduit
  try {
    const expiresAt = Date.now() + ICE_CACHE_TTL_MIN * 60 * 1000;
    chrome.storage.local.set({ wss_ice_cache: { iceServers, expiresAt } });
  } catch { /* ignore */ }

  return iceServers;
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

  // ✅ MediaStream unique pour accumuler audio/vidéo
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 🔊 Overlay “Activer le son” (déblocage autoplay)
  const [canUnmute, setCanUnmute] = useState<boolean>(false);

  const offerIcePollId = useRef<number | null>(null);
  const seenOfferIce = useRef<Set<string>>(new Set());
  const relayRetriedRef = useRef<boolean>(false); // fallback auto (une seule fois)

  useEffect(() => {
    void connect(FORCE_TURN_RELAY);
    return () => { void cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- DIAG léger: écouter les events <video> ---
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const log = (e: Event) => console.log(`[viewer:<video>] ${e.type}`, { readyState: v.readyState, paused: v.paused, muted: v.muted });
    const events = ["loadedmetadata","canplay","playing","waiting","stalled","suspend","emptied","error"];
    events.forEach(ev => v.addEventListener(ev, log));
    return () => { events.forEach(ev => v.removeEventListener(ev, log)); };
  }, []);

  // helper autoplay
  async function ensureVideoPlays(): Promise<void> {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // indispensable pour l’autoplay Chrome
    try { await v.play(); } catch { /* ignore */ }
  }

  async function connect(forceRelay: boolean): Promise<void> {
    if (!sessionId) { setErr("Missing session code."); return; }
    if (connecting || connected) return;

    setConnecting(true);
    setErr(null);
    setStatus(forceRelay ? "Connecting via TURN…" : "Registering…");

    try {
      const reg = await bg<{}>({ type: "wrtc-register-viewer", sessionId, viewerId });
      if (!reg.ok) throw new Error(reg.error || "register failed");

      if (!forceRelay) setStatus("Waiting for offer…");
      let offer: RTCSessionDescriptionInit | undefined;
      for (let i = 0; i < 30; i++) {
        const r = await bg<OfferResp>({ type: "wrtc-get-offer-v", sessionId, viewerId });
        if (!r.ok) throw new Error(r.error || "wrtc-get-offer-v failed");
        if (r.exists && r.offer) { offer = r.offer; break; }
        await new Promise((res) => setTimeout(res, 800));
      }
      if (!offer) { setErr("No offer for this viewer."); setConnecting(false); return; }

      // ICE + PC
      const iceServers = await loadIceServers();
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: forceRelay ? "relay" : "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });
      pcRef.current = pc;

      pc.ontrack = async (ev: RTCTrackEvent) => {
        // MediaStream persistante
        const incoming = ev.track;
        if (!mediaStreamRef.current) mediaStreamRef.current = new MediaStream();
        const ms = mediaStreamRef.current;

        if (!ms.getTracks().some((t) => t.id === incoming.id)) {
          ms.addTrack(incoming);
        }
        const v = videoRef.current;
        if (v && v.srcObject !== ms) v.srcObject = ms;

        // autoplay muted + afficher bouton “Activer le son”
        await ensureVideoPlays();
        setCanUnmute(true);
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

      pc.onconnectionstatechange = () => {
        console.log("[viewer] pc.connectionState =", pc.connectionState, "(relay:", forceRelay, ")");
        if (pc.connectionState === "connected") {
          setConnected(true);
          // DIAG: stats 10s
          const t0 = Date.now();
          const iv = window.setInterval(async () => {
            try {
              const stats = await pc.getStats(null);
              stats.forEach((r: any) => {
                if (r.type === "inbound-rtp" && r.kind === "video") {
                  console.log("[viewer] inbound-rtp video", {
                    bytes: r.bytesReceived,
                    framesDecoded: r.framesDecoded,
                    fps: r.framesPerSecond,
                    width: r.frameWidth,
                    height: r.frameHeight,
                    packetsLost: r.packetsLost,
                    jitter: r.jitter
                  });
                }
                if (r.type === "candidate-pair" && r.state === "succeeded") {
                  console.log("[viewer] selected candidate pair", {
                    local: r.localCandidateId, remote: r.remoteCandidateId, nominated: r.nominated
                  });
                }
              });
              if (Date.now() - t0 > 10000) window.clearInterval(iv);
            } catch {}
          }, 1000);
        }

        // 🔁 fallback auto : si "all" échoue, retente en relay-only une fois
        if (pc.connectionState === "failed" && !forceRelay && !relayRetriedRef.current) {
          relayRetriedRef.current = true;
          console.warn("[viewer] failed in 'all' mode — retrying with TURN relay-only");
          void cleanup(true /*keepStatus*/).then(() => connect(true));
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      setStatus(forceRelay ? "Answering (TURN)..." : "Creating answer…");
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

  async function cleanup(keepStatus = false): Promise<void> {
    if (offerIcePollId.current) { window.clearInterval(offerIcePollId.current); offerIcePollId.current = null; }
    try { pcRef.current?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} }); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    // libérer MediaStream & <video>
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      try { (videoRef.current as any).srcObject = null; } catch {}
    }

    if (!keepStatus) {
      setConnected(false);
      setStatus("Stopped");
    }

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
        <button onClick={() => void connect(FORCE_TURN_RELAY)} disabled={connecting || connected}>
          {connecting ? "..." : connected ? "Connected" : "Join"}
        </button>
        <button onClick={() => void cleanup()} disabled={!connected && !connecting}>Leave</button>
      </div>

      {err && <div style={{ color: "tomato", marginBottom: 8 }}>{err}</div>}
      <div style={{ marginBottom: 8 }}>Status: {status}</div>

      {/* Conteneur pour l’overlay “Activer le son” */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls
          style={{ width: "min(95vw, 1280px)", maxHeight: "80vh", background: "#000", borderRadius: 8 }}
        />
        {canUnmute && (
          <button
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = false;       // 👉 les spectateurs entendent l’audio (tab + voix hôte PTT)
              v.play().catch(()=>{});
              setCanUnmute(false);
            }}
            style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
              padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "#1976d2", color: "#fff", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.35)"
            }}
            title="Activer le son"
          >
            🔊 Activer le son
          </button>
        )}
      </div>
    </div>
  );
}
