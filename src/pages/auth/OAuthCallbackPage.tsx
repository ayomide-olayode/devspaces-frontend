import { useEffect, useRef, useState, type JSX } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { handleOAuthCallback } from "@/features/auth/api/auth.api";
import { getUserProfile } from "@/lib/api/user.api";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export default function OAuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const { provider: paramProvider } = useParams<{ provider?: string }>();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [statusMessage, setStatusMessage] = useState("Authenticating with provider...");
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    async function processCallback(): Promise<void> {
      const code = searchParams.get("code");
      const state = searchParams.get("state") ?? undefined;
      const error = searchParams.get("error") || searchParams.get("error_description");

      // Check if backend or provider passed an error
      if (error) {
        toast.error(`Authentication failed: ${error}`);
        navigate("/auth/sign-up");
        return;
      }

      // Determine provider from route param or search params
      const providerStr =
        paramProvider?.toLowerCase() || searchParams.get("provider")?.toLowerCase() || "";
      const provider: "google" | "github" = providerStr.includes("github") ? "github" : "google";

      // If no code was provided in URL query, check if token was returned directly
      const directToken = searchParams.get("token") || searchParams.get("accessToken");
      if (directToken) {
        setAuth(directToken);
        try {
          await getUserProfile();
        } catch {
          // Gracefully continue even if profile fetch fails
        }
        toast.success("Successfully authenticated!");
        navigate("/");
        return;
      }

      if (!code) {
        toast.error("No authorization code returned from provider.");
        navigate("/auth/sign-up");
        return;
      }

      try {
        setStatusMessage(`Completing ${provider} sign in...`);
        const response = await handleOAuthCallback(provider, { code, state });

        const authToken = response.token || response.accessToken;
        if (authToken) {
          setAuth(authToken, response.refreshToken ?? null, response.user);
          if (!response.user) {
            try {
              await getUserProfile();
            } catch {
              // Gracefully continue even if profile fetch fails
            }
          }
          toast.success("Welcome to DevSpace!");
          navigate("/");
        } else {
          toast.success(response.message || "Successfully authenticated!");
          navigate("/");
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err));
        navigate("/auth/sign-up");
      }
    }

    processCallback();
  }, [navigate, paramProvider, searchParams, setAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-75 p-6 text-center space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="absolute font-mono text-xs font-bold text-primary">&lt;/&gt;</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text">Connecting account</h2>
        <p className="text-xs text-text/60">{statusMessage}</p>
      </div>
    </div>
  );
}
