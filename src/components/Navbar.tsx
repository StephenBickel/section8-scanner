"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Mail,
  FileText,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";

const NAV_LINKS = [
  { href: "/", label: "Scanner", icon: Search },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Building2 },
  { href: "/outreach", label: "Outreach", icon: Mail, investorOnly: true },
  { href: "/reports", label: "Reports", icon: FileText, proOnly: true },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, setUser, setProfile, setLoading } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadSession() {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/");
  };

  const planBadgeColor =
    profile?.plan === "investor"
      ? "bg-[rgba(170,255,68,0.12)] text-[#aaff44]"
      : profile?.plan === "pro"
        ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
        : "bg-[rgba(119,119,119,0.12)] text-[#777]";

  return (
    <nav className="h-14 border-b border-[#222] bg-[#111] flex items-center px-4 md:px-6 gap-4 shrink-0 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
        <span className="pulse-dot w-2 h-2 rounded-full bg-[#00ff88] inline-block" />
        <span className="text-sm font-bold text-white tracking-tight hidden sm:inline">
          Section 8 Scanner
        </span>
        <span className="text-sm font-bold text-white tracking-tight sm:hidden">
          S8
        </span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ href, label, icon: Icon, investorOnly, proOnly }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showLock = (investorOnly && profile?.plan !== "investor") ||
            (proOnly && profile?.plan === "free");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active
                  ? "bg-[rgba(0,255,136,0.08)] text-[#00ff88]"
                  : "text-[#777] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              <Icon size={14} />
              {label}
              {showLock && <Lock size={10} className="text-[#555]" />}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Auth section */}
      {user ? (
        <div className="hidden md:flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${planBadgeColor}`}>
            {profile?.plan ?? "free"}
          </span>
          <Link
            href="/settings"
            className="text-xs text-[#777] hover:text-white transition-colors"
          >
            <Settings size={14} />
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs text-[#777] hover:text-[#ff4444] transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs text-[#777] hover:text-white px-3 py-1.5 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-xs font-bold text-black bg-[#00ff88] px-3 py-1.5 rounded-md hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
          >
            Sign up
          </Link>
        </div>
      )}

      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden text-[#777] hover:text-white"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#111] border-b border-[#222] p-4 flex flex-col gap-2 md:hidden z-50">
          {NAV_LINKS.map(({ href, label, icon: Icon, investorOnly, proOnly }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const showLock = (investorOnly && profile?.plan !== "investor") ||
              (proOnly && profile?.plan === "free");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  active
                    ? "bg-[rgba(0,255,136,0.08)] text-[#00ff88]"
                    : "text-[#777] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
                {showLock && <Lock size={10} className="text-[#555]" />}
              </Link>
            );
          })}
          <div className="border-t border-[#222] mt-2 pt-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${planBadgeColor}`}>
                    {profile?.plan ?? "free"}
                  </span>
                  <span className="text-xs text-[#777] truncate">{user.email}</span>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#777] hover:text-white"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#777] hover:text-[#ff4444] w-full text-left"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#777] hover:text-white py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-bold text-black bg-[#00ff88] px-3 py-2 rounded-md"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
