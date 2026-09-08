import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaRegEnvelope, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

import { FormInput, Button, OtpInput, ResendOtpButton } from "@/components/common";
import { toast } from "@/hooks/useToast";
import { verifyAccount, resendOtp } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/useAuthStore";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface LocationState {
  email?: string;
}

const verifyAccountSchema = z.object({
  email: z
    .string()
    .regex(/^[^\s]/, "Email cannot start with a space")
    .email("Please enter a valid email address"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

type VerifyAccountFormData = z.infer<typeof verifyAccountSchema>;

export default function VerifyAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const setAuth = useAuthStore((s) => s.setAuth);

  const initialEmail = state?.email || "";
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(!initialEmail);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<VerifyAccountFormData>({
    resolver: zodResolver(verifyAccountSchema),
    defaultValues: {
      email: initialEmail,
      otp: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const emailValue = useWatch({ control, name: "email" }) || "";
  const otpValue = useWatch({ control, name: "otp" }) || "";

  // --- Submit Verification ---
  const handleVerifySubmit = async (data: VerifyAccountFormData) => {
    try {
      const response = await verifyAccount({
        email: data.email.trim(),
        otp: data.otp,
      });

      const authToken = response.token || response.accessToken;
      if (authToken) {
        setAuth(authToken, response.refreshToken ?? null, response.user);
        toast.success(response.message || "Account verified successfully! Welcome to DevSpace.");
        navigate("/playground");
      } else {
        toast.success(
          response.message || "Account verified successfully! Please sign in to continue.",
        );
        navigate("/auth/sign-in");
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    }
  };

  // --- Resend OTP Handler ---
  const handleResendOtp = async () => {
    if (!emailValue.trim()) {
      toast.error("Please enter a valid email address to resend OTP.");
      throw new Error("Missing email");
    }

    try {
      const response = await resendOtp({ email: emailValue.trim() });
      toast.success(
        response.message || "A new 6-digit verification code has been sent to your email.",
      );
      setValue("otp", "");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  return (
    <div className="shadow-xl sm:shadow-2xl rounded-lg flex flex-col gap-2.5 p-4 sm:p-6 items-center w-full max-w-md bg-white border border-border my-auto">
      {/* Mobile Brand Logo */}
      <div className="lg:hidden flex items-center justify-center gap-1.5 pb-0.5">
        <span className="font-mono font-bold text-primary text-base leading-none">&lt;/&gt;</span>
        <span className="font-bold text-lg text-text tracking-tight">DevSpace</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-0.5 w-full">
        <h1 className="text-text font-bold leading-tight font-inter text-xl sm:text-2xl tracking-tight">
          Verify your account
        </h1>
        <p className="text-text/60 text-xs sm:text-sm">
          Enter the 6-digit verification code sent to your email address to complete registration.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(handleVerifySubmit)}
        className="flex flex-col w-full gap-3.5 pt-1"
      >
        {/* Email Field or Email Display */}
        {isEditingEmail ? (
          <FormInput
            label="Email address"
            type="email"
            inputSize="sm"
            leftIcon={<FaRegEnvelope className="text-text/40" />}
            placeholder="you@example.com"
            {...register("email")}
            errorMessage={errors.email?.message}
            required
          />
        ) : (
          <div className="flex items-center justify-between bg-background p-2.5 rounded-md border border-border text-xs">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <FaCheckCircle className="text-emerald-500 shrink-0 w-3.5 h-3.5" />
              <span className="font-medium text-text truncate">{emailValue}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="text-primary hover:underline font-semibold shrink-0"
            >
              Change
            </button>
          </div>
        )}

        {/* Reusable 6-Digit OTP Input */}
        <OtpInput
          label="6-Digit Verification Code"
          subLabel="Numeric digits only"
          length={6}
          value={otpValue}
          onChange={(val) => {
            setValue("otp", val);
            if (val.length === 6) {
              trigger("otp");
            }
          }}
          error={errors.otp?.message}
        />

        {/* Reusable Resend OTP Button */}
        <ResendOtpButton onResend={handleResendOtp} cooldownSeconds={60} initialTimer={60} />

        {/* Submit Verification Button */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          size="md"
          className="mt-1 font-semibold"
        >
          Verify Account
        </Button>
      </form>

      {/* Footer Links */}
      <div className="pt-2 text-center flex flex-col gap-1.5 text-xs text-text/70">
        <div>
          Wrong email address?{" "}
          <button
            type="button"
            onClick={() => setIsEditingEmail(true)}
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Update Email
          </button>
        </div>

        <div>
          <Link
            to="/auth/sign-in"
            className="inline-flex items-center justify-center gap-1.5 font-semibold text-text/70 hover:text-primary transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
