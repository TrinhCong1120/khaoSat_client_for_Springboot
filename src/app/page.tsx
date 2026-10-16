import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiFileText,
  FiGitBranch,
  FiImage,
  FiLink,
  FiMusic,
  FiPlay,
  FiShare2,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

const SAMPLE_SURVEY = "/survey/adf2076a";

type VisualKind = "schedule" | "logic" | "share" | "access" | "media" | "validation" | "report";

const capabilities: Array<{
  icon: typeof FiCalendar;
  title: string;
  text: string;
  kind: VisualKind;
  color: string;
  span: string;
}> = [
  { icon: FiCalendar, title: "Lên lịch xuất bản", text: "Chọn chính xác thời điểm mở và đóng cho toàn khảo sát hoặc từng trang.", kind: "schedule", color: "bg-[#ffd166]", span: "lg:col-span-7" },
  { icon: FiGitBranch, title: "Câu hỏi theo điều kiện", text: "Tự động hiện hoặc ẩn nội dung dựa trên lựa chọn trước đó.", kind: "logic", color: "bg-[#cdb7ff]", span: "lg:col-span-5" },
  { icon: FiShare2, title: "Link, mã riêng và QR", text: "Chia sẻ khảo sát công khai nhanh chóng mà người trả lời không cần đăng nhập.", kind: "share", color: "bg-[#9ee5ef]", span: "lg:col-span-5" },
  { icon: FiUsers, title: "Cộng tác đúng quyền", text: "Cấp quyền xem, chỉnh sửa hoặc chuyển chủ sở hữu khi cần bàn giao.", kind: "access", color: "bg-[#ffb8d1]", span: "lg:col-span-7" },
  { icon: FiImage, title: "Media ở mọi cấp", text: "Thêm ảnh, video và âm thanh cho khảo sát, trang, câu hỏi hoặc lựa chọn.", kind: "media", color: "bg-[#a8e6cf]", span: "lg:col-span-6" },
  { icon: FiAlertCircle, title: "Validation rõ ràng", text: "Thiết lập quy tắc, báo lỗi đúng câu hỏi và kiểm tra dữ liệu trước khi gửi.", kind: "validation", color: "bg-[#ffcca8]", span: "lg:col-span-6" },
  { icon: FiBarChart2, title: "Báo cáo sẵn để hành động", text: "Lọc phản hồi, đọc thống kê theo từng loại câu hỏi và xuất Excel để phân tích tiếp.", kind: "report", color: "bg-[#a9c9ff]", span: "lg:col-span-12" },
];

function FeatureVisual({ kind }: { kind: VisualKind }) {
  if (kind === "schedule") return (
    <div className="grid h-36 grid-cols-[1fr_auto] gap-3 rounded-xl bg-white/85 p-4 text-slate-900">
      <div><div className="mb-3 flex items-center justify-between text-xs font-bold"><span>Tháng 10</span><span className="text-emerald-700">Đang mở</span></div><div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">{[5,6,7,8,9,10,11,12,13,14,15,16,17,18].map((day) => <span key={day} className={day === 8 ? "grid aspect-square place-items-center rounded-md bg-[#0d5c63] font-bold text-white" : "grid aspect-square place-items-center"}>{day}</span>)}</div></div>
      <div className="flex flex-col justify-center gap-2 border-l border-slate-200 pl-3 text-[10px]"><span className="rounded-md bg-emerald-100 px-2 py-1 font-bold">08:00 mở</span><span className="rounded-md bg-rose-100 px-2 py-1 font-bold">22:00 đóng</span></div>
    </div>
  );
  if (kind === "logic") return (
    <div className="flex h-36 items-center justify-center rounded-xl bg-[#2f2154] p-4 text-xs font-bold text-white">
      <div className="rounded-lg bg-white px-3 py-2 text-slate-900">Bạn đã dùng thử?</div><div className="h-px w-5 bg-white/50" /><div className="space-y-3"><div className="rounded-lg bg-[#ffd166] px-3 py-2 text-slate-900">Có → hỏi đánh giá</div><div className="rounded-lg bg-white/15 px-3 py-2">Không → bỏ qua</div></div>
    </div>
  );
  if (kind === "share") return (
    <div className="flex h-36 items-center gap-4 rounded-xl bg-white/85 p-4 text-slate-900"><div className="grid size-24 shrink-0 grid-cols-5 gap-1 rounded-lg bg-white p-2 shadow-sm">{Array.from({ length: 25 }, (_, i) => <span key={i} className={`rounded-[2px] ${[0,1,2,5,7,10,11,12,14,17,18,20,22,23,24].includes(i) ? "bg-slate-900" : "bg-slate-100"}`} />)}</div><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold"><FiLink /> adf2076a</div><p className="mt-2 text-[11px] leading-5 text-slate-500">Quét QR hoặc gửi link trực tiếp</p></div></div>
  );
  if (kind === "access") return (
    <div className="h-36 rounded-xl bg-[#431b2c] p-4 text-white"><div className="flex -space-x-2">{["AN","BI","CH"].map((name, i) => <span key={name} className={`grid size-9 place-items-center rounded-full border-2 border-[#431b2c] text-[10px] font-black ${["bg-[#ffd166] text-slate-900","bg-[#9ee5ef] text-slate-900","bg-[#cdb7ff] text-slate-900"][i]}`}>{name}</span>)}</div><div className="mt-4 grid grid-cols-2 gap-2 text-[11px]"><span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"><FiUserCheck /> Chủ sở hữu</span><span className="rounded-lg bg-white/10 px-3 py-2">Chỉnh sửa</span><span className="rounded-lg bg-white/10 px-3 py-2">Chỉ xem</span><span className="rounded-lg bg-[#ffb8d1] px-3 py-2 font-bold text-slate-900">Chuyển quyền</span></div></div>
  );
  if (kind === "media") return (
    <div className="grid h-36 grid-cols-3 gap-2 rounded-xl bg-[#173d35] p-4 text-white"><div className="grid place-items-center rounded-lg bg-[#ffd166] text-slate-900"><FiImage size={24} /></div><div className="grid place-items-center rounded-lg bg-[#cdb7ff] text-slate-900"><FiPlay size={24} /></div><div className="grid place-items-center rounded-lg bg-[#9ee5ef] text-slate-900"><FiMusic size={24} /></div></div>
  );
  if (kind === "validation") return (
    <div className="h-36 space-y-3 rounded-xl bg-white/85 p-4 text-slate-900"><div className="flex items-center justify-between text-xs font-bold"><span>Email liên hệ</span><span className="text-rose-600">Bắt buộc</span></div><div className="rounded-lg border-2 border-rose-300 bg-white px-3 py-2 text-xs text-slate-400">abc@</div><div className="flex items-center gap-2 text-[11px] font-semibold text-rose-600"><FiAlertCircle /> Email chưa đúng định dạng</div></div>
  );
  return (
    <div className="grid h-40 grid-cols-[1fr_1.25fr] gap-5 rounded-xl bg-[#102f3a] p-5 text-white"><div><p className="text-xs text-slate-300">Phản hồi đã ghi nhận</p><p className="mt-1 text-4xl font-black">128</p><p className="mt-3 flex items-center gap-2 text-[11px] text-emerald-200"><FiFileText /> Xuất báo cáo Excel</p></div><div className="flex items-end gap-2 border-b border-white/20 pb-2">{[38,68,48,92,74,110,84].map((height, i) => <span key={i} className={`flex-1 rounded-t-md ${i === 5 ? "bg-[#ffd166]" : "bg-[#9ee5ef]"}`} style={{ height }} />)}</div></div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf1] text-slate-950 selection:bg-[#ffd166] dark:bg-[#0b1115] dark:text-white">
      <header className="relative z-20 border-b border-slate-900/10 bg-[#fffaf1] dark:border-white/10 dark:bg-[#0b1115]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><Link href="/" className="flex items-center gap-3" aria-label="Trang chủ Khảo sát"><span className="grid size-10 place-items-center rounded-xl bg-[#0d5c63] text-white"><FiCheck size={20} /></span><span className="text-base font-black">Khảo sát</span></Link><div className="flex items-center gap-2"><ThemeToggleButton /><Link href="/admin" className="hidden min-h-11 items-center px-3 text-sm font-bold text-slate-700 hover:text-[#0d5c63] dark:text-slate-200 sm:inline-flex">Đăng nhập quản trị</Link></div></div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-900/10 bg-[#fff0cf] dark:border-white/10 dark:bg-[#171324]">
        <span aria-hidden="true" className="absolute -right-14 top-16 size-40 rotate-12 rounded-2xl bg-[#ffb8d1]" /><span aria-hidden="true" className="absolute -left-16 bottom-12 size-32 -rotate-12 rounded-2xl bg-[#9ee5ef]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div><h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.75rem]">Hỏi điều cần biết. Nhận câu trả lời có ích.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 dark:text-[#ece6ff]">Tạo khảo sát nhiều trang, đặt lịch, chia sẻ bằng mã riêng và đọc kết quả trong một luồng làm việc rõ ràng.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={SAMPLE_SURVEY} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#0d5c63] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(13,92,99,.24)] transition hover:bg-[#0a4b51]">Thử khảo sát mẫu <FiArrowRight className="transition-transform group-hover:translate-x-1" /></Link><Link href="/admin" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#cdb7ff] px-6 text-sm font-black text-[#241442] transition hover:bg-white">Tạo khảo sát của bạn</Link></div></div>
          <div className="relative mx-auto w-full max-w-xl"><div className="absolute -left-4 top-10 z-10 hidden rotate-[-4deg] rounded-xl bg-[#ffd166] px-4 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,.16)] sm:block">Đã lên lịch · 08:00</div><div className="rounded-2xl bg-[#6446a6] p-3 shadow-[0_30px_80px_rgba(67,27,92,.25)] sm:p-5"><div className="rounded-xl bg-white p-5 text-slate-900 sm:p-7"><div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>Khảo sát trải nghiệm</span><span>2 / 4</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 bg-[#0d5c63]" /></div><h2 className="mt-8 text-xl font-black leading-7">Điều gì khiến bạn muốn quay lại một sản phẩm?</h2><div className="mt-5 space-y-3">{["Trải nghiệm rõ ràng, dễ sử dụng", "Giải quyết đúng nhu cầu", "Hỗ trợ nhanh chóng"].map((answer, index) => <div key={answer} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${index === 0 ? "border-[#0d5c63] bg-[#dff2ec] font-bold" : "border-slate-200"}`}><span className={`size-4 rounded-full border ${index === 0 ? "border-[5px] border-[#0d5c63]" : "border-slate-300"}`} />{answer}</div>)}</div></div></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-12 max-w-3xl"><h2 className="text-4xl font-black tracking-[-0.035em] sm:text-5xl">7 ưu điểm nhìn là hiểu, dùng là quen.</h2><p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">Mỗi phần dưới đây mô phỏng đúng một việc bạn có thể làm trong hệ thống.</p></div>
        <div className="grid gap-5 lg:grid-cols-12">
          {capabilities.map(({ icon: Icon, title, text, kind, color, span }) => <article key={title} className={`${span} ${color} min-w-0 rounded-2xl p-5 text-slate-950 sm:p-7`}><div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,.9fr)] sm:items-center"><div><span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-white"><Icon size={20} /></span><h3 className="mt-5 text-2xl font-black tracking-[-0.025em]">{title}</h3><p className="mt-3 max-w-lg text-sm leading-6 text-slate-700">{text}</p></div><FeatureVisual kind={kind} /></div></article>)}
        </div>
      </section>

      <section className="bg-[#102f3a] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-20"><div><h2 className="max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">Thử từ góc nhìn người trả lời.</h2><p className="mt-5 max-w-2xl leading-7 text-[#cce7e3]">Mở khảo sát mẫu để trải nghiệm điều hướng nhiều trang, validation và giao diện trên điện thoại.</p></div><Link href={SAMPLE_SURVEY} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#ffd166] px-6 text-sm font-black text-slate-950 transition hover:bg-white">Bắt đầu khảo sát mẫu <FiArrowRight className="transition-transform group-hover:translate-x-1" /></Link></div></section>
      <footer className="bg-[#fffaf1] px-4 py-7 text-sm text-slate-600 dark:bg-[#0b1115] dark:text-slate-400 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:justify-between"><p>Khảo sát — dành cho cá nhân và nhóm nhỏ.</p><Link href="/admin" className="font-bold text-[#0d5c63] dark:text-[#9ee5ef]">Quản trị khảo sát</Link></div></footer>
    </main>
  );
}
