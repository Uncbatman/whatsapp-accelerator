import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface ProgressStep {
  label: string;
  status: "pending" | "loading" | "complete" | "error";
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: number;
  title?: string;
  description?: string;
}

export function ProgressTracker({
  steps,
  currentStep,
  title = "Setting up your WhatsApp Business Account",
  description = "This usually takes less than 30 seconds",
}: ProgressTrackerProps) {
  const [displaySteps, setDisplaySteps] = useState(steps);

  useEffect(() => {
    setDisplaySteps(steps);
  }, [steps]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-8 pb-8">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600">{description}</p>
          </div>

          <div className="space-y-4">
            {displaySteps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                {/* Step Indicator */}
                <div className="flex-shrink-0 pt-1">
                  {step.status === "complete" ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-600 rounded-full animate-pulse opacity-20" />
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 relative z-10" />
                    </div>
                  ) : step.status === "loading" ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse" />
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin relative z-10" />
                    </div>
                  ) : step.status === "error" ? (
                    <div className="h-6 w-6 rounded-full border-2 border-red-600 flex items-center justify-center">
                      <div className="h-2 w-2 bg-red-600 rounded-full" />
                    </div>
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium transition-colors ${
                        step.status === "complete"
                          ? "text-emerald-600"
                          : step.status === "loading"
                            ? "text-blue-600"
                            : step.status === "error"
                              ? "text-red-600"
                              : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.status === "loading" && (
                      <span className="text-xs text-blue-600 font-medium">In progress...</span>
                    )}
                    {step.status === "complete" && (
                      <span className="text-xs text-emerald-600 font-medium">Done</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {index < displaySteps.length - 1 && (
                    <div className="mt-3 ml-3 h-8 border-l-2 border-slate-200">
                      {step.status === "complete" && (
                        <div className="h-full border-l-2 border-emerald-600 animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-semibold text-slate-900">
                {displaySteps.filter((s) => s.status === "complete").length} of {displaySteps.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-500 ease-out"
                style={{
                  width: `${(displaySteps.filter((s) => s.status === "complete").length / displaySteps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
