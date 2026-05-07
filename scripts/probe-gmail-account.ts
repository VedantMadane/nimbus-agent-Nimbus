/**
 * One-off read-only probe to identify which Google account the stored Gmail
 * OAuth token is bound to. Prints the account email and the HTTP status of
 * users/me/profile and users/me/messages?maxResults=1.
 *
 * Run: bun run scripts/probe-gmail-account.ts
 *
 * Never prints access_token / refresh_token. Delete after diagnosis.
 */

import { join } from "node:path";

import { DpapiVault } from "../packages/gateway/src/vault/win32.ts";

if (process.platform !== "win32") {
  console.error("This probe is Windows-only. Adapt to Keychain/libsecret if needed.");
  process.exit(2);
}

const appData = process.env["APPDATA"];
if (appData === undefined || appData === "") {
  console.error("APPDATA is not set");
  process.exit(2);
}
const configDir = join(appData, "Nimbus");

const vault = new DpapiVault({ configDir } as never);

async function readGmailOAuth(): Promise<string | null> {
  const perService = await vault.get("google_gmail.oauth");
  if (perService !== null && perService !== "") {
    console.log("[probe] vault key: google_gmail.oauth (per-service)");
    return perService;
  }
  const shared = await vault.get("google.oauth");
  if (shared !== null && shared !== "") {
    console.log("[probe] vault key: google.oauth (legacy shared)");
    return shared;
  }
  return null;
}

type Stored = { accessToken: string; refreshToken: string; expiresAt: number };

function parseStored(raw: string): Stored {
  const o = JSON.parse(raw) as Record<string, unknown>;
  const accessToken = o["accessToken"];
  const refreshToken = o["refreshToken"];
  const expiresAt = o["expiresAt"];
  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("missing accessToken");
  }
  if (typeof refreshToken !== "string" || refreshToken === "") {
    throw new Error("missing refreshToken");
  }
  if (typeof expiresAt !== "number") {
    throw new Error("missing expiresAt");
  }
  return { accessToken, refreshToken, expiresAt };
}

async function probe(token: string, url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.text();
  return { status: res.status, body };
}

const raw = await readGmailOAuth();
if (raw === null) {
  console.error("[probe] no Gmail OAuth token in vault — run: nimbus connector auth gmail");
  process.exit(1);
}

const parsed = parseStored(raw);
const expSec = Math.round((parsed.expiresAt - Date.now()) / 1000);
console.log(`[probe] token expires in ${String(expSec)}s`);
if (expSec < 0) {
  console.error(
    "[probe] token is expired — run any sync (it auto-refreshes) then re-run this probe",
  );
  process.exit(1);
}

const profile = await probe(
  parsed.accessToken,
  "https://gmail.googleapis.com/gmail/v1/users/me/profile",
);
console.log(`[probe] users/me/profile -> HTTP ${String(profile.status)}`);
if (profile.status === 200) {
  const j = JSON.parse(profile.body) as Record<string, unknown>;
  const email = typeof j["emailAddress"] === "string" ? j["emailAddress"] : "(missing)";
  console.log(`[probe] account: ${email}`);
} else {
  console.log(`[probe] profile body: ${profile.body.slice(0, 300)}`);
}

// Reproduce the exact sequence the connector runs on first sync.
const listUrl =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than%3A30d";
const list = await probe(parsed.accessToken, listUrl);
console.log(`[probe] messages.list q=newer_than:30d&maxResults=50 -> HTTP ${String(list.status)}`);
if (list.status !== 200) {
  console.log(`[probe] messages body: ${list.body.slice(0, 400)}`);
  process.exit(0);
}

const listJson = JSON.parse(list.body) as {
  messages?: Array<{ id?: string; threadId?: string }>;
  resultSizeEstimate?: number;
};
const ids = (listJson.messages ?? [])
  .map((m) => (typeof m.id === "string" ? m.id : ""))
  .filter((s) => s !== "");
console.log(`[probe] list returned ${String(ids.length)} message ids`);

let firstFailure: { id: string; status: number; body: string } | null = null;
let okCount = 0;
for (const id of ids) {
  const u = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
  );
  u.searchParams.set("format", "metadata");
  u.searchParams.append("metadataHeaders", "Subject");
  u.searchParams.append("metadataHeaders", "From");
  u.searchParams.append("metadataHeaders", "To");
  const r = await probe(parsed.accessToken, u.toString());
  if (r.status !== 200) {
    firstFailure = { id, status: r.status, body: r.body };
    break;
  }
  okCount += 1;
}

console.log(`[probe] per-message metadata: ${String(okCount)} ok before any failure`);

// Replay the actual delta-phase call that the connector is making.
const histUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
histUrl.searchParams.set("startHistoryId", "12625616");
histUrl.searchParams.set("maxResults", "100");
for (const ht of ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"]) {
  histUrl.searchParams.append("historyTypes", ht);
}
const hist = await probe(parsed.accessToken, histUrl.toString());
console.log(`[probe] history.list startHistoryId=12625616 -> HTTP ${String(hist.status)}`);
if (hist.status !== 200) {
  console.log(`[probe] history body: ${hist.body.slice(0, 300)}`);
} else {
  const histJson = JSON.parse(hist.body) as {
    history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>;
    historyId?: string;
  };
  const addedIds: string[] = [];
  for (const rec of histJson.history ?? []) {
    for (const a of rec.messagesAdded ?? []) {
      const id = a.message?.id;
      if (typeof id === "string" && id !== "") {
        addedIds.push(id);
      }
    }
  }
  console.log(`[probe] history reports ${String(addedIds.length)} messagesAdded ids`);
  let firstAddedFail: { id: string; status: number } | null = null;
  let okAdded = 0;
  for (const id of addedIds) {
    const u = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
    );
    u.searchParams.set("format", "metadata");
    u.searchParams.append("metadataHeaders", "Subject");
    u.searchParams.append("metadataHeaders", "From");
    u.searchParams.append("metadataHeaders", "To");
    const r = await probe(parsed.accessToken, u.toString());
    if (r.status !== 200) {
      firstAddedFail = { id, status: r.status };
      break;
    }
    okAdded += 1;
  }
  console.log(`[probe] messagesAdded metadata: ${String(okAdded)} ok before any failure`);
  if (firstAddedFail !== null) {
    console.log(
      `[probe] first failure: id=${firstAddedFail.id} -> HTTP ${String(firstAddedFail.status)}`,
    );
    if (firstAddedFail.status === 404) {
      console.log("");
      console.log(
        "[verdict] CONFIRMED: history.list reports messages that messages.get cannot resolve.",
      );
      console.log("[verdict] gmail-sync.ts:242 (gmailHistoryApplyAdded) does not tolerate 404.");
    }
  }
}

if (firstFailure !== null) {
  console.log(
    `[probe] first failure: id=${firstFailure.id} -> HTTP ${String(firstFailure.status)}`,
  );
  console.log(`[probe] body: ${firstFailure.body.slice(0, 400)}`);
  if (firstFailure.status === 404) {
    console.log("");
    console.log(
      "[verdict] messages.list returned an id that messages.get cannot resolve. Real bug:",
    );
    console.log("[verdict] gmail-sync.ts:329 (and :242) does not tolerate per-message 404s.");
    console.log("[verdict] Workaround: skip the bad id; fix is in gmail-sync.ts.");
  }
}
