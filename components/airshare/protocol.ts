export const CHUNK_BYTES = 64 * 1024;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 4000;

export type CandidateSummary = { type: string; address: string | null };

export type ParsedCandidate = {
  address: string;
  port: number;
  protocol: string;
  type: string;
};

// "candidate:<foundation> <component> <protocol> <priority> <address> <port> typ <type> …"
export function parseIceCandidate(line: string | null | undefined): ParsedCandidate | null {
  if (!line) return null;
  const parts = line.trim().split(/\s+/);
  if (parts.length < 8) return null;
  if (!parts[0].startsWith("candidate:")) return null;
  if (parts[6] !== "typ") return null;
  const protocol = parts[2].toLowerCase();
  if (protocol !== "udp" && protocol !== "tcp") return null;
  const address = parts[4];
  const port = Number.parseInt(parts[5], 10);
  const type = parts[7];
  if (!address || !type || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
  return { address, port, protocol, type };
}

export function randomHex(bytes = 16): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generatePin(): string {
  const data = new Uint8Array(8);
  crypto.getRandomValues(data);
  return Array.from(data, (byte) => String(byte % 10)).join("");
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[unit]}`;
}

export function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_").trim();
  return (cleaned || "airshare-file").slice(0, 120);
}

// Host candidates are the only kind AirShare gathers: no STUN or TURN server is
// configured, so a connection can only exist between interfaces on one network.
// mDNS hostnames (.local) are how Chromium and Safari expose local addresses.
export function isPrivateAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  let value = address.trim().toLowerCase();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  if (!value) return false;
  if (value.endsWith(".local")) return true;

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const octets = value.split(".").map(Number);
    if (octets.some((part) => part < 0 || part > 255)) return false;
    const [a, b] = octets;
    return (
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254)
    );
  }

  if (!value.includes(":")) return false;
  if (value === "::1") return true;

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped) return isPrivateAddress(mapped[1]);

  const head = value.split(":")[0];
  if (head.length < 2) return false;
  const prefix = Number.parseInt(head, 16);
  if (!Number.isFinite(prefix)) return false;
  return (prefix & 0xffc0) === 0xfe80 || (prefix & 0xfe00) === 0xfc00;
}

export type CandidateStatsSummary = {
  type: string;
  address: string | null;
  port: number | null;
  protocol: string | null;
};

// Chrome can blank the address in getStats(); match the selected pair back to
// the candidates the browser actually exchanged to learn the address.
export function resolveCandidate(
  report: CandidateStatsSummary,
  gathered: ParsedCandidate[],
): CandidateSummary {
  if (report.address) return { type: report.type, address: report.address };
  if (report.port === null) return { type: report.type, address: null };
  const matches = gathered.filter(
    (item) =>
      item.port === report.port &&
      (!report.protocol || item.protocol === report.protocol) &&
      (!report.type || item.type === report.type),
  );
  if (matches.length === 0) return { type: report.type, address: null };
  const publicMatch = matches.find((item) => !isPrivateAddress(item.address));
  if (publicMatch) return { type: report.type, address: publicMatch.address };
  return { type: report.type, address: matches[0].address };
}

export function isLanCandidate(candidate: CandidateSummary | null | undefined): boolean {
  if (!candidate) return false;
  if (candidate.type !== "host") return false;
  return isPrivateAddress(candidate.address);
}

export function isLanConnection(
  local: CandidateSummary | null | undefined,
  remote: CandidateSummary | null | undefined,
): boolean {
  return isLanCandidate(local) && isLanCandidate(remote);
}
