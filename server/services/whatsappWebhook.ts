import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as db from "../db";

function isValidSignature(
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature || !process.env.META_APP_SECRET) return false;
  const expected = `sha256=${createHmac("sha256", process.env.META_APP_SECRET).update(rawBody).digest("hex")}`;
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return (
    received.length === calculated.length &&
    timingSafeEqual(received, calculated)
  );
}

export async function verifyWhatsAppWebhook(req: Request, res: Response) {
  const wabaId = String(req.params.wabaId || "");
  const config = await db.getWebhookConfigurationByWabaId(wabaId);
  if (!config) return res.sendStatus(404);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (
    mode === "subscribe" &&
    token === config.verifyToken &&
    typeof challenge === "string"
  ) {
    await db.updateWebhookConfiguration(wabaId, { isVerified: 1 });
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

export async function receiveWhatsAppWebhook(req: Request, res: Response) {
  const wabaId = String(req.params.wabaId || "");
  const account = await db.getWabaAccountByWabaId(wabaId);
  if (!account || !account.isActive) return res.sendStatus(404);
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  if (!isValidSignature(rawBody, req.header("x-hub-signature-256")))
    return res.sendStatus(401);
  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      object?: string;
      entry?: Array<{
        changes?: Array<{
          value?: { messages?: unknown[]; statuses?: unknown[] };
        }>;
      }>;
    };
    if (payload.object !== "whatsapp_business_account")
      return res.sendStatus(400);
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (value?.messages?.length)
          console.info("[WhatsApp] Received message event", {
            wabaId,
            count: value.messages.length,
          });
        if (value?.statuses?.length)
          console.info("[WhatsApp] Received status event", {
            wabaId,
            count: value.statuses.length,
          });
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error("[WhatsApp] Invalid webhook payload", error);
    return res.sendStatus(400);
  }
}
