import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  InsertWabaAccount,
  WabaAccount,
  wabaAccounts,
  InsertBusinessProfile,
  BusinessProfile,
  businessProfiles,
  InsertWebhookConfiguration,
  WebhookConfiguration,
  webhookConfigurations,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { decrypt, encrypt } from "../encryption";

let _db: ReturnType<typeof drizzle> | null = null;

function withDecryptedToken(account: WabaAccount): WabaAccount {
  return { ...account, accessToken: decrypt(account.accessToken) };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// WhatsApp WABA Account queries
export async function createWabaAccount(
  data: InsertWabaAccount
): Promise<WabaAccount | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const persistedData = {
      ...data,
      accessToken: encrypt(data.accessToken),
    };
    const result = await db.insert(wabaAccounts).values(persistedData);
    const inserted = await db
      .select()
      .from(wabaAccounts)
      .where(eq(wabaAccounts.wabaId, data.wabaId))
      .limit(1);
    return inserted.length > 0 ? withDecryptedToken(inserted[0]) : null;
  } catch (error) {
    console.error("[Database] Failed to create WABA account:", error);
    throw error;
  }
}

export async function getWabaAccountByWabaId(
  wabaId: string
): Promise<WabaAccount | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(wabaAccounts)
    .where(eq(wabaAccounts.wabaId, wabaId))
    .limit(1);

  return result.length > 0 ? withDecryptedToken(result[0]) : null;
}

export async function getWabaAccountsByUserId(
  userId: number
): Promise<WabaAccount[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(wabaAccounts).where(eq(wabaAccounts.userId, userId));
}

export async function saveAccessToken(
  userId: number,
  rawToken: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const encryptedToken = encrypt(rawToken);
  await db
    .update(wabaAccounts)
    .set({ accessToken: encryptedToken })
    .where(eq(wabaAccounts.userId, userId));
}

export async function getAllWabaAccounts(): Promise<WabaAccount[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(wabaAccounts);
  } catch (error) {
    console.error("[Database] Failed to fetch all WABA accounts:", error);
    return [];
  }
}

export async function updateWabaAccount(
  wabaId: string,
  updates: Partial<InsertWabaAccount>
): Promise<WabaAccount | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const persistedUpdates = updates.accessToken
      ? { ...updates, accessToken: encrypt(updates.accessToken) }
      : updates;
    await db
      .update(wabaAccounts)
      .set(persistedUpdates)
      .where(eq(wabaAccounts.wabaId, wabaId));

    return getWabaAccountByWabaId(wabaId);
  } catch (error) {
    console.error("[Database] Failed to update WABA account:", error);
    throw error;
  }
}

// Business Profile queries
export async function createBusinessProfile(
  data: InsertBusinessProfile
): Promise<BusinessProfile | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(businessProfiles).values(data);
    const inserted = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, data.userId))
      .orderBy(t => t.createdAt)
      .limit(1);
    return inserted.length > 0 ? inserted[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create business profile:", error);
    throw error;
  }
}

export async function getBusinessProfileByUserId(
  userId: number
): Promise<BusinessProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateBusinessProfile(
  userId: number,
  updates: Partial<InsertBusinessProfile>
): Promise<BusinessProfile | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(businessProfiles)
      .set(updates)
      .where(eq(businessProfiles.userId, userId));

    return getBusinessProfileByUserId(userId);
  } catch (error) {
    console.error("[Database] Failed to update business profile:", error);
    throw error;
  }
}

// Webhook Configuration queries
export async function createWebhookConfiguration(
  data: InsertWebhookConfiguration
): Promise<WebhookConfiguration | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(webhookConfigurations).values(data);
    const inserted = await db
      .select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.wabaId, data.wabaId))
      .limit(1);
    return inserted.length > 0 ? inserted[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create webhook configuration:", error);
    throw error;
  }
}

export async function getWebhookConfigurationByWabaId(
  wabaId: string
): Promise<WebhookConfiguration | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(webhookConfigurations)
    .where(eq(webhookConfigurations.wabaId, wabaId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateWebhookConfiguration(
  wabaId: string,
  updates: Partial<InsertWebhookConfiguration>
): Promise<WebhookConfiguration | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(webhookConfigurations)
      .set(updates)
      .where(eq(webhookConfigurations.wabaId, wabaId));

    return getWebhookConfigurationByWabaId(wabaId);
  } catch (error) {
    console.error("[Database] Failed to update webhook configuration:", error);
    throw error;
  }
}

// TODO: add feature queries here as your schema grows.
