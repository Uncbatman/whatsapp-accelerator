import type { Request, Response } from "express";
import * as db from "../db";

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
  try {
    const raw = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body ?? {});
    const payload = JSON.parse(raw) as {
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
          console.info("[WhatsApp] Incoming messages", {
            wabaId,
            count: value.messages.length,
          });
        if (value?.statuses?.length)
          console.info("[WhatsApp] Message statuses", {
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
