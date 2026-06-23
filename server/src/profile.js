/**
 * Player profiles — donut balance, owned cosmetics, equipped loadout.
 */

import { cleanUsername, getDb, usernameKey } from "./lib.js";
import {
  COSMETICS,
  DEFAULT_EQUIPPED,
  DEFAULT_OWNED,
  catalogForClient,
  isValidItem,
  itemType,
} from "./cosmetics.js";

function profileView(doc) {
  if (!doc) return null;
  const owned = Array.isArray(doc.owned) ? doc.owned : [...DEFAULT_OWNED];
  return {
    username: doc.username,
    donuts: Math.max(0, Math.floor(Number(doc.donuts) || 0)),
    owned: [...new Set([...DEFAULT_OWNED, ...owned])],
    equipped: { ...DEFAULT_EQUIPPED, ...(doc.equipped ?? {}) },
  };
}

export async function getProfile(username) {
  const cleanName = cleanUsername(username);
  if (!cleanName) return { ok: false, error: "Invalid username." };

  const db = await getDb();
  const key = usernameKey(cleanName);
  let doc = await db.collection("profiles").findOne({ key });

  if (!doc) {
    doc = {
      key,
      username: cleanName,
      donuts: 0,
      owned: [...DEFAULT_OWNED],
      equipped: { ...DEFAULT_EQUIPPED },
      ts: Date.now(),
    };
    await db.collection("profiles").insertOne(doc);
  }

  return {
    ok: true,
    profile: profileView(doc),
    catalog: catalogForClient(),
  };
}

export async function bankDonuts(username, amount) {
  const cleanName = cleanUsername(username);
  const add = Math.max(0, Math.floor(Number(amount) || 0));
  if (!cleanName) return { ok: false, error: "Invalid username." };
  if (add <= 0) return { ok: true, banked: 0 };

  const ensured = await getProfile(cleanName);
  if (!ensured.ok) return { ok: false, error: ensured.error || "Invalid username." };

  const db = await getDb();
  const key = usernameKey(cleanName);

  const update = await db.collection("profiles").updateOne(
    { key },
    { $inc: { donuts: add }, $set: { username: cleanName } }
  );

  if (update.matchedCount === 0) {
    return { ok: false, error: "Profile not found." };
  }

  const doc = await db.collection("profiles").findOne({ key });
  const profile = profileView(doc);
  if (!profile) return { ok: false, error: "Could not load profile after banking." };

  return { ok: true, banked: add, profile };
}

export async function buyItem(username, itemId) {
  const cleanName = cleanUsername(username);
  const id = String(itemId ?? "").trim();
  if (!cleanName) return { ok: false, error: "Invalid username." };
  if (!isValidItem(id)) return { ok: false, error: "Unknown item." };

  const item = COSMETICS[id];
  const db = await getDb();
  const key = usernameKey(cleanName);
  const doc = await db.collection("profiles").findOne({ key });

  if (!doc) {
    await getProfile(cleanName);
    return buyItem(cleanName, id);
  }

  if ((doc.owned ?? []).includes(id)) {
    return { ok: false, error: "Already owned." };
  }
  if ((doc.donuts ?? 0) < item.cost) {
    return { ok: false, error: "Not enough donuts." };
  }

  const update = await db.collection("profiles").updateOne(
    { key, donuts: { $gte: item.cost }, owned: { $ne: id } },
    {
      $inc: { donuts: -item.cost },
      $addToSet: { owned: id },
      $set: { username: cleanName },
    }
  );

  if (update.modifiedCount === 0) {
    const fresh = await db.collection("profiles").findOne({ key });
    if ((fresh?.owned ?? []).includes(id)) {
      return { ok: false, error: "Already owned." };
    }
    return { ok: false, error: "Not enough donuts." };
  }

  const updated = await db.collection("profiles").findOne({ key });
  const profile = profileView(updated);
  if (!profile) return { ok: false, error: "Could not update profile." };

  return { ok: true, profile };
}

export async function equipItem(username, itemId) {
  const cleanName = cleanUsername(username);
  const id = String(itemId ?? "").trim();
  if (!cleanName) return { ok: false, error: "Invalid username." };
  if (!isValidItem(id)) return { ok: false, error: "Unknown item." };

  const slot = itemType(id);
  if (!slot) return { ok: false, error: "Unknown item." };

  const db = await getDb();
  const key = usernameKey(cleanName);
  const doc = await db.collection("profiles").findOne({ key });

  if (!doc) {
    await getProfile(cleanName);
    return equipItem(cleanName, id);
  }
  if (!(doc.owned ?? DEFAULT_OWNED).includes(id)) {
    return { ok: false, error: "You don't own that item." };
  }

  const equipped = { ...DEFAULT_EQUIPPED, ...(doc.equipped ?? {}), [slot]: id };
  await db.collection("profiles").updateOne({ key }, { $set: { equipped, username: cleanName } });

  const updated = await db.collection("profiles").findOne({ key });
  const profile = profileView(updated);
  if (!profile) return { ok: false, error: "Could not update profile." };

  return { ok: true, profile };
}
