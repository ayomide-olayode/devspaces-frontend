import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaGithub } from "react-icons/fa";
import { CiLock } from "react-icons/ci";
import { MdOutlineEmail } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";

import { FormInput, Button } from "@/components/common";
import { toast } from "@/hooks/useToast";
import { initiateOAuth, signIn } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/useAuthStore";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const signInSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, "Username or email is required")
    .refine((val) => !val.startsWith(" "), "Username or email cannot start with a space"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => !val.startsWith(" "), "Password cannot start with a space"),
  rememberMe: z.boolean().optional(),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
      rememberMe: true,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submitHandler = async (data: SignInFormData) => {
    const setAuth = useAuthStore.getState().setAuth;
    try {
      const res = await signIn({
        usernameOrEmail: data.usernameOrEmail.trim(),
        password: data.password,
      });
      if (res && (res.accessToken || res.success)) {
        if (res.accessToken) localStorage.setItem("devspace_token", res.accessToken);
        if (res.refreshToken) localStorage.setItem("devspace_refresh_token", res.refreshToken);

        const userFromApi = res.user ?? {
          id: res.userId,
          email: res.email,
          userName: res.userName,
          username: res.userName,
          firstName: res.firstName,
          lastName: res.lastName,
          avatarUrl: res.avatarUrl ?? null,
        };

        setAuth(res.accessToken ?? "", res.refreshToken ?? null, userFromApi);
        toast.success(res.message ?? "Welcome back to DevSpace!");
        reset();
        navigate(redirectPath, { replace: true });
      } else {
        toast.error(res.message || "Authentication failed.");
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error));
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
        <h1 className="text-text font-black leading-tight font-inter text-lg sm:text-lg tracking-tight">
          Welcome back
        </h1>
        <p className="text-text/70 text-xs sm:text-sm">Sign in to continue to DevSpace</p>
      </div>

      {/* Sign-In Form */}
      <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col w-full gap-2 pt-1">
        <FormInput
          label="Username or Email"
          type="text"
          inputSize="md"
          leftIcon={<MdOutlineEmail className="text-text/40 text-4xl" />}
          placeholder="Enter your username or email"
          {...register("usernameOrEmail")}
          errorMessage={errors.usernameOrEmail?.message}
          required
        />

        <FormInput
          label="Password"
          type="password"
          inputSize="md"
          leftIcon={<CiLock className="text-text/40 text-4xl" />}
          placeholder="Enter your password"
          {...register("password")}
          errorMessage={errors.password?.message}
          required
        />

        <div className="flex items-center justify-between gap-3 pt-0.5 w-full">
          <label className="flex cursor-pointer items-center gap-2 text-base text-text/70">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span>Remember me</span>
          </label>

          <Link
            to="/auth/forgot-password"
            className="text-base font-semibold text-primary hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          size="md"
          className="mt-1 font-semibold"
        >
          Sign in
        </Button>
      </form>

      {/* Divider */}
      <div className="my-4 flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="whitespace-nowrap text-xs text-slate-500">Or continue with</span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Social Logins */}
      <div className="flex gap-2 justify-center items-center w-full">
        <Button
          type="button"
          variant="outline"
          size="icon"
          fullWidth
          onClick={() => initiateOAuth("github")}
          leftIcon={<FaGithub className="w-3.5 h-3.5 text-text" />}
        >
          GitHub
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          fullWidth
          onClick={() => initiateOAuth("google")}
          leftIcon={<FcGoogle className="w-3.5 h-3.5" />}
        >
          Google
        </Button>
      </div>

      {/* Footer Navigation */}
      <div className="text-center text-base text-text/70">
        New to DevSpace?{" "}
        <Link
          to="/auth/sign-up"
          className="text-primary font-semibold hover:underline transition-colors"
        >
          Create account
        </Link>
      </div>

      {/* Terms & Privacy */}
      <p className="text-text/50 text-[11px] text-center leading-tight">
        By continuing, you agree to DevSpace's{" "}
        <span className="text-primary hover:underline cursor-pointer">terms of service</span> and{" "}
        <span className="text-primary hover:underline cursor-pointer">privacy policy</span>
      </p>
    </div>
  );
}
