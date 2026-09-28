import Link from "next/link";

export default function AdminNotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-10">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Không tìm thấy trang quản trị</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Trang admin bạn đang truy cập không tồn tại hoặc đã được di chuyển.</p>
        <Link href="/admin" className="mt-6 inline-flex rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">Về dashboard</Link>
      </div>
    </section>
  );
}
