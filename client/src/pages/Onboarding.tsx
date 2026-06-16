import { useState } from "react";
import { PreFlightValidator } from "@/components/PreFlightValidator";
import { MetaEmbeddedSignup } from "@/components/MetaEmbeddedSignup";
import { ProgressTracker, type ProgressStep } from "@/components/ProgressTracker";

type OnboardingStep = "preflight" | "connect" | "processing" | "complete";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("preflight");
  const [validatedUrl, setValidatedUrl] = useState<string>("");
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { label: "Securing tokens", status: "pending" },
    { label: "Configuring gateway", status: "pending" },
    { label: "Setting up inbox", status: "pending" },
    { label: "Verifying connection", status: "pending" },
  ]);

  const handleValidationSuccess = (url: string) => {
    setValidatedUrl(url);
    setCurrentStep("connect");
  };

  const handleValidationError = (errors: string[]) => {
    console.error("Validation errors:", errors);
  };

  const handleMetaSuccess = (code: string) => {
    console.log("Meta connection successful, code:", code);
    setCurrentStep("processing");
    // Simulate the processing steps
    simulateProcessing();
  };

  const handleMetaError = (error: string) => {
    console.error("Meta connection error:", error);
  };

  const simulateProcessing = () => {
    // Simulate step 1: Securing tokens
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step, idx) =>
          idx === 0 ? { ...step, status: "loading" } : step
        )
      );
    }, 500);

    // Complete step 1, start step 2
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step, idx) => {
          if (idx === 0) return { ...step, status: "complete" };
          if (idx === 1) return { ...step, status: "loading" };
          return step;
        })
      );
    }, 2000);

    // Complete step 2, start step 3
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step, idx) => {
          if (idx <= 1) return { ...step, status: "complete" };
          if (idx === 2) return { ...step, status: "loading" };
          return step;
        })
      );
    }, 4000);

    // Complete step 3, start step 4
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step, idx) => {
          if (idx <= 2) return { ...step, status: "complete" };
          if (idx === 3) return { ...step, status: "loading" };
          return step;
        })
      );
    }, 6000);

    // Complete all steps
    setTimeout(() => {
      setProgressSteps((prev) =>
        prev.map((step) => ({ ...step, status: "complete" }))
      );
      setCurrentStep("complete");
    }, 8000);
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
          {["preflight", "connect", "processing", "complete"].map((step, idx) => (
            <div
              key={step}
              className={`h-2 flex-1 max-w-xs rounded-full transition-all ${
                currentStep === step || (idx < ["preflight", "connect", "processing", "complete"].indexOf(currentStep))
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
              currentStep={progressSteps.findIndex((s) => s.status === "loading" || s.status === "pending")}
              title="Setting up your WhatsApp Business Account"
              description="This usually takes less than 30 seconds"
            />
          )}

          {currentStep === "complete" && (
            <div className="text-center space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-emerald-900 mb-2">You're All Set!</h2>
                <p className="text-emerald-700 mb-6">
                  Your WhatsApp Business Account has been successfully connected and configured.
                </p>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-600">
          <p>Need help? <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">Contact our support team</a></p>
        </div>
      </div>
    </div>
  );
}
