import axios from "axios";

const META_GRAPH_API_BASE = "https://graph.instagram.com";
const META_API_VERSION = "v18.0";

interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface WABAInfoResponse {
  id: string;
  name: string;
  phone_number_id: string;
  business_account_id: string;
  currency: string;
}

interface WebhookRegisterResponse {
  success: boolean;
}

export class MetaApiService {
  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  /**
   * Exchange authorization code for long-lived access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResponse> {
    try {
      const response = await axios.get(`${META_GRAPH_API_BASE}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      return response.data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Token exchange failed";
      throw new Error(`Failed to exchange code for token: ${errorMsg}`);
    }
  }

  /**
   * Get WABA info from access token
   */
  async getWABAInfo(accessToken: string): Promise<WABAInfoResponse> {
    try {
      const response = await axios.get(`${META_GRAPH_API_BASE}/${META_API_VERSION}/me/whatsapp_business_accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error("No WhatsApp Business Accounts found");
      }

      const waba = response.data.data[0];
      return {
        id: waba.id,
        name: waba.name,
        phone_number_id: waba.phone_number_id,
        business_account_id: waba.business_account_id,
        currency: waba.currency,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to get WABA info";
      throw new Error(`Failed to retrieve WABA information: ${errorMsg}`);
    }
  }

  /**
   * Register webhook URL with Meta
   */
  async registerWebhook(
    wabaId: string,
    webhookUrl: string,
    accessToken: string
  ): Promise<WebhookRegisterResponse> {
    try {
      const response = await axios.post(
        `${META_GRAPH_API_BASE}/${META_API_VERSION}/${wabaId}/subscribed_apps`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Update webhook URL
      await axios.post(
        `${META_GRAPH_API_BASE}/${META_API_VERSION}/${wabaId}/webhooks`,
        {
          url: webhookUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Webhook registration failed";
      throw new Error(`Failed to register webhook: ${errorMsg}`);
    }
  }

  /**
   * Send test message to verify connection
   */
  async sendTestMessage(
    phoneNumberId: string,
    recipientPhone: string,
    accessToken: string
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await axios.post(
        `${META_GRAPH_API_BASE}/${META_API_VERSION}/${phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: {
            name: "hello_world",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to send test message";
      throw new Error(`Failed to send test message: ${errorMsg}`);
    }
  }

  /**
   * Get WABA status (approval status)
   */
  async getWABAStatus(wabaId: string, accessToken: string): Promise<string> {
    try {
      const response = await axios.get(`${META_GRAPH_API_BASE}/${META_API_VERSION}/${wabaId}`, {
        params: {
          fields: "account_review_status,quality_rating",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const status = response.data.account_review_status;
      if (status === "APPROVED") {
        return "Fully Approved";
      } else if (status === "PENDING_REVIEW") {
        return "Pending Review";
      } else if (status === "REJECTED") {
        return "Rejected";
      }
      return "Pending Review";
    } catch (error) {
      // Default to pending if we can't fetch status
      return "Pending Review";
    }
  }
}

// Export singleton instance
export const metaApiService = new MetaApiService(
  process.env.META_APP_ID || "",
  process.env.META_APP_SECRET || ""
);
