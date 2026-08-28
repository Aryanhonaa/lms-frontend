"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { loginFormSchema, type LoginFormValues } from "@/lib/auth/login-schema";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
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
        <span className="font-medium text-stone-800">
          Email
          <RequiredMark />
        </span>
        <input type="email" autoComplete="email" className={fieldClass} {...register("email")} />
        {errors.email ? <span className="text-red-700">{errors.email.message}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-800">
          Password
          <RequiredMark />
        </span>
        <input type="password" autoComplete="current-password" className={fieldClass} {...register("password")} />
        {errors.password ? <span className="text-red-700">{errors.password.message}</span> : null}
      </label>
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
