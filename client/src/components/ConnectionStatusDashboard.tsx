import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ConnectionStatusDashboardProps {
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  accessToken: string;
  webhookUrl?: string;
  onNavigateToShadowMode?: () => void;
}

export function ConnectionStatusDashboard({
  wabaId,
  phoneNumberId,
  phoneNumber,
  accessToken,
  webhookUrl,
  onNavigateToShadowMode,
}: ConnectionStatusDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statusQuery = trpc.whatsapp.getConnectionStatus.useQuery(
    { wabaId, accessToken },
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await statusQuery.refetch();
    setIsRefreshing(false);
  };

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied!");
    }
  };

  const isFullyApproved = statusQuery.data?.isFullyApproved ?? false;
  const status = statusQuery.data?.status ?? "Pending Review";

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <CardTitle>WhatsApp Business Connected</CardTitle>
                <CardDescription>Your account is active and ready to use</CardDescription>
              </div>
            </div>
            <Badge
              className={`text-base px-4 py-1 ${
                isFullyApproved
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isFullyApproved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Fully Approved
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Pending Review
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Account Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone Number */}
        <Card className="border-0 shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connected Phone Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-slate-900 font-mono">{phoneNumber}</p>
              <p className="text-xs text-slate-600 mt-2">Phone Number ID: {phoneNumberId}</p>
            </div>
          </CardContent>
        </Card>

        {/* WABA ID */}
        <Card className="border-0 shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">WABA ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-mono text-slate-900 break-all">{wabaId}</p>
              <p className="text-xs text-slate-600 mt-2">Unique identifier for your account</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Information */}
      {!isFullyApproved && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Pending Review:</strong> Meta is reviewing your business information. This typically takes 24-48 hours. You can still send and receive messages during this time.
          </AlertDescription>
        </Alert>
      )}

      {isFullyApproved && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            <strong>Fully Approved:</strong> Your WhatsApp Business Account is fully approved and ready for production use.
          </AlertDescription>
        </Alert>
      )}

      {/* Webhook Configuration */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Webhook Configuration</span>
            <Badge variant="outline" className="ml-auto">
              Active
            </Badge>
          </CardTitle>
          <CardDescription>Your webhook is configured to receive incoming messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookUrl && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 mb-2">Webhook URL</p>
                  <p className="text-xs font-mono text-slate-600 break-all bg-white rounded p-2 border border-slate-200">
                    {webhookUrl}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhookUrl}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
            <p className="font-medium">📋 Webhook Details:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Receives incoming WhatsApp messages</li>
              <li>Handles message status updates</li>
              <li>Processes webhook events in real-time</li>
              <li>Automatically verified with Meta</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            variant="outline"
            className="w-full justify-start"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </Button>

          {onNavigateToShadowMode && (
            <Button
              onClick={onNavigateToShadowMode}
              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send Test Message
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Support Information */}
      <Card className="border-0 shadow bg-gradient-to-br from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Check our <a href="#" className="text-emerald-600 hover:underline">documentation</a> for API integration guides</p>
          <p>• Contact <a href="#" className="text-emerald-600 hover:underline">support</a> if you encounter any issues</p>
          <p>• View <a href="#" className="text-emerald-600 hover:underline">webhook logs</a> to debug message delivery</p>
        </CardContent>
      </Card>
    </div>
  );
}
