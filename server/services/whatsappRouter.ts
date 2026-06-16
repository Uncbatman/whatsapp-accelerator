import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { metaApiService } from "./metaApiService";
import { notifyOwnerOfNewOnboarding } from "./notificationService";
import * as db from "../db";

export const whatsappRouter = router({
  /**
   * Exchange Meta authorization code for access token and set up WABA
   */
  exchangeCodeForToken: publicProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string().url(),
        websiteUrl: z.string().url(),
        businessName: z.string(),
        phoneNumber: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Step 1: Exchange code for token
        const tokenResponse = await metaApiService.exchangeCodeForToken(input.code, input.redirectUri);

        // Step 2: Get WABA info
        const wabaInfo = await metaApiService.getWABAInfo(tokenResponse.access_token);

        // Step 3: Save to database (using system user ID 1 for now)
        const wabaAccount = await db.createWabaAccount({
          userId: 1, // System user - in production, use ctx.user.id
          wabaId: wabaInfo.id,
          phoneNumberId: wabaInfo.phone_number_id,
          phoneNumber: input.phoneNumber,
          businessName: input.businessName,
          websiteUrl: input.websiteUrl,
          accessToken: tokenResponse.access_token,
          displayNameStatus: "pending",
          webhookUrl: null,
          webhookVerifyToken: null,
          isActive: 1,
        });

        if (!wabaAccount) {
          throw new Error("Failed to save WABA account");
        }

        // Notify owner of new onboarding
        await notifyOwnerOfNewOnboarding({
          businessName: input.businessName,
          phoneNumber: input.phoneNumber,
          wabaId: wabaAccount.wabaId,
          websiteUrl: input.websiteUrl,
          connectedAt: new Date(),
        });

        return {
          success: true,
          wabaId: wabaAccount.wabaId,
          phoneNumberId: wabaAccount.phoneNumberId,
          displayNameStatus: wabaAccount.displayNameStatus,
          accessToken: wabaAccount.accessToken,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Token exchange failed";
        throw new Error(errorMsg);
      }
    }),

  /**
   * Register webhook URL with Meta for incoming messages
   */
  registerWebhook: publicProcedure
    .input(
      z.object({
        wabaId: z.string(),
        webhookUrl: z.string().url(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await metaApiService.registerWebhook(input.wabaId, input.webhookUrl, input.accessToken);

        // Generate verify token
        const verifyToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Save webhook configuration
        await db.createWebhookConfiguration({
          wabaId: input.wabaId,
          webhookUrl: input.webhookUrl,
          verifyToken,
          isVerified: 0,
        });

        return { success: true, verifyToken };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Webhook registration failed";
        throw new Error(errorMsg);
      }
    }),

  /**
   * Send test message to verify connection
   */
  sendTestMessage: publicProcedure
    .input(
      z.object({
        phoneNumberId: z.string(),
        recipientPhone: z.string(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await metaApiService.sendTestMessage(
          input.phoneNumberId,
          input.recipientPhone,
          input.accessToken
        );

        return {
          success: result.success,
          messageId: result.messageId,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to send test message";
        throw new Error(errorMsg);
      }
    }),

  /**
   * Get WABA connection status
   */
  getConnectionStatus: publicProcedure
    .input(z.object({ wabaId: z.string(), accessToken: z.string() }))
    .query(async ({ input }) => {
      try {
        const status = await metaApiService.getWABAStatus(input.wabaId, input.accessToken);

        return {
          status,
          isFullyApproved: status === "Fully Approved",
        };
      } catch (error) {
        return {
          status: "Pending Review",
          isFullyApproved: false,
        };
      }
    }),

  /**
   * Get WABA account details
   */
  getWABADetails: publicProcedure
    .input(z.object({ wabaId: z.string() }))
    .query(async ({ input }) => {
      try {
        const waba = await db.getWabaAccountByWabaId(input.wabaId);
        if (!waba) {
          throw new Error("WABA account not found");
        }

        return {
          wabaId: waba.wabaId,
          phoneNumberId: waba.phoneNumberId,
          phoneNumber: waba.phoneNumber,
          businessName: waba.businessName,
          displayNameStatus: waba.displayNameStatus,
          webhookUrl: waba.webhookUrl,
          createdAt: waba.createdAt,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to fetch WABA details";
        throw new Error(errorMsg);
      }
    }),
});
