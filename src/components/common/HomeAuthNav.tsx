"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function HomeHeaderAuthButton() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  return (
    <Link
      href={loggedIn ? "/admin" : "/signin"}
      className="hidden min-h-11 items-center px-3 text-sm font-bold text-slate-700 hover:text-[#0d5c63] dark:text-slate-200 sm:inline-flex"
    >
      {loggedIn ? "Quản trị khảo sát" : "Đăng nhập quản trị"}
    </Link>
  );
}

export function HomeHeroAction() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  return (
    <Link
      href={loggedIn ? "/admin" : "/signin"}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#cdb7ff] px-6 text-sm font-black text-[#241442] transition hover:bg-white"
    >
      Tạo khảo sát của bạn
    </Link>
  );
}

export function HomeFooterAuthLink() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  return (
    <Link
      href={loggedIn ? "/admin" : "/signin"}
      className="font-bold text-[#0d5c63] dark:text-[#9ee5ef]"
    >
      {loggedIn ? "Quản trị khảo sát" : "Đăng nhập quản trị"}
    </Link>
  );
}
