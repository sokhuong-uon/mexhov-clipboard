# Mexboard Cryptography — Design Note

**Document Version:** 1.0
**Last Updated:** 2026-04-25
**Status:** Design — not yet implemented for Cloud / Mobile. Desktop LAN sync is partially shipped and deviates from this note (see §12).
**Supersedes:** ad-hoc decisions in `src-tauri/src/sync/crypto.rs` (LAN path). That file will be aligned with this note in a follow-up PR.

This is the source of truth for Mexboard's cryptographic design. It complements `SRS.md` (requirements) and governs code in:

- `src-tauri/src/sync/crypto.rs` (desktop LAN + legacy cloud path)
- the forthcoming Cloud Sync module (Cloudflare Worker + DO + D1 + R2)
- the forthcoming Mobile app (React Native)

If code disagrees with this note, **fix the code or change the note before merging**. Silent drift kills zero-knowledge guarantees.

---

## Table of Contents

1. [Goals and Non-Goals](#1-goals-and-non-goals)
2. [Threat Model](#2-threat-model)
3. [Primitives and Libraries](#3-primitives-and-libraries)
4. [Key Hierarchy](#4-key-hierarchy)
5. [Recovery Passphrase Format](#5-recovery-passphrase-format)
6. [First-Device Ceremony](#6-first-device-ceremony)
7. [Additional-Device Enrollment](#7-additional-device-enrollment)
8. [Device Roster and Signing](#8-device-roster-and-signing)
9. [Message Encryption](#9-message-encryption)
10. [Epoch Ratchet (Forward Secrecy)](#10-epoch-ratchet-forward-secrecy)
11. [Revocation](#11-revocation)
12. [LAN Sync Path (Current State and Migration)](#12-lan-sync-path-current-state-and-migration)
13. [Storage of Key Material per Platform](#13-storage-of-key-material-per-platform)
14. [Known Leakage and Mitigations](#14-known-leakage-and-mitigations)
15. [Testing, Audit, and Operational Notes](#15-testing-audit-and-operational-notes)
16. [Pseudocode Reference](#16-pseudocode-reference)

---

## 1. Goals and Non-Goals

### 1.1 Goals

- **End-to-end confidentiality.** Clipboard content is encrypted on-device and decrypted only on recipient devices. The Cloudflare backend sees ciphertext, metadata, and envelopes — never plaintext.
- **Integrity and authenticity.** Every message is authenticated; receivers cryptographically verify sender device identity against a signed roster.
- **Server-forgery resistance.** A malicious or compromised server cannot enroll a fake device and impersonate the user without possession of the recovery secret held by at least one trusted device.
- **Account portability.** Historical ciphertext stays decryptable across device loss as long as the user retains either (a) one trusted device or (b) the recovery passphrase.
- **Key isolation.** Compromise of one device compromises only that device's future outbound messages. Other devices' keys remain safe.
- **Operational simplicity.** The design is boring. No novel cryptographic primitives, no hand-rolled AEAD, no one-off protocols.

### 1.2 Non-Goals (and why)

- **Perfect forward secrecy at per-message granularity.** Mexboard uses an *epoch ratchet* (§10), not a Signal-style Double Ratchet. Clipboard items are short-lived in practice; the implementation cost of a full ratchet does not pay for itself here. We accept a defined forward-secrecy window.
- **Deniability.** Messages are signed/authenticated and bound to device identities. Users who want deniability should not use Mexboard.
- **Metadata privacy from the server.** The server sees timestamps, content types, sender/recipient device IDs, and ciphertext sizes (§14). Reducing these requires padding / onion-routing / Private Information Retrieval tricks that are out of scope.
- **Protection against a compromised device you still trust.** If a device is compromised and the user has not revoked it, all messages sent to or from it are readable by the attacker. This is inherent.
- **"If you lose everything, we can recover it."** We cannot. That is zero knowledge.

---

## 2. Threat Model

### 2.1 Actors

| Actor | Capabilities | Defended? |
|---|---|---|
| **Honest-but-curious server** | Reads all DB rows, R2 objects, request logs, presence state | Yes — sees ciphertext only |
| **Active network attacker** | Intercepts / modifies in-flight traffic | Yes — TLS + E2E envelope AEAD |
| **Compromised Cloudflare account** | Can rewrite D1, inject rows, forge server messages | Yes for data confidentiality; **partially** for enrollment (see §2.3) |
| **Stolen / unlocked device** | Has access to decrypted content and to session keys on-device | Partially — biometric gate, no plaintext backup, revocation |
| **Stolen / locked device** | Has ciphertext at rest only | Yes — DB-at-rest encryption (proposed) + OS keychain for keys |
| **Malicious peer on same account** | Trusted by the roster, can send crafted messages | Limited — framed by signed roster; user can revoke |
| **User who loses everything** | Lost all devices + lost recovery passphrase | **Not defended.** Data is unrecoverable by design. |
| **Casual LAN attacker** | Sniffs Wi-Fi | Yes — LAN sync uses AEAD and a pairing code |

### 2.2 Out of Scope

- Side-channel attacks on the device OS (RAM scraping by privileged malware).
- Users who paste secrets into untrusted applications despite warnings.
- Physical coercion.

### 2.3 Server-Forgery Nuance

A compromised server **cannot** silently add a device because any added device must be signed either by the root identity (requires the recovery secret) or by an already-trusted device (requires user interaction on that device). However, a compromised server **can**:

- Drop, delay, or reorder messages.
- Selectively deliver messages to only a subset of recipients.
- Refuse service.

Clients defend against drop/reorder with **monotonic sequence numbers** (§9.4) and a visible "last synced" indicator.

---

## 3. Primitives and Libraries

All primitives are standard and come from audited libraries. **Do not implement any of these ourselves.**

| Primitive | Choice | Rationale |
|---|---|---|
| **AEAD (payload)** | AES-256-GCM | Widely supported in hardware, FIPS-friendly, well-understood nonce discipline |
| **Key agreement** | X25519 (Curve25519 ECDH) | Misuse-resistant, constant-time, 32-byte keys |
| **Signatures** | Ed25519 | Fast, deterministic, no RNG requirement on sign |
| **KDF from ECDH** | HKDF-SHA-256 | The correct primitive for high-entropy input; RFC 5869 |
| **KDF from passphrase** | Argon2id | Memory-hard, resistant to GPU/ASIC attacks; parameters in §5 |
| **Hash** | SHA-256 (general), BLAKE3 (fingerprints, optional) | SHA-256 is the safe default; BLAKE3 is allowed for fingerprints because speed helps UX |
| **CSPRNG** | Platform — `getrandom`, `SecRandomCopyBytes`, `java.security.SecureRandom` via `react-native-get-random-values` | Never `Math.random`, never `rand::thread_rng()` for key material without a note |

### 3.1 Library Map

| Platform | AEAD + curves + KDF | Notes |
|---|---|---|
| **Rust (desktop)** | `aes-gcm`, `x25519-dalek`, `ed25519-dalek`, `hkdf`, `argon2`, `sha2`, `rand_core` | Already in `Cargo.toml`. Add `ed25519-dalek` + `hkdf`. |
| **React Native** | `react-native-libsodium` (preferred) or `@noble/ciphers` + `@noble/curves` + `@noble/hashes` | Libsodium-based is easier to review; noble is pure-JS and works in Hermes. Pick one and stay consistent. |
| **Cloudflare Worker** | Web Crypto API + `@noble/*` for Ed25519 verification (Web Crypto lacks Ed25519 in some runtimes) | The server **only verifies** signatures on the roster; it never performs symmetric or agreement crypto. |

### 3.2 Forbidden

- CBC-mode anything.
- ECB.
- PKCS#1 v1.5.
- RSA key transport (we don't need it).
- Custom "encryption + MAC" (use AES-GCM, not AES-CTR + HMAC).
- Deterministic nonces.
- Re-using `x25519-dalek::EphemeralSecret` across messages (it's consumed on `diffie_hellman`; we use it correctly per handshake but must not try to cache).

---

## 4. Key Hierarchy

```
Recovery Passphrase  (user-chosen, 12+ chars, or 12-word mnemonic)
        │
        │  Argon2id(passphrase, salt = account_salt, m=64MiB, t=3, p=1)
        ▼
Passphrase-Derived Key (PDK, 32 B)                          ─── never leaves the client
        │
        │  AES-256-GCM decrypt of server-stored blob `root_id_encrypted`
        ▼
Root Identity (Ed25519 keypair; "RID")                       ─── only exists in memory briefly
        │
        │  Signs (account_id, device_pubkey_ed, device_pubkey_x, platform, not_before)
        ▼
Device Roster Entry  ─── published to D1 (signed_by = "root")
        │
        │
Device Identity (per-device, generated on-device)
  ├─ Ed25519 signing key  ─── signs outbound message envelopes
  └─ X25519 key-agreement key  ─── ECDH with other devices' X25519 keys
        │
        │  HKDF(shared, salt = account_id || min(a,b) || max(a,b) || epoch, info = "mexboard/v1/session")
        ▼
Pairwise Session Key (PSK, 32 B, AES-256-GCM)                ─── rotates per epoch (§10)
        │
        │  Random 96-bit nonce per message
        ▼
Message Ciphertext
```

### 4.1 Root Identity Is Decoupled From the Passphrase

A common beginner mistake is to derive the root signing key *directly* from the passphrase. We do **not** do that:

- The **root identity** (Ed25519 keypair) is generated with a CSPRNG during the first-device ceremony.
- It is encrypted with `PDK` (passphrase-derived key) via AES-256-GCM and stored on the server as `root_id_encrypted`.
- The server cannot decrypt it (it never sees the passphrase).
- Passphrase rotation re-derives `PDK` and re-encrypts `root_id_encrypted` — **the root identity itself never changes**, so historical signatures remain valid.

This is exactly analogous to how 1Password / Bitwarden separate "account password → KEK" from "actual data key".

### 4.2 Device Identity Keypairs

Each device generates both:

- An **Ed25519** keypair for signing envelopes (integrity + authenticity).
- An **X25519** keypair for ECDH (key agreement with peers).

Both public halves are entered into the roster. Both private halves are stored in the device's secure key store (§13) and never leave.

### 4.3 Pairwise Session Keys (PSK)

For every pair of devices `(A, B)` on an account, we derive a symmetric key via:

```
shared      = X25519(A.kex_priv, B.kex_pub)                       # or vice versa
psk_epoch_n = HKDF-SHA256(
                IKM  = shared,
                salt = account_id || sort(A.id, B.id) || epoch_n,
                info = "mexboard/v1/session",
                L    = 32
              )
```

- `sort(A.id, B.id)` enforces canonical ordering so both sides derive the same key regardless of who initiates.
- `epoch_n` is a monotonic integer that advances every 24 h or every 1000 messages per direction, whichever comes first (§10).
- The AAD of AES-GCM frames binds `account_id`, sender/recipient device IDs, epoch, `content_type`, `seq`, schema version.

---

## 5. Recovery Passphrase Format

### 5.1 Two Modes

Users pick one at onboarding:

1. **Mnemonic mode (recommended).** 12-word BIP39 phrase generated client-side from 128 bits of entropy. Human-readable, easy to back up on paper.
2. **Free-form mode.** ≥ 12 characters, strength meter requiring ≥ 80 bits effective entropy (per `zxcvbn`). Lets power users bring their own passphrase manager.

Both modes feed Argon2id with the same parameters and salt construction.

### 5.2 Argon2id Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Memory cost (`m`) | 64 MiB | Runs in < 500 ms on a 2020 laptop; too expensive for GPU farms on 128-bit inputs |
| Iterations (`t`) | 3 | Per OWASP 2024 guidance |
| Parallelism (`p`) | 1 | Predictable across platforms, including mobile |
| Output length | 32 B | Fed as `PDK` into AES-256-GCM |
| Salt | 16 B random, generated at sign-up, stored as `accounts.recovery_salt` | Unique per account; not secret |

These parameters are encoded in the server row so a future hardening can be detected and upgraded.

### 5.3 Verifier vs Key

Argon2id produces two things derived the same way but used differently:

- **`PDK`** (key): used locally to AES-GCM-decrypt `root_id_encrypted`.
- **`PDK_verifier`**: the server stores **only** `Argon2id(PDK, salt = verifier_salt, ...)` so it can check a passphrase during certain flows *without* holding `PDK` itself. `verifier_salt` is separate from `recovery_salt`.

A correct passphrase therefore unlocks both: the server confirms "yes, that was right" and the client proceeds to decrypt.

---

## 6. First-Device Ceremony

User signs up via better-auth, then:

```
1. Client generates:
      recovery_salt   = random(16)
      verifier_salt   = random(16)
      root_ed_priv    = Ed25519.generate()    // root identity
      root_ed_pub     = Ed25519.public(root_ed_priv)

2. Client prompts for recovery passphrase. Client computes:
      PDK             = Argon2id(passphrase, recovery_salt)
      PDK_verifier    = Argon2id(PDK,        verifier_salt)
      root_id_nonce   = random(12)
      root_id_ct      = AES-256-GCM_encrypt(key = PDK,
                                            nonce = root_id_nonce,
                                            aad   = "mexboard/v1/root/" || account_id,
                                            pt    = root_ed_priv)

3. Client generates its device keypairs:
      dev_ed_priv     = Ed25519.generate()
      dev_ed_pub      = Ed25519.public(dev_ed_priv)
      dev_x_priv      = X25519.generate()
      dev_x_pub       = X25519.public(dev_x_priv)

4. Client signs the device roster entry with root_ed_priv:
      msg = canonical({
              account_id, device_id, platform,
              ed_pub = dev_ed_pub, kex_pub = dev_x_pub,
              signed_by = "root",
              not_before = now_iso8601()
            })
      sig = Ed25519.sign(root_ed_priv, msg)

5. Client sends to server:
      - root_ed_pub
      - recovery_salt, verifier_salt
      - PDK_verifier
      - root_id_ct, root_id_nonce
      - device entry + signature (step 4)

6. Client **wipes** root_ed_priv and PDK from memory.
   Device keeps dev_ed_priv + dev_x_priv in the OS key store.

7. Client displays the recovery phrase (or acknowledges the free-form passphrase) and requires
   the user to confirm they have saved it before continuing.
```

After step 7 the server has enough to validate roster signatures and the client has its own device keys.

### 6.1 Critical UX

- Do not proceed past step 7 without the user typing back (or confirming) the phrase.
- Offer a printable recovery sheet (PDF with QR + mnemonic). This is worth building even if it feels old-fashioned.
- Warn explicitly: **"If you lose your password and your recovery passphrase and all your devices, your data cannot be recovered. Not even by us."**

---

## 7. Additional-Device Enrollment

Two paths — **approval** (preferred) and **recovery** (fallback).

### 7.1 Approval Path

The user signs in on the new device. The new device generates its keypairs locally and requests enrollment:

```
NewDevice: generate dev_ed, dev_x keypairs
NewDevice: POST /account/roster/request
           { candidate: { account_id, device_id, platform, ed_pub, kex_pub } }
Server:    broadcasts a "roster_request" DO frame to all online trusted devices

TrustedDevice: UI shows "Approve [platform] device? fp = XXXX-XXXX"
TrustedDevice: user visually confirms the 8-char fingerprint matches (SAS pattern)
TrustedDevice: sig = Ed25519.sign(own_dev_ed_priv, canonical(candidate + "signed_by=" + own_id + "not_before=..."))
TrustedDevice: POST /account/roster/sign { device_id, signature }

Server:    appends signed entry to roster in D1, bumps roster_version, broadcasts roster update
NewDevice: verifies its own entry is in the roster, begins normal operation
```

- The fingerprint is `BASE32(SHA-256(ed_pub || kex_pub))[:8]`, formatted `XXXX-XXXX` for legibility.
- Approval is "short authentication string" style — the user's eyeballs are the anti-MITM device.
- An approved device is signed by *another device*, not by root. That is fine: the verifier follows the signature chain back to either `root_ed_pub` or a root-signed device.

### 7.2 Recovery Path

When no trusted device is available (phone stolen, new laptop, etc.):

```
NewDevice: sign in via better-auth
NewDevice: prompt for recovery passphrase
NewDevice: fetch accounts row → recovery_salt, verifier_salt, root_id_ct, root_id_nonce
NewDevice: PDK       = Argon2id(passphrase, recovery_salt)
NewDevice: verifier  = Argon2id(PDK, verifier_salt)
NewDevice: POST /auth/recovery-check { verifier }
Server:    compares to stored PDK_verifier with constant-time eq → ok / fail
NewDevice: on ok, decrypt root_id_ct with PDK → root_ed_priv
NewDevice: self-sign its own roster entry as "signed_by = root"
NewDevice: wipe root_ed_priv and PDK from memory
NewDevice: proceed
```

- The server gates by verifier to rate-limit passphrase guessing; the real defense is Argon2id, not the server.
- After recovery, root private key must be wiped within the request cycle. **Do not persist it to disk.**

### 7.3 Rate Limiting Enrollment

- Approval requests: ≤ 3 pending simultaneously per account; expire in 5 minutes.
- Recovery verifier attempts: 10 per hour per account; tarpit on repeated failure.

---

## 8. Device Roster and Signing

### 8.1 Roster Entry

```ts
type RosterEntry = {
  account_id: string;
  device_id:  string;
  platform:   "desktop-linux" | "desktop-mac" | "desktop-windows" | "ios" | "android";
  ed_pub:     Base64; // Ed25519 public key
  kex_pub:    Base64; // X25519 public key
  signed_by:  string | "root";  // device_id of signer, or "root"
  not_before: string; // ISO-8601
  revoked_at: string | null;
  signature:  Base64; // Ed25519 signature over canonical(above fields minus signature)
};
```

### 8.2 Canonicalization

Before signing or verifying, fields are serialized as **canonical JSON** (RFC 8785):

- Sorted keys.
- No whitespace.
- UTF-8 NFC for strings.
- Integers without trailing `.0`.

This avoids signature mismatches from benign formatting differences across platforms.

### 8.3 Verification

On every inbound envelope, the receiving client MUST:

1. Look up `from_device` in the local roster cache. If missing, refresh from server.
2. Verify the roster entry's signature chains to `root_ed_pub` (or to another roster entry that does).
3. Check `revoked_at IS NULL`.
4. Verify the envelope's Ed25519 signature against `roster[from_device].ed_pub`.
5. Only then attempt decryption.

If any check fails, drop the message and surface a security warning in the UI (`"Received a message from an unverified device. Ignored."`).

### 8.4 Roster Versioning

- `roster_version` is a monotonic integer maintained by the DO.
- Clients cache the roster and a version; on every socket reconnect they fetch incrementally (`?since=<version>`).
- Any `add / revoke / rename` bumps the version.

---

## 9. Message Encryption

### 9.1 Envelope

```ts
type Envelope = {
  v:            1;                // schema version
  type:         "item" | "delete" | "sub" | "presence" | "ack" | "error";
  from:         string;           // device_id
  to:           string | "broadcast";
  seq:          number;           // monotonic per sender
  content_type: "text" | "image";
  size:         number;           // ciphertext length
  nonce:        Base64;           // 12 B
  ct:           Base64;           // inline ciphertext, OR
  r2_key?:      string;           // when size > 64 KB
  sig:          Base64;           // Ed25519 sig over canonical(all other fields + "signed_by=from")
};
```

### 9.2 Encryption

```
plaintext   = zstd_compress(json_serialize(content))     // content is { text } or { base64Data, width, height }
psk         = derive_psk(from, to, epoch)                // §4.3
nonce       = random(12)
aad         = canonical({
                v, type, from, to, seq, content_type, size: ciphertext_len_placeholder, epoch
              })
ct          = AES-256-GCM_encrypt(key=psk, nonce=nonce, aad=aad, pt=plaintext)
```

- `aad` binds metadata so an attacker cannot swap `to`, `seq`, `content_type`, or `epoch` without breaking authentication.
- `size` in the AAD uses the final ciphertext length; implementations compute it twice (placeholder → real) or use the plaintext length and document that.
- For R2-stored blobs, the same AEAD scheme applies; the `r2_key` is included in the envelope AAD instead of `ct`.

### 9.3 Decryption

1. Verify envelope signature (§8.3).
2. Look up / derive `psk` for `(from, self, epoch)`.
3. `pt = AES-256-GCM_decrypt(psk, nonce, aad, ct)`.
4. `zstd_decompress(pt)` → parse JSON → application layer.
5. Drop if any step fails; never return a partial plaintext.

### 9.4 Replay and Reorder Protection

- Clients track `last_seen_seq[from_device]`. Envelopes with `seq ≤ last_seen_seq` are rejected as replays.
- The DO also keeps `last_seq` per (account, from_device) and refuses to route stale `seq`.
- Clients surface gaps (`expected 42, got 44 → possible drop`) as a subtle UI hint, not a modal.

### 9.5 Nonce Discipline

- **Never reuse a nonce under the same key.** AES-GCM collapses catastrophically on nonce reuse.
- We use 12-byte CSPRNG nonces. Birthday bound: ≈ 2^48 messages per key before probability of collision exceeds 2⁻³². Epoch rotation (§10) keeps us far below this.
- Reject zero-nonce on receive as a belt-and-braces check.

---

## 10. Epoch Ratchet (Forward Secrecy)

Mexboard provides **bounded forward secrecy** via epoch-keyed sessions, not per-message ratcheting.

### 10.1 Epoch Definition

An `epoch` is an integer. Epoch `n+1` begins when **any** of the following fires for a pair `(A, B)`:

- ≥ 24 hours have elapsed since `epoch n` started.
- ≥ 1000 messages have been sent in either direction under `epoch n`.
- Either side's device identity X25519 key has rotated (§10.2).
- User explicitly triggers "Rotate keys" in Settings → Account.

The first side to hit the threshold computes the new PSK and includes an `epoch = n+1` hint in its next envelope; the other side recomputes on receipt. The HKDF `salt` includes the epoch number, so there is no ambiguity.

### 10.2 X25519 Identity Rotation

Device X25519 keys (not Ed25519 identity) rotate every 30 days:

- New X25519 keypair generated.
- Signed by the device's Ed25519 key.
- Published as a roster update with bumped `kex_pub_generation`.
- Peers re-derive PSKs using the new public key, starting at `epoch 0` for the new generation.
- Old X25519 private key is wiped after a 1 h grace period so in-flight messages finish decrypting.

### 10.3 Why Not a Full Double Ratchet?

Clipboard content is usually short-lived and the attack window for lost forward secrecy is small. Running a Double Ratchet would:

- Add ≈ 2 KB of state per peer.
- Force ordering requirements that conflict with the DO's fan-out-and-mailbox model.
- Complicate mobile battery profiles (more asymmetric ops).

The 24 h / 1000-message epoch is a pragmatic middle ground. If demand arises, we can upgrade to Double Ratchet under a new wire `v`.

---

## 11. Revocation

### 11.1 What Revocation Achieves

When a user revokes a device, they want:

- The revoked device cannot send **new** messages that other devices will accept.
- The revoked device cannot receive **new** messages.
- The revoked device's historical access to past plaintext is **not** retroactively erased (we cannot take a message back out of a phone that already decrypted it).

### 11.2 Protocol

```
TrustedDevice: POST /account/devices/:id/revoke
Server:        sets roster.revoked_at = now, bumps roster_version
Server:        broadcasts roster update to all sockets; disconnects revoked device's socket
Server:        invalidates better-auth sessions for that device
Clients:       on receiving updated roster, drop PSK cache for that device
Clients:       reject any future envelopes from that device (even replays with old seq)
Revoked dev:   on next network request, receives 401; on next local unlock, logs out
```

### 11.3 Key Wipe on the Revoked Device

Revocation from *other* devices cannot forcibly wipe keys from the revoked one (it might be offline, or the OS might not support remote wipe). We document this limitation and recommend:

- Changing the account password (better-auth) so re-auth fails.
- Using OS-level remote wipe (Find My iPhone, Android Device Manager) for stolen hardware.

### 11.4 Partial Compromise Recovery

If only one device is compromised but the account overall is not:

- Revoke that device.
- Optionally rotate all device X25519 keys (§10.2) early so the compromised device's captured PSKs become useless for future messages.
- Do **not** need to rotate the recovery passphrase or root identity.

If the root identity might be compromised (recovery phrase leaked):

- Rotate recovery passphrase.
- Generate a **new root identity**.
- Sign every existing device with the new root (the user confirms each on a trusted device, using SAS codes).
- Retire the old root. Historical signatures still verify against the old root public key, which we keep in D1 with an `retired_at` marker.

---

## 12. LAN Sync Path (Current State and Migration)

The LAN sync module (`src-tauri/src/sync/crypto.rs`) predates this note and deviates from it in three ways:

| Issue | Current Behavior | Target Behavior |
|---|---|---|
| KDF from ECDH | `Argon2id(shared_secret, static_salt)` | `HKDF-SHA256(shared_secret, salt = pairing_code || random_salt, info = "mexboard/v1/lan")` |
| Salt | Static byte string (`b"omg-clipboard-sync-static-salt"`) | Per-handshake random salt exchanged during handshake |
| Signature | None — only AEAD | Add Ed25519 signatures using device identity keys once account layer lands |

### 12.1 Why This Deviation Exists

Argon2id on the ECDH shared secret is technically not wrong — it produces a uniformly random key — but it is the wrong tool: Argon2id is meant to slow down attackers guessing low-entropy inputs (passwords). ECDH output is already 256 bits of uniformly random bytes; HKDF is the correct extractor.

### 12.2 Migration Plan

1. Add `HKDF` derivation alongside current Argon2id.
2. Advertise a new `proto=2` handshake; fall back to `proto=1` for older peers.
3. After two minor releases, drop `proto=1`.
4. Replace static salt with random salt embedded in the `Auth` handshake message.
5. Once account layer ships, reuse device Ed25519 keys for LAN session signatures. Pairing code remains as the short-term trust bootstrap when no account exists.

### 12.3 Interim Safety

The static salt bug is **not exploitable** for realistic attackers — it does not weaken the confidentiality of a given session. It only removes cross-session independence; an attacker who recorded many LAN sessions *and* broke ECDH could not use one session's break to speed up another. Since breaking ECDH is outside our threat model, the practical risk is near zero. We still fix it for hygiene.

---

## 13. Storage of Key Material per Platform

### 13.1 Desktop

| Material | Location | Notes |
|---|---|---|
| `dev_ed_priv`, `dev_x_priv` | OS keyring via a helper (`keyring` crate on Rust) | Windows Credential Manager / macOS Keychain / Secret Service |
| Session keys (in memory) | `zeroize`-wiped `Vec<u8>` | Never serialized |
| `root_ed_priv` | **Never persisted.** Only in memory during decryption / signing ceremony | Wipe on function return |
| Recovery phrase | **Never persisted.** User is responsible | Shown once |

On Linux without a Secret Service daemon, fall back to a file encrypted with a hardware-bound key (TPM where available, otherwise a best-effort with user confirmation).

### 13.2 Mobile

| Material | Location | Notes |
|---|---|---|
| `dev_ed_priv`, `dev_x_priv` | iOS Keychain (`kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`, `kSecAttrAccessGroup` with app-group sharing to Share Extension) / Android Keystore with `setUserAuthenticationRequired(true)` + biometric | Never extractable |
| Session keys (in memory) | JS `ArrayBuffer` (Hermes) | Zero on scope exit; consider `sodium_memzero` where available |
| `root_ed_priv` | In-memory only during ceremony | Same as desktop |

### 13.3 Backend

The Cloudflare side stores **no** private key material for users. What it does store:

- `root_ed_pub` per account.
- `root_id_encrypted` (opaque to the server).
- Argon2id `verifier` (one-way).
- Per-device `ed_pub`, `kex_pub`.

---

## 14. Known Leakage and Mitigations

| Leak | What the server sees | Mitigation |
|---|---|---|
| Timing | When messages are sent | None worth the cost (onion routing is out of scope) |
| Content type | `content_type` field | Needed for subscription filtering; acceptable |
| Ciphertext size | `size` field and R2 object length | Padding is costly; consider bucket-rounding (to 1 KB / 16 KB / 256 KB / 4 MB) in a future revision |
| Device fan-out | Which devices a message targets | Needed for fan-out; acceptable |
| Language / topic via size histogram | Possible statistical inference | Bucket-rounding helps; full fix requires constant-size padding |
| `source_app` | Not synced to cloud (intentional) | — |
| `note` text | Encrypted end-to-end in the `payload` | — |
| `detected_color`, `detected_date` | Not synced (detection re-runs on recipient) | — |

We document these plainly in `PRIVACY.md` so users know what a subpoena could reveal.

---

## 15. Testing, Audit, and Operational Notes

### 15.1 Mandatory Tests

- **Round-trip:** encrypt + decrypt for text (small / large), image (PNG / large).
- **AAD tamper:** flipping any AAD field fails decryption.
- **Nonce reuse refusal:** constructing two messages with the same nonce under the same key is never possible through the public API (property-based test with fuzzing).
- **Signature tamper:** flipping any signed field is rejected.
- **Replay:** resending an envelope with a seen `seq` is rejected.
- **Roster chain:** verifier accepts only chains terminating at `root_ed_pub` (or a retired-but-known root).
- **Epoch transition:** messages sent across an epoch boundary decrypt on both sides without user-visible interruption.
- **Recovery flow:** creating an account, wiping local state, and recovering via passphrase restores the device roster and decrypts historical items.
- **Revocation:** revoked device cannot decrypt future messages even if it still has old PSKs (because new epochs use rotated X25519 keys).
- **Mobile key-store:** uninstalling the app wipes keys; reinstall requires re-enrollment.

### 15.2 Fuzzing

- Envelope parser: `cargo-fuzz` / `fast-check` against malformed, oversize, and truncated inputs.
- Signature verifier: reject malformed or high-S Ed25519 signatures.
- Argon2id parameters: never trust server-provided parameters without a client-side lower bound.

### 15.3 External Audit

Before Cloud Sync ships to general availability, commission an external review:

- One cryptographic design review (Trail of Bits, NCC Group, or equivalent).
- One implementation review covering the Cloudflare handlers and mobile key storage.
- Publish the summary.

### 15.4 Operational Do-Nots

- **Never** log ciphertext, nonces, or raw envelope bytes. Log shapes only (`{ type, size, from: short_id, to: short_id }`).
- **Never** accept a parameter override from the server for Argon2id that makes parameters *weaker* than the client's floor.
- **Never** cache decrypted plaintext to disk. Plaintext may only exist in memory and in the app's encrypted local DB.
- **Never** implement "password reset" that would let the server hand out a new `root_id_encrypted` — that would break zero knowledge and mean users have to re-enroll.

---

## 16. Pseudocode Reference

### 16.1 PSK Derivation

```ts
function derive_psk(
  self: Device,
  peer: Device,
  epoch: number,
  account_id: string,
): Uint8Array {
  const shared = x25519(self.kex_priv, peer.kex_pub);     // 32 B
  const [a, b] = [self.id, peer.id].sort();               // canonical ordering
  const salt   = concat(
    utf8(account_id),
    utf8(a), utf8(b),
    u64be(epoch),
  );
  return hkdfSha256({
    ikm:  shared,
    salt,
    info: utf8("mexboard/v1/session"),
    length: 32,
  });
}
```

### 16.2 Encrypt

```ts
function encrypt_item(
  self: Device,
  peer: Device,
  account_id: string,
  epoch: number,
  seq: number,
  content: ClipboardPayload,
): Envelope {
  const pt    = zstd(json(content));
  const psk   = derive_psk(self, peer, epoch, account_id);
  const nonce = randomBytes(12);
  const metaForAad = {
    v: 1, type: "item",
    from: self.id, to: peer.id,
    seq, content_type: content.type,
    epoch,
  };
  const aad = canonicalJson(metaForAad);
  const ct  = aesGcm256Encrypt(psk, nonce, aad, pt);

  const env: Envelope = {
    ...metaForAad,
    size: ct.length,
    nonce: b64(nonce),
    ct:    ct.length <= 64 * 1024 ? b64(ct) : undefined,
    r2_key: ct.length  > 64 * 1024 ? uploadToR2(account_id, ct) : undefined,
    sig:   "",
  };
  env.sig = b64(ed25519_sign(self.ed_priv, canonicalJson({ ...env, sig: "" })));
  return env;
}
```

### 16.3 Decrypt

```ts
function decrypt_item(self: Device, env: Envelope, roster: Roster): ClipboardPayload {
  assert_roster_verified(roster, env.from, rootEdPub);
  assert_signature_ok(roster[env.from].ed_pub, env);
  assert_seq_not_replayed(self, env.from, env.seq);

  const ct = env.ct
    ? b64decode(env.ct)
    : fetchFromR2(env.r2_key!);

  const psk = derive_psk(self, roster[env.from], env.epoch, env.account_id);
  const aad = canonicalJson(omit(env, ["size", "nonce", "ct", "r2_key", "sig"]));
  const pt  = aesGcm256Decrypt(psk, b64decode(env.nonce), aad, ct);
  return json_parse(zstd_decompress(pt));
}
```

---

## Appendix A — Design Decisions Worth Re-Visiting

- **`zstd` before AEAD.** Compression before encryption is safe here because payloads are not attacker-chosen in a way that leaks via length (CRIME-style attacks require adaptive injection). Revisit if that changes.
- **Canonical JSON.** Simpler and less bug-prone than CBOR for a small envelope. If we ever go binary, switch to CBOR with deterministic encoding (RFC 8949 §4.2).
- **Epoch boundaries.** 24 h / 1000 messages is a guess. Tune with telemetry once we have deployment data.
- **No deniability.** Explicitly accepted. If the product ever pivots toward secure messaging, this is the first thing to reconsider.
- **Server-computed `ts`.** Clients trust the server's timestamp for UI "last synced at" only, never for security decisions. Security decisions use client-computed monotonic `seq` + epoch.

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **AAD** | Additional Authenticated Data — AEAD input that is authenticated but not encrypted. |
| **AEAD** | Authenticated Encryption with Associated Data. AES-GCM in our case. |
| **ECDH** | Elliptic-Curve Diffie-Hellman. |
| **HKDF** | HMAC-based Key Derivation Function (RFC 5869). |
| **PSK** | Pairwise Session Key — the per-pair, per-epoch AES-256 key. |
| **PDK** | Passphrase-Derived Key — the 32 B output of Argon2id over the recovery passphrase. |
| **Roster** | The account's signed list of authorized devices. |
| **SAS** | Short Authentication String — the 8-char fingerprint users compare to prevent MITM during device approval. |
