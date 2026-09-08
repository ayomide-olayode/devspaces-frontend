import { apiClient } from "../../../lib/api/client";
import { ENDPOINTS } from "../../../lib/api/endpoints";
import type {
  OAuthCallbackPayload,
  AuthResponse,
  SignUpPayload,
  SignInPayload,
  SignInResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyAccountPayload,
  ResendOtpPayload,
  LogoutPayload,
} from "@/types/auth.types";
import axios from "axios";

export interface RefreshTokenPayload {
  refreshToken: string;
}

/**
 * Registers a new user with their personal details and credentials.
 */
export async function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.SIGN_UP, payload);
  return response.data;
}

/**
 * Sign in a user with username or email and password.
 */
export async function signIn(payload: SignInPayload): Promise<SignInResponse> {
  const response = await apiClient.post<SignInResponse>(ENDPOINTS.AUTH.SIGN_IN, payload);
  return response.data;
}

/**
 * Logs out the user by invalidating their refresh token.
 */
export async function logoutUser(payload: LogoutPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.LOGOUT, payload);
  return response.data;
}

/**
 * Verifies a user's account using the email and 6-digit OTP.
 */
export async function verifyAccount(payload: VerifyAccountPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.VERIFY_ACCOUNT, payload);
  return response.data;
}

/**
 * Resends a verification OTP code to the specified email.
 */
export async function resendOtp(payload: ResendOtpPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.RESEND_OTP, payload);
  return response.data;
}

/**
 * Requests an OTP code to be sent to the specified email for password reset.
 */
export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
  return response.data;
}

/**
 * Resets the password using email, 6-digit OTP, and the new password.
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
  return response.data;
}

/**
 * Redirects the user to the backend OAuth initiation endpoint.
 */
export function initiateOAuth(provider: "google" | "github"): void {
  if (provider === "google") {
    window.location.href = ENDPOINTS.AUTH.GOOGLE_INIT;
  } else {
    window.location.href = ENDPOINTS.AUTH.GITHUB_INIT;
  }
}

/**
 * Sends the OAuth authorization code to backend to complete authentication.
 */
export async function handleOAuthCallback(
  provider: "google" | "github",
  payload: OAuthCallbackPayload,
): Promise<AuthResponse> {
  const endpoint =
    provider === "google" ? ENDPOINTS.AUTH.GOOGLE_CALLBACK : ENDPOINTS.AUTH.GITHUB_CALLBACK;

  const response = await apiClient.post<AuthResponse>(endpoint, payload);
  return response.data;
}

export async function refreshAccessToken(payload: RefreshTokenPayload): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(ENDPOINTS.AUTH.REFRESH_TOKEN, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}
