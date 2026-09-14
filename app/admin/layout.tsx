"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const router = useRouter();

  const [checking, setChecking] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Session Error:",
            sessionError
          );

          if (active) {
            router.replace("/login");
          }

          return;
        }

        const user =
          sessionData.session?.user;

        if (!user) {
          if (active) {
            router.replace("/login");
          }

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Admin Profile Error:",
            profileError
          );

          if (active) {
            router.replace("/account");
          }

          return;
        }

        if (
          !profile ||
          profile.role !== "admin"
        ) {
          if (active) {
            setAuthorized(false);
            router.replace("/account");
          }

          return;
        }

        if (active) {
          setAuthorized(true);
        }
      } catch (error) {
        console.error(
          "Admin Authorization Error:",
          error
        );

        if (active) {
          router.replace("/account");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <p className="mt-4 text-gray-500">
            Checking admin access...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Redirecting...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}