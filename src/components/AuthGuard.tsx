"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-[#777] text-sm">
          <span className="pulse-dot w-2 h-2 rounded-full bg-[#00ff88] inline-block" />
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
