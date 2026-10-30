#!/usr/bin/env node
// Generates the ADMIN_PASSWORD_HASH secret for the Worker.
// Usage: node scripts/hash-password.mjs "your long admin password"
// The password is never written to disk; only the hash is printed.

import { webcrypto as crypto } from "node:crypto";

// Cloudflare Workers rejects PBKDF2 iteration counts above 100,000, so 100,000
// is the strongest setting that still verifies inside the Worker.
const ITERATIONS = 100_000;

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "<password>"');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const encoder = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));

const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
  "deriveBits",
]);
const bits = new Uint8Array(
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  ),
);

const base64url = (bytes) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

console.log(`pbkdf2_sha256$${ITERATIONS}$${base64url(salt)}$${base64url(bits)}`);
