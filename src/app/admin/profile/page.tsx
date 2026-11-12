"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile, UserProfile } from "@/lib/profile-service";
import ProfileHero from "@/components/profile/ProfileHero";

import ProfileInfoTab from "@/components/profile/ProfileInfoTab";
import SecurityTab from "@/components/profile/SecurityTab";
import BotIntegrationTab from "@/components/profile/BotIntegrationTab";
import GoogleIntegrationTab from "@/components/profile/GoogleIntegrationTab";
import { API_GOOGLE_INTEGRATIONS } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { FiRefreshCw, FiAlertCircle, FiChevronRight, FiHome } from "react-icons/fi";
import Link from "next/link";

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "bot" | "google">(
    tabParam === "security" || tabParam === "bot" || tabParam === "google" ? tabParam : "profile"
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleConnectionsCount, setGoogleConnectionsCount] = useState<number | undefined>(undefined);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam === "security" || tabParam === "bot" || tabParam === "google" || tabParam === "profile") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: "profile" | "security" | "bot" | "google") => {
    setActiveTab(tab);
    router.replace(`/admin/profile?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_GOOGLE_INTEGRATIONS}/connections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setGoogleConnectionsCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProfile();
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải thông tin hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarUpdated = async (newAvatarUrl: string | null) => {
    if (!user) return;
    const updated = await updateMyProfile({ avatarUrl: newAvatarUrl || "" });
    setUser(updated);
  };

  const handleProfileUpdated = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="size-9 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Đang tải thông tin tài khoản...
        </p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/60 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <FiAlertCircle size={28} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Không thể tải hồ sơ
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {error || "Tài khoản không tìm thấy hoặc đã hết hạn đăng nhập"}
        </p>
        <button
          type="button"
          onClick={fetchProfile}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
        >
          <FiRefreshCw size={14} />
          Thử tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <FiHome size={14} />
          <span>Trang chủ</span>
        </Link>
        <FiChevronRight size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          Quản lý tài khoản
        </span>
      </nav>

      {/* Hero Overview & Tabs Switcher */}
      <ProfileHero
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAvatarUpdated={handleAvatarUpdated}
        googleConnectionsCount={googleConnectionsCount}
      />

      {/* Tab Panels */}
      <div className="transition-opacity duration-200">
        {activeTab === "profile" && (
          <ProfileInfoTab user={user} onProfileUpdated={handleProfileUpdated} />
        )}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "bot" && (
          <BotIntegrationTab user={user} onProfileUpdated={handleProfileUpdated} />
        )}
        {activeTab === "google" && (
          <GoogleIntegrationTab
            onConnectionsChange={(count) => setGoogleConnectionsCount(count)}
          />
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
