import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 min-h-dvh bg-white p-4 dark:bg-gray-950 sm:p-0">

        <div className="relative flex min-h-dvh w-full flex-col justify-center dark:bg-gray-950 lg:flex-row sm:p-0">
          {children}
          <div className="hidden min-h-dvh w-full items-center bg-brand-950 lg:grid lg:w-1/2 dark:bg-gray-900">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  <Image
                    width={231}
                    height={48}
                    src="./images/logo/auth-logo.svg"
                    alt="Logo"
                  />
                </Link>
                <p className="text-center leading-6 text-gray-300 dark:text-gray-300">
                  Hệ thống quản trị và tạo khảo sát trực tuyến chuyên nghiệp
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
            <ThemeTogglerTwo />
          </div>
        </div>
    </div>
  );
}
