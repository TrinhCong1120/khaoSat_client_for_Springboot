import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCheck, FiClock, FiLayers, FiShield } from "react-icons/fi";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

const SAMPLE_SURVEY = "/survey/adf2076a";

export default function SurveyNavigationPage() {
  return (
    <main className="min-h-screen bg-[#f4f8f8] text-slate-950 selection:bg-emerald-200 dark:bg-[#071319] dark:text-white">
      <header className="border-b border-slate-900/10 dark:border-white/10">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-[#0d5c63] text-white"><FiCheck /></span>Khảo sát</Link>
          <div className="flex items-center gap-2"><ThemeToggleButton /><Link href="/" className="hidden min-h-11 items-center gap-2 px-3 text-sm font-semibold text-slate-600 hover:text-[#0d5c63] dark:text-slate-300 sm:flex"><FiArrowLeft /> Trang chủ</Link></div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:py-20">
        <div>
          <h1 className="text-4xl font-black leading-[1.06] tracking-[-0.04em] sm:text-5xl">Một khảo sát mẫu, đủ để bạn thử toàn bộ trải nghiệm.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">Khảo sát này dùng dữ liệu thật từ hệ thống để minh họa cách người tham gia đọc nội dung, trả lời từng trang và gửi phản hồi.</p>
          <div className="mt-8 space-y-4 border-y border-slate-900/10 py-6 dark:border-white/10">
            <p className="flex items-start gap-3 text-sm leading-6"><FiLayers className="mt-1 shrink-0 text-[#0d5c63]" /> Hỗ trợ nhiều trang, nhiều loại câu hỏi và câu hỏi điều kiện.</p>
            <p className="flex items-start gap-3 text-sm leading-6"><FiClock className="mt-1 shrink-0 text-[#0d5c63]" /> Thời gian mở và đóng được kiểm soát theo lịch từ máy chủ.</p>
            <p className="flex items-start gap-3 text-sm leading-6"><FiShield className="mt-1 shrink-0 text-[#0d5c63]" /> Câu trả lời chỉ được ghi nhận khi bạn chủ động bấm gửi.</p>
          </div>
        </div>

        <article className="overflow-hidden rounded-2xl bg-[#102f3a] p-3 shadow-[0_28px_70px_rgba(7,31,42,.24)] sm:p-5">
          <div className="rounded-xl bg-white p-6 text-slate-900 sm:p-9">
            <div className="flex items-center justify-between gap-4"><span className="rounded-lg bg-[#dff2ec] px-3 py-1.5 text-xs font-bold text-[#0d5c63]">Khảo sát mẫu</span><span className="text-xs font-semibold text-slate-400">Mã: adf2076a</span></div>
            <h2 className="mt-8 text-2xl font-black tracking-[-0.025em] sm:text-3xl">Trải nghiệm khảo sát trực tuyến</h2>
            <p className="mt-4 leading-7 text-slate-600">Mở biểu mẫu để xem nội dung do người tạo khảo sát thiết lập và thử luồng trả lời hoàn chỉnh.</p>
            <Link href={SAMPLE_SURVEY} className="group mt-9 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#0d5c63] px-6 text-sm font-bold text-white transition hover:bg-[#0a4b51] sm:w-auto">Bắt đầu khảo sát <FiArrowRight className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </article>
      </section>
    </main>
  );
}
