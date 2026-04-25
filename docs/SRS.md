# Software Requirements Specification (SRS)
## Mexboard — Local-First Cross-Device Clipboard Manager

**Document Version:** 2.1
**Last Updated:** 2026-04-25
**Application Version:** 1.15.0 (desktop), pre-1.0 (mobile)
**Status:** Active — source-verified for desktop; design-level for mobile + cloud

---

## Preamble — How This Document Is Used

Every requirement carries a **Status** tag so the SRS doubles as a reality check:

- `[Shipped]` — implemented in `1.15.0`, verified in source
- `[Partial]` — partially implemented; gap identified
- `[Planned]` — approved for a future release
- `[Proposed]` — new requirement added in v2.0 to close UX, a11y, security, or reliability gaps

Requirements without a concrete acceptance test are not merged. "Nice" is not an acceptance criterion.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Data Management](#6-data-management)
7. [User Interfaces](#7-user-interfaces)
8. [Integration Points](#8-integration-points)
9. [Quality Attributes](#9-quality-attributes)
10. [Testing Requirements](#10-testing-requirements)
11. [Appendices](#appendices)

---

## 1. Introduction

### 1.1 Purpose
Specify the behavior, quality attributes, and interfaces of **Mexboard**, a desktop clipboard manager that prioritizes local-first storage and optional peer-to-peer synchronization.

### 1.2 Scope
Mexboard is a clipboard ecosystem with three client surfaces and one optional cloud:

- **Desktop app** (Tauri, shipped) — automatic capture, storage, and recall of text and image clipboard history with content-aware enrichment, LAN sync, and the core quick-paste UX.
- **Mobile companion** (React Native, planned) — cross-platform iOS + Android app that can send and receive clipboard items, viewed via the same encrypted account.
- **Cloud backend** (Cloudflare Workers + Hono + better-auth + Durable Objects + D1 + R2, planned) — optional account layer that enables account-bound cloud sync, offline mailbox, and mobile ↔ desktop relay. **Payloads remain end-to-end encrypted; the server never sees plaintext.**
- **Insertable palettes** — GIFs (Klipy) and Unicode symbols.

Explicitly out of scope for this revision:
- File/binary clipboard payloads beyond text and image (file paths are detected; their MIME type is displayed but the file bytes are not synced).
- Arbitrary cloud storage providers (Google Drive / Dropbox / S3). Cloud sync uses the Mexboard Cloudflare backend.
- Server-side plaintext search (impossible by design — content is E2E-encrypted).

### 1.3 Intended Audience
Engineering, QA, security reviewers, documentation maintainers, and external contributors.

### 1.4 Product Overview

**Desktop (shipped):**
- Tauri v2.10 shell.
- Frontend: React 19 + TypeScript (strict), Vite 7, Tailwind v4, Base UI / shadcn primitives, TanStack Query / Virtual / Hotkeys / Pacer, Zustand, Motion.
- Backend (Rust): `arboard` (clipboard I/O), `rusqlite` via `drizzle-rs` ORM, `tokio` + `tokio-tungstenite` (WebSocket), `mdns-sd` (discovery), `aes-gcm` + `x25519-dalek` + `argon2` (E2E crypto), `enigo` (paste synthesis), `secretscan`, `image` + `png`, `scraper` + `reqwest`.
- Local DB: SQLite + WAL at `$APP_DATA_DIR/clipboard.db`.
- IPC typing: `tauri-specta` generates `src/bindings.ts` from Rust commands.
- Targets: Windows 10+, Linux (X11 + Wayland, Cosmic `data-control` supported), macOS (Intel + Apple Silicon).

**Mobile (planned):**
- React Native (New Architecture), TypeScript, Expo or bare workflow (decision captured in `docs/MOBILE-ARCHITECTURE.md`).
- Targets: iOS 16+, Android 10+ (API 29).
- Local store: SQLite via `op-sqlite` or `expo-sqlite`, mirroring the desktop schema.
- Secure key storage: iOS Keychain, Android Keystore (biometric-gated).
- Clipboard interop: iOS `UIPasteboard`; Android `ClipboardManager` + Share Target; both include a "Share to Mexboard" system extension.
- Push: APNs (iOS) + FCM (Android), used only for "new item available" signals — payload is empty or opaque.

**Cloud backend (planned — Cloudflare):**
- Workers + **Hono** router.
- **better-auth** for email/password, OAuth (GitHub, Google), magic links, and session management.
- **Durable Objects** for per-account presence + real-time WebSocket routing between online devices (one DO per account; messages fan out to currently-connected device sockets).
- **D1** for relational state: users, devices, sessions, message metadata, subscriptions, quotas, audit log. Small text clipboard payloads (≤ 64 KB encrypted) live here too.
- **R2** for encrypted blobs (images and oversize text > 64 KB). Bucket is private; access is mediated by Workers that validate the better-auth session.
- **Queues** (Cloudflare Queues) for async jobs: orphan sweeping, retention purges, push-notification fan-out.
- **Zero-knowledge:** all clipboard content, notes, source app names, detected metadata strings, and filenames are encrypted on-device before leaving the client.

---

## 2. Overall Description

### 2.1 Product Perspective
Mexboard is a single-instance background app (`tauri-plugin-single-instance`) with:
- A hidden-by-default main window summoned by a **global shortcut** (see §3.5).
- A **system tray** with `Show Window / Hide Window / Quit`.
- A monitor loop that polls the system clipboard every 500 ms and broadcasts diffs.

### 2.2 Product Features (High-Level)

#### 2.2.1 Core Clipboard Management `[Shipped]`
- Automatic capture of text and image clipboard content.
- Persistent, ordered history with favorites/pinning, notes, and drag-and-drop reordering via fractional indexing.
- Quick-paste via `Ctrl/Cmd+1..9`, keyboard navigation (arrow keys + configurable Vim-style `J/K`, jump-top/bottom), and modifier-hold reveal of numeric quick-paste hints.
- Duplicate suppression via SHA-256 `content_hash`.
- Soft-delete → trash lifecycle `[Planned]` (current behavior is immediate deletion).

#### 2.2.2 Content-Aware Enrichment `[Shipped]`
- Detects CSS colors, ISO-8601 / common date strings, URLs (link preview), `.env` key-value pairs (splittable into per-key entries), file-path MIME types, and secrets (pattern- and entropy-based).

#### 2.2.3 Cross-Device Synchronization
- **LAN mode `[Shipped]`** — server / client with 6-digit pairing code, X25519 ECDH handshake, Argon2id-derived AES-256-GCM session key, over WebSocket.
- **Cloud mode `[Planned]`** — account-bound sync through Mexboard's Cloudflare backend. Each signed-in device maintains a WebSocket to its account's Durable Object; the DO fans out encrypted frames to online devices and enqueues to D1/R2 for offline ones. The DO only moves ciphertext — it cannot decrypt.
- **Mobile bridge `[Planned]`** — the mobile app participates as a first-class device: it can both send and receive clipboard items from any other device on the account, subject to per-device content-type subscriptions (§3.10).
- **mDNS discovery `[Shipped]`** — live add/remove events. Generic DNS-SD service type with a Mexboard app-filter tag so only Mexboard peers appear (§REQ-LAN-008).
- **Echo suppression `[Shipped]`** — via last-remote content hash.

#### 2.2.4 Insertable Content Palettes `[Shipped]`
- **GIF tab** powered by the Klipy API.
- **Symbols tab** for Unicode glyphs.
- Paste target uses `enigo` (with Wayland + x11rb features) and a caret-positioned window so the overlay does not obscure the insertion point.

#### 2.2.5 User Experience
- Light / Dark / System themes (`next-themes`) — `[Shipped]`.
- Virtualized list for large histories (`@tanstack/react-virtual`) — `[Shipped]`.
- Full WCAG 2.1 AA keyboard and screen-reader support — `[Proposed, see §4.4]`.
- Multi-language UI — `[Proposed]` (currently English-only, no i18n framework).

#### 2.2.6 Mobile Companion `[Planned]`
- Clipboard history view mirroring the desktop, scoped per-device.
- System share-sheet target ("Share to Mexboard") for sending any text or image into sync without opening the app.
- Biometric/PIN unlock gate before the app shows content.
- Offline mailbox — cloud-enqueued items are delivered when the app foregrounds or on a push wake.

#### 2.2.7 Account (Optional) `[Planned]`
- **Local-first by default.** Users can use the desktop app without signing in. An account is required only for Cloud Sync and mobile bridging.
- **better-auth** provides email + password, social login (GitHub, Google), and magic links.
- **Recovery phrase:** because the account password does *not* derive the E2E key, users set a separate recovery passphrase at first device pair (§REQ-AUTH-004). Losing both means encrypted data is permanently unreadable — this is the zero-knowledge cost and must be communicated clearly.

### 2.3 User Classes and Characteristics

| User Class | Characteristics | Primary Needs |
|---|---|---|
| **Individual Power User** | Solo user, heavy copy/paste workflows | Fast recall, keyboard-driven, minimal chrome |
| **Developer** | Handles secrets, tokens, env files, code | Secret masking, `.env` split, file-path hints, color detection |
| **Multi-Device User** | Works across laptop + desktop on same LAN | Reliable LAN sync, offline tolerance, device-pairing UX |
| **Mobile-First User** | Primarily on phone, occasionally copies to/from desktop | Push receipt of new items, biometric gate, low-battery friendly |
| **Privacy-Conscious** | Avoids cloud services | Local-only default, ability to fully disable sync and monitoring |
| **Cloud Sync User** | Signs in, uses multiple devices including phone | Account management, device list, clear storage/quota visibility |
| **Assistive-Tech User** | Relies on screen readers, keyboard-only, high contrast | WCAG 2.1 AA conformance, visible focus, reduced motion, accessible names |

### 2.4 Operating Environment

**Desktop:**
- **Windows:** Windows 10 build 17763+.
- **Linux:** X11 and Wayland. Wayland uses `wl-clipboard-rs`; Cosmic `data-control` detected at runtime and surfaced in Settings.
- **macOS:** Apple Silicon and Intel. Core Foundation bindings for clipboard.

**Mobile:**
- **iOS:** 16+ (for `UIPasteboard` detection patterns and share-extension API maturity).
- **Android:** 10+ (API 29; required for scoped storage and background clipboard API restrictions).

**Network:**
- mDNS reachable LAN (UDP 5353) for LAN sync.
- Outbound `wss://` to `*.mexboard.app` (or the configured cloud host) for Cloud Sync.
- The app works fully offline except for: Cloud Sync, mobile push delivery, GIF search, and link previews.

**Storage:**
- Desktop: SQLite + WAL at `app_data_dir()` (`clipboard.db`).
- Mobile: SQLite via Expo/op-sqlite in the app sandbox.
- Cloud: D1 for metadata + small payloads, R2 for image blobs and oversize text.

### 2.5 Assumptions and Dependencies
- User has permission to register a global hotkey (desktop environments or other apps may preempt it; registration failure is logged and surfaced with remediation text).
- On Linux, clipboard images require a display server compositor that supports persistent selections (or a running clipboard manager on Wayland).
- Internet access is **not required** for any feature except the optional Cloud relay and GIF tab.

### 2.6 Constraints
- Tauri window is frameless (`decorations: false`), `skipTaskbar: true`, hidden on blur and Escape. Any future system-dialog UX must account for these.
- Monitor cadence is a 500 ms tick (latency ↔ CPU tradeoff).
- `src-tauri/tauri.conf.json` sets `security.csp: null` today — see §4.3 (**proposed hardening**).

---

## 3. Functional Requirements

### 3.1 Clipboard Capture & Management (REQ-CM)

#### REQ-CM-001: Automatic Clipboard Monitoring `[Shipped]`
- The monitor polls every 500 ms; image channel is checked before text.
- Monitoring can be toggled from Settings → General → Monitoring (`set_monitoring`).
- When disabled, no reads, emits, or sync broadcasts occur.
- **Test:** toggle monitoring off → copy text → confirm no `clipboard-changed` event fired, no DB insert.

#### REQ-CM-002: Clipboard Entry Persistence `[Shipped]`
- Stored fields (authoritative list, per `clipboard_items`): `id`, `content_type` ∈ {`text`,`image`}, `text_content`, `image_data` (base64 PNG), `image_width/height`, `char_count`, `line_count`, `source_app`, `is_favorite`, `sort_order` (fractional index), `copy_count`, `kv_key`, `detected_date`, `detected_color`, `is_env`, `is_secret`, `note`, `content_hash`, `file_mime`, `created_at`, `updated_at`.
- Deduplication via SHA-256 `content_hash` with index `idx_clipboard_items_content_hash`.
- `source_app` column exists but is not populated in 1.15 — `[Partial — see REQ-CM-002b]`.

#### REQ-CM-002b `[Proposed]`: Populate `source_app`
- On capture, record the focused application's bundle/id where OS APIs permit.
- Gracefully degrade to `NULL` on platforms that cannot resolve it.

#### REQ-CM-003: Clipboard History Display `[Shipped]`
- Virtualized list (`@tanstack/react-virtual`) with drag-and-drop reordering (`@dnd-kit/react`).
- Shows type icon, content preview, relative time (`date-fns`), note badge, favorite star, detected-content chips (color, URL, date, env, secret, file-mime).
- "Load more" pagination; keyboard and pointer selection remain stable across loads.
- **Test:** at 10,000 entries, scroll 5,000 items — frame time ≤ 16 ms P95 (§4.1).

#### REQ-CM-004: Restore to Clipboard `[Shipped]`
- Single click on an item writes it back to the OS clipboard and bumps `copy_count`.
- `Ctrl/Cmd+1..9` pastes the Nth visible item via `enigo`-synthesized paste into the previously focused app.
- When the modifier is held, numeric badges (`quick-paste-badge`) light up on items 1..9.
- **Test:** select entry with arrow keys → press configured `paste` hotkey → focused text field receives content.

#### REQ-CM-005: Entry Deletion `[Partial]`
- Individual delete `[Shipped]`, via UI or `delete` hotkey.
- Clear-all with confirmation `[Shipped]`.
- **Missing:** bulk (multi-select) delete `[Proposed]`; soft-delete / trash bucket `[Proposed]`.

#### REQ-CM-006: Favorites / Pinning `[Shipped]`
- Per-item toggle; "Favorites First" sort can be applied via `favoritesFirst` hotkey (default `O`).
- No hard cap on favorites; the earlier SRS's 50-favorite limit is **not implemented and not recommended** — pinning is a user-driven signal and should not be capped. `[Note]`

#### REQ-CM-007 `[Shipped]`: Notes / Annotations
- Each entry accepts a user-editable text note; list filters support `note` as a facet.
- While a note is being edited, list hotkeys (move, delete, favorite, …) are suppressed to prevent accidental mutation.

#### REQ-CM-008 `[Shipped]`: Drag-and-Drop Reordering
- `sort_order` is a fractional-index string (`jittered-fractional-indexing`), enabling O(1) reorder without renumbering.
- Drag reordering is disabled in Search mode to avoid ambiguous intent.

#### REQ-CM-009 `[Shipped]`: Key-Value (.env) Splitting
- Entries detected as `.env` content expose a "Split" action that inserts one entry per key-value pair with `kv_key` set; original entry is preserved.

### 3.2 Search & Filtering (REQ-SF)

#### REQ-SF-001 `[Shipped]`: Text Search
- Case-insensitive substring search over `text_content` and `note`.
- Runs locally; debounced via `@tanstack/react-pacer`.
- Matches are rendered in a dedicated search-results layout; drag reorder is disabled while searching.

#### REQ-SF-001b `[Proposed]`: Match Highlighting
- Visually highlight the matched span in previews (currently not highlighted).
- Announce result count via `aria-live="polite"` for screen readers (see §4.4).

#### REQ-SF-002 `[Shipped]`: Content-Type Facets
- Facets: **Image, Secret, Env, URL, Color, Date, Note**. Multi-select, combinable with favorite filter and date range.

#### REQ-SF-003 `[Partial]`: Date Range
- Quick filters: **All / Today / Week / Month** `[Shipped]`.
- Custom range picker `[Proposed]`.

### 3.3 LAN Synchronization (REQ-LAN)

#### REQ-LAN-001 `[Shipped]`: mDNS Discovery
- Service type `_http._tcp.local.`; TXT record carries `hostname`.
- `mdns_start_discovery` / `mdns_stop_discovery` commands; emits `mdns-device-found` / `mdns-device-lost`.
- Own service is skipped in the browse stream.

#### REQ-LAN-002 `[Shipped]`: Pairing and Handshake
- Host advertises a random 6-digit numeric pairing code.
- Client sends `Auth { code, pubkey }`; server replies `AuthOk { pubkey }`.
- Both derive an AES-256-GCM key from X25519 ECDH + Argon2id KDF.
- **Test:** incorrect pairing code must be rejected before any payload frame is exchanged.

#### REQ-LAN-003 `[Shipped]`: Payload Transport
- Payloads are JSON `SyncMessage { Text | Image }` sealed with AES-256-GCM (random 96-bit nonce per frame), carried as `EncryptedEnvelope { nonce, ciphertext }` over WebSocket.
- Server fans out to all peers; each peer independently decrypts.

#### REQ-LAN-004 `[Shipped]`: Echo Suppression
- `last_remote_hash` records the 64-bit content hash of the most-recent inbound payload; the local monitor consumes the marker and skips rebroadcasting identical content.

#### REQ-LAN-005 `[Shipped]`: Sync Mode Transitions
- Starting a new mode stops the previous mode (`stop()`), cleans peers, and emits a `sync-status-changed` event with the new status.

#### REQ-LAN-006 `[Proposed]`: Pairing UX Hardening
- Present the pairing code with monospaced digits plus QR (library already present: `qrcode.react`).
- Show a visible TTL for the pairing code (rotate every 5 minutes while unused).
- Block acceptance after N failed attempts per peer (rate-limit).

#### REQ-LAN-007 `[Proposed]`: Per-Session Salt
- `crypto::SALT` is currently a static byte string (`sync/crypto.rs:8`). Replace with a per-session random salt transmitted during handshake to remove cross-session key material correlation.

#### REQ-LAN-008 `[Proposed]`: Mexboard-Only Discovery Filter
- Keep the generic DNS-SD service type (`_http._tcp.local.`) so the advertisement remains compatible with standard mDNS browsers, but add a required TXT record set:
  - `app=mexboard`
  - `proto=1` (wire protocol version)
  - `fp=<first-8-bytes-of-sha256(node-identity-pubkey)>` (short fingerprint for trust-on-first-use display)
- Discovery consumers MUST filter the browse stream to entries whose TXT record contains `app=mexboard`. Non-Mexboard services must not appear in the device picker.
- **Optional follow-up:** switch to a custom service type (`_mexboard._tcp.local.`) once stability is proven; the TXT filter must remain in place for defense-in-depth.
- **Acceptance:** a Bonjour/Avahi test fixture advertising a non-Mexboard `_http._tcp` service must be filtered out by the Mexboard browser.

### 3.4 Cloud Sync (Cloudflare) (REQ-CLOUD)

> **Architecture:** Cloudflare Workers (Hono router) + better-auth + one Durable Object per account for live WebSocket fan-out + D1 for metadata and small payloads + R2 for encrypted image blobs. **All clipboard content is end-to-end encrypted on-device; the server stores ciphertext only and has no ability to decrypt.**

#### REQ-CLOUD-001 `[Shipped legacy, being replaced]`: Legacy Relay
- The current desktop `sync_cloud_join(relay_url, auth_token)` stays for self-hosted deployments, but is not the target architecture for managed Cloud Sync. The managed backend supersedes it as described below.

#### REQ-CLOUD-002 `[Planned]`: Account Session
- Sign-in is performed via better-auth in the client (desktop and mobile). Session token is stored in the OS keychain / Keystore; never in the encrypted DB.
- Cloud Sync is disabled unless the user is signed in *and* has completed the E2E key setup (§REQ-AUTH-004).

#### REQ-CLOUD-003 `[Planned]`: Durable Object Connect
- Client opens `wss://<host>/sync` with the better-auth session token.
- Worker authenticates, resolves the account ID, and forwards the upgrade to the account's Durable Object.
- DO accepts the socket, registers the device in its presence list, and emits a `welcome` frame with: server time, own device ID, peer list (device-id + public-key fingerprint + content-type subscriptions), and the sequence cursor.

#### REQ-CLOUD-004 `[Planned]`: Message Envelope
- All sync messages are framed as:

  ```json
  {
    "v": 1,
    "type": "item" | "ack" | "presence" | "delete" | "sub",
    "from": "<device_id>",
    "to":   "<device_id>" | "broadcast",
    "seq":  <monotonic per-sender>,
    "ts":   <server-rewritten>,
    "contentType": "text" | "image",
    "size":  <ciphertext bytes>,
    "payload": { ... }
  }
  ```

- Small payloads (`size ≤ 64 KB` after encryption) are embedded inline as `{ nonce_b64, ciphertext_b64 }`.
- Large payloads are uploaded to R2 by the sender first; the envelope then carries `{ nonce_b64, r2_key, etag }` instead (§REQ-CLOUD-006).

#### REQ-CLOUD-005 `[Planned]`: Per-Peer E2E Keys
- Each account maintains a **device identity keypair** (Ed25519 for signing + X25519 for ECDH), generated on first sign-in and stored in the OS secure enclave.
- Account public keys (Ed25519) are signed by a **root identity** established from the recovery passphrase; any client verifies every device's identity against the signed roster returned by the server (the server cannot forge a device because it does not hold the root private key).
- Pairwise AES-256-GCM keys are derived via X25519 + HKDF (not Argon2id for online ops — HKDF is the correct KDF when input key material is already high-entropy).
- Keys are ratcheted on a schedule (every 24 h or every 1000 messages, whichever first).

#### REQ-CLOUD-006 `[Planned]`: Hybrid Storage (D1 + R2)
- **D1 stores:** users, devices, sessions (via better-auth), message metadata (`id, account_id, from_device, to_device, content_type, size, r2_key?, created_at, delivered_at, expires_at`), content-type subscriptions, audit log, quota counters, and inline ciphertext for payloads ≤ 64 KB.
- **R2 stores:** encrypted blobs keyed by `accounts/<account_id>/items/<item_id>`. Bucket is private; only the Worker can issue reads, and only when the better-auth session + account match. No direct signed URLs to the client (prevents URL leakage from becoming data leakage).
- **Compression:** payloads are zstd-compressed before encryption (text sees ~3–5× reduction; images see ~1× since PNG is already compressed).
- **Quota:** default 1 GB per account; surfaced in Settings. Hard-cap at quota; user gets a non-destructive warning at 80 %.

#### REQ-CLOUD-007 `[Planned]`: Offline Mailbox
- When a destination device is offline, the DO writes the envelope to D1 with `delivered_at = NULL`.
- On device reconnect, the DO streams undelivered messages in order, respecting that device's content-type subscription. Delivered messages are marked and then purged after `max(retention_days, 7)`.
- Optional APNs/FCM push wake is sent to offline mobile devices (§REQ-MOBILE-006); payload is empty/opaque.

#### REQ-CLOUD-008 `[Planned]`: Conflict & Ordering
- Single-writer per device: each message carries a strictly increasing `seq` per sender.
- DO rewrites a server timestamp (`ts`) and a global monotonic cursor that clients persist to resume after reconnect.
- "Last copy wins" for the local clipboard — there is no merge; the clipboard is a point-in-time value.

#### REQ-CLOUD-009 `[Planned]`: Reconnect & Backoff
- Exponential backoff 0.5 s → 30 s with ±20 % jitter; attempt indicator visible in sync status chip.
- On successful reconnect, client replays any locally-queued outbound messages in `seq` order before processing inbound.

#### REQ-CLOUD-010 `[Planned]`: Rate Limits and Abuse Prevention
- Per-device: ≤ 60 messages / minute, ≤ 5 MB / minute aggregate payload.
- Per-account: ≤ 1000 messages / minute aggregate.
- Enforced in the DO (cheap, in-memory counters). Exceeding returns a `rate_limited` frame; client pauses outbound and surfaces a UI hint.

#### REQ-CLOUD-011 `[Planned]`: Retention & Deletion
- Default retention: 30 days for inline payloads, 14 days for R2 blobs; configurable per account (1 day … 1 year … indefinite within quota).
- `delete` envelope from any trusted device removes the item from D1 and schedules an R2 delete via Queues.
- Account deletion purges D1 rows and R2 objects within 24 h; audit event recorded before purge.

### 3.5 User Interface (REQ-UI)

#### REQ-UI-001 `[Shipped]`: Main Window
- Dimensions: 400 × 600 (resizable up to `maxWidth: 1000`); frameless; drag region on tab strip.
- Hidden on blur and Escape (except when focus is in an editable target).
- Context menu is suppressed globally.

#### REQ-UI-002 `[Shipped]`: Theme Support
- `next-themes` with `defaultTheme: "system"` and `enableSystem`.
- Tailwind v4 `class` strategy; color tokens in `main.css`.

#### REQ-UI-003 `[Shipped]`: System Tray
- Menu: **Show Window**, **Hide Window**, **Quit**.
- Tray icon falls back to the default window icon.

#### REQ-UI-004 `[Shipped]`: Quick-Paste Overlay
- Global toggle hotkey summons the window near the active text caret (`caret/` per-OS implementations); pressing Escape or blur hides it.
- Items 1–9 paste via `Mod+N`.

#### REQ-UI-005 `[Shipped]`: GIF Tab
- Klipy search, categories, and static grid; pasting falls back to URL copy when direct paste is unsupported (e.g., Telegram).

#### REQ-UI-006 `[Shipped]`: Symbols Tab
- Unicode symbol palette; paste via the same paste pipeline.

#### REQ-UI-007 `[Proposed]`: Accessible Dialogs and Navigation
- Every dialog/sheet must have a visible or `sr-only` `SheetTitle` + `SheetDescription` (already adopted for Settings — standardize across all overlays).
- Focus traps in Sheets; restore focus to the triggering control on close.
- Roving-tabindex over the clipboard list with `aria-activedescendant` to match the current keyboard selection model.

### 3.6 Settings & Configuration (REQ-CONFIG)

#### REQ-CONFIG-001 `[Shipped]`: General
- Monitoring on/off, history limit (`25 / 50 / 100 / 200 / 500`), Clear All history.

#### REQ-CONFIG-002 `[Partial]`: Privacy
- Currently supports: disabling clipboard capture, disabling sync.
- **Missing and Proposed:**
  - Per-application exclusion list.
  - Mask/skip rule for clipboard items flagged `is_secret` (e.g., "never store", "store but hide preview", "store and clear after N minutes").
  - Data retention policy (auto-delete after N days).

#### REQ-CONFIG-003 `[Shipped]`: Keyboard Shortcuts
- Configurable actions: `moveDown, moveUp, copy, paste, delete, favorite, colorMenu, favoritesFirst, jumpTop, jumpBottom, search, toggleWindowVisibility`.
- Defaults are platform-aware: toggle defaults to `Shift+Meta+V` (macOS), `Alt+Meta+V` (Windows), `Meta+V` (Linux).
- Tauri accelerator translation (`Meta`→`Super`, `Mod`→`CmdOrCtrl`) handled in `shortcuts::to_tauri_accelerator`.
- **Missing and Proposed:** conflict detection against OS-registered shortcuts (today only registration failure is logged).

#### REQ-CONFIG-004 `[Proposed]`: Notification Settings
- Toggle for in-app toasts on: successful paste, incoming sync message, secret-detected warning, sync connection changes.
- Desktop notifications are **not** currently used; before enabling, confirm they comply with "no noise" UX expectations.

#### REQ-CONFIG-005 `[Proposed]`: Startup Integration
- "Launch at login" toggle per-OS (Tauri `autostart` plugin).
- "Start minimized to tray" toggle.

### 3.7 Mobile Companion (REQ-MOBILE) `[Planned]`

#### REQ-MOBILE-001: Clipboard History
- Displays the account's synced clipboard history, most-recent first, with the same type affordances as the desktop (text, image, URL/color/date/secret chips where applicable).
- Supports search, favorite toggle, delete, copy-to-system-clipboard.

#### REQ-MOBILE-002: Send to Sync (Share Sheet)
- iOS Share Extension and Android Share Target accept text and images from any app and produce a Mexboard item encrypted with the account keys.
- Share UI shows a target selector (All devices / specific device) and a content-type reminder.

#### REQ-MOBILE-003: Receive from Sync
- Inbound items from the DO are displayed live when the app is foregrounded, and delivered via the mailbox on next foreground or push wake (§REQ-CLOUD-007).

#### REQ-MOBILE-004: Secure Key Storage
- Identity keypair is generated on first successful sign-in and persisted in iOS Keychain (`kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`) or Android Keystore with `setUserAuthenticationRequired(true)` for biometric gating.
- Never written to app documents, backups, or unprotected storage.

#### REQ-MOBILE-005: Biometric / PIN Gate
- App content is hidden until the user passes biometric (Face/Touch/fingerprint) or fallback PIN.
- Re-lock after configurable idle (default 60 s) or on app backgrounding.

#### REQ-MOBILE-006: Push Notifications (Opt-In)
- Default **off**. When enabled, the cloud sends APNs/FCM wakes with empty/opaque payloads — only "new item available" is signaled.
- No plaintext content or sender identity in notification payloads.

#### REQ-MOBILE-007: Clipboard Anti-Leak
- When a Mexboard-managed item is pasted, clear it from `UIPasteboard` / `ClipboardManager` after a configurable duration (default 60 s, off by default for Android where autoclearing may surprise users; on by default for iOS).
- Never include Mexboard items in iCloud Universal Clipboard handoff (iOS: use `UIPasteboardOption.localOnly`).

#### REQ-MOBILE-008: Offline Capability
- All features except Cloud Sync work offline. The app queues outbound shares for replay on reconnect.

### 3.8 Account & Authentication (REQ-AUTH) `[Planned]`

#### REQ-AUTH-001: better-auth Integration
- Supported methods: email + password (with verification), magic links, OAuth (GitHub, Google; Apple on iOS per App Review rules).
- Session cookies (web context) or bearer tokens (native); tokens stored in OS keychain.
- Sessions expire on inactivity (sliding 30 days) and on explicit sign-out from any device.

#### REQ-AUTH-002: First-Device Onboarding
- On first sign-in:
  1. Generate identity keypair.
  2. Prompt the user to create a **recovery passphrase** (12+ chars, strength meter). This derives the root identity that signs device public keys.
  3. Offer to display a one-time recovery key (mnemonic) which the user is strongly encouraged to save.
- The server stores only the signed device-public-key roster and the verifier for the recovery passphrase (Argon2id-hashed). It cannot derive the root private key.

#### REQ-AUTH-003: Additional-Device Onboarding
- New device signs in, generates its own identity keypair, and requests enrollment.
- **Approval path (preferred):** an already-trusted device sees a push/toast with the new device's public-key fingerprint; user compares a 6-digit short code derived from the fingerprint and approves. Approval signs the new device's public key with the root identity and publishes it to the roster.
- **Recovery path:** user enters the recovery passphrase on the new device; the client re-derives the root identity locally and self-approves.
- No recovery passphrase and no trusted device → cannot access historical encrypted data. This must be stated plainly in the UI.

#### REQ-AUTH-004: Recovery & Rotation
- Users can rotate the recovery passphrase; rotation re-signs the roster (cheap) and does not re-encrypt historical content (root private key unchanged is optional — see design note in `docs/CRYPTO.md`).
- Revoking a device removes its public key from the signed roster. Revoked devices cannot post new messages because other devices will reject unsigned identities; in-flight material in transit is still decryptable by the revoked device until its keys are wiped, so revocation must be paired with server-side socket termination.

#### REQ-AUTH-005: Sign Out
- Local sign-out clears the session token and offers to also **wipe local encrypted history** (default off — many users want to retain local data).
- "Sign out everywhere" endpoint in Settings → Account revokes all sessions.

### 3.9 Device Management (REQ-DEV) `[Planned]`

#### REQ-DEV-001: Device Registry
- Every signed-in client appears in Settings → Account → Devices with: user-editable name, platform, first-seen, last-seen, location hint (IP → coarse geo, never precise), content-type subscriptions, and status (online/offline).

#### REQ-DEV-002: Rename & Revoke
- Any trusted device can rename or revoke any other device. Revocation:
  - Removes the device's public key from the signed roster.
  - Terminates the revoked device's WebSocket from the DO.
  - Invalidates the better-auth session server-side.
- An audit-log entry is recorded (§REQ-DEV-004).

#### REQ-DEV-003: Presence
- Online/offline reflected in real time from the DO presence list. "Last active" on offline devices is the last successful heartbeat.

#### REQ-DEV-004: Audit Log
- Account-scoped, append-only log stored in D1 with rows encrypted at the field level (server sees only the event type, timestamp, and actor device ID — the human-readable description is encrypted to the account).
- Events: sign-in, sign-out, device approved, device revoked, recovery passphrase rotated, quota exceeded.

### 3.10 Content-Type Subscriptions (REQ-SUB) `[Planned]`

#### REQ-SUB-001: Per-Device Subscription Profile
- Each device has a subscription profile stored in D1 and mirrored to the DO:

  ```ts
  type Subscription = {
    text:   { accept: boolean; maxBytes: number };
    image:  { accept: boolean; maxBytes: number };
    secret: { accept: boolean };   // filters items where is_secret = true
    url:    { accept: boolean };
    color:  { accept: boolean };
    date:   { accept: boolean };
  };
  ```

- Sensible defaults by form factor:
  - **Desktop:** accept all; text max 1 MB; image max 16 MB.
  - **Mobile:** accept text + URL + color; image off by default (user enables); secret off by default; image max 4 MB when enabled.

#### REQ-SUB-002: Server-Side Filtering
- The DO consults each destination device's subscription before fanning out a message. Rejected messages are neither delivered nor stored per-recipient; if a message is rejected by all recipients, it is not persisted.
- Filtering is metadata-only (`content_type`, `is_secret`, `size`); the server never decrypts payload to filter.

#### REQ-SUB-003: UI
- Settings → Devices → [device] → Subscriptions: toggles and size limits per content type, with a "reset to defaults" action per device.
- Changes take effect on the next DO roster refresh (typically < 1 s).

#### REQ-SUB-004: Bandwidth Friendliness
- Clients SHOULD skip sending outbound frames when *no* destination device subscribes to the given type. The DO also drops such frames defensively.
- "Send anyway" override from the sender is available for one-shot sends.

---

## 4. Non-Functional Requirements

### 4.1 Performance (REQ-PERF)

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| REQ-PERF-001 | Cold start (window first-paint after tray summon) | ≤ 500 ms | Tauri dev-trace + in-app perf marks |
| REQ-PERF-002 | Clipboard capture → DB insert | ≤ 150 ms P95 | Rust `tracing` spans |
| REQ-PERF-003 | Search over 10k entries | ≤ 150 ms P95 | Measured in browser Perf API |
| REQ-PERF-004 | Frame time while scrolling 10k-item virtualized list | ≤ 16 ms P95 | React profiler + CDP |
| REQ-PERF-005 | Idle memory (steady state after 1 h monitor) | ≤ 120 MB | OS RSS |
| REQ-PERF-006 | LAN sync round-trip (text ≤ 4 KB) | ≤ 250 ms P95 on same subnet | Integration test harness |
| REQ-PERF-007 | Image payload bound | Reject > 16 MB decoded; emit user-facing warning | Source-side guard |
| REQ-PERF-008 | Monitor tick overhead | ≤ 1 % CPU on a 2020-era laptop with clipboard idle | OS sampler |

**Design notes grounded in source:**
- `ImageCache` avoids re-encoding unchanged images (`clipboard/manager.rs`).
- `fast_hash` samples the first + last 64 bytes of base64 for O(1) change detection.
- `PRAGMA journal_mode=WAL` is enabled for non-blocking reads.

### 4.2 Reliability (REQ-REL)

#### REQ-REL-001 `[Shipped]`: No Data Loss on Normal Shutdown
- SQLite WAL; database is flushed on exit.

#### REQ-REL-002 `[Proposed]`: Crash-Safe Inserts
- Wrap the monitor's capture+insert pipeline in a transaction; on panic, the clipboard buffer is re-read on next tick. Use `tauri::async_runtime::spawn` with a watchdog that restarts the monitor if it exits unexpectedly.

#### REQ-REL-003 `[Proposed]`: Error Taxonomy and Recovery
- Classify errors: `ClipboardUnavailable`, `DbLocked`, `SyncDisconnected`, `PairingFailed`, `ImageTooLarge`. Each must have:
  - A user-visible message and remediation hint.
  - A retryable flag so the UI can auto-retry idempotent operations.
- Replace `String` error types at FFI boundaries with structured variants exposed through Specta.

#### REQ-REL-004 `[Shipped]`: Sync Reconnection
- `stop()` is called at the start of every new mode transition, preventing leaked peers.
- **Extend (Proposed):** automatic reconnect for LAN client and Cloud modes with exponential backoff (250 ms → 30 s, capped), and a "Reconnecting… (Nth attempt)" status chip.

#### REQ-REL-005 `[Proposed]`: Database Backups
- Daily WAL checkpoint + timestamped snapshot (`clipboard.db.YYYY-MM-DD`) kept rotating for 7 days in app-data dir.
- Manual "Export as JSON" action in Settings.

### 4.3 Security (REQ-SEC)

#### REQ-SEC-001 `[Partial]`: Encryption
- **In transit, peer-to-peer:** AES-256-GCM with keys derived via X25519 ECDH + Argon2id — `[Shipped]`.
- **At rest (DB):** SQLite is **unencrypted** today. The original SRS's "optional encrypted local DB" is **not implemented**.
- **REQ-SEC-001a Proposed:** Integrate SQLCipher (or age-encrypted DB blob) with an OS-keychain-backed master key, opt-in via settings, with a clear warning that enabling destroys the current plaintext DB unless migrated.

#### REQ-SEC-002 `[Proposed]`: Static Salt Removal
- Replace the hard-coded `b"omg-clipboard-sync-static-salt"` in `sync/crypto.rs` with a per-session random salt exchanged in the handshake. Low-effort fix with material defense-in-depth value.

#### REQ-SEC-003 `[Shipped]`: Secret Detection
- `secretscan` known-pattern match + Shannon-entropy screen on single-token strings 20–256 chars.
- UI surfaces a "secret" chip on matching entries.
- **Proposed UX:** optional "never store" rule so detected secrets never hit the DB (today they do hit the DB, just flagged).

#### REQ-SEC-004 `[Proposed]`: Tightened Capabilities & CSP
- `src-tauri/tauri.conf.json` sets `security.csp: null`. Replace with a strict CSP:
  - `default-src 'self'`; `connect-src 'self' https://api.klipy.com wss://*`; `img-src 'self' data: blob: https:`; `style-src 'self' 'unsafe-inline'` only if Tailwind JIT requires it; `frame-ancestors 'none'`.
- Audit `capabilities/*.json` to ensure only commands actually consumed by the UI are exposed (principle of least privilege).

#### REQ-SEC-005 `[Shipped]`: Outbound Traffic Posture
- `reqwest` is compiled with `rustls-tls` (no native TLS backend, fewer CVE surfaces) and `default-features = false`.

#### REQ-SEC-006 `[Proposed]`: Link Preview Safety
- `fetch_link_preview` issues outbound HTTP — enforce:
  - Per-host cache with TTL and size cap.
  - Disallow HTTP by default; require explicit opt-in for plaintext.
  - SSRF guard: refuse private/link-local IP ranges.
  - Strict timeout (≤ 5 s) and max response size (≤ 256 KB).
  - No cookie jar; no redirects to private ranges.

#### REQ-SEC-007 `[Proposed]`: Sensitive-App Exclude List
- User-configurable exclude list (by window class / bundle id) so password managers, banking apps, and secure-note apps can be silenced.

#### REQ-SEC-008 `[Proposed]`: Disable Debug Export in Release
- `main.rs` exports Specta bindings even outside `debug_assertions` — verify the `#[cfg(debug_assertions)]` guard is actually present in all builds and that no stray `eprintln!` leaks clipboard content. (Initial audit: no payload logging observed; formalize as a CI check using `grep -r "eprintln!" src-tauri/src/` for expected lines only.)

#### REQ-SEC-009 `[Proposed]`: Telemetry
- No telemetry is collected today. Formalize this as a policy (documented in `PRIVACY.md`) and block future additions without an explicit opt-in flow.

### 4.4 Usability & Accessibility (REQ-USAB)

#### REQ-USAB-001 `[Proposed]`: Keyboard-First Contract
- Every feature reachable within 2 key presses from the focused list.
- Focus is always visible: `:focus-visible` ring of ≥ 3:1 contrast against any background.
- Global `Escape` closes the window; local `Escape` exits search / color menu / note editor first.
- Document the full keymap in `docs/KEYMAP.md` (generated from `HOTKEY_META`).

#### REQ-USAB-002 `[Proposed]`: WCAG 2.1 AA Conformance
- **Perceivable:** color-contrast ≥ 4.5:1 for text, ≥ 3:1 for non-text; verify in both themes with an automated check (axe-core in Playwright).
- **Operable:** all interactive elements reachable by Tab; `prefers-reduced-motion` disables Motion-driven transitions (`AnimatePresence`).
- **Understandable:** every icon-only button has `aria-label`; every filter toggle announces its state.
- **Robust:** semantic roles — the clipboard list uses `role="listbox"` with `aria-activedescendant`; search input has `aria-describedby` for result count.
- Screen-reader verified with NVDA (Windows), VoiceOver (macOS), Orca (Linux).

#### REQ-USAB-003 `[Proposed]`: Reduced Motion
- Respect `prefers-reduced-motion: reduce`: disable list animations, drag-motion flourishes, theme-transition fades.

#### REQ-USAB-004 `[Proposed]`: High-Contrast / Forced-Colors
- Respect `forced-colors: active` (Windows high-contrast): opt out of background gradients; ensure borders use `CanvasText`.

#### REQ-USAB-005 `[Proposed]`: Empty, Error, and Loading States
- Every view must have all four states (loaded, loading, empty, error) with distinct visual language.
- Existing components `clipboard-empty-state.tsx`, `clipboard-error-banner.tsx`, `clipboard-item-skeleton.tsx` set the baseline — verify coverage in Storybook/MDX.

#### REQ-USAB-006 `[Proposed]`: Internationalization Scaffold
- Introduce a minimal i18n layer (e.g., `@lingui/core` or `react-i18next`) with English as the source locale.
- Provide `t()` for every user-visible string; CI fails on hard-coded strings in `src/components/**/*.tsx`.

#### REQ-USAB-007 `[Proposed]`: Aesthetic Baseline
- Typography: Figtree Variable (`@fontsource-variable/figtree`) with fluid sizing; line-height ≥ 1.4 for body.
- Consistent 4 px radius scale, 8 px spacing scale.
- Motion: subtle `200 ms cubic-bezier(0.4, 0, 0.2, 1)`; never ≥ 300 ms for common transitions.
- Iconography: Lucide + Hugeicons — standardize on one family per context (Lucide for nav, Hugeicons for marketing/onboarding); audit and document in `components.json`.

### 4.5 Maintainability (REQ-MAINT)

#### REQ-MAINT-001 `[Shipped]`: TypeScript Strictness
- `tsconfig.json` enforces strict settings; `pnpm build` runs `tsc && vite build`.

#### REQ-MAINT-002 `[Proposed]`: Linting & Formatting
- Add ESLint + Prettier (not present today) with flat config; `rustfmt` + `clippy --deny warnings` in CI.

#### REQ-MAINT-003 `[Proposed]`: Test Coverage
- ≥ 70 % line coverage on:
  - Rust detection modules (`detection/*`), sync crypto, DB items.
  - TypeScript hooks (`hooks/*`) and feature reducers.
- Full E2E smoke suite per §10.

#### REQ-MAINT-004 `[Shipped]`: Release Automation
- Semantic Release wired (`.releaserc.json`, `scripts/prepare-release.js`, `scripts/sync-version.js`).

---

## 5. System Architecture

### 5.1 Architecture Diagram

```
┌─ Desktop (Tauri, shipped) ────────────┐   ┌─ Mobile (React Native, planned) ─┐
│ React 19 / TS (WebView)               │   │ React Native UI                   │
│  Clipboard | GIF | Symbols | Settings │   │  History · Share target · Lock    │
│  - @tanstack/react-virtual/hotkeys    │   │  - Biometric gate                 │
│  - DnD · next-themes · Motion         │   │  - Keychain / Keystore            │
│        │ tauri-specta typed bindings  │   │        │ native modules           │
│ ┌──────▼──────────────────────────┐   │   │ ┌──────▼──────────────────────┐  │
│ │ Rust Commands (commands/*.rs)    │   │   │ │ TS Services + native bridge │  │
│ └──┬───────────────────────┬──────┘   │   │ └──┬──────────────────────────┘  │
│    │                       │           │   │    │                              │
│ ┌──▼──────────┐   ┌────────▼───────┐   │   │ ┌──▼──────────┐  ┌─────────────┐ │
│ │ Clipboard   │   │ SQLite (WAL)   │   │   │ │ SQLite       │  │ OS Clipboard│ │
│ │ (arboard)   │   │ drizzle-rs ORM │   │   │ │ op-sqlite    │  │ UIPaste/    │ │
│ │ enigo paste │   │ content_hash ix│   │   │ │              │  │ ClipboardMgr│ │
│ └──┬──────────┘   └────────────────┘   │   │ └──┬──────────┘  └─────────────┘ │
│    │                                   │   │    │                              │
│ ┌──▼─────────────────────────────────┐ │   │ ┌──▼─────────────────────────┐   │
│ │ clipboard_monitor (tokio, 500ms)   │ │   │ │ Sync Client (WS + crypto)  │   │
│ └──┬─────────────────────────────────┘ │   │ └──┬─────────────────────────┘   │
│    │                                   │   │    │                              │
│ ┌──▼─────────────────────────────────┐ │   │    │                              │
│ │ SyncState: LAN | Cloud | Off       │ │   │    │                              │
│ │  mDNS (_http._tcp.local. +         │ │   │    │                              │
│ │        TXT app=mexboard filter)    │ │   │    │                              │
│ │  ECDH X25519 + HKDF + AES-256-GCM  │ │   │    │                              │
│ └─────┬──────────────┬───────────────┘ │   │    │                              │
└───────┼──────────────┼─────────────────┘   └────┼──────────────────────────────┘
        │              │                          │
        │ LAN (direct) │                          │ wss://<host>/sync
        │              │                          │
        │              ▼                          ▼
        │       ┌────────────────── Cloudflare (planned) ─────────────────┐
        │       │                                                          │
        │       │  Worker (Hono) ──► better-auth ──► session              │
        │       │       │                                                  │
        │       │       ▼                                                  │
        │       │   Durable Object per account                             │
        │       │     - live device presence + WebSocket fan-out           │
        │       │     - enforces per-device content-type subscriptions     │
        │       │     - rate-limits + abuse counters                       │
        │       │       │                                                  │
        │       │       ├─► D1 (metadata + ≤64KB ciphertext)               │
        │       │       ├─► R2 (encrypted blobs, account-scoped keys)      │
        │       │       └─► Queues (orphan sweep, retention, push fan-out) │
        │       │                                                          │
        │       └──────────────────────────────────────────────────────────┘
        │
        ▼
Other desktop peers on LAN
```

Notes: clients never see the bucket directly — R2 is accessed via the Worker, which validates the better-auth session and the account → object key match.

### 5.2 Technology Stack

**Desktop (verified):**

| Component | Technology | Notes |
|---|---|---|
| Desktop framework | Tauri `2.10.3` | `tray-icon`, `drag`, `opener`, `global-shortcut`, `single-instance` |
| Frontend | React 19, Vite 7, TS 5.8, Tailwind 4 | Base UI + shadcn primitives |
| State / data | Zustand, TanStack Query, Zod 4 | Query client disables refetch-on-window-focus (intentional) |
| Motion | `motion` | Gate with `prefers-reduced-motion` (proposed) |
| Clipboard IO | `arboard` + `wayland-data-control`; `wl-clipboard-rs` on Linux | macOS uses Core Foundation bindings |
| DB | `rusqlite` + `drizzle-rs`; `PRAGMA journal_mode=WAL` | `idx_clipboard_items_content_hash` present |
| Sync (LAN shipped) | `tokio-tungstenite`, `mdns-sd`, `x25519-dalek`, `aes-gcm`, `argon2`, `rand` | Per-peer ECDH, AES-256-GCM |
| HTTP | `reqwest` + `rustls-tls` | No native TLS backends |
| Detection | `secretscan`, `csscolorparser`, `chrono`, `url` | — |
| Paste synthesis | `enigo` + `wayland` + `x11rb` | — |

**Mobile (planned):**

| Component | Technology | Notes |
|---|---|---|
| Framework | React Native (New Architecture) | Expo (preferred) or bare; decide in `docs/MOBILE-ARCHITECTURE.md` |
| Storage | `op-sqlite` or `expo-sqlite` | Schema mirrors desktop where applicable |
| Crypto | `react-native-libsodium` / `@noble/ciphers` + `@noble/curves` | AES-256-GCM + X25519 + HKDF; never roll our own |
| Secure key storage | iOS Keychain, Android Keystore | Biometric-gated |
| Push | APNs (via Apple push), FCM | Only empty/opaque wakes |
| Share integration | iOS Share Extension, Android Share Target + Process Text intent | Accepts text and images |

**Cloudflare backend (planned):**

| Component | Technology | Notes |
|---|---|---|
| Compute | Workers | Hono router + tRPC-style handlers (pick one style; avoid mixing) |
| Auth | better-auth | Email + password, magic links, OAuth (GitHub, Google, Apple) |
| Realtime | Durable Objects | One DO per account; WebSocket hibernation API for scale |
| Relational | D1 | Users, devices, sessions, message metadata, ≤ 64 KB inline ciphertext, subscriptions, audit log |
| Blobs | R2 | Encrypted image blobs and oversize text, keyed `accounts/<id>/items/<id>` |
| Async jobs | Cloudflare Queues | Retention sweep, R2 orphan cleanup, push fan-out |
| Observability | Workers Analytics Engine + Logpush | No clipboard plaintext anywhere; redact tokens |
| CI/CD | GitHub Actions + Wrangler | Staging + production environments with separate D1/R2 |

### 5.3 Key Data Flows

1. **Capture (desktop, shipped).** `clipboard_monitor` ticks → image first, text fallback → if changed, emit `clipboard-changed` → broadcast to peers when not an echo → UI consumes event and inserts via `db_insert_item`.
2. **Recall (desktop, shipped).** UI calls `paste_item` → ClipboardManager writes back → `enigo` synthesizes the OS paste in the previously focused window.
3. **LAN pair (shipped).** Host runs `sync_start_server` → mDNS advertises with `app=mexboard` TXT → Client picks from filtered device list → `sync_connect` handshake → encrypted WebSocket loop.
4. **Mobile share in (planned).** Share sheet invokes Mexboard Share Extension → user confirms targets → content is encrypted locally → if online, uploaded to DO; if offline, queued.
5. **Cloud send (planned).**
   - Client encrypts payload client-side.
   - If ciphertext ≤ 64 KB: POST to DO inline.
   - Else: PUT to Worker → R2 (`accounts/<id>/items/<id>`), then POST envelope with `r2_key`.
   - DO validates subscription, fans out to online peers, mailboxes to D1 for offline peers.
6. **Cloud receive (planned).** Device reconnects → DO sends mailboxed envelopes ordered by `seq` → client fetches R2 blobs when needed → decrypts → inserts into local DB → marks delivered.
7. **Account onboarding (planned).** better-auth sign-in → generate identity keypair → prompt recovery passphrase → sign roster → publish device record to D1.
8. **Device approval (planned).** New device requests enrollment → existing trusted device signs new device's key → updated roster written to D1 → DO broadcasts roster update so other devices can verify future messages.

---

## 6. Data Management

### 6.1 Storage Structure (authoritative)

```sql
-- Clipboard entries
CREATE TABLE clipboard_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type    TEXT    NOT NULL,          -- 'text' | 'image'
  text_content    TEXT,
  image_data      TEXT,                      -- base64 PNG
  image_width     INTEGER,
  image_height    INTEGER,
  char_count      INTEGER,
  line_count      INTEGER,
  source_app      TEXT,                      -- currently NULL in 1.15
  is_favorite     INTEGER NOT NULL,          -- 0|1
  sort_order      TEXT    NOT NULL,          -- jittered fractional index
  copy_count      INTEGER NOT NULL,
  kv_key          TEXT,                      -- when split from .env
  detected_date   TEXT,
  detected_color  TEXT,
  is_env          INTEGER NOT NULL,
  is_secret       INTEGER NOT NULL,
  note            TEXT,
  content_hash    TEXT,                      -- sha-256
  file_mime       TEXT,                      -- set when text is an existing path
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX idx_clipboard_items_content_hash ON clipboard_items(content_hash);

-- Key/value settings bag (hotkeys, preferences, etc.)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

> **Not implemented:** `device_sync_log` and `cloud_sync_status` tables from v1 of this SRS. Sync state lives in process memory and is not persisted.

### 6.2 Retention Policy

- **Shipped:** history cap enforced by `historyLimit` setting (`25 / 50 / 100 / 200 / 500`). Excess items are pruned oldest-first.
- **Proposed:** time-based retention (e.g., auto-delete > 30 days) with a user-configurable schedule.

### 6.3 Backup Strategy `[Proposed]`

- Daily WAL checkpoint and rotating snapshot (keep 7).
- Manual "Export to JSON" / "Import from JSON" in Settings (encrypt the export with a user-supplied passphrase).

### 6.4 Data Privacy

- **Shipped:** secret detection flag; user can disable monitoring; user can clear all.
- **Proposed:** per-app exclude list; "never store secrets" rule; passphrase-encrypted export; documented deletion procedure (delete app-data dir path, listed in Settings → About).

### 6.5 File Locations (verified)

- Database: `<app_data_dir>/clipboard.db` (`src-tauri/src/db/initialization.rs:12`).
- Logs / crash traces: currently stderr only `[Proposed: file log with rotation]`.

---

## 7. User Interfaces

### 7.1 Main Window

```
┌─ Mexboard (frameless, 400×600, hidden by default) ──────────────────┐
│ [ 🔍  Search...        ]  [ Filter ▾ ]  [ ⚙️ ]                      │  ← header
├─────────────────────────────────────────────────────────────────────┤
│ ⭐ #1  JWT refresh token (secret)                    2:30 PM        │
│ #2     https://docs.example.com/...  (URL)           2:10 PM        │
│ #3     {image 640×400}                               2:00 PM        │
│ #4     /home/me/report.pdf  (application/pdf)        1:50 PM        │
│  ...                                                                │
├─────────────────────────────────────────────────────────────────────┤
│ [Clipboard] [GIF] [Symbols]                                         │  ← bottom tabs
└─────────────────────────────────────────────────────────────────────┘
```

- Holding the paste modifier shows numeric badges `1..9` on the first nine visible items.
- Drag handles appear on hover; drag is suppressed in search mode.

### 7.2 Settings Sheet (verified shape)

```
Settings
├─ General
│   ├─ Monitoring  [toggle]
│   ├─ History limit  [25|50|100|200|500]
│   ├─ Clipboard Sync
│   │   ├─ Mode tabs: [LAN] [Cloud]
│   │   ├─ LAN: host server or connect to discovered device, 6-digit pairing
│   │   ├─ Cloud: relay URL + auth token → connect
│   │   └─ Active state cards with disconnect action
│   ├─ Clear all history
│   └─ Wayland • Data Control badge (if applicable)
└─ Keymap
    └─ Rebindable hotkeys for: moveDown, moveUp, copy, paste, delete,
       favorite, colorMenu, favoritesFirst, jumpTop, jumpBottom,
       search, toggleWindowVisibility
       (Reset per-hotkey / Reset all)
```

### 7.3 Accessible Interaction Contract `[Proposed]`

- Listbox semantics for history (`role="listbox"`, items `role="option"`, `aria-selected`).
- `aria-live="polite"` for result counts and sync-status changes.
- Focus outlines: 2 px ring + 1 px offset, ≥ 3:1 contrast with adjacent colors.

---

## 8. Integration Points

### 8.1 OS
- **Clipboard:** `arboard` across platforms; `wl-clipboard-rs` on Wayland; `core-foundation` on macOS.
- **Paste synthesis:** `enigo` with Wayland + X11rb features.
- **System tray:** Tauri `tray-icon`.
- **Global hotkeys:** `tauri-plugin-global-shortcut`.
- **Single instance:** `tauri-plugin-single-instance` (re-invokes pass through `handle_command` with `show|hide|toggle`).

### 8.2 External Services

| Service | Purpose | Security |
|---|---|---|
| **Klipy API** (GIF tab) | Search and fetch GIFs | HTTPS; no PII sent; API key loaded from `.env` via `dotenvy` — **verify `.env` is not bundled into release artifacts** (proposed CI check). |
| **Mexboard Cloud** (Cloudflare Workers + Hono + DO + D1 + R2) | Account-bound sync, mobile bridge, offline mailbox | `wss://` only; better-auth sessions; zero-knowledge — server sees ciphertext only. |
| **Legacy self-hosted relay** (user-supplied) | Forward encrypted frames between peers | Token auth; require `wss://` by default; zero access to plaintext. Deprecated once Mexboard Cloud ships. |
| **APNs / FCM** | Optional push wake on new items | Empty/opaque payloads only — no plaintext or sender identity. |
| **Link previews** (`fetch_link_preview`) | Optional OpenGraph fetch | Apply SSRF guards and size/time caps (§REQ-SEC-006). |

### 8.3 Platform Considerations

| Platform | Notes |
|---|---|
| Windows | Meta key = Windows key; default toggle `Alt+Meta+V`. Use `PowerToys Keyboard Manager` when combo conflicts. |
| Linux | X11 + Wayland. Cosmic `data-control` detection surfaces a badge. Default toggle `Meta+V`. |
| macOS | Default toggle `Shift+Meta+V`. Accessibility permission required for `enigo` to synthesize paste. |

---

## 9. Quality Attributes

### 9.1 Performance Targets

| Metric | Target | Acceptable | Critical |
|---|---|---|---|
| Window first paint | ≤ 500 ms | ≤ 1 s | > 3 s |
| Clipboard capture → event | ≤ 150 ms | ≤ 250 ms | > 500 ms |
| Search over 10 k items | ≤ 150 ms | ≤ 500 ms | > 1 s |
| Steady-state RSS (1 h) | ≤ 120 MB | ≤ 200 MB | > 350 MB |
| LAN payload RTT (≤ 4 KB) | ≤ 250 ms | ≤ 1 s | > 3 s |

### 9.2 Reliability Targets
- Uncaught-panic rate over a 30-day window: 0.
- Monitor task uptime ≥ 99.9 % of app uptime.
- Sync reconnect success within 10 s of network restore ≥ 99 %.

### 9.3 Security Targets
- All peer-to-peer payloads AEAD-encrypted.
- No plaintext secrets in logs, crash reports, or telemetry (there is no telemetry; enforce by policy).
- Quarterly dependency audit (`cargo audit`, `pnpm audit`).
- 48 h target for critical CVE remediation.

### 9.4 Aesthetic and UX Targets
- Figma-verified tokens for color, spacing, radius, motion.
- Both themes pass axe-core with zero critical violations.
- Copy / tone review for all user-visible strings (no jargon in default UI, jargon allowed in developer-mode tooltips).

---

## 10. Testing Requirements

### 10.1 Unit
- **Rust:** `cargo test` across `detection/*`, `sync/crypto`, `db/items/*`, `clipboard/image` (encode/decode round-trip).
- **TypeScript:** Vitest for hooks, reducers, and pure utilities.

### 10.2 Integration
- In-memory SQLite migration round-trip.
- mDNS: two spawned instances on the same machine discover each other within 5 s.
- Sync: Text + Image round-trip with echo suppression verified by payload-count assertion.
- Cloud: end-to-end with a local relay fake; ensures relay never receives plaintext.

### 10.3 System / E2E
- Playwright + Tauri Driver. Scenarios:
  1. **Basic capture/paste:** copy external text → appears in list → press `Ctrl/Cmd+1` → focused app receives paste.
  2. **LAN sync:** two app instances with distinct app-data dirs pair and round-trip a text and an image.
  3. **Cloud sync:** mocked relay, two peers, text and image round-trip.
  4. **Search + filter:** type "jwt" → only secret/URL entries matching are visible.
  5. **Hotkey rebinding:** change `copy` to `X` → persisted and active after restart.
  6. **Blur-hide:** summon window → click outside → window hides.
  7. **Escape semantics:** in search → Escape clears search, not window. In list → Escape hides window.

### 10.4 Performance
- Seed 10k / 50k entries; assert search and scroll budgets (§4.1).
- 1-hour monitor-idle RSS growth < 20 MB.

### 10.5 Accessibility
- axe-core in Playwright on every rendered view; zero critical violations.
- Manual keyboard-only pass for each release (documented in `docs/A11Y-CHECKLIST.md`).
- Screen reader smoke test on at least one per-OS SR (NVDA, VoiceOver, Orca).

### 10.6 Security
- `cargo audit`, `pnpm audit`; fail CI on High/Critical.
- Fuzz `detection/secret` and `detection/env` with a corpus of safe and malicious strings.
- Verify no HTTP without TLS in production builds (static check on reqwest call sites).
- Verify `.env` file is in `.gitignore` and not included in Tauri bundle resources.

---

## Appendices

### A. Glossary (updated)

| Term | Definition |
|---|---|
| **mDNS** | Multicast DNS for zero-configuration service discovery. |
| **ECDH** | Elliptic-curve Diffie-Hellman key agreement. Mexboard uses X25519. |
| **AEAD** | Authenticated encryption with associated data. Mexboard uses AES-256-GCM. |
| **Fractional indexing** | String-based sort keys that allow O(1) reorder between neighbors. |
| **Relay** | A server that forwards encrypted frames without being able to read them. |
| **Echo suppression** | Ignoring your own just-sent payload when it bounces back locally. |

### B. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-04 | Mexboard Team | Initial SRS. |
| 2.0 | 2026-04-25 | Mexboard Team | Source-verified rewrite. Corrected cloud-sync model, hotkey defaults, deletion model, favorites limit, i18n status, and storage schema. Added Proposed NFRs for accessibility, security hardening, reliability, and UX. Added test targets with measurable budgets. |
| 2.1 | 2026-04-25 | Mexboard Team | Added mobile companion (React Native), Cloudflare backend (Workers + Hono + better-auth + Durable Objects + D1 + R2 hybrid storage), per-device content-type subscriptions (§3.10), mDNS app-filter (§REQ-LAN-008), account & authentication requirements (§3.8), device management (§3.9), and the Cloudflare backend contract (Appendix F). Suggested additional features catalogued in Appendix E. |

### C. Corrections from Prior SRS (1.0 → 2.0)

The following 1.0 statements were **not** true when the codebase was audited:

1. **Cloud providers:** 1.0 claimed Google Drive / Dropbox / S3 with OAuth 2.0. Actual: WebSocket relay with E2E per-peer encryption; user-supplied URL and auth token.
2. **Hotkey default `Ctrl/Cmd+Shift+V`:** Actual defaults are platform-specific — `Shift+Meta+V` (mac), `Alt+Meta+V` (Windows), `Meta+V` (Linux), plus a full per-action keymap (`HOTKEY_META`).
3. **Files support:** 1.0 implied text + image + files. Actual: only text and image are persisted; file paths are detected and their MIME type is shown as a hint.
4. **Soft delete / 7-day trash:** Not implemented; single-step delete + Clear All.
5. **Favorites cap of 50:** Not implemented and not recommended.
6. **Local DB encryption:** Not implemented (DB is plaintext SQLite).
7. **i18n / multi-language:** Not implemented; no i18n library is present.
8. **Daily SQLite backup and JSON export:** Not implemented.
9. **Device sync log and cloud sync status tables:** Not present in the schema.
10. **`source_app` capture:** Column exists but is not populated.
11. **Custom date-range picker:** Only All/Today/Week/Month exist.
12. **TLS 1.3+ boilerplate:** `reqwest` uses `rustls-tls`; the specific protocol floor is a platform/library defaults matter and should be documented, not claimed.

### D. Open Issues & Future Work

- [ ] Browser extension (capture from web-app clipboard API).
- [ ] Local full-text index (FTS5) for faster large-history search.
- [ ] Encrypted DB at rest (SQLCipher) with OS-keychain master key.
- [ ] End-user data-deletion guide and "Delete all data" button in Settings → About.
- [ ] ML-assisted smart categorization (experimental, opt-in, fully on-device).

---

### E. Suggested Additional Features

Features proposed in v2.1 that are worth discussing before committing to the roadmap. Each is sized in rough effort and tagged by the design surface it touches.

**High value, low effort (S):**
1. **QR-pair for mobile** — desktop shows QR (LAN address + pairing code + app fingerprint); phone scans. `qrcode.react` already in deps.
2. **Send-to-device ("push mode")** — explicit one-shot send rather than ambient sync, for occasional cross-device transfers; reduces bandwidth and leak surface.
3. **Per-device name + emoji** — easy device disambiguation (e.g., "🖥️ Work Desktop", "📱 Pixel").
4. **Drag-to-send** — drag an item onto a device chip in the status bar to push it to that device only.
5. **Outgoing-only mode per device** — device sends but does not receive. Useful for a shared-computer scenario.

**High value, medium effort (M):**
6. **Offline-safe queue for sent items** — already implicit in the DO mailbox design, but surface UI state ("Queued — will send when [device] is online").
7. **Clipboard history sync filter rules** — regex or domain-based "never sync if content matches X" rules; runs client-side so the server never sees filtered content at all.
8. **Passphrase-encrypted backup export / import** — age-format archive with a user-supplied passphrase; works across devices and across account changes.
9. **Web portal (read-only)** — browse and download items via a browser login. The browser does the decryption locally (WebCrypto); the Worker only serves ciphertext.
10. **"Send to someone"** — one-shot encrypted links with a passphrase. Recipient does not need an account. TTL default 24 h, max 1 use.
11. **Content TTL rules per type** — "auto-expire secrets in 1 hour", "auto-expire images in 7 days", etc.
12. **Key-rotation ceremony** — scheduled or user-initiated; UX should make it feel routine, not alarming.
13. **Trusted network autopair** — remember "home Wi-Fi" and skip pairing code on known networks (opt-in).
14. **Apple Watch / Wear OS glance** — show last 3 items; tap to push to phone clipboard.

**Strategic (L):**
15. **Team / shared-room sync** — beyond personal account, a room that multiple accounts can join (design space similar to Signal groups; requires group-key ratcheting).
16. **Zero-knowledge encrypted search index** — `searchable encryption` / trapdoor scheme so the server can filter by type + hash without seeing plaintext. Complex but valuable.
17. **CLI companion (`mexctl`)** — headless send/receive; uses the same account credentials as the desktop. Great for scripting.
18. **Browser extension** — capture inside the browser clipboard sandbox, which normal clipboard managers cannot see.
19. **Snippet expansion** — favorite items can be triggered by text-expansion shortcuts (e.g., `;email` → pastes your email). Needs careful UX with the secret detector.
20. **Automation hooks** — per-item or global "on copy" hooks (e.g., run a sanitizer on detected credit-card numbers). Opt-in, sandboxed, cross-platform.

**Trust & recovery:**
21. **Paper recovery** — print-ready PDF of the recovery key with a QR + mnemonic.
22. **Second-factor enrollment** — WebAuthn / passkey for sign-in; not a replacement for the E2E recovery passphrase, but reduces account-takeover risk.
23. **"Forget my account" flow** — not just sign-out; delete-and-wipe with a 72 h grace window and confirmation from another trusted device.

**Observability for users:**
24. **Storage usage + content breakdown** — Settings → Account shows "X MB used of Y MB, Z% text / W% image" over time.
25. **Transfer log** — optional local log of what was sent/received to which device, encrypted, searchable only on-device.

### F. Cloudflare Backend Contract (Design Baseline)

Defined here so frontend, mobile, and backend teams share a single source of truth before implementation.

**Base URL:** `https://api.mexboard.app` (prod), `https://api.staging.mexboard.app` (staging).

**Auth:** better-auth; the client must include the session (cookie for web contexts, `Authorization: Bearer <token>` for native).

**REST (Hono routes) — non-exhaustive draft:**

| Method | Path | Purpose |
|---|---|---|
| `POST`   | `/auth/*` | better-auth endpoints (sign-up, sign-in, sessions, password reset, OAuth callbacks) |
| `GET`    | `/account/me` | Account summary, quota, device count |
| `GET`    | `/account/devices` | Device list with subscriptions |
| `PATCH`  | `/account/devices/:id` | Rename or update subscription |
| `DELETE` | `/account/devices/:id` | Revoke device |
| `GET`    | `/account/roster` | Signed device-public-key roster |
| `POST`   | `/account/roster/sign` | Submit a new device approval (signed by an existing trusted device) |
| `GET`    | `/account/audit?since=...` | Encrypted audit log feed |
| `POST`   | `/items` | Inline-payload upload (≤ 64 KB ciphertext) |
| `POST`   | `/items/:id/blob` | R2 upload URL for oversize payloads (single-use, short-TTL presigned or proxied PUT) |
| `GET`    | `/items/:id/blob` | R2 stream-through download for recipients |
| `DELETE` | `/items/:id` | Soft-delete item; Queues remove R2 blob |

**WebSocket:** `wss://api.mexboard.app/sync` (upgrades at Worker, forwards to the account Durable Object).

- Frames use the envelope in §REQ-CLOUD-004.
- First frame from server is `welcome { server_time, device_id, peers[], roster_version, cursor }`.
- Client heartbeats every 25 s; server hibernates sockets idle > 30 s (WebSocket Hibernation API).
- Errors are structured: `{ type: "error", code: "rate_limited" | "auth_expired" | "quota_exceeded" | "subscription_rejected" | "schema_unsupported", retryAfterMs?: number }`.

**D1 schema (sketch):**

```sql
-- Users are managed by better-auth; the columns below are the Mexboard extensions.
CREATE TABLE accounts (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL UNIQUE,            -- better-auth user id
  quota_bytes    INTEGER NOT NULL,
  used_bytes     INTEGER NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 30,
  root_pubkey    BLOB NOT NULL,                   -- Ed25519 root identity public key
  recovery_hash  TEXT NOT NULL,                   -- Argon2id verifier
  created_at     TEXT NOT NULL
);

CREATE TABLE devices (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL,                  -- "desktop-linux" | "ios" | ...
  identity_pubkey BLOB NOT NULL,                  -- Ed25519
  kex_pubkey      BLOB NOT NULL,                  -- X25519
  signed_by       TEXT NOT NULL,                  -- device id or "root"
  signature       BLOB NOT NULL,
  subscription    TEXT NOT NULL,                  -- JSON per §REQ-SUB-001
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL,
  revoked_at      TEXT
);

CREATE TABLE items (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  from_device  TEXT NOT NULL REFERENCES devices(id),
  content_type TEXT NOT NULL,                    -- "text" | "image"
  size         INTEGER NOT NULL,                 -- ciphertext bytes
  inline_ct    BLOB,                             -- NULL when stored in R2
  r2_key       TEXT,                             -- set when size > 64KB
  nonce        BLOB NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);
CREATE INDEX idx_items_account_time ON items(account_id, created_at DESC);

CREATE TABLE deliveries (
  item_id       TEXT NOT NULL REFERENCES items(id),
  device_id     TEXT NOT NULL REFERENCES devices(id),
  delivered_at  TEXT,
  PRIMARY KEY (item_id, device_id)
);

CREATE TABLE audit_log (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  actor_device TEXT REFERENCES devices(id),
  event_type   TEXT NOT NULL,
  ct_details   BLOB NOT NULL,                    -- encrypted to the account
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_audit_account_time ON audit_log(account_id, created_at DESC);
```

**R2 layout:**

- Bucket: `mexboard-prod` / `mexboard-staging`.
- Key: `accounts/<account_id>/items/<item_id>`.
- Object metadata: minimal (`schema=1`). No plaintext. No content-disposition/filename.
- Lifecycle: Queues-driven purge at `items.expires_at`; nightly orphan sweep matches R2 keys to D1 rows.

**Durable Object responsibilities:**

- One DO per `account_id` (single writer, ordered frames).
- In-memory state: connected sockets, last-seen `seq` per device, rate-limit counters.
- Persists to D1 for mailbox and audit; persists presence "last_seen" no more than once per 10 s to avoid write amplification.
- Hibernation: use the Hibernatable WebSocket API so idle accounts cost near-zero.

**Security invariants (must hold at all times):**

1. No endpoint returns plaintext clipboard content. Ever.
2. No R2 object is ever reachable without a valid better-auth session for the owning account.
3. The DO never accepts a frame from a device whose key is not in the current roster.
4. `expires_at` is enforced by both a Queues sweep and a read-time filter (belt + braces).
5. Logs redact `Authorization`, better-auth cookies, and any `ciphertext`/`payload` field.

---

**Document End**
