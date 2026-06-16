import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Copy, Trash2, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminBusinessDetail() {
  const { user } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const wabaId = params?.wabaId as string;

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const businessQuery = trpc.admin.getBusinessDetails.useQuery({ wabaId });
  const disconnectMutation = trpc.admin.disconnectBusiness.useMutation();
  const sendTestMessageMutation = trpc.admin.sendTestMessage.useMutation();

  const [showTestMessageDialog, setShowTestMessageDialog] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from WhatsApp Business.");

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this business? This action cannot be undone.")) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync({ wabaId });
      toast.success("Business disconnected successfully");
      navigate("/admin");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to disconnect";
      toast.error(errorMsg);
    }
  };

  const handleCopyWebhook = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp/${wabaId}`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const handleSendTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!testMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await sendTestMessageMutation.mutateAsync({
        wabaId,
        phoneNumber: testPhoneNumber,
        message: testMessage,
      });

      toast.success("Test message sent successfully!");
      setShowTestMessageDialog(false);
      setTestPhoneNumber("");
      setTestMessage("Hello! This is a test message from WhatsApp Business.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to send test message";
      toast.error(errorMsg);
    }
  };

  const business = businessQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {businessQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : business ? (
          <>
            {/* Business Info Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl">{business.businessName || "N/A"}</CardTitle>
                    <CardDescription className="mt-2">
                      WABA ID: <span className="font-mono">{business.wabaId}</span>
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      business.displayNameStatus === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : business.displayNameStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }
                  >
                    {business.displayNameStatus === "approved"
                      ? "Fully Approved"
                      : business.displayNameStatus === "rejected"
                        ? "Rejected"
                        : "Pending Review"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Phone Number</h3>
                    <p className="text-lg font-mono text-slate-900">{business.phoneNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Website</h3>
                    <a
                      href={business.websiteUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-emerald-600 hover:underline"
                    >
                      {business.websiteUrl || "N/A"}
                    </a>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Connected</h3>
                    <p className="text-lg text-slate-900">
                      {new Date(business.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Last Updated</h3>
                    <p className="text-lg text-slate-900">
                      {new Date(business.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Status</h3>
                    <p className="text-lg text-slate-900">
                      {business.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800">Inactive</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Message Section */}
            <Card className="border-0 shadow-lg bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Test Connection</CardTitle>
                <CardDescription className="text-blue-800">
                  Send a test WhatsApp message to verify the connection is working
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowTestMessageDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Message
                </Button>
              </CardContent>
            </Card>

            {/* Test Message Dialog */}
            <Dialog open={showTestMessageDialog} onOpenChange={setShowTestMessageDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Test Message</DialogTitle>
                  <DialogDescription>
                    Verify the connection by sending a test WhatsApp message
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Recipient Phone Number
                    </label>
                    <Input
                      placeholder="+1234567890"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      disabled={sendTestMessageMutation.isPending}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Include country code (e.g., +1 for USA)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Message
                    </label>
                    <Textarea
                      placeholder="Enter your test message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      disabled={sendTestMessageMutation.isPending}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {testMessage.length}/1024 characters
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowTestMessageDialog(false)}
                      disabled={sendTestMessageMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendTestMessage}
                      disabled={sendTestMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {sendTestMessageMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Webhook Configuration */}
            {business.webhook && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>Incoming message routing configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Webhook URL</h3>
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <code className="flex-1 font-mono text-sm text-slate-900">
                        {business.webhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyWebhook}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Verification Status</h3>
                    <Badge
                      className={
                        business.webhook.isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {business.webhook.isVerified ? "Verified" : "Pending Verification"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Configured</h3>
                    <p className="text-sm text-slate-600">
                      {new Date(business.webhook.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="border-0 shadow-lg bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-red-800">
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Business"}
                </Button>
                <p className="text-sm text-red-800">
                  This will immediately disconnect this WhatsApp Business Account from your system.
                  The business will need to reconnect to resume messaging.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">Business not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
