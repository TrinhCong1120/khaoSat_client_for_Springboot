"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getVisitorId } from "@/lib/site-visitor";

export default function SiteVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/" && !pathname?.startsWith("/survey/")) return;
    const visitorId = getVisitorId();
    if (!visitorId) return;
    void fetch(`${API_BASE}/api/public/site-visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
