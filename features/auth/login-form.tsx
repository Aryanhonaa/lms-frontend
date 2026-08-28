"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { loginFormSchema, type LoginFormValues } from "@/lib/auth/login-schema";
import { useAuth } from "@/providers/auth-provider";

const fieldClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition duration-150 hover:border-stone-400 focus-visible:border-violet-400";

const passwordFieldClass = `${fieldClass} pr-11`;

const submitButtonClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition duration-150 hover:bg-violet-700 hover:shadow-md disabled:opacity-50";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      const user = await login(values.email, values.password);
      router.replace(getDashboardPath(user.role));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setFormError("Invalid email or password");
        return;
      }

      setFormError("Unable to sign in. Try again.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-800">Email</span>
        <input type="email" autoComplete="email" className={fieldClass} {...register("email")} />
        {errors.email ? <span className="text-red-700">{errors.email.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-800">Password</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={passwordFieldClass}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 transition duration-150 hover:text-violet-700"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? <span className="text-red-700">{errors.password.message}</span> : null}
      </label>
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
