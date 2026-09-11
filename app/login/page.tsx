"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

async function handleLogin(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();

  setLoading(true);
  setErrorMessage("");

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  console.log("Login User:", data.user);
  console.log("Login Session:", data.session);

  if (error) {
    console.error("Login Error:", error);
    setErrorMessage(error.message);
    setLoading(false);
    return;
  }

  router.push("/account");
  router.refresh();
}

  return (
    <main className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6 py-16">

      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">

          <p className="text-sm text-gray-500">
            Angel Dear Malaysia
          </p>

          <h1 className="mt-2 text-4xl font-bold text-[#38435A]">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-500">
            Login to manage your account and orders.
          </p>

        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-sm p-8">

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="your@email.com"
                required
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

            {/* Password */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                required
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#E8C9C1] py-3 font-medium text-[#38435A] hover:bg-[#DDB8AE] transition disabled:opacity-50"
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          {/* Register */}
          <div className="mt-6 text-center text-sm text-gray-500">

            Don't have an account?{" "}

            <Link
              href="/register"
              className="font-semibold text-[#38435A] hover:underline"
            >
              Create Account
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}