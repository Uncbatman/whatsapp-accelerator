import { notifyOwner } from "../_core/notification";

export interface OnboardingNotification {
  businessName: string;
  phoneNumber: string;
  wabaId: string;
  websiteUrl: string;
  connectedAt: Date;
}

/**
 * Send notification to app owner when a new business successfully onboards
 */
export async function notifyOwnerOfNewOnboarding(data: OnboardingNotification): Promise<boolean> {
  try {
    const content = `
New WhatsApp Business Account Connected:

**Business Name:** ${data.businessName}
**Phone Number:** ${data.phoneNumber}
**WABA ID:** ${data.wabaId}
**Website:** ${data.websiteUrl}
**Connected At:** ${data.connectedAt.toLocaleString()}

The business is now ready to send and receive WhatsApp messages. Display name approval is pending Meta's review.
    `.trim();

    return await notifyOwner({
      title: "🎉 New WhatsApp Business Connected",
      content,
    });
  } catch (error) {
    console.error("Failed to send owner notification:", error);
    return false;
  }
}

/**
 * Send notification when a business's display name is approved
 */
export async function notifyOwnerOfApproval(businessName: string, wabaId: string): Promise<boolean> {
  try {
    return await notifyOwner({
      title: "✅ WhatsApp Display Name Approved",
      content: `The display name for ${businessName} (WABA ID: ${wabaId}) has been approved by Meta and is now fully active.`,
    });
  } catch (error) {
    console.error("Failed to send approval notification:", error);
    return false;
  }
}

/**
 * Send notification when a business's display name is rejected
 */
export async function notifyOwnerOfRejection(businessName: string, wabaId: string, reason?: string): Promise<boolean> {
  try {
    const reasonText = reason ? `\n\nReason: ${reason}` : "";
    return await notifyOwner({
      title: "⚠️ WhatsApp Display Name Rejected",
      content: `The display name for ${businessName} (WABA ID: ${wabaId}) was rejected by Meta.${reasonText}\n\nPlease review and resubmit with a compliant display name.`,
    });
  } catch (error) {
    console.error("Failed to send rejection notification:", error);
    return false;
  }
}
