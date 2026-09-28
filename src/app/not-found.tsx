import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 text-gray-900 dark:bg-gray-950 dark:text-white">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-10">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">404</div>
        <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Trang bạn đang truy cập không tồn tại hoặc đường dẫn đã thay đổi.</p>
        <Link href="/" className="mt-6 inline-flex rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">Về trang chủ</Link>
      </section>
    </main>
  );
}
