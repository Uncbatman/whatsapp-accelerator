import { useState } from "react";
import { PreFlightValidator } from "@/components/PreFlightValidator";
import { MetaEmbeddedSignup } from "@/components/MetaEmbeddedSignup";
import { ProgressTracker, type ProgressStep } from "@/components/ProgressTracker";
import { ShadowModeDashboard } from "@/components/ShadowModeDashboard";
import { ConnectionStatusDashboard } from "@/components/ConnectionStatusDashboard";
import { trpc } from "@/lib/trpc";

type OnboardingStep = "preflight" | "connect" | "processing" | "complete" | "dashboard";

interface WABAConnectionData {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  phoneNumber: string;
  displayNameStatus: string;
  websiteUrl: string;
  businessName: string;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("preflight");
  const [validatedUrl, setValidatedUrl] = useState<string>("");
  const [connectionData, setConnectionData] = useState<WABAConnectionData | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { label: "Securing tokens", status: "pending" },
    { label: "Configuring gateway", status: "pending" },
    { label: "Setting up inbox", status: "pending" },
    { label: "Verifying connection", status: "pending" },
  ]);

  const exchangeCodeMutation = trpc.whatsapp.exchangeCodeForToken.useMutation();
  const registerWebhookMutation = trpc.whatsapp.registerWebhook.useMutation();

  const handleValidationSuccess = (url: string) => {
    setValidatedUrl(url);
    setCurrentStep("connect");
  };

  const handleValidationError = (errors: string[]) => {
    console.error("Validation errors:", errors);
  };

  const handleMetaSuccess = async (code: string) => {
    console.log("Meta connection successful, code:", code);
    setCurrentStep("processing");

    try {
      // Step 1: Exchange code for token
      setProgressSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "loading" } : s))
      );

      const exchangeResult = await exchangeCodeMutation.mutateAsync({
        code,
        redirectUri: window.location.origin + "/onboarding",
        websiteUrl: validatedUrl,
        businessName: "Your Business", // TODO: Get from form
        phoneNumber: "+1234567890", // TODO: Get from Meta popup
      });

      setProgressSteps((prev) =>
        prev.map((s, i) =>
          i === 0 ? { ...s, status: "complete" } : i === 1 ? { ...s, status: "loading" } : s
        )
      );

      // Step 2: Register webhook
      const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp/${exchangeResult.wabaId}`;
      await registerWebhookMutation.mutateAsync({
        wabaId: exchangeResult.wabaId,
        webhookUrl,
        accessToken: exchangeResult.accessToken || "",
      });

      setProgressSteps((prev) =>
        prev.map((s, i) =>
          i <= 1 ? { ...s, status: "complete" } : i === 2 ? { ...s, status: "loading" } : s
        )
      );

      // Step 3: Setup inbox (simulated)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgressSteps((prev) =>
        prev.map((s, i) =>
          i <= 2 ? { ...s, status: "complete" } : i === 3 ? { ...s, status: "loading" } : s
        )
      );

      // Step 4: Verify connection (simulated)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgressSteps((prev) => prev.map((s) => ({ ...s, status: "complete" })));

      // Store connection data and move to dashboard
      setConnectionData({
        wabaId: exchangeResult.wabaId,
        phoneNumberId: exchangeResult.phoneNumberId,
        accessToken: exchangeResult.accessToken || "",
        phoneNumber: "+1234567890", // TODO: Get from Meta
        displayNameStatus: exchangeResult.displayNameStatus,
        websiteUrl: validatedUrl,
        businessName: "Your Business", // TODO: Get from form
      });

      setTimeout(() => {
        setCurrentStep("dashboard");
      }, 2000);
    } catch (error) {
      console.error("Onboarding error:", error);
      setProgressSteps((prev) => prev.map((s) => ({ ...s, status: "error" })));
      handleMetaError(error instanceof Error ? error.message : "Onboarding failed");
    }
  };

  const handleMetaError = (error: string) => {
    console.error("Meta connection error:", error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
            WhatsApp Business Onboarding
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Connect your WhatsApp Business Account in minutes. We handle all the technical setup for you.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mb-12">
          {["preflight", "connect", "processing", "dashboard"].map((step, idx) => (
            <div
              key={step}
              className={`h-2 flex-1 max-w-xs rounded-full transition-all ${
                currentStep === step ||
                (idx <
                  ["preflight", "connect", "processing", "dashboard"].indexOf(
                    currentStep
                  ))
                  ? "bg-emerald-600"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto">
          {currentStep === "preflight" && (
            <PreFlightValidator
              onValidationSuccess={handleValidationSuccess}
              onValidationError={handleValidationError}
            />
          )}

          {currentStep === "connect" && (
            <MetaEmbeddedSignup
              onSuccess={handleMetaSuccess}
              onError={handleMetaError}
            />
          )}

          {currentStep === "processing" && (
            <ProgressTracker
              steps={progressSteps}
              currentStep={progressSteps.findIndex(
                (s) => s.status === "loading" || s.status === "pending"
              )}
              title="Setting up your WhatsApp Business Account"
              description="This usually takes less than 30 seconds"
            />
          )}

          {currentStep === "complete" && (
            <div className="text-center space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-emerald-900 mb-2">
                  You're All Set!
                </h2>
                <p className="text-emerald-700 mb-6">
                  Your WhatsApp Business Account has been successfully connected and
                  configured.
                </p>
                <button
                  onClick={() => setCurrentStep("dashboard")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {currentStep === "dashboard" && connectionData && (
            <div className="space-y-8">
              <ConnectionStatusDashboard
                wabaId={connectionData.wabaId}
                phoneNumberId={connectionData.phoneNumberId}
                phoneNumber={connectionData.phoneNumber}
                accessToken={connectionData.accessToken}
                webhookUrl={`${window.location.origin}/api/webhooks/whatsapp/${connectionData.wabaId}`}
                onNavigateToShadowMode={() => {
                  // Scroll to shadow mode section
                  document.getElementById("shadow-mode")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              />

              <div id="shadow-mode">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Test Your Connection</h2>
                <ShadowModeDashboard
                  wabaId={connectionData.wabaId}
                  phoneNumberId={connectionData.phoneNumberId}
                  accessToken={connectionData.accessToken}
                  phoneNumber={connectionData.phoneNumber}
                  displayNameStatus={connectionData.displayNameStatus}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-600">
          <p>
            Need help?{" "}
            <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
