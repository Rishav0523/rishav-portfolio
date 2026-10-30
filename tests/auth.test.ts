import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSession, sha256Hex, verifyPassword, verifySession } from "../worker/auth";

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeHash(password: string, iterations = 210_000): Promise<string> {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await webcrypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key,
      256,
    ),
  );
  return `pbkdf2_sha256$${iterations}$${base64url(salt)}$${base64url(bits)}`;
}

describe("verifyPassword", () => {
  it("accepts the matching password", async () => {
    const stored = await makeHash("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
  });

  it("rejects a different password", async () => {
    const stored = await makeHash("correct horse battery staple");
    await expect(verifyPassword("Correct horse battery staple", stored)).resolves.toBe(false);
  });

  it("rejects malformed or weak hashes", async () => {
    const valid = await makeHash("correct horse battery staple");
    const parts = valid.split("$");
    await expect(verifyPassword("x", "plaintext")).resolves.toBe(false);
    await expect(verifyPassword("x", `bcrypt$10$${parts[2]}$${parts[3]}`)).resolves.toBe(false);
    await expect(verifyPassword("x", `pbkdf2_sha256$1000$${parts[2]}$${parts[3]}`)).resolves.toBe(false);
    await expect(verifyPassword("x", `pbkdf2_sha256$210000$${parts[2]}$***`)).resolves.toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips a signed session", async () => {
    const token = await createSession("a-very-long-test-secret", 3600);
    const payload = await verifySession(token, "a-very-long-test-secret");
    expect(payload?.sub).toBe("admin");
    expect(payload?.exp).toBeGreaterThan(payload?.iat ?? 0);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSession("secret-one", 3600);
    await expect(verifySession(token, "secret-two")).resolves.toBeNull();
  });

  it("rejects tampered payloads", async () => {
    const token = await createSession("shared-secret", 3600);
    const [payload, signature] = token.split(".");
    const tampered = `${payload.startsWith("a") ? "b" : "a"}${payload.slice(1)}.${signature}`;
    await expect(verifySession(tampered, "shared-secret")).resolves.toBeNull();
  });

  it("rejects expired sessions and garbage", async () => {
    const token = await createSession("shared-secret", -60);
    await expect(verifySession(token, "shared-secret")).resolves.toBeNull();
    await expect(verifySession(undefined, "shared-secret")).resolves.toBeNull();
    await expect(verifySession("", "shared-secret")).resolves.toBeNull();
  });
});

describe("sha256Hex", () => {
  it("hashes deterministically", async () => {
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
