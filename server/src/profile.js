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
  return {
    username: doc.username,
    donuts: doc.donuts ?? 0,
    owned: doc.owned ?? [...DEFAULT_OWNED],
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
  const donuts = Math.max(0, Math.floor(Number(amount) || 0));
  if (!cleanName || donuts <= 0) return { ok: true, banked: 0 };

  const db = await getDb();
  const key = usernameKey(cleanName);
  const result = await db.collection("profiles").findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        key,
        username: cleanName,
        owned: [...DEFAULT_OWNED],
        equipped: { ...DEFAULT_EQUIPPED },
        ts: Date.now(),
      },
      $inc: { donuts },
      $set: { username: cleanName },
    },
    { upsert: true, returnDocument: "after" }
  );

  const doc = result ?? (await db.collection("profiles").findOne({ key }));
  if (!doc) {
    return { ok: false, error: "Could not save donuts." };
  }

  return { ok: true, banked: donuts, profile: profileView(doc) };
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

  const updated = await db.collection("profiles").findOneAndUpdate(
    { key, donuts: { $gte: item.cost }, owned: { $ne: id } },
    {
      $inc: { donuts: -item.cost },
      $addToSet: { owned: id },
      $set: { username: cleanName },
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    const fresh = await db.collection("profiles").findOne({ key });
    if ((fresh?.owned ?? []).includes(id)) {
      return { ok: false, error: "Already owned." };
    }
    return { ok: false, error: "Not enough donuts." };
  }

  return { ok: true, profile: profileView(updated) };
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
  const updated = await db.collection("profiles").findOneAndUpdate(
    { key },
    { $set: { equipped, username: cleanName } },
    { returnDocument: "after" }
  );

  return { ok: true, profile: profileView(updated) };
}
