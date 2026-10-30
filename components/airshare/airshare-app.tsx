"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/static-link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileUp,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  CHUNK_BYTES,
  MAX_FILE_BYTES,
  MAX_TEXT_LENGTH,
  formatBytes,
  generatePin,
  isLanConnection,
  parseIceCandidate,
  randomHex,
  resolveCandidate,
  safeFilename,
  type ParsedCandidate,
} from "./protocol";

const API = "/api/airshare";
const HEARTBEAT_MS = 20_000;
const POLL_MS = 2_000;
const CONNECT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;
const MAX_MESSAGES = 200;

type Phase = "gate" | "session";
type ConnectionStatus = "waiting" | "connecting" | "connected" | "retrying" | "blocked" | "failed";
type ChatEntry = { id: string; direction: "in" | "out"; text: string; at: number };
type IncomingFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  accepted: boolean;
  chunks: ArrayBuffer[];
  received: number;
};
type OutgoingStatus = "pending" | "sending" | "complete" | "rejected" | "failed" | "cancelled";
type OutgoingFile = {
  id: string;
  file: File;
  name: string;
  sent: number;
  cancelled: boolean;
  status: OutgoingStatus;
};
type DownloadInfo = { url: string; name: string; size: number };
type RemoteSession = {
  id: string;
  name: string;
  status: ConnectionStatus;
  detail: string;
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  sessionId: string;
  verified: boolean;
  channelReady: boolean;
  initiator: boolean;
  pendingIce: RTCIceCandidateInit[];
  preIce: { session: string; candidate: RTCIceCandidateInit }[];
  localCandidates: ParsedCandidate[];
  remoteCandidates: ParsedCandidate[];
  connectTimer: number | null;
  retryTimer: number | null;
  disconnectTimer: number | null;
  attempt: number;
  messages: ChatEntry[];
  incoming: IncomingFile | null;
  outgoing: OutgoingFile | null;
  download: DownloadInfo | null;
  lastProgressAt: number;
  unread: number;
};
type PeerSnapshot = {
  id: string;
  name: string;
  status: ConnectionStatus;
  detail: string;
  messages: ChatEntry[];
  incoming: { id: string; name: string; size: number; accepted: boolean } | null;
  outgoing: { id: string; name: string; size: number; sent: number; status: OutgoingStatus } | null;
  download: DownloadInfo | null;
  unread: number;
};
type ProgressInfo = {
  direction: "in" | "out";
  done: number;
  total: number;
  name: string;
};
type SessionInfo = { pin: string; room: string; peerId: string; name: string };
type ServerPeer = { id: string; name: string; lastSeen: string };
type SignalItem = { id: number; from: string; payload: string };
type SignalPayload = {
  kind?: string;
  session?: string;
  type?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};
type PairStatsLike = {
  type: string;
  state?: string;
  selected?: boolean;
  nominated?: boolean;
  localCandidateId?: string;
  remoteCandidateId?: string;
  bytesSent?: number;
  bytesReceived?: number;
};
type CandidateStatsLike = {
  candidateType?: string;
  address?: string | null;
  port?: number;
  protocol?: string;
};

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  waiting: "Waiting for the other device",
  connecting: "Connecting directly…",
  connected: "Connected on this Wi-Fi",
  retrying: "Connection lost — retrying",
  blocked: "Stopped: not a local connection",
  failed: "Not connected",
};

const STATUS_DOT: Record<ConnectionStatus, string> = {
  waiting: "bg-[var(--muted)]",
  connecting: "bg-[var(--teal)] animate-pulse",
  connected: "bg-emerald-500",
  retrying: "bg-[var(--coral)] animate-pulse",
  blocked: "bg-[var(--coral)]",
  failed: "bg-[var(--muted)]",
};

function newRemote(peer: ServerPeer): RemoteSession {
  return {
    id: peer.id,
    name: peer.name,
    status: "waiting",
    detail: "Waiting to connect…",
    pc: null,
    dc: null,
    sessionId: "",
    verified: false,
    channelReady: false,
    initiator: false,
    pendingIce: [],
    preIce: [],
    localCandidates: [],
    remoteCandidates: [],
    connectTimer: null,
    retryTimer: null,
    disconnectTimer: null,
    attempt: 0,
    messages: [],
    incoming: null,
    outgoing: null,
    download: null,
    lastProgressAt: 0,
    unread: 0,
  };
}

export default function AirShareApp() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateNotice, setGateNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [peers, setPeers] = useState<PeerSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressInfo>>({});
  const [linkNotice, setLinkNotice] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [textDraft, setTextDraft] = useState("");
  const [copied, setCopied] = useState<"pin" | "link" | null>(null);

  const infoRef = useRef<SessionInfo | null>(null);
  const sessionsRef = useRef(new Map<string, RemoteSession>());
  const selectedRef = useRef<string | null>(null);
  const cursorRef = useRef(0);
  const pollBusyRef = useRef(false);
  const pollFailuresRef = useRef(0);
  const aliveRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDisplayName(window.localStorage.getItem("airshare:name") ?? "");
  }, []);

  function syncPeers() {
    setPeers(
      Array.from(sessionsRef.current.values()).map((remote) => ({
        id: remote.id,
        name: remote.name,
        status: remote.status,
        detail: remote.detail,
        messages: remote.messages,
        incoming: remote.incoming
          ? {
              id: remote.incoming.id,
              name: remote.incoming.name,
              size: remote.incoming.size,
              accepted: remote.incoming.accepted,
            }
          : null,
        outgoing: remote.outgoing
          ? {
              id: remote.outgoing.id,
              name: remote.outgoing.name,
              size: remote.outgoing.file.size,
              sent: remote.outgoing.sent,
              status: remote.outgoing.status,
            }
          : null,
        download: remote.download,
        unread: remote.unread,
      })),
    );
  }

  function selectPeer(id: string) {
    selectedRef.current = id;
    setSelectedId(id);
    setTextDraft("");
    setTransferNotice("");
    const remote = sessionsRef.current.get(id);
    if (remote) remote.unread = 0;
    syncPeers();
  }

  function closePc(remote: RemoteSession) {
    if (remote.connectTimer !== null) window.clearTimeout(remote.connectTimer);
    if (remote.retryTimer !== null) window.clearTimeout(remote.retryTimer);
    if (remote.disconnectTimer !== null) window.clearTimeout(remote.disconnectTimer);
    remote.connectTimer = null;
    remote.retryTimer = null;
    remote.disconnectTimer = null;

    const channel = remote.dc;
    const pc = remote.pc;
    remote.dc = null;
    remote.pc = null;
    remote.channelReady = false;
    remote.verified = false;
    remote.pendingIce = [];
    remote.localCandidates = [];
    remote.remoteCandidates = [];
    remote.sessionId = "";

    if (channel) {
      channel.onopen = null;
      channel.onclose = null;
      channel.onerror = null;
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        // already closed
      }
    }
    if (pc) {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.ondatachannel = null;
      try {
        pc.close();
      } catch {
        // already closed
      }
    }
  }

  function destroyRemote(remote: RemoteSession) {
    closePc(remote);
    if (remote.download) URL.revokeObjectURL(remote.download.url);
    remote.download = null;
  }

  function endSession(message?: string) {
    aliveRef.current = false;
    infoRef.current = null;
    for (const remote of sessionsRef.current.values()) destroyRemote(remote);
    sessionsRef.current.clear();
    setPeers([]);
    setProgress({});
    setSelectedId(null);
    selectedRef.current = null;
    setSession(null);
    setPhase("gate");
    setTextDraft("");
    setTransferNotice("");
    setLinkNotice("");
    setGateNotice(message ?? "");
  }

  async function sendSignal(to: string, payload: unknown) {
    const info = infoRef.current;
    if (!info) return;
    try {
      await fetch(`${API}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: info.room, from: info.peerId, to, payload }),
      });
    } catch {
      // The poll loop reports signaling outages; connection timeouts cover this.
    }
  }

  function updateProgress(remote: RemoteSession, direction: "in" | "out", done: number, total: number, name: string) {
    const now = Date.now();
    if (done < total && now - remote.lastProgressAt < 120) return;
    remote.lastProgressAt = now;
    setProgress((current) => ({ ...current, [remote.id]: { direction, done, total, name } }));
  }

  function armConnectTimer(remote: RemoteSession) {
    if (remote.connectTimer !== null) window.clearTimeout(remote.connectTimer);
    remote.connectTimer = window.setTimeout(() => {
      remote.connectTimer = null;
      if (remote.status === "connecting" || remote.status === "waiting") {
        handleLost(remote, "No direct connection was made. Both devices must be on the same Wi-Fi.");
      }
    }, CONNECT_TIMEOUT_MS);
  }

  function maybeConnected(remote: RemoteSession) {
    if (!remote.channelReady || !remote.verified) return;
    if (remote.connectTimer !== null) window.clearTimeout(remote.connectTimer);
    remote.connectTimer = null;
    remote.status = "connected";
    remote.detail = "Direct connection on this Wi-Fi";
    remote.attempt = 0;
    syncPeers();
  }

  async function verifyLan(remote: RemoteSession, pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats();
      let pair: PairStatsLike | null = null;
      stats.forEach((report) => {
        const row = report as unknown as PairStatsLike;
        if (row.type !== "candidate-pair") return;
        if (row.state !== "succeeded" && row.state !== "in-progress") return;
        if (!row.selected && !row.nominated) return;
        const traffic = (row.bytesSent ?? 0) + (row.bytesReceived ?? 0);
        const best = pair ? (pair.bytesSent ?? 0) + (pair.bytesReceived ?? 0) : -1;
        if (!pair || traffic >= best) pair = row;
      });
      const selectedPair = pair as PairStatsLike | null;
      if (!selectedPair || !selectedPair.localCandidateId || !selectedPair.remoteCandidateId) {
        throw new Error("no candidate pair");
      }
      const localReport = stats.get(selectedPair.localCandidateId) as unknown as
        | CandidateStatsLike
        | undefined;
      const remoteReport = stats.get(selectedPair.remoteCandidateId) as unknown as
        | CandidateStatsLike
        | undefined;
      const local = resolveCandidate(
        {
          type: localReport?.candidateType ?? "",
          address: localReport?.address ?? null,
          port: typeof localReport?.port === "number" ? localReport.port : null,
          protocol: localReport?.protocol ?? null,
        },
        remote.localCandidates,
      );
      const remoteCandidate = resolveCandidate(
        {
          type: remoteReport?.candidateType ?? "",
          address: remoteReport?.address ?? null,
          port: typeof remoteReport?.port === "number" ? remoteReport.port : null,
          protocol: remoteReport?.protocol ?? null,
        },
        remote.remoteCandidates,
      );

      if (!isLanConnection(local, remoteCandidate)) {
        remote.status = "blocked";
        remote.detail = "AirShare stopped this connection because it did not use a local network address.";
        closePc(remote);
        syncPeers();
        return;
      }

      remote.verified = true;
      maybeConnected(remote);
    } catch {
      remote.status = "failed";
      remote.detail = "AirShare could not confirm that both devices are on the same network.";
      closePc(remote);
      syncPeers();
    }
  }

  function attachChannel(remote: RemoteSession, channel: RTCDataChannel) {
    remote.dc = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 256 * 1024;
    channel.onopen = () => {
      if (remote.dc !== channel) return;
      remote.channelReady = true;
      maybeConnected(remote);
    };
    channel.onclose = () => {
      if (remote.dc !== channel) return;
      remote.channelReady = false;
      if (remote.status === "connected") handleLost(remote, "The other device closed the connection.");
    };
    channel.onerror = () => {};
    channel.onmessage = (event) => {
      if (remote.dc !== channel) return;
      void handleChannelData(remote, event.data);
    };
  }

  function attachPc(remote: RemoteSession, pc: RTCPeerConnection) {
    pc.onicecandidate = (event) => {
      if (remote.pc !== pc) return;
      const candidate = event.candidate;
      if (!candidate || !candidate.candidate) return;
      const parsed = parseIceCandidate(candidate.candidate);
      if (parsed) remote.localCandidates.push(parsed);
      void sendSignal(remote.id, {
        kind: "ice",
        session: remote.sessionId,
        candidate: candidate.toJSON(),
      });
    };
    pc.onconnectionstatechange = () => {
      if (remote.pc !== pc) return;
      if (pc.connectionState === "connected") {
        void verifyLan(remote, pc);
      } else if (pc.connectionState === "failed") {
        handleLost(remote, "The direct connection failed.");
      } else if (pc.connectionState === "disconnected") {
        if (remote.disconnectTimer !== null) window.clearTimeout(remote.disconnectTimer);
        remote.disconnectTimer = window.setTimeout(() => {
          remote.disconnectTimer = null;
          if (remote.pc === pc && pc.connectionState === "disconnected") {
            handleLost(remote, "The other device stopped responding.");
          }
        }, 6_000);
      }
    };
    pc.ondatachannel = (event) => {
      if (remote.pc !== pc) return;
      attachChannel(remote, event.channel);
    };
  }

  function handleLost(remote: RemoteSession, detail: string) {
    if (remote.status === "blocked") return;
    const canRetry = remote.initiator && remote.attempt > 0 && remote.attempt < MAX_ATTEMPTS;
    closePc(remote);
    if (remote.incoming) remote.incoming = null;
    if (remote.outgoing && (remote.outgoing.status === "pending" || remote.outgoing.status === "sending")) {
      remote.outgoing.status = "failed";
    }

    if (canRetry) {
      remote.status = "retrying";
      remote.detail = `${detail} Retrying…`;
      syncPeers();
      remote.retryTimer = window.setTimeout(() => {
        remote.retryTimer = null;
        if (sessionsRef.current.get(remote.id) === remote && remote.status === "retrying") {
          void startOffer(remote);
        }
      }, 4_000);
    } else {
      remote.status = "failed";
      remote.detail = detail;
      syncPeers();
    }
  }

  async function startOffer(remote: RemoteSession) {
    const info = infoRef.current;
    if (!info) return;

    closePc(remote);
    remote.status = "connecting";
    remote.detail = "Starting a direct connection…";
    remote.initiator = true;
    remote.attempt += 1;
    syncPeers();

    const pc = new RTCPeerConnection({ iceServers: [] });
    remote.pc = pc;
    remote.sessionId = randomHex(8);
    attachPc(remote, pc);

    const channel = pc.createDataChannel("airshare", { ordered: true });
    attachChannel(remote, channel);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (remote.pc !== pc) return;
      const description = pc.localDescription;
      if (!description?.sdp) throw new Error("no local description");
      await sendSignal(remote.id, {
        kind: "sdp",
        session: remote.sessionId,
        type: "offer",
        sdp: description.sdp,
      });
      armConnectTimer(remote);
    } catch {
      handleLost(remote, "Could not start the connection.");
    }
  }

  async function flushIce(remote: RemoteSession) {
    const pc = remote.pc;
    if (!pc) return;
    const pending = remote.pendingIce.splice(0);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // A stale candidate is harmless.
      }
    }
  }

  async function handleSignal(from: string, payload: SignalPayload) {
    const remote = sessionsRef.current.get(from);
    const info = infoRef.current;
    if (!remote || !info) return;
    if (typeof payload.session !== "string" || !payload.session) return;

    if (payload.kind === "sdp" && (payload.type === "offer" || payload.type === "answer") && typeof payload.sdp === "string") {
      if (payload.type === "offer") {
        if (
          remote.pc &&
          remote.sessionId !== payload.session &&
          remote.pc.signalingState === "have-local-offer" &&
          info.peerId < remote.id
        ) {
          return;
        }

        if (!remote.pc || remote.sessionId !== payload.session) {
          closePc(remote);
          remote.status = "connecting";
          remote.detail = "Connecting…";
          remote.initiator = false;
          remote.attempt += 1;
          remote.sessionId = payload.session;
          const pc = new RTCPeerConnection({ iceServers: [] });
          remote.pc = pc;
          attachPc(remote, pc);
          armConnectTimer(remote);
        }

        const pc = remote.pc;
        if (!pc) return;
        const queued = remote.preIce.filter((item) => item.session === payload.session);
        if (queued.length > 0) {
          remote.preIce = remote.preIce.filter((item) => item.session !== payload.session);
          for (const item of queued) {
            const parsed = parseIceCandidate(item.candidate.candidate);
            if (parsed) remote.remoteCandidates.push(parsed);
            remote.pendingIce.push(item.candidate);
          }
        }
        try {
          await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
          await flushIce(remote);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (remote.pc !== pc) return;
          const description = pc.localDescription;
          if (description?.sdp) {
            await sendSignal(remote.id, {
              kind: "sdp",
              session: remote.sessionId,
              type: "answer",
              sdp: description.sdp,
            });
          }
        } catch {
          handleLost(remote, "The connection could not be established.");
        }
        syncPeers();
        return;
      }

      if (!remote.pc || remote.sessionId !== payload.session) return;
      if (remote.pc.signalingState !== "have-local-offer") return;
      try {
        await remote.pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        await flushIce(remote);
      } catch {
        handleLost(remote, "The connection could not be established.");
      }
      return;
    }

    if (payload.kind === "ice" && payload.candidate && typeof payload.candidate.candidate === "string") {
      if (!remote.pc || remote.sessionId !== payload.session) {
        remote.preIce.push({ session: payload.session, candidate: payload.candidate });
        if (remote.preIce.length > 64) remote.preIce.splice(0, remote.preIce.length - 64);
        return;
      }
      const parsed = parseIceCandidate(payload.candidate.candidate);
      if (parsed) remote.remoteCandidates.push(parsed);
      if (remote.pc.remoteDescription) {
        try {
          await remote.pc.addIceCandidate(payload.candidate);
        } catch {
          // A stale candidate is harmless.
        }
      } else {
        remote.pendingIce.push(payload.candidate);
      }
    }
  }

  function applyPeers(list: ServerPeer[]) {
    const info = infoRef.current;
    if (!info) return;
    const seen = new Set<string>();

    for (const peer of list) {
      if (peer.id === info.peerId) continue;
      seen.add(peer.id);
      const existing = sessionsRef.current.get(peer.id);
      if (existing) {
        if (peer.name && peer.name !== existing.name) existing.name = peer.name;
        continue;
      }
      const remote = newRemote(peer);
      sessionsRef.current.set(peer.id, remote);
      if (!selectedRef.current) {
        selectedRef.current = peer.id;
        setSelectedId(peer.id);
      }
      if (info.peerId < peer.id) void startOffer(remote);
    }

    for (const [id, remote] of Array.from(sessionsRef.current.entries())) {
      if (seen.has(id)) continue;
      destroyRemote(remote);
      sessionsRef.current.delete(id);
      setProgress((current) => {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      });
      if (selectedRef.current === id) {
        const nextId = sessionsRef.current.keys().next().value ?? null;
        selectedRef.current = nextId;
        setSelectedId(nextId);
      }
    }

    syncPeers();
  }

  async function join(pin: string) {
    const name = displayName.trim();
    if (!name) {
      setGateError("Add a device name first, so the other device knows who it is talking to.");
      return;
    }
    if (!/^\d{6,10}$/.test(pin)) {
      setGateError("The PIN must be 6 to 10 digits.");
      return;
    }

    setBusy(true);
    setGateError("");
    setGateNotice("");
    const peerId = randomHex(16);

    try {
      const response = await fetch(`${API}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, peerId, name }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        room?: unknown;
        peers?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not join the room.");
      }
      if (typeof data.room !== "string") throw new Error("The server sent an unexpected response.");

      window.localStorage.setItem("airshare:name", name);
      const info: SessionInfo = { pin, room: data.room, peerId, name };
      infoRef.current = info;
      cursorRef.current = 0;
      pollFailuresRef.current = 0;
      for (const remote of sessionsRef.current.values()) destroyRemote(remote);
      sessionsRef.current.clear();
      setProgress({});
      setSelectedId(null);
      selectedRef.current = null;
      setSession(info);
      setPhase("session");
      applyPeers(Array.isArray(data.peers) ? (data.peers as ServerPeer[]) : []);
    } catch (error) {
      setGateError(error instanceof Error ? error.message : "Could not join the room.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveSession() {
    const info = infoRef.current;
    if (info) {
      try {
        await fetch(`${API}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: info.room, peerId: info.peerId }),
          keepalive: true,
        });
      } catch {
        // Leaving locally is what matters; the row expires on its own.
      }
    }
    endSession();
  }

  function notePollFailure() {
    pollFailuresRef.current += 1;
    if (pollFailuresRef.current >= 3) {
      setLinkNotice("The signaling service is not answering. Check your connection; AirShare keeps retrying.");
    }
  }

  async function pollOnce() {
    const info = infoRef.current;
    if (!info || pollBusyRef.current || !aliveRef.current) return;
    pollBusyRef.current = true;
    try {
      const response = await fetch(
        `${API}/signals?room=${encodeURIComponent(info.room)}&peer=${encodeURIComponent(info.peerId)}&since=${cursorRef.current}`,
        { cache: "no-store" },
      );
      if (!aliveRef.current) return;
      if (response.status === 410) {
        endSession("Your AirShare session expired. Join again with the same PIN.");
        return;
      }
      if (!response.ok) {
        notePollFailure();
        return;
      }
      pollFailuresRef.current = 0;
      setLinkNotice("");
      const data = (await response.json()) as {
        signals?: SignalItem[];
        cursor?: number;
        peers?: ServerPeer[];
      };
      if (typeof data.cursor === "number") cursorRef.current = data.cursor;
      applyPeers(Array.isArray(data.peers) ? data.peers : []);
      for (const signal of data.signals ?? []) {
        if (!aliveRef.current) break;
        let payload: SignalPayload;
        try {
          payload = JSON.parse(signal.payload) as SignalPayload;
        } catch {
          continue;
        }
        await handleSignal(signal.from, payload);
      }
    } catch {
      notePollFailure();
    } finally {
      pollBusyRef.current = false;
    }
  }

  async function heartbeat() {
    const info = infoRef.current;
    if (!info || !aliveRef.current) return;
    try {
      const response = await fetch(`${API}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: info.room, peerId: info.peerId }),
      });
      if (!aliveRef.current) return;
      if (response.status === 410) {
        endSession("Your AirShare session expired. Join again with the same PIN.");
        return;
      }
      if (!response.ok) return;
      const data = (await response.json()) as { peers?: ServerPeer[] };
      applyPeers(Array.isArray(data.peers) ? data.peers : []);
    } catch {
      // The poll loop reports outages.
    }
  }

  useEffect(() => {
    if (!session) return;
    aliveRef.current = true;
    const beat = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_MS);
    const poll = window.setInterval(() => {
      void pollOnce();
    }, POLL_MS);
    void pollOnce();
    return () => {
      window.clearInterval(beat);
      window.clearInterval(poll);
    };
    // Everything below reads refs, so the loop only needs to restart per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    const handlePageHide = () => {
      const info = infoRef.current;
      if (!info) return;
      try {
        navigator.sendBeacon(
          `${API}/leave`,
          new Blob([JSON.stringify({ room: info.room, peerId: info.peerId })], { type: "text/plain" }),
        );
      } catch {
        // The row expires after 90 seconds anyway.
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      for (const remote of sessionsRef.current.values()) destroyRemote(remote);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [peers]);

  function pushMessage(remote: RemoteSession, direction: "in" | "out", text: string) {
    remote.messages = [
      ...remote.messages.slice(-(MAX_MESSAGES - 1)),
      { id: randomHex(6), direction, text, at: Date.now() },
    ];
    if (direction === "in" && selectedRef.current !== remote.id) remote.unread += 1;
    syncPeers();
  }

  function sendControl(remote: RemoteSession, message: Record<string, unknown>): boolean {
    const channel = remote.dc;
    if (!channel || channel.readyState !== "open") {
      setTransferNotice("That device is not connected right now.");
      return false;
    }
    try {
      channel.send(JSON.stringify(message));
      return true;
    } catch {
      setTransferNotice("The message could not be sent.");
      return false;
    }
  }

  function finishIncoming(remote: RemoteSession) {
    const incoming = remote.incoming;
    if (!incoming) return;
    if (incoming.received !== incoming.size) {
      remote.incoming = null;
      setTransferNotice("The incoming file was incomplete and has been discarded.");
      syncPeers();
      return;
    }
    const blob = new Blob(incoming.chunks, { type: incoming.mime || "application/octet-stream" });
    if (remote.download) URL.revokeObjectURL(remote.download.url);
    const download = { url: URL.createObjectURL(blob), name: incoming.name, size: incoming.size };
    remote.download = download;
    remote.incoming = null;
    setProgress((current) => ({
      ...current,
      [remote.id]: { direction: "in", done: download.size, total: download.size, name: download.name },
    }));

    const anchor = document.createElement("a");
    anchor.href = download.url;
    anchor.download = download.name;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    syncPeers();
  }

  async function pumpOutgoing(remote: RemoteSession) {
    const transfer = remote.outgoing;
    const channel = remote.dc;
    if (!transfer || transfer.status !== "pending" || !channel) return;
    transfer.status = "sending";
    syncPeers();

    try {
      let offset = 0;
      while (offset < transfer.file.size) {
        if (transfer.cancelled || remote.outgoing !== transfer) return;
        if (!remote.dc || remote.dc.readyState !== "open") throw new Error("channel closed");
        if (remote.dc.bufferedAmount > 4 * 1024 * 1024) {
          await new Promise((resolve) => window.setTimeout(resolve, 40));
          continue;
        }
        const chunk = await transfer.file.slice(offset, offset + CHUNK_BYTES).arrayBuffer();
        remote.dc.send(chunk);
        offset += chunk.byteLength;
        transfer.sent = offset;
        updateProgress(remote, "out", offset, transfer.file.size, transfer.name);
      }
      sendControl(remote, { type: "file-complete", id: transfer.id });
      transfer.status = "complete";
      updateProgress(remote, "out", transfer.file.size, transfer.file.size, transfer.name);
    } catch {
      transfer.status = "failed";
      setTransferNotice("The connection dropped during the transfer.");
    } finally {
      syncPeers();
    }
  }

  async function handleChannelData(remote: RemoteSession, data: unknown) {
    if (typeof data === "string") {
      let message: Record<string, unknown>;
      try {
        const parsed = JSON.parse(data) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
        message = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      if (message.type === "text" && typeof message.text === "string") {
        const text = message.text.trim().slice(0, MAX_TEXT_LENGTH);
        if (text) pushMessage(remote, "in", text);
        return;
      }

      if (message.type === "file-offer" && typeof message.id === "string" && typeof message.name === "string") {
        const size = typeof message.size === "number" ? message.size : Number.NaN;
        if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
          sendControl(remote, { type: "file-reject", id: message.id });
          return;
        }
        if (remote.incoming) {
          sendControl(remote, { type: "file-reject", id: message.id });
          return;
        }
        remote.incoming = {
          id: message.id,
          name: safeFilename(message.name),
          size,
          mime: typeof message.mime === "string" ? message.mime.slice(0, 120) : "",
          accepted: false,
          chunks: [],
          received: 0,
        };
        remote.unread += 1;
        syncPeers();
        return;
      }

      if (message.type === "file-accept" && typeof message.id === "string") {
        if (remote.outgoing?.id === message.id) void pumpOutgoing(remote);
        return;
      }

      if (message.type === "file-reject" && typeof message.id === "string") {
        if (remote.outgoing?.id === message.id) {
          remote.outgoing.status = "rejected";
          syncPeers();
        }
        return;
      }

      if (message.type === "file-cancel" && typeof message.id === "string") {
        if (remote.outgoing?.id === message.id) {
          remote.outgoing.cancelled = true;
          remote.outgoing.status = "cancelled";
        }
        if (remote.incoming?.id === message.id) {
          remote.incoming = null;
          setTransferNotice(`The sender cancelled ${remote.name}'s transfer.`);
        }
        syncPeers();
        return;
      }

      if (message.type === "file-complete" && typeof message.id === "string") {
        if (remote.incoming?.id === message.id) finishIncoming(remote);
        return;
      }
      return;
    }

    let buffer: ArrayBuffer | null = null;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (data instanceof Blob) {
      buffer = await data.arrayBuffer();
    }
    if (!buffer) return;

    const incoming = remote.incoming;
    if (!incoming || !incoming.accepted) return;
    incoming.chunks.push(buffer);
    incoming.received += buffer.byteLength;
    if (incoming.received > incoming.size) {
      remote.incoming = null;
      setTransferNotice("The incoming file was larger than announced and has been discarded.");
      syncPeers();
      return;
    }
    updateProgress(remote, "in", incoming.received, incoming.size, incoming.name);
    if (incoming.received >= incoming.size) finishIncoming(remote);
  }

  function acceptIncoming(remote: RemoteSession) {
    const incoming = remote.incoming;
    if (!incoming || incoming.accepted) return;
    incoming.accepted = true;
    updateProgress(remote, "in", 0, incoming.size, incoming.name);
    sendControl(remote, { type: "file-accept", id: incoming.id });
    syncPeers();
  }

  function rejectIncoming(remote: RemoteSession) {
    const incoming = remote.incoming;
    if (!incoming) return;
    sendControl(remote, { type: "file-reject", id: incoming.id });
    remote.incoming = null;
    syncPeers();
  }

  async function sendFile(file: File, remote: RemoteSession) {
    if (remote.status !== "connected" || !remote.channelReady) {
      setTransferNotice("Wait until both devices show as connected.");
      return;
    }
    if (file.size <= 0) {
      setTransferNotice("That file is empty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setTransferNotice(`Files are limited to ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    if (remote.outgoing && (remote.outgoing.status === "pending" || remote.outgoing.status === "sending")) {
      setTransferNotice("Finish or cancel the current transfer first.");
      return;
    }

    const id = randomHex(8);
    const name = safeFilename(file.name);
    remote.outgoing = { id, file, name, sent: 0, cancelled: false, status: "pending" };
    setTransferNotice("");
    sendControl(remote, {
      type: "file-offer",
      id,
      name,
      size: file.size,
      mime: file.type || "application/octet-stream",
    });
    syncPeers();
  }

  function cancelOutgoing(remote: RemoteSession) {
    const transfer = remote.outgoing;
    if (!transfer) return;
    transfer.cancelled = true;
    transfer.status = "cancelled";
    sendControl(remote, { type: "file-cancel", id: transfer.id });
    syncPeers();
  }

  function submitText(event: React.FormEvent) {
    event.preventDefault();
    const remote = selectedRef.current ? sessionsRef.current.get(selectedRef.current) : null;
    const text = textDraft.trim();
    if (!remote || !text) return;
    if (text.length > MAX_TEXT_LENGTH) {
      setTransferNotice(`Messages are limited to ${MAX_TEXT_LENGTH} characters.`);
      return;
    }
    if (!sendControl(remote, { type: "text", text })) return;
    pushMessage(remote, "out", text);
    setTextDraft("");
  }

  function reconnect(remote: RemoteSession) {
    remote.attempt = 0;
    remote.detail = "Reconnecting…";
    void startOffer(remote);
  }

  async function copy(value: string, kind: "pin" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1_600);
    } catch {
      setGateError("Copy failed. Select the text and copy it manually.");
    }
  }

  const selectedPeer = peers.find((peer) => peer.id === selectedId) ?? null;
  const progressInfo = selectedPeer ? progress[selectedPeer.id] : undefined;

  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative max-w-5xl py-12 md:py-20">
        <Link
          href="/airshare/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          How AirShare works
        </Link>

        <p className="eyebrow mt-7">AirShare</p>
        <h1 className="display mt-4 text-[clamp(2.1rem,5vw,3.4rem)]">Move a file between two browsers</h1>
        <p className="lede mt-4 max-w-2xl">
          Open this page on both devices, on the same Wi-Fi, and join with one PIN. Files and messages
          travel directly between the two browsers — never through this site.
        </p>

        {phase === "gate" ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="card p-6 md:p-8">
              <div
                role="tablist"
                aria-label="AirShare mode"
                className="inline-flex rounded-full border border-[var(--line)] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "create"}
                  onClick={() => {
                    setMode("create");
                    setGateError("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === "create"
                      ? "bg-[var(--cerulean)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  Create a room
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "join"}
                  onClick={() => {
                    setMode("join");
                    setGateError("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === "join"
                      ? "bg-[var(--cerulean)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  Join with a PIN
                </button>
              </div>

              <div className="form-field mt-6">
                <label className="form-label" htmlFor="airshare-name">
                  This device&apos;s name
                </label>
                <input
                  id="airshare-name"
                  data-testid="airshare-name"
                  className="form-input"
                  value={displayName}
                  maxLength={40}
                  autoComplete="off"
                  placeholder="e.g. Rishav's laptop"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <p className="form-hint">The other device sees this name. Keep it short and recognisable.</p>
              </div>

              {mode === "create" ? (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void join(generatePin());
                  }}
                >
                  <p className="text-sm leading-relaxed text-[var(--muted)]">
                    AirShare generates a random 8-digit PIN and opens the room. Type that PIN into the
                    other device to connect.
                  </p>
                  <button type="submit" data-testid="airshare-create" className="btn btn-primary mt-5" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating…
                      </>
                    ) : (
                      "Create a room"
                    )}
                  </button>
                </form>
              ) : (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void join(pinInput);
                  }}
                >
                  <div className="form-field">
                    <label className="form-label" htmlFor="airshare-pin">
                      6 to 10 digit PIN
                    </label>
                    <input
                      id="airshare-pin"
                      data-testid="airshare-pin-input"
                      className="form-input text-xl tracking-[0.3em] tabular-nums"
                      value={pinInput}
                      inputMode="numeric"
                      autoComplete="off"
                      pattern="[0-9]{6,10}"
                      maxLength={10}
                      placeholder="00000000"
                      onChange={(event) => setPinInput(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                    <p className="form-hint">Ask the person who created the room for the PIN.</p>
                  </div>
                  <button
                    type="submit"
                    data-testid="airshare-join"
                    className="btn btn-primary mt-5"
                    disabled={busy || pinInput.length < 6}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Joining…
                      </>
                    ) : (
                      "Join room"
                    )}
                  </button>
                </form>
              )}

              {gateError && (
                <p className="form-error mt-4" role="alert">
                  {gateError}
                </p>
              )}
              {gateNotice && (
                <p className="form-status mt-4" role="status">
                  {gateNotice}
                </p>
              )}
            </div>

            <aside className="card p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="h-5 w-5 text-[var(--cerulean)]" aria-hidden />
                Before you start
              </h2>
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-[var(--muted)]">
                <li className="flex gap-2">
                  <Wifi className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Both devices must be on the same Wi-Fi. Guest networks that isolate devices will not
                  connect.
                </li>
                <li className="flex gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Anyone with the PIN can join while you are in the room. Share it only with the person
                  in front of you.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  AirShare checks the selected network path and stops the connection unless both ends
                  are local addresses.
                </li>
                <li className="flex gap-2">
                  <FileUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Up to {formatBytes(MAX_FILE_BYTES)} per file, one transfer at a time, held in the
                  receiving browser&apos;s memory until you save it.
                </li>
              </ul>
            </aside>
          </div>
        ) : (
          session && (
            <div className="mt-8 grid gap-5 lg:grid-cols-[20rem_1fr]">
              <aside className="grid content-start gap-4">
                <div className="card p-5">
                  <p className="form-label">Room PIN</p>
                  <p
                    data-testid="airshare-room-pin"
                    className="mt-2 text-3xl font-semibold tracking-[0.3em] tabular-nums"
                  >
                    {session.pin}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-outline" onClick={() => void copy(session.pin, "pin")}>
                      {copied === "pin" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      Copy PIN
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => void copy(window.location.href, "link")}
                    >
                      {copied === "link" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      Copy link
                    </button>
                  </div>
                  <p className="form-hint mt-3">
                    On the other device, open rishavprasad.in/airshare/app/ and join with this PIN.
                  </p>
                  <button type="button" className="btn btn-outline mt-4 w-full" onClick={() => void leaveSession()}>
                    <LogOut className="h-4 w-4" aria-hidden />
                    Leave room
                  </button>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Devices</p>
                    <span className="chip">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {peers.length + 1}
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-2">
                    <li className="rounded-xl border border-[var(--line)] px-3 py-2">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2 w-2 rounded-full bg-[var(--teal)]" aria-hidden />
                        {session.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">This device</p>
                    </li>
                    {peers.map((peer) => (
                      <li key={peer.id}>
                        <button
                          type="button"
                          data-testid="airshare-peer"
                          onClick={() => selectPeer(peer.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            selectedId === peer.id
                              ? "border-[var(--cerulean)] bg-[rgba(0,129,167,0.08)]"
                              : "border-[var(--line)] hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[peer.status]}`} aria-hidden />
                              {peer.name}
                            </span>
                            {peer.unread > 0 && <span className="chip">{peer.unread} new</span>}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">{STATUS_TEXT[peer.status]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {peers.length === 0 && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Waiting for another device to join…
                    </p>
                  )}
                </div>
              </aside>

              <div className="card p-5 md:p-6">
                {selectedPeer ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{selectedPeer.name}</h2>
                        <p
                          data-testid="airshare-status"
                          className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]"
                        >
                          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[selectedPeer.status]}`} aria-hidden />
                          {STATUS_TEXT[selectedPeer.status]}
                        </p>
                      </div>
                      {(selectedPeer.status === "failed" || selectedPeer.status === "blocked") && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => {
                            const remote = sessionsRef.current.get(selectedPeer.id);
                            if (remote) reconnect(remote);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden />
                          Try again
                        </button>
                      )}
                    </div>

                    {selectedPeer.status !== "connected" && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-3 text-sm leading-relaxed text-[var(--muted)]">
                        {selectedPeer.status === "blocked" || selectedPeer.status === "failed" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--coral)]" aria-hidden />
                        ) : (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        )}
                        <span>{selectedPeer.detail}</span>
                      </div>
                    )}

                    {linkNotice && (
                      <p className="form-status mt-3" role="status">
                        {linkNotice}
                      </p>
                    )}
                    {transferNotice && (
                      <p className="form-status mt-3" role="status">
                        {transferNotice}
                      </p>
                    )}

                    {selectedPeer.incoming && (
                      <div className="mt-4 rounded-2xl border border-[var(--line-strong)] p-4">
                        <p className="text-sm font-semibold">Incoming file</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {selectedPeer.incoming.name} · {formatBytes(selectedPeer.incoming.size)}
                        </p>
                        {selectedPeer.incoming.accepted ? (
                          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Receiving…
                          </p>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              data-testid="airshare-accept"
                              className="btn btn-primary"
                              onClick={() => {
                                const remote = sessionsRef.current.get(selectedPeer.id);
                                if (remote) acceptIncoming(remote);
                              }}
                            >
                              <Check className="h-4 w-4" aria-hidden />
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => {
                                const remote = sessionsRef.current.get(selectedPeer.id);
                                if (remote) rejectIncoming(remote);
                              }}
                            >
                              <X className="h-4 w-4" aria-hidden />
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedPeer.download && (
                      <div className="mt-4 rounded-2xl border border-[var(--line-strong)] p-4">
                        <p className="text-sm font-semibold">File received</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {selectedPeer.download.name} · {formatBytes(selectedPeer.download.size)}
                        </p>
                        <a
                          data-testid="airshare-save"
                          href={selectedPeer.download.url}
                          download={selectedPeer.download.name}
                          className="btn btn-primary mt-3"
                        >
                          <Download className="h-4 w-4" aria-hidden />
                          Save file
                        </a>
                      </div>
                    )}

                    {progressInfo && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
                          <span className="truncate">
                            {progressInfo.direction === "in" ? "Receiving" : "Sending"} {progressInfo.name}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {Math.min(100, Math.round((progressInfo.done / Math.max(1, progressInfo.total)) * 100))}% ·{" "}
                            {formatBytes(progressInfo.done)} / {formatBytes(progressInfo.total)}
                          </span>
                        </div>
                        <div
                          className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--line)]"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.min(
                            100,
                            Math.round((progressInfo.done / Math.max(1, progressInfo.total)) * 100),
                          )}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--teal)]"
                            style={{
                              width: `${Math.min(100, (progressInfo.done / Math.max(1, progressInfo.total)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {selectedPeer.outgoing && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="font-semibold">{selectedPeer.outgoing.name}</span>
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            {selectedPeer.outgoing.status === "pending" && "waiting for acceptance"}
                            {selectedPeer.outgoing.status === "sending" && "sending"}
                            {selectedPeer.outgoing.status === "complete" && "sent"}
                            {selectedPeer.outgoing.status === "rejected" && "declined by the other device"}
                            {selectedPeer.outgoing.status === "cancelled" && "cancelled"}
                            {selectedPeer.outgoing.status === "failed" && "failed"}
                          </span>
                        </span>
                        {(selectedPeer.outgoing.status === "pending" ||
                          selectedPeer.outgoing.status === "sending") && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              const remote = sessionsRef.current.get(selectedPeer.id);
                              if (remote) cancelOutgoing(remote);
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className={`mt-5 rounded-2xl border border-dashed p-4 text-center ${
                        selectedPeer.status === "connected"
                          ? "border-[var(--line-strong)]"
                          : "border-[var(--line)] opacity-60"
                      }`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const remote = sessionsRef.current.get(selectedPeer.id);
                        const file = event.dataTransfer.files?.[0];
                        if (remote && file) void sendFile(file, remote);
                      }}
                    >
                      <FileUp className="mx-auto h-5 w-5 text-[var(--cerulean)]" aria-hidden />
                      <p className="mt-2 text-sm font-semibold">Send a file</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Drop it here or choose one. Up to {formatBytes(MAX_FILE_BYTES)}.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary mt-3"
                        disabled={selectedPeer.status !== "connected"}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose a file
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      data-testid="airshare-file"
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        const remote = sessionsRef.current.get(selectedPeer.id);
                        if (file && remote) void sendFile(file, remote);
                      }}
                    />

                    <div className="mt-6">
                      <h3 className="text-sm font-semibold">Messages</h3>
                      <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] p-3">
                        {selectedPeer.messages.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">
                            Short notes you send here stay in these two browser tabs and are never stored.
                          </p>
                        ) : (
                          <ul className="grid gap-2">
                            {selectedPeer.messages.map((message) => (
                              <li
                                key={message.id}
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                  message.direction === "out"
                                    ? "ml-auto bg-[rgba(0,129,167,0.1)]"
                                    : "mr-auto bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]"
                                }`}
                              >
                                <span className="whitespace-pre-wrap break-words">{message.text}</span>
                                <span className="mt-1 block text-[10px] text-[var(--muted)]">
                                  {message.direction === "out" ? "You" : selectedPeer.name} ·{" "}
                                  {new Date(message.at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <form className="mt-3 flex gap-2" onSubmit={submitText}>
                        <input
                          className="form-input"
                          value={textDraft}
                          maxLength={MAX_TEXT_LENGTH}
                          placeholder="Message"
                          aria-label="Message"
                          onChange={(event) => setTextDraft(event.target.value)}
                          disabled={selectedPeer.status !== "connected"}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          aria-label="Send message"
                          disabled={selectedPeer.status !== "connected" || !textDraft.trim()}
                        >
                          <Send className="h-4 w-4" aria-hidden />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center">
                    <Users className="mx-auto h-6 w-6 text-[var(--cerulean)]" aria-hidden />
                    <p className="mt-3 text-sm font-semibold">Waiting for a second device</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                      Open rishavprasad.in/airshare/app/ on another device that is on the same Wi-Fi and
                      enter the PIN {session.pin}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
