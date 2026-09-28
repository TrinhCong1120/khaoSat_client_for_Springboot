import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Quên mật khẩu
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Chức năng đặt lại mật khẩu chưa được kết nối với máy chủ.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}
