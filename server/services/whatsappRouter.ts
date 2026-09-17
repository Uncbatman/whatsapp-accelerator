import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { metaApiService } from "./metaApiService";
import { notifyOwnerOfNewOnboarding } from "./notificationService";
import * as db from "../db";
import { randomBytes } from "node:crypto";

async function ownedAccount(userId: number, wabaId: string) {
  const account = await db.getWabaAccountByWabaId(wabaId);
  if (!account)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "WABA account not found",
    });
  if (account.userId !== userId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not own this WABA account",
    });
  return account;
}

export const whatsappRouter = router({
  exchangeCodeForToken: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
        redirectUri: z.string().url(),
        websiteUrl: z.string().url(),
        businessName: z.string().trim().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenResponse = await metaApiService.exchangeCodeForToken(
        input.code,
        input.redirectUri
      );
      const wabaInfo = await metaApiService.getWABAInfo(
        tokenResponse.access_token
      );
      const wabaAccount = await db.createWabaAccount({
        userId: ctx.user.id,
        wabaId: wabaInfo.id,
        phoneNumberId: wabaInfo.phone_number_id,
        phoneNumber: wabaInfo.display_phone_number,
        businessName: input.businessName,
        websiteUrl: input.websiteUrl,
        accessToken: tokenResponse.access_token,
        displayNameStatus:
          wabaInfo.display_name_status === "APPROVED" ? "approved" : "pending",
        webhookUrl: null,
        webhookVerifyToken: null,
        isActive: 1,
      });
      if (!wabaAccount)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save WABA account",
        });
      await notifyOwnerOfNewOnboarding({
        businessName: input.businessName,
        phoneNumber: wabaInfo.display_phone_number,
        wabaId: wabaAccount.wabaId,
        websiteUrl: input.websiteUrl,
        connectedAt: new Date(),
      });
      return {
        success: true,
        wabaId: wabaAccount.wabaId,
        phoneNumberId: wabaAccount.phoneNumberId,
        phoneNumber: wabaAccount.phoneNumber,
        businessName: wabaAccount.businessName,
        displayNameStatus: wabaAccount.displayNameStatus,
      };
    }),

  registerWebhook: protectedProcedure
    .input(
      z.object({ wabaId: z.string().min(1), webhookUrl: z.string().url() })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ownedAccount(ctx.user.id, input.wabaId);
      const verifyToken = randomBytes(32).toString("hex");
      await metaApiService.registerWebhook(
        account.wabaId,
        input.webhookUrl,
        account.accessToken
      );
      await db.createWebhookConfiguration({
        wabaId: account.wabaId,
        webhookUrl: input.webhookUrl,
        verifyToken,
        isVerified: 0,
      });
      await db.updateWabaAccount(account.wabaId, {
        webhookUrl: input.webhookUrl,
        webhookVerifyToken: verifyToken,
      });
      return { success: true };
    }),

  sendTestMessage: protectedProcedure
    .input(
      z.object({
        wabaId: z.string().min(1),
        recipientPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
        message: z.string().trim().min(1).max(1024).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ownedAccount(ctx.user.id, input.wabaId);
      const result = await metaApiService.sendTestMessage(
        account.phoneNumberId,
        input.recipientPhone,
        account.accessToken,
        input.message
      );
      return { success: result.success, messageId: result.messageId };
    }),

  getConnectionStatus: protectedProcedure
    .input(z.object({ wabaId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const account = await ownedAccount(ctx.user.id, input.wabaId);
      const status = await metaApiService.getWABAStatus(
        account.wabaId,
        account.accessToken
      );
      return { status, isFullyApproved: status === "Fully Approved" };
    }),

  getWABADetails: protectedProcedure
    .input(z.object({ wabaId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const waba = await ownedAccount(ctx.user.id, input.wabaId);
      return {
        wabaId: waba.wabaId,
        phoneNumberId: waba.phoneNumberId,
        phoneNumber: waba.phoneNumber,
        businessName: waba.businessName,
        displayNameStatus: waba.displayNameStatus,
        webhookUrl: waba.webhookUrl,
        createdAt: waba.createdAt,
      };
    }),
});
