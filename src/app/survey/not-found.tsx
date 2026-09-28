import Link from "next/link";

export default function SurveyNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10 text-[#1f2937]">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-indigo-50 text-2xl font-bold text-indigo-600">404</div>
        <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy khảo sát</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">Khảo sát bạn đang truy cập không tồn tại hoặc đường dẫn không chính xác.</p>
        <Link href="/survey" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Về danh sách khảo sát</Link>
      </section>
    </main>
  );
}
