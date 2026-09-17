import axios from "axios";

const META_GRAPH_API_BASE =
  process.env.META_GRAPH_API_BASE || "https://graph.facebook.com";
const META_API_VERSION = process.env.META_API_VERSION || "v21.0";

interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}
interface WABAInfoResponse {
  id: string;
  name: string;
  phone_number_id: string;
  display_phone_number: string;
  display_name_status?: string;
}
interface WebhookRegisterResponse {
  success: boolean;
}

export class MetaApiService {
  constructor(
    private appId: string,
    private appSecret: string
  ) {}
  private url(path: string) {
    return `${META_GRAPH_API_BASE}/${META_API_VERSION}/${path.replace(/^\//, "")}`;
  }
  private auth(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<TokenExchangeResponse> {
    try {
      const response = await axios.get(
        `${META_GRAPH_API_BASE}/oauth/access_token`,
        {
          params: {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: redirectUri,
            code,
          },
        }
      );
      if (!response.data?.access_token)
        throw new Error("Meta returned no access token");
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to exchange code for token: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  async getWABAInfo(accessToken: string): Promise<WABAInfoResponse> {
    try {
      const accounts = await axios.get(
        this.url("me/whatsapp_business_accounts"),
        { headers: this.auth(accessToken) }
      );
      const waba = accounts.data?.data?.[0];
      if (!waba?.id) throw new Error("No WhatsApp Business Accounts found");
      const phones = await axios.get(this.url(`${waba.id}/phone_numbers`), {
        headers: this.auth(accessToken),
        params: { fields: "id,display_phone_number,verified_name,status" },
      });
      const phone = phones.data?.data?.[0];
      if (!phone?.id || !phone.display_phone_number)
        throw new Error("No WhatsApp phone number found");
      return {
        id: waba.id,
        name: waba.name || "",
        phone_number_id: phone.id,
        display_phone_number: phone.display_phone_number,
        display_name_status: phone.verified_name ? phone.status : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve WABA information: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  async registerWebhook(
    wabaId: string,
    _webhookUrl: string,
    accessToken: string
  ): Promise<WebhookRegisterResponse> {
    try {
      const response = await axios.post(
        this.url(`${wabaId}/subscribed_apps`),
        {},
        { headers: this.auth(accessToken) }
      );
      return { success: response.data?.success !== false };
    } catch (error) {
      throw new Error(
        `Failed to register webhook: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  async sendTestMessage(
    phoneNumberId: string,
    recipientPhone: string,
    accessToken: string,
    messageText?: string
  ) {
    const payload = messageText
      ? {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: { body: messageText },
        }
      : {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        };
    try {
      const response = await axios.post(
        this.url(`${phoneNumberId}/messages`),
        payload,
        { headers: this.auth(accessToken) }
      );
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error) {
      throw new Error(
        `Failed to send test message: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  async getWABAStatus(wabaId: string, accessToken: string): Promise<string> {
    const response = await axios.get(this.url(wabaId), {
      params: { fields: "account_review_status,quality_rating" },
      headers: this.auth(accessToken),
    });
    const status = response.data?.account_review_status;
    return status === "APPROVED"
      ? "Fully Approved"
      : status === "REJECTED"
        ? "Rejected"
        : "Pending Review";
  }
}

export const metaApiService = new MetaApiService(
  process.env.META_APP_ID || "",
  process.env.META_APP_SECRET || ""
);
