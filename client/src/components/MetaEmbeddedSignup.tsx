import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, AlertCircle, Loader2 } from "lucide-react";

const META_APP_ID = "929745616498292";

interface MetaEmbeddedSignupProps {
  onSuccess: (code: string) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: () => void;
  }
}

type FacebookResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
  };
};

export function MetaEmbeddedSignup({ onSuccess, onError, isLoading }: MetaEmbeddedSignupProps) {
  const [fbReady, setFbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Initialize Facebook SDK
    const initFacebook = () => {
      if (window.FB) {
        window.FB.init({
          appId: META_APP_ID,
          xfbml: false,
          version: "v18.0",
        });
        setFbReady(true);
      }
    };

    // Load Facebook SDK
    if (!window.FB) {
      window.fbAsyncInit = initFacebook;
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      initFacebook();
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleConnect = async () => {
    if (!window.FB) {
      const errorMsg = "Facebook SDK not loaded";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Use Facebook Login for WhatsApp Business Account connection
      window.FB.login(
        (response: FacebookResponse) => {
          if (response.authResponse) {
            const { code, accessToken } = response.authResponse;
            if (code) {
              onSuccess(code);
            } else if (accessToken) {
              // Fallback to access token if code not available
              onSuccess(accessToken);
            } else {
              const errorMsg = "No authorization code received";
              setError(errorMsg);
              onError?.(errorMsg);
            }
          } else {
            const errorMsg = "User cancelled login or did not fully authorize";
            setError(errorMsg);
            onError?.(errorMsg);
          }
          setIsConnecting(false);
        },
        {
          scope: "whatsapp_business_management,whatsapp_business_messaging",
          response_type: "code",
          auth_type: "rerequest",
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Connect WhatsApp Business</CardTitle>
              <CardDescription>Link your WhatsApp Business Account in seconds</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-100">
            <h3 className="font-semibold text-slate-900 mb-3">What happens next:</h3>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-emerald-700">1.</span>
                <span>Click the button below to connect your Facebook Business Account</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-emerald-700">2.</span>
                <span>Select your business and WhatsApp phone number</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-emerald-700">3.</span>
                <span>We'll automatically configure everything on your behalf</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-semibold text-emerald-700">4.</span>
                <span>Start sending WhatsApp messages immediately</span>
              </li>
            </ol>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleConnect}
            disabled={!fbReady || isConnecting || isLoading}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-lg"
          >
            {isConnecting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : !fbReady ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-5 w-5" />
                Connect WhatsApp Business Account
              </>
            )}
          </Button>

          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-900">Requirements:</p>
            <ul className="space-y-1">
              <li>✓ Active Facebook Business Account</li>
              <li>✓ WhatsApp Business Account (we'll create if needed)</li>
              <li>✓ Verified phone number for WhatsApp</li>
            </ul>
          </div>

          <div className="text-xs text-slate-500 text-center">
            <p>Your connection is secure and encrypted. We never store your login credentials.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
