import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock3, Home, ShieldCheck } from "lucide-react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

const surveys = [
  {
    href: "/survey/4",
    title: "Nhu cầu thuê nhà ở xã hội",
    description:
      "Dành cho cá nhân, hộ gia đình đang sinh sống và làm việc tại Đà Nẵng có nhu cầu thuê nhà.",
    icon: Home,
    code: "Phiếu 01",
  },
  {
    href: "/survey/3",
    title: "Nhu cầu mua nhà ở xã hội",
    description:
      "Dành cho cá nhân, hộ gia đình có nguyện vọng sở hữu nhà ở xã hội tại thành phố.",
    icon: Building2,
    code: "Phiếu 02",
  },
];

const commitments = [
  { title: "Dữ liệu thực tế", text: "Phản hồi được tổng hợp để phục vụ công tác lập kế hoạch.", icon: CheckCircle2 },
  { title: "Thông tin an toàn", text: "Dữ liệu cá nhân được xử lý theo quy định hiện hành.", icon: ShieldCheck },
  { title: "Khoảng 5 phút", text: "Biểu mẫu ngắn gọn, có thể thực hiện thuận tiện trên điện thoại.", icon: Clock3 },
];

export default function SurveyNavigationPage() {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-[#eef5f7] text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 shadow-[0_6px_24px_rgba(18,52,65,0.06)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Emblem_of_Vietnam.svg/960px-Emblem_of_Vietnam.svg.png"
              alt="Quốc huy Việt Nam"
              width={42}
              height={42}
              priority
              className="size-10 shrink-0 object-contain"
            />
            <span className="min-w-0 border-l border-gray-200 pl-3 dark:border-gray-700">
              <span className="block text-sm font-semibold leading-5 text-gray-900 dark:text-white sm:text-base">
                Sở Xây dựng Đà Nẵng
              </span>
              <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                Cổng thông tin khảo sát nhà ở
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggleButton />
            <Link
              href="/"
              className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white sm:inline-flex"
            >
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-24 size-[32rem] rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-900/10" />
        <section className="relative min-w-0 px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_22px_65px_rgba(18,52,65,0.12)] dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative flex min-w-0 flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-24">
              <div aria-hidden="true" className="absolute -bottom-32 -left-32 size-80 rounded-full bg-brand-50 dark:bg-brand-950/70" />
              <div className="relative min-w-0">
              <p className="mb-5 flex w-fit items-center gap-3 text-sm font-semibold text-brand-700 dark:text-brand-300">
                <span className="h-px w-9 bg-brand-500" />
                Khảo sát nhu cầu nhà ở xã hội
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.12] tracking-[-0.035em] text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
                Cùng xây dựng chính sách nhà ở sát với nhu cầu thực tế.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg sm:leading-8">
                Mỗi phản hồi giúp thành phố hiểu rõ hơn nhu cầu thuê và mua nhà ở xã hội của người dân Đà Nẵng.
              </p>
              <div className="mt-8 inline-flex max-w-full items-start gap-3 self-start rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium leading-5 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                <Clock3 aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">Chỉ mất khoảng 5 phút để hoàn thành</span>
              </div>
              </div>
            </div>
            <div className="relative min-h-72 min-w-0 overflow-hidden border-t border-gray-200 dark:border-gray-800 lg:min-h-full lg:border-l lg:border-t-0">
              <Image
                src="https://images.unsplash.com/photo-1555109307-f7d9da25c244?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                alt="Không gian đô thị Đà Nẵng"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover saturate-[.85] dark:brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/55 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 max-w-md break-words rounded-xl border border-white/20 bg-gray-950/55 p-4 text-sm leading-6 text-white backdrop-blur-md sm:bottom-7 sm:left-7">
                Thông tin đúng giúp nguồn lực nhà ở đến đúng nơi cần thiết.
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell relative py-12 sm:py-16">
          <div className="mb-8 max-w-2xl border-l-4 border-brand-500 pl-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
              Chọn nội dung phù hợp với nhu cầu của bạn
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
              Bạn có thể mở biểu mẫu ngay và hoàn thành trên máy tính hoặc điện thoại.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            {surveys.map(({ href, title, description, icon: Icon, code }, index) => (
              <article key={href} className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_14px_38px_rgba(18,52,65,0.10)] dark:border-gray-800 dark:bg-gray-900 sm:p-7">
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${index === 0 ? "bg-brand-500" : "bg-[#d39438]"}`} />
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${index === 0 ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"}`}>
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{code}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base sm:leading-7">{description}</p>
                <Link
                  href={href}
                  className="group mt-7 inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,107,135,0.22)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-brand-600 sm:w-auto"
                >
                  Bắt đầu khảo sát
                  <ArrowRight aria-hidden="true" size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="relative px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-5 rounded-2xl bg-brand-900 px-5 py-8 text-white shadow-[0_18px_45px_rgba(7,31,42,0.16)] dark:border dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3 sm:px-8 sm:py-10">
            {commitments.map(({ title, text, icon: Icon }) => (
              <div key={title} className="grid min-w-0 grid-cols-[2.5rem_1fr] gap-4 rounded-xl bg-white/[0.06] p-4">
                <Icon aria-hidden="true" className="mt-0.5 text-brand-200" size={24} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-brand-100">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-gray-950 px-4 py-8 text-gray-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 text-sm leading-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-white">Sở Xây dựng thành phố Đà Nẵng</p>
            <p className="mt-1 text-gray-400">24 Pasteur, Hải Châu, Đà Nẵng · 0236 3822 000</p>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} Sở Xây dựng Đà Nẵng</p>
        </div>
      </footer>
    </div>
  );
}
