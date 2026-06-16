import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * WhatsApp Business Account (WABA) storage.
 * Stores the connection details for each business's WhatsApp integration.
 */
export const wabaAccounts = mysqlTable("waba_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  wabaId: varchar("wabaId", { length: 64 }).notNull().unique(),
  phoneNumberId: varchar("phoneNumberId", { length: 64 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  websiteUrl: varchar("websiteUrl", { length: 2048 }),
  accessToken: text("accessToken").notNull(), // Encrypted in production
  refreshToken: text("refreshToken"), // If applicable
  displayNameStatus: mysqlEnum("displayNameStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  webhookUrl: varchar("webhookUrl", { length: 2048 }),
  webhookVerifyToken: varchar("webhookVerifyToken", { length: 255 }),
  isActive: int("isActive").default(1).notNull(), // 1 = true, 0 = false
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WabaAccount = typeof wabaAccounts.$inferSelect;
export type InsertWabaAccount = typeof wabaAccounts.$inferInsert;

/**
 * Webhook configurations for incoming WhatsApp messages.
 * Tracks webhook setup status and verification details.
 */
export const webhookConfigurations = mysqlTable("webhook_configurations", {
  id: int("id").autoincrement().primaryKey(),
  wabaId: varchar("wabaId", { length: 64 }).notNull().unique().references(() => wabaAccounts.wabaId, { onDelete: "cascade" }),
  webhookUrl: varchar("webhookUrl", { length: 2048 }).notNull(),
  verifyToken: varchar("verifyToken", { length: 255 }).notNull(),
  isVerified: int("isVerified").default(0).notNull(),
  subscribedFields: text("subscribedFields"), // JSON array of subscribed webhook fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type InsertWebhookConfiguration = typeof webhookConfigurations.$inferInsert;

/**
 * Business profiles for pre-flight validation.
 * Stores website URLs and validation results.
 */
export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  websiteUrl: varchar("websiteUrl", { length: 2048 }).notNull(),
  hasPrivacyPolicy: int("hasPrivacyPolicy").default(0).notNull(),
  hasTermsOfService: int("hasTermsOfService").default(0).notNull(),
  validationStatus: mysqlEnum("validationStatus", ["pending", "valid", "invalid"]).default("pending").notNull(),
  lastValidatedAt: timestamp("lastValidatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;