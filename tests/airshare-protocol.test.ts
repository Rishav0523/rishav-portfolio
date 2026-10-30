import { describe, expect, it } from "vitest";
import {
  CHUNK_BYTES,
  MAX_FILE_BYTES,
  formatBytes,
  generatePin,
  isLanCandidate,
  isLanConnection,
  isPrivateAddress,
  parseIceCandidate,
  randomHex,
  resolveCandidate,
  safeFilename,
} from "../components/airshare/protocol";

describe("isPrivateAddress", () => {
  it("accepts loopback, link-local and RFC 1918 IPv4 addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.7",
      "172.16.4.9",
      "172.31.255.1",
      "192.168.1.42",
      "169.254.10.3",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("rejects public and malformed IPv4 addresses", () => {
    for (const address of ["8.8.8.8", "172.32.0.1", "192.169.1.1", "1.1.1.1", "10.0.0.256", "nope"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("accepts local IPv6 addresses and mDNS hostnames", () => {
    for (const address of ["::1", "fe80::1", "fd12:3456::1", "fc00::5", "::ffff:192.168.0.9", "a1b2c3.local"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("rejects global and empty addresses", () => {
    for (const address of ["2001:db8::1", "2606:4700::1111", "", "   ", null, undefined]) {
      expect(isPrivateAddress(address ?? null), String(address)).toBe(false);
    }
  });
});

describe("LAN candidate checks", () => {
  it("requires a host candidate with a local address on both sides", () => {
    const local = { type: "host", address: "192.168.0.4" };
    const remote = { type: "host", address: "ab12cd34.local" };
    expect(isLanConnection(local, remote)).toBe(true);
    expect(isLanCandidate(local)).toBe(true);
  });

  it("rejects server-reflexive, relayed or public candidates", () => {
    expect(isLanCandidate({ type: "srflx", address: "192.168.0.4" })).toBe(false);
    expect(isLanCandidate({ type: "host", address: "203.0.113.5" })).toBe(false);
    expect(isLanConnection({ type: "host", address: "10.0.0.1" }, { type: "relay", address: "10.0.0.2" })).toBe(
      false,
    );
    expect(isLanConnection(null, { type: "host", address: "10.0.0.2" })).toBe(false);
  });
});

describe("ICE candidate parsing", () => {
  it("reads the address, port and type from a host candidate", () => {
    const parsed = parseIceCandidate(
      "candidate:842163049 1 udp 1677729535 192.168.0.5 54321 typ host generation 0 ufrag abcd",
    );
    expect(parsed).toEqual({ address: "192.168.0.5", port: 54321, protocol: "udp", type: "host" });
  });

  it("reads server-reflexive candidates so they can be rejected", () => {
    const parsed = parseIceCandidate(
      "candidate:1 1 udp 41885439 203.0.113.7 61234 typ srflx raddr 192.168.0.5 rport 54321",
    );
    expect(parsed).toEqual({ address: "203.0.113.7", port: 61234, protocol: "udp", type: "srflx" });
  });

  it("rejects malformed lines", () => {
    for (const line of [
      "",
      null,
      undefined,
      "candidate:1 1 udp 100 192.168.0.5 typ host",
      "candidate:1 1 udp 100 192.168.0.5 54321 host",
      "candidate:1 1 sctp 100 192.168.0.5 54321 typ host",
      "candidate:1 1 udp 100 192.168.0.5 0 typ host",
      "candidate:1 1 udp 100 192.168.0.5 70000 typ host",
    ]) {
      expect(parseIceCandidate(line), String(line)).toBeNull();
    }
  });
});

describe("resolveCandidate", () => {
  const gathered = [
    { address: "192.168.0.5", port: 54321, protocol: "udp", type: "host" },
    { address: "a1b2c3.local", port: 54322, protocol: "udp", type: "host" },
  ];

  it("uses the address from getStats when the browser provides one", () => {
    const summary = resolveCandidate(
      { type: "host", address: "192.168.0.5", port: 54321, protocol: "udp" },
      [],
    );
    expect(summary).toEqual({ type: "host", address: "192.168.0.5" });
  });

  it("falls back to the exchanged candidate lines when the address is blank", () => {
    const summary = resolveCandidate({ type: "host", address: "", port: 54322, protocol: "udp" }, gathered);
    expect(summary).toEqual({ type: "host", address: "a1b2c3.local" });
  });

  it("prefers a public match so a suspicious pair is never accepted", () => {
    const summary = resolveCandidate({ type: "host", address: null, port: 54321, protocol: "udp" }, [
      ...gathered,
      { address: "203.0.113.7", port: 54321, protocol: "udp", type: "host" },
    ]);
    expect(summary).toEqual({ type: "host", address: "203.0.113.7" });
    expect(isLanCandidate(summary)).toBe(false);
  });

  it("returns no address when nothing matches", () => {
    expect(resolveCandidate({ type: "host", address: "", port: 1, protocol: "udp" }, gathered)).toEqual({
      type: "host",
      address: null,
    });
    expect(resolveCandidate({ type: "host", address: "", port: null, protocol: "udp" }, gathered)).toEqual({
      type: "host",
      address: null,
    });
  });
});

describe("protocol helpers", () => {
  it("generates an eight digit PIN and hex identifiers", () => {
    for (let index = 0; index < 20; index += 1) {
      expect(generatePin()).toMatch(/^\d{8}$/);
    }
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("keeps a transfer well under the chunk limit", () => {
    expect(CHUNK_BYTES).toBe(64 * 1024);
    expect(MAX_FILE_BYTES).toBe(100 * 1024 * 1024);
    expect(MAX_FILE_BYTES % CHUNK_BYTES).toBe(0);
  });

  it("formats byte counts for the UI", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(64 * 1024)).toBe("64 KB");
    expect(formatBytes(100 * 1024 * 1024)).toBe("100 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("sanitises file names and always returns a name", () => {
    expect(safeFilename("notes.txt")).toBe("notes.txt");
    expect(safeFilename("../secret/name.txt")).toBe(".._secret_name.txt");
    expect(safeFilename("a\u0000b<>.txt")).toBe("a_b__.txt");
    expect(safeFilename("   ")).toBe("airshare-file");
    expect(safeFilename("x".repeat(400))).toHaveLength(120);
  });
});
