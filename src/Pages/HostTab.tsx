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

/* ----------------------------- */
/*   Twilio ICE helper (backend) */
/* ----------------------------- */
async function loadIceServers(): Promise<RTCIceServer[]> {
  // 1) cache ~45min (chrome.storage.local)
  try {
    const key = "wss_ice_cache";
    const cached: any = await new Promise((resolve) =>
      chrome.storage.local.get([key], (r) => resolve(r[key]))
    );
    if (cached?.iceServers && cached?.expiresAt && cached.expiresAt > Date.now()) {
      return cached.iceServers as RTCIceServer[];
    }
  } catch { /* ignore */ }

  // 2) fetch depuis ton backend (remplace l’URL en prod)
  const resp = await fetch("https://websyncspace-twilio-ice.com/ice", { method: "GET" });
  if (!resp.ok) throw new Error("Failed to fetch ICE servers");
  const data = await resp.json();
  const iceServers: RTCIceServer[] = data.iceServers ?? data.ice_servers ?? [];

  // 3) cache 45 min
  try {
    const expiresAt = Date.now() + 45 * 60 * 1000;
    chrome.storage.local.set({ wss_ice_cache: { iceServers, expiresAt } });
  } catch { /* ignore */ }

  return iceServers;
}

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

  // ===== [9a] Monitoring host (toggle + volume) =====
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const monitorSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [monitorOn, setMonitorOn] = useState<boolean>(() => localStorage.getItem("wss_monitorOn") === "1");
  const [monitorVolume, setMonitorVolume] = useState<number>(() => Number(localStorage.getItem("wss_monitorVolume") ?? 0.5));
  useEffect(() => { localStorage.setItem("wss_monitorOn", monitorOn ? "1" : "0"); }, [monitorOn]);
  useEffect(() => {
    localStorage.setItem("wss_monitorVolume", String(monitorVolume));
    if (monitorGainRef.current) monitorGainRef.current.gain.value = monitorVolume;
  }, [monitorVolume]);

  function handleToggleMonitor(next: boolean) {
    setMonitorOn(next);
    if (next) {
      if (streamRef.current) setupMonitoring(streamRef.current);
      else console.warn("[WSS] Monitoring ON demandé mais pas de stream partagé (lance d’abord le partage).");
    } else {
      teardownMonitoring();
    }
  }
  function setupMonitoring(stream: MediaStream) {
    if (audioCtxRef.current && monitorGainRef.current) {
      monitorGainRef.current.gain.value = monitorVolume;
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) { console.warn("[WSS] Aucun audio à monitorer sur la source."); return; }
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx: AudioContext = new Ctx();
    audioCtxRef.current = ctx;

    const src = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
    monitorSourceRef.current = src;
    const delay = ctx.createDelay(); delay.delayTime.value = 0.03; // 30ms pour limiter larsen
    const gain = ctx.createGain(); gain.gain.value = monitorVolume; monitorGainRef.current = gain;
    src.connect(delay); delay.connect(gain);

    const dest = ctx.createMediaStreamDestination();
    gain.connect(dest);

    if (!audioElRef.current) {
      const a = document.createElement("audio");
      a.autoplay = true; a.muted = false; // a.playsInline n'existe pas sur audio
      audioElRef.current = a;
      document.body.appendChild(a);
    }
    audioElRef.current.srcObject = dest.stream;
    if (ctx.state === "suspended") ctx.resume().catch(()=>{});
  }
  function teardownMonitoring() {
    try {
      if (audioElRef.current) {
        audioElRef.current.srcObject = null;
        audioElRef.current.parentNode?.removeChild(audioElRef.current);
        audioElRef.current = null;
      }
      try { monitorSourceRef.current?.disconnect(); } catch {}
      monitorSourceRef.current = null;
      try { monitorGainRef.current?.disconnect(); } catch {}
      monitorGainRef.current = null;
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(()=>{}); audioCtxRef.current = null; }
    } catch (e) { console.warn("[WSS] teardown monitoring error", e); }
  }
  // ================================================

  // ===== [9b] Micro host + Push-to-talk =====
  const micStreamRef = useRef<MediaStream | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const [pttActive, setPttActive] = useState(false);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); pttDown(); } };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); pttUp(); } };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [monitorVolume]);

  async function ensureMicPrepared() {
    if (micTrackRef.current) return;
    try {
      const m = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = m;
      const t = m.getAudioTracks()[0];
      t.enabled = false; // OFF par défaut
      micTrackRef.current = t;

      // ajouter la piste micro à TOUS les pc viewers existants (et futurs dans setupPcForViewer)
      pcs.current.forEach(({ pc }) => { try { pc.addTrack(t, m); } catch {} });
    } catch (err) {
      console.warn("[WSS] Micro non disponible/autorisé", err);
    }
  }
  function pttDown() {
    if (!micTrackRef.current) return;
    micTrackRef.current.enabled = true;
    setPttActive(true);
    if (monitorGainRef.current) monitorGainRef.current.gain.value = Math.max(0, monitorVolume * 0.2);
  }
  function pttUp() {
    if (!micTrackRef.current) return;
    micTrackRef.current.enabled = false;
    setPttActive(false);
    if (monitorGainRef.current) monitorGainRef.current.gain.value = monitorVolume;
  }
  // =======================================

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

      // [9a] si toggle déjà ON, brancher le monitoring maintenant
      if (monitorOn) setupMonitoring(stream);

      // [9b] préparer la piste micro (désactivée) pour PTT
      await ensureMicPrepared();

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

    // 🔁 ICI: on remplace la création du PC par Twilio ICE (via backend)
    const iceServers = await loadIceServers();
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

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

    // tracks du display
    stream.getTracks().forEach((t: MediaStreamTrack) => pc.addTrack(t, stream));
    // [9b] si la piste micro existe déjà, l’ajouter aussi à ce nouveau PC
    if (micStreamRef.current && micTrackRef.current) {
      try { pc.addTrack(micTrackRef.current, micStreamRef.current); } catch {}
    }

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

    // [9b] couper micro si actif
    try { micTrackRef.current && (micTrackRef.current.enabled = false); } catch {}
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    micTrackRef.current = null;
    micStreamRef.current = null;

    // [9a] démonter le monitoring local
    teardownMonitoring();

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

      {/* [9a] Toggle monitor + volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={monitorOn} onChange={(e) => handleToggleMonitor(e.target.checked)} />
          Écouter l'audio du partage (monitor)
        </label>
        {monitorOn && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={monitorVolume}
              onChange={(e) => setMonitorVolume(Number(e.target.value))}
              style={{ width: 200 }}
            />
            <span>{Math.round(monitorVolume * 100)}%</span>
          </div>
        )}
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

      {/* [9b] Push-to-talk */}
      <div style={{ marginBottom: 16 }}>
        <button
          onMouseDown={pttDown}
          onMouseUp={pttUp}
          onTouchStart={pttDown}
          onTouchEnd={pttUp}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: pttActive ? "#d32f2f" : "#1976d2",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
          title="Maintiens pour parler (raccourci: Espace)"
        >
          {pttActive ? "En train de parler…" : "Appuyer pour parler (PTT)"}
        </button>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          Astuce: utilise des écouteurs pour éviter le larsen.
        </div>
      </div>

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
