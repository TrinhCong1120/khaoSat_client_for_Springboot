import Link from "next/link";
import {
  FiArrowUpRight,
  FiBarChart2,
  FiCheckCircle,
  FiClipboard,
  FiLock,
} from "react-icons/fi";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

const entryPoints = [
  {
    href: "/survey",
    title: "Thực hiện khảo sát",
    description:
      "Gửi ý kiến về nhu cầu nhà ở xã hội bằng biểu mẫu rõ ràng, thuận tiện trên mọi thiết bị.",
    action: "Đi tới khảo sát",
    icon: FiClipboard,
    tone: "survey",
  },
  {
    href: "/admin",
    title: "Khu vực quản trị",
    description:
      "Quản lý biểu mẫu, theo dõi phản hồi và tổng hợp dữ liệu phục vụ công tác chuyên môn.",
    action: "Mở trang quản trị",
    icon: FiBarChart2,
    tone: "admin",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full min-w-0 overflow-hidden bg-[#eaf2f4] text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-55 dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 10%, rgba(71,155,173,.24), transparent 28%), radial-gradient(circle at 88% 78%, rgba(23,107,135,.16), transparent 30%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/85 px-4 shadow-[0_12px_40px_rgba(18,52,65,0.08)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-[0_8px_20px_rgba(23,107,135,0.25)]">
              <FiBarChart2 aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                Sở Xây dựng thành phố Đà Nẵng
              </span>
              <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                Cổng thông tin khảo sát nhà ở
              </span>
            </span>
          </Link>
          <ThemeToggleButton />
        </header>

        <section className="mt-4 overflow-hidden rounded-[1.75rem] bg-brand-900 text-white shadow-[0_24px_70px_rgba(7,31,42,0.18)] dark:border dark:border-gray-800 dark:bg-gray-900 sm:mt-6">
          <div className="relative grid min-h-[460px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.24) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
                maskImage: "linear-gradient(to right, black, transparent 82%)",
              }}
            />

            <div className="relative flex min-w-0 flex-col justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
              <div className="mb-7 flex items-center gap-3 text-sm font-medium text-brand-100">
                <span className="h-px w-9 bg-brand-300" />
                Hệ thống khảo sát trực tuyến
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.12] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]">
                Lắng nghe nhu cầu, xây dựng thành phố đáng sống hơn.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-brand-100 sm:text-lg sm:leading-8">
                Nơi người dân đóng góp ý kiến và cơ quan quản lý theo dõi dữ liệu khảo sát nhà ở một cách minh bạch, thuận tiện.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-brand-100">
                <span className="inline-flex items-center gap-2">
                  <FiCheckCircle aria-hidden="true" className="text-brand-300" />
                  Dễ thực hiện
                </span>
                <span className="inline-flex items-center gap-2">
                  <FiLock aria-hidden="true" className="text-brand-300" />
                  Thông tin an toàn
                </span>
              </div>
            </div>

            <div className="relative flex min-w-0 items-center border-t border-white/10 bg-white/[0.06] p-4 sm:p-7 lg:border-l lg:border-t-0 lg:p-9">
              <div className="grid w-full gap-4">
                {entryPoints.map(({ href, title, description, action, icon: Icon, tone }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-white px-5 py-5 text-gray-900 shadow-[0_12px_30px_rgba(7,31,42,0.16)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(7,31,42,0.22)] focus-visible:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-950 dark:text-white sm:px-6 sm:py-6"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-1 ${tone === "survey" ? "bg-brand-400" : "bg-[#f4b860]"}`}
                    />
                    <span className="flex min-w-0 items-start gap-4">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone === "survey" ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"}`}>
                        <Icon aria-hidden="true" size={22} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xl font-semibold">{title}</span>
                        <span className="mt-2 block text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {description}
                        </span>
                        <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
                          {action}
                          <FiArrowUpRight aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 px-1 py-6 text-xs leading-5 text-gray-600 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Nền tảng tiếp nhận và tổng hợp thông tin khảo sát phục vụ cộng đồng.</p>
          <p>Đà Nẵng · Việt Nam</p>
        </footer>
      </div>
    </main>
  );
}
