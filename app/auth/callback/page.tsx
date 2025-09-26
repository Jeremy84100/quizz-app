"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erreur lors de la récupération de la session:", error);
          router.push("/auth/login?error=callback_error");
          return;
        }

        if (data?.session) {
          // L'utilisateur est connecté, rediriger vers le dashboard
          router.push("/dashboard");
        } else {
          // Pas de session, rediriger vers la page de connexion
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Erreur lors du traitement du callback:", error);
        router.push("/auth/login?error=callback_error");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Finalisation de la connexion...</p>
      </div>
    </div>
  );
}
