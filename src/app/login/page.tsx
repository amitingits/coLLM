// src/app/login/page.tsx
"use client";

import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/");
      }
    };
    checkSession();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-lg bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign in to coLLM</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google"]}
          magicLink={true}
          theme="dark"
        />
      </div>
    </main>
  );
}
