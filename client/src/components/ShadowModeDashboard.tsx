import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ShadowModeDashboardProps {
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayNameStatus: string;
}

export function ShadowModeDashboard({
  wabaId,
  phoneNumberId,
  phoneNumber,
  displayNameStatus,
}: ShadowModeDashboardProps) {
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageStatus, setMessageStatus] = useState<"idle" | "sent" | "error">(
    "idle"
  );
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);

  const sendTestMessageMutation = trpc.whatsapp.sendTestMessage.useMutation();

  const handleSendTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsSending(true);
    setMessageStatus("idle");

    try {
      await sendTestMessageMutation.mutateAsync({
        wabaId,
        recipientPhone: testPhoneNumber,
      });

      setMessageStatus("sent");
      toast.success("Test message sent! Check your phone.");
      setTestPhoneNumber("");

      setTimeout(() => {
        setMessageStatus("idle");
      }, 3000);
    } catch (error) {
      setMessageStatus("error");
      const errorMsg =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhooks/whatsapp/${wabaId}`;
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                Connection Status
              </CardTitle>
              <CardDescription>
                Your WhatsApp Business Account is connected and ready
              </CardDescription>
            </div>
            <Badge
              variant={
                displayNameStatus === "approved" ? "default" : "secondary"
              }
              className={
                displayNameStatus === "approved"
                  ? "bg-emerald-600"
                  : "bg-amber-600"
              }
            >
              {displayNameStatus === "approved"
                ? "Fully Approved"
                : "Pending Review"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-600 font-medium mb-1">
                Connected Phone Number
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {phoneNumber}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-600 font-medium mb-1">WABA ID</p>
              <p className="text-sm font-mono text-slate-900 truncate">
                {wabaId}
              </p>
            </div>
          </div>

          {displayNameStatus !== "approved" && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your display name is pending Meta's review. This usually takes
                24-48 hours. You can still send and receive messages.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Message Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Send Test Message</CardTitle>
          <CardDescription>
            Verify your connection by sending a test message to yourself
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="test-phone" className="text-sm font-medium">
              Recipient Phone Number
            </label>
            <div className="flex gap-2">
              <Input
                id="test-phone"
                type="tel"
                placeholder="+1234567890"
                value={testPhoneNumber}
                onChange={e => setTestPhoneNumber(e.target.value)}
                disabled={isSending}
                className="flex-1"
              />
              <Button
                onClick={handleSendTestMessage}
                disabled={!testPhoneNumber.trim() || isSending}
                className="px-6 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>

          {messageStatus === "sent" && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Test message sent successfully! You should receive it within a
                few seconds.
              </AlertDescription>
            </Alert>
          )}

          {messageStatus === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to send test message. Please try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Tip:</p>
            <p>
              Use your own phone number to test the connection. The message will
              arrive as a notification from your WhatsApp Business Account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Your webhook is automatically configured to receive incoming
            messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Webhook URL
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {showWebhookUrl
                    ? `${window.location.origin}/api/webhooks/whatsapp/${wabaId}`
                    : "••••••••••••••••••••••••••••••••"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWebhookUrl}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Webhook URL
              </Button>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
            <p className="font-medium mb-2">✓ Webhook Status</p>
            <p>
              Your webhook is active and ready to receive incoming WhatsApp
              messages. All messages will be processed automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="text-emerald-900">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-emerald-900">
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-emerald-700">
                1.
              </span>
              <span>
                Send a test message above to verify everything is working
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-emerald-700">
                2.
              </span>
              <span>
                Start building your WhatsApp integration using our API
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-emerald-700">
                3.
              </span>
              <span>Monitor incoming messages in your dashboard</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold text-emerald-700">
                4.
              </span>
              <span>Set up automation and workflows for your business</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
