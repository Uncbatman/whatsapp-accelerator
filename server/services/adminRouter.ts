import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Admin-only router for managing onboarded businesses
 * All procedures require admin role
 */
export const adminRouter = router({
  /**
   * Get paginated list of all onboarded businesses
   */
  listBusinesses: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(10),
        sortBy: z.enum(["connectedAt", "businessName", "phoneNumber"]).default("connectedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        statusFilter: z.enum(["all", "approved", "pending"]).default("all"),
        searchQuery: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check admin role
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can access this endpoint",
        });
      }

      try {
        const allWabas = await db.getAllWabaAccounts();

        // Filter by status
        let filtered = allWabas;
        if (input.statusFilter === "approved") {
          filtered = filtered.filter((w) => w.displayNameStatus === "approved");
        } else if (input.statusFilter === "pending") {
          filtered = filtered.filter((w) => w.displayNameStatus === "pending");
        }

        // Filter by search query
        if (input.searchQuery) {
          const query = input.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (w) =>
              w.businessName?.toLowerCase().includes(query) ||
              w.phoneNumber?.toLowerCase().includes(query) ||
              w.wabaId.toLowerCase().includes(query)
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let aVal: any;
          let bVal: any;

          if (input.sortBy === "connectedAt") {
            aVal = a.createdAt?.getTime() || 0;
            bVal = b.createdAt?.getTime() || 0;
          } else {
            aVal = a[input.sortBy as keyof typeof a];
            bVal = b[input.sortBy as keyof typeof b];
          }

          if (aVal < bVal) return input.sortOrder === "asc" ? -1 : 1;
          if (aVal > bVal) return input.sortOrder === "asc" ? 1 : -1;
          return 0;
        });

        // Paginate
        const total = filtered.length;
        const offset = (input.page - 1) * input.limit;
        const items = filtered.slice(offset, offset + input.limit);

        return {
          items: items.map((w) => ({
            id: w.id,
            wabaId: w.wabaId,
            businessName: w.businessName,
            phoneNumber: w.phoneNumber,
            websiteUrl: w.websiteUrl,
            displayNameStatus: w.displayNameStatus,
            createdAt: w.createdAt,
            isActive: w.isActive,
            connectedAt: w.createdAt,
          })),
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to fetch businesses";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMsg,
        });
      }
    }),

  /**
   * Get detailed information about a specific business
   */
  getBusinessDetails: protectedProcedure
    .input(z.object({ wabaId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can access this endpoint",
        });
      }

      try {
        const waba = await db.getWabaAccountByWabaId(input.wabaId);
        if (!waba) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business not found",
          });
        }

        const webhook = await db.getWebhookConfigurationByWabaId(input.wabaId);

        return {
          id: waba.id,
          wabaId: waba.wabaId,
          businessName: waba.businessName,
          phoneNumber: waba.phoneNumber,
          websiteUrl: waba.websiteUrl,
          displayNameStatus: waba.displayNameStatus,
          createdAt: waba.createdAt,
          updatedAt: waba.updatedAt,
          isActive: waba.isActive,
          webhook: webhook
            ? {
                url: webhook.webhookUrl,
                isVerified: webhook.isVerified,
                createdAt: webhook.createdAt,
              }
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Failed to fetch business details";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMsg,
        });
      }
    }),

  /**
   * Get admin dashboard statistics
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can access this endpoint",
      });
    }

    try {
      const allWabas = await db.getAllWabaAccounts();

      const totalBusinesses = allWabas.length;
      const approvedCount = allWabas.filter((w) => w.displayNameStatus === "approved").length;
      const pendingCount = allWabas.filter((w) => w.displayNameStatus === "pending").length;
      const rejectedCount = allWabas.filter((w) => w.displayNameStatus === "rejected").length;
      const activeCount = allWabas.filter((w) => w.isActive === 1).length;

      // Get recent connections (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentConnections = allWabas.filter((w) => w.createdAt > sevenDaysAgo).length;

      return {
        totalBusinesses,
        approvedCount,
        pendingCount,
        rejectedCount,
        activeCount,
        recentConnections,
        approvalRate: totalBusinesses > 0 ? ((approvedCount / totalBusinesses) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch statistics";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMsg,
      });
    }
  }),

  /**
   * Disconnect a business account
   */
  disconnectBusiness: protectedProcedure
    .input(z.object({ wabaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can perform this action",
        });
      }

      try {
        await db.updateWabaAccount(input.wabaId, { isActive: 0 });

        return { success: true, message: "Business disconnected successfully" };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to disconnect business";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMsg,
        });
      }
    }),

  /**
   * Send a test WhatsApp message to verify connection
   */
  sendTestMessage: protectedProcedure
    .input(
      z.object({
        wabaId: z.string(),
        phoneNumber: z.string(),
        message: z.string().min(1).max(1024),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can send test messages",
        });
      }

      try {
        // Get the WABA account to verify it exists and is active
        const waba = await db.getWabaAccountByWabaId(input.wabaId);
        if (!waba) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Business not found",
          });
        }

        if (!waba.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Business account is not active",
          });
        }

        // Use Meta API service to send test message
        const { MetaApiService } = await import("./metaApiService");
        const metaService = new MetaApiService(
          process.env.META_APP_ID || "",
          process.env.META_APP_SECRET || ""
        );

        const result = await metaService.sendTestMessage(
          waba.phoneNumberId,
          input.phoneNumber,
          waba.accessToken,
          input.message
        );

        return {
          success: result.success,
          messageId: result.messageId,
          message: "Test message sent successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Failed to send test message";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMsg,
        });
      }
    }),

  /**
   * Export businesses list as JSON
   */
  exportBusinesses: protectedProcedure
    .input(
      z.object({
        statusFilter: z.enum(["all", "approved", "pending"]).default("all"),
        format: z.enum(["json", "csv"]).default("json"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can export data",
        });
      }

      try {
        let allWabas = await db.getAllWabaAccounts();

        // Filter by status
        if (input.statusFilter === "approved") {
          allWabas = allWabas.filter((w) => w.displayNameStatus === "approved");
        } else if (input.statusFilter === "pending") {
          allWabas = allWabas.filter((w) => w.displayNameStatus !== "approved");
        }

        const data = allWabas.map((w) => ({
          businessName: w.businessName,
          phoneNumber: w.phoneNumber,
          wabaId: w.wabaId,
          websiteUrl: w.websiteUrl,
          status: w.displayNameStatus,
          connectedAt: w.createdAt.toISOString(),
          isActive: w.isActive === 1 ? "Yes" : "No",
        }));

        if (input.format === "csv") {
          const headers = Object.keys(data[0] || {});
          const csv = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((h) => {
                const val = row[h as keyof typeof row];
                return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
              })
            ),
          ].join("\n");

          return { data: csv, format: "csv" };
        }

        return { data: JSON.stringify(data, null, 2), format: "json" };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to export businesses";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMsg,
        });
      }
    }),
});
