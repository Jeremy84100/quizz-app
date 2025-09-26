"use client";

import { Home, Plus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface MobileBottomNavProps {
  user: SupabaseUser;
}

export function MobileBottomNav({ user }: MobileBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Accueil",
      isActive: pathname === "/dashboard",
    },
    {
      href: "/quiz/create",
      icon: Plus,
      label: "Créer",
      isActive: pathname === "/quiz/create",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50 rounded-t-4xl">
      <div className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 ${
                item.isActive ? "text-primary" : "text-muted-foreground"
              }`}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
          <LogOut className="h-5 w-5" />
          <span className="text-xs">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}
