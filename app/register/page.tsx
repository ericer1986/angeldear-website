"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Check password length
    if (password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters."
      );
      setLoading(false);
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Create Supabase account
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          },
        },
      });

    if (authError) {
      console.error("Register Error:", authError);

      setErrorMessage(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setErrorMessage(
        "Registration failed. Please try again."
      );
      setLoading(false);
      return;
    }

    /*
      If Confirm Email is OFF,
      Supabase normally creates a session immediately.

      But we check it to make the flow safer.
    */

    let session = authData.session;

    // If no session, try login automatically
    if (!session) {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        console.error(
          "Automatic Login Error:",
          loginError
        );

        setErrorMessage(
          "Account created, but automatic login failed. Please login manually."
        );

        setLoading(false);
        return;
      }

      session = loginData.session;
    }

    // Final session check
    if (!session) {
      setErrorMessage(
        "Account created, but no login session was created."
      );
      setLoading(false);
      return;
    }

    console.log("Registered User:", authData.user);
    console.log("Session:", session);

    setSuccessMessage(
      "Account created successfully. Redirecting..."
    );

    setLoading(false);

    // Go to customer account
    setTimeout(() => {
      router.replace("/account");
      router.refresh();
    }, 700);
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
            Create Account
          </h1>

          <p className="mt-3 text-gray-500">
            Create your Angel Dear customer account.
          </p>

        </div>

        {/* Register Card */}
        <div className="bg-white rounded-3xl shadow-sm p-8">

          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >

            {/* Full Name */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Your full name"
                required
                autoComplete="name"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

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
                autoComplete="email"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

            {/* Phone */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="012-3456789"
                required
                autoComplete="tel"
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
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

            {/* Confirm Password */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Enter password again"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#E8C9C1]"
              />

            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#E8C9C1] py-3 font-medium text-[#38435A] hover:bg-[#DDB8AE] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          {/* Login */}
          <div className="mt-6 text-center text-sm text-gray-500">

            Already have an account?{" "}

            <Link
              href="/login"
              className="font-semibold text-[#38435A] hover:underline"
            >
              Login
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}