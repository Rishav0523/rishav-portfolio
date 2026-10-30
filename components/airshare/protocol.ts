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
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  if (!value) return false;
  if (value.endsWith(".local")) return true;

  const ipv4 = parseIpv4(value);
  if (ipv4) {
    const [a, b] = ipv4;
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

function parseIpv4(value: string): number[] | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return null;
  const octets = value.split(".").map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return octets;
}

// First four hextets of an IPv6 address, i.e. its /64 prefix.
function firstHextets(value: string, count: number): number[] | null {
  let address = value.trim().toLowerCase();
  if (address.startsWith("[") && address.endsWith("]")) address = address.slice(1, -1);
  const zone = address.indexOf("%");
  if (zone >= 0) address = address.slice(0, zone);
  if (!address.includes(":")) return null;

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const groups = [...left];
  if (halves.length === 2) {
    const fill = 8 - left.length - right.length;
    if (fill < 0) return null;
    for (let index = 0; index < fill; index += 1) groups.push("0");
  }
  groups.push(...right);

  const result: number[] = [];
  for (let index = 0; index < count && index < groups.length; index += 1) {
    if (!/^[0-9a-f]{1,4}$/.test(groups[index])) return null;
    result.push(Number.parseInt(groups[index], 16));
  }
  return result.length === count ? result : null;
}

// Two addresses on the same subnet: /64 for IPv6, /24 for IPv4. Used only when
// neither side is a private address (for example two IPv6 addresses handed out
// by the same router or two public IPv4 addresses on a campus network).
export function sameSubnet(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  const leftV6 = firstHextets(left, 4);
  const rightV6 = firstHextets(right, 4);
  if (leftV6 && rightV6) return leftV6.every((group, index) => group === rightV6[index]);
  const leftV4 = parseIpv4(left.trim());
  const rightV4 = parseIpv4(right.trim());
  if (leftV4 && rightV4) return leftV4[0] === rightV4[0] && leftV4[1] === rightV4[1] && leftV4[2] === rightV4[2];
  return false;
}

export type CandidateStatsSummary = {
  type: string;
  address: string | null;
  port: number | null;
  protocol: string | null;
};

// Chrome can blank the address in getStats(); match the selected pair back to
// the candidates the browser actually exchanged to learn the address. A
// peer-reflexive candidate is the peer's real source address, discovered from
// its first connectivity check, so it is resolved by port like a host one.
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
      (report.type === "prflx" || !report.type || item.type === report.type),
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
  if (!local || !remote) return false;
  // Only host and peer-reflexive candidates can exist without STUN or TURN;
  // server-reflexive and relayed candidates would mean a server was involved.
  const direct = (type: string) => type === "host" || type === "prflx";
  if (!direct(local.type) || !direct(remote.type)) return false;
  // A working pair with a private or mDNS endpoint can only exist on one link:
  // a private/link-local address is not routable from another network. Phones
  // often negotiate over global IPv6 instead, so also accept two addresses
  // that share a subnet.
  if (isPrivateAddress(local.address) || isPrivateAddress(remote.address)) return true;
  return sameSubnet(local.address, remote.address);
}
