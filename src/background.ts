import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, set, update, get, push,
} from "firebase/database";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[WebSyncSpace] Extension installée");
});

// === Firebase init ===
const firebaseConfig = {
  apiKey: "AIzaSyCYWiWZtaC_GCGP-u6q4uuyI7LDCL6tpuA",
  authDomain: "web-sync-space.firebaseapp.com",
  databaseURL: "https://web-sync-space-default-rtdb.firebaseio.com",
  projectId: "web-sync-space",
  storageBucket: "web-sync-space.appspot.com",
  messagingSenderId: "191633119192",
  appId: "1:191633119192:web:fd9e5a60799d15a09d84ad",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== Messaging (UI <-> background) =====
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const t = message?.type as string | undefined;

  // ---- Sessions meta
  if (t === "wrtc-init-session") {
    const { sessionId, sharedURL } = message as { sessionId: string; sharedURL?: string };
    if (!sessionId) { sendResponse({ ok: false, error: "sessionId manquant" }); return true; }
    set(ref(db, `sessions/${sessionId}/meta`), {
      createdAt: Date.now(),
      status: "created",
      sharedURL: sharedURL || "",
    })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-end-session") {
    const { sessionId } = message as { sessionId: string };
    if (!sessionId) { sendResponse({ ok: false, error: "sessionId manquant" }); return true; }
    update(ref(db, `sessions/${sessionId}/meta`), { status: "ended", endedAt: Date.now() })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // ---- Vérification (client)
  if (t === "wrtc-check-session") {
    const { sessionId } = message as { sessionId: string };
    if (!sessionId) { sendResponse({ ok: false, error: "sessionId manquant" }); return true; }
    get(ref(db, `sessions/${sessionId}/meta`))
      .then((snap) => {
        const meta = snap.val() as { status?: string; sharedURL?: string } | null;
        const exists = !!meta && meta.status !== "ended";
        sendResponse({ ok: true, exists, sharedURL: meta?.sharedURL ?? "" });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // ===== Legacy 1:1 (conservé pour compat)
  if (t === "wrtc-set-offer") {
    const { sessionId, offer } = message as { sessionId: string; offer: any };
    if (!sessionId || !offer) { sendResponse({ ok: false, error: "paramètres manquants" }); return true; }
    Promise.all([
      update(ref(db, `sessions/${sessionId}/meta`), { status: "live" }),
      set(ref(db, `sessions/${sessionId}/offer`), offer),
    ])
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-get-offer") {
    const { sessionId } = message as { sessionId: string };
    get(ref(db, `sessions/${sessionId}/offer`))
      .then((snap) => sendResponse({ ok: true, exists: snap.exists(), offer: snap.val() }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-add-offer-cand") {
    const { sessionId, candidate } = message as { sessionId: string; candidate: any };
    push(ref(db, `sessions/${sessionId}/offerCandidates`), candidate)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-get-answer") {
    const { sessionId } = message as { sessionId: string };
    get(ref(db, `sessions/${sessionId}/answer`))
      .then((snap) => sendResponse({ ok: true, exists: snap.exists(), answer: snap.val() }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-list-answer-cands") {
    const { sessionId } = message as { sessionId: string };
    get(ref(db, `sessions/${sessionId}/answerCandidates`))
      .then((snap) => {
        const arr: any[] = [];
        snap.forEach((child) => { arr.push({ key: child.key, ...child.val() }); return; });
        sendResponse({ ok: true, candidates: arr });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-set-answer") {
    const { sessionId, answer } = message as { sessionId: string; answer: any };
    set(ref(db, `sessions/${sessionId}/answer`), answer)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-add-answer-cand") {
    const { sessionId, candidate } = message as { sessionId: string; candidate: any };
    push(ref(db, `sessions/${sessionId}/answerCandidates`), candidate)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (t === "wrtc-list-offer-cands") {
    const { sessionId } = message as { sessionId: string };
    get(ref(db, `sessions/${sessionId}/offerCandidates`))
      .then((snap) => {
        const arr: any[] = [];
        snap.forEach((child) => { arr.push({ key: child.key, ...child.val() }); return; });
        sendResponse({ ok: true, candidates: arr });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // ===== Multi-viewers 1→N
  if (t === "wrtc-register-viewer") {
    const { sessionId, viewerId } = message as { sessionId: string; viewerId: string };
    if (!sessionId || !viewerId) { sendResponse({ ok: false, error: "params" }); return true; }
    update(ref(db, `sessions/${sessionId}/viewers/${viewerId}/meta`), {
      joinedAt: Date.now(),
      status: "joining",
    })
      .then(() => set(ref(db, `sessions/${sessionId}/viewers/${viewerId}/hello`), Date.now()))
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-list-viewers") {
    const { sessionId } = message as { sessionId: string };
    get(ref(db, `sessions/${sessionId}/viewers`))
      .then((snap) => {
        const ids: string[] = [];
        const infos: Record<string, any> = {};
        snap.forEach((child) => {
          ids.push(child.key as string);
          infos[child.key as string] = child.val()?.meta ?? {};
          return;
        });
        sendResponse({ ok: true, ids, infos });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-set-offer-v") {
    const { sessionId, viewerId, offer } = message as { sessionId: string; viewerId: string; offer: any };
    Promise.all([
      set(ref(db, `sessions/${sessionId}/viewers/${viewerId}/offer`), offer),
      update(ref(db, `sessions/${sessionId}/viewers/${viewerId}/meta`), { status: "offered" }),
    ])
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-add-offer-cand-v") {
    const { sessionId, viewerId, candidate } =
      message as { sessionId: string; viewerId: string; candidate: any };
    push(ref(db, `sessions/${sessionId}/viewers/${viewerId}/offerCandidates`), candidate)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-get-viewer-answer") {
    const { sessionId, viewerId } = message as { sessionId: string; viewerId: string };
    get(ref(db, `sessions/${sessionId}/viewers/${viewerId}/answer`))
      .then((snap) => sendResponse({ ok: true, exists: snap.exists(), answer: snap.val() }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-list-viewer-answer-cands") {
    const { sessionId, viewerId } = message as { sessionId: string; viewerId: string };
    get(ref(db, `sessions/${sessionId}/viewers/${viewerId}/answerCandidates`))
      .then((snap) => {
        const arr: any[] = [];
        snap.forEach((child) => { arr.push({ key: child.key, ...child.val() }); return; });
        sendResponse({ ok: true, candidates: arr });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-get-offer-v") {
    const { sessionId, viewerId } = message as { sessionId: string; viewerId: string };
    get(ref(db, `sessions/${sessionId}/viewers/${viewerId}/offer`))
      .then((snap) => sendResponse({ ok: true, exists: snap.exists(), offer: snap.val() }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-set-answer-v") {
    const { sessionId, viewerId, answer } =
      message as { sessionId: string; viewerId: string; answer: any };
    Promise.all([
      set(ref(db, `sessions/${sessionId}/viewers/${viewerId}/answer`), answer),
      update(ref(db, `sessions/${sessionId}/viewers/${viewerId}/meta`), { status: "answered" }),
    ])
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-add-answer-cand-v") {
    const { sessionId, viewerId, candidate } =
      message as { sessionId: string; viewerId: string; candidate: any };
    push(ref(db, `sessions/${sessionId}/viewers/${viewerId}/answerCandidates`), candidate)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (t === "wrtc-list-offer-cands-v") {
    const { sessionId, viewerId } = message as { sessionId: string; viewerId: string };
    get(ref(db, `sessions/${sessionId}/viewers/${viewerId}/offerCandidates`))
      .then((snap) => {
        const arr: any[] = [];
        snap.forEach((child) => { arr.push({ key: child.key, ...child.val() }); return; });
        sendResponse({ ok: true, candidates: arr });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // Viewer status updates
  if (t === "wrtc-viewer-status") {
    const { sessionId, viewerId, status } =
      message as { sessionId: string; viewerId: string; status: "connected" | "left" };
    update(ref(db, `sessions/${sessionId}/viewers/${viewerId}/meta`), {
      status, [status === "connected" ? "connectedAt" : "leftAt"]: Date.now(),
    })
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  sendResponse({ ok: false, error: "unknown type" });
  return true;
});
