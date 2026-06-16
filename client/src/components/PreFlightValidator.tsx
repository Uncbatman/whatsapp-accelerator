import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface PreFlightValidatorProps {
  onValidationSuccess: (url: string) => void;
  onValidationError?: (errors: string[]) => void;
}

export function PreFlightValidator({ onValidationSuccess, onValidationError }: PreFlightValidatorProps) {
  const [url, setUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const checkWebsiteMutation = trpc.validator.checkWebsite.useMutation();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      return;
    }

    setIsValidating(true);
    setShowResult(false);

    try {
      const result = await checkWebsiteMutation.mutateAsync({ url });
      setValidationResult(result);
      setShowResult(true);

      if (result.isValid) {
        // Success - proceed to next step
        setTimeout(() => {
          onValidationSuccess(result.url);
        }, 1500);
      } else if (onValidationError) {
        onValidationError(result.errors);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Validation failed";
      setValidationResult({
        url,
        isValid: false,
        errors: [errorMessage],
        hasPrivacyPolicy: false,
        hasTermsOfService: false,
      });
      setShowResult(true);
      if (onValidationError) {
        onValidationError([errorMessage]);
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold">Ready to Connect?</CardTitle>
          <CardDescription className="text-base">
            Let's verify your website meets Meta's requirements before connecting your WhatsApp Business Account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleValidate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="website-url" className="text-sm font-medium">
                Your Website URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isValidating}
                  className="flex-1 h-11"
                />
                <Button
                  type="submit"
                  disabled={!url.trim() || isValidating}
                  className="px-6 h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                >
                  {isValidating ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Check
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {showResult && validationResult && (
              <div className="space-y-3 pt-4 border-t">
                {/* Privacy Policy Check */}
                <div className="flex items-start gap-3">
                  {validationResult.hasPrivacyPolicy ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {validationResult.hasPrivacyPolicy ? "Privacy Policy" : "Privacy Policy Missing"}
                    </p>
                    {!validationResult.hasPrivacyPolicy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Meta requires a Privacy Policy on your website
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms of Service Check */}
                <div className="flex items-start gap-3">
                  {validationResult.hasTermsOfService ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {validationResult.hasTermsOfService ? "Terms of Service" : "Terms of Service Missing"}
                    </p>
                    {!validationResult.hasTermsOfService && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Meta requires Terms of Service on your website
                      </p>
                    )}
                  </div>
                </div>

                {/* Error Messages */}
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.errors.map((error: string, idx: number) => (
                          <li key={idx} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Message */}
                {validationResult.isValid && (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      Great! Your website meets all requirements. Proceeding to connect your WhatsApp Business Account...
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </form>

          {/* Info Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium text-slate-900">What we're checking:</p>
            <ul className="space-y-1 text-slate-700">
              <li>✓ Privacy Policy page exists on your website</li>
              <li>✓ Terms of Service page exists on your website</li>
              <li>✓ Website is accessible and properly configured</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
