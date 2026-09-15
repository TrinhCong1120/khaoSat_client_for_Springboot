"use client";

import { useRouter } from "next/navigation";
import { FiGrid, FiList, FiArrowRight } from "react-icons/fi";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 selection:bg-brand-500/30">
      <div className="max-w-4xl w-full text-center space-y-12">
        
        {/* TITLE */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            <span className="text-brand-500">Khaosat</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Hệ thống quản lý và thực hiện khảo sát trực tuyến thông minh, 
            giúp bạn thu thập dữ liệu một cách chuyên nghiệp.
          </p>
        </div>

        {/* OPTIONS */}
        <div className="grid md:grid-cols-2 gap-8 px-4">
          
          {/* DASHBOARD */}
          <div
            onClick={() => router.push("/admin")}
            className="group cursor-pointer bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-800 hover:border-brand-500/50 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-500/10 rounded-3xl flex items-center justify-center mb-6 text-brand-500 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-brand-500/5">
              <FiGrid size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Quản trị viên
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm leading-relaxed max-w-[200px]">
              Xây dựng khảo sát, quản lý người dùng và phân tích dữ liệu chuyên sâu.
            </p>
            
            <div className="mt-8 flex items-center gap-2 text-brand-500 font-bold text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
              Truy cập ngay <FiArrowRight />
            </div>
          </div>

          {/* SURVEY */}
          <div
            onClick={() => router.push("/survey")}
            className="group cursor-pointer bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-success-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-800 hover:border-success-500/50 flex flex-col items-center text-center relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-success-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

            <div className="w-20 h-20 bg-success-50 dark:bg-success-500/10 rounded-3xl flex items-center justify-center mb-6 text-success-600 group-hover:scale-110 group-hover:bg-success-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-success-500/5">
              <FiList size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Người khảo sát
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm leading-relaxed max-w-[200px]">
              Tham gia trả lời các câu hỏi và đóng góp ý kiến của bạn một cách nhanh chóng.
            </p>

            <div className="mt-8 flex items-center gap-2 text-success-600 font-bold text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
              Bắt đầu ngay <FiArrowRight />
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="text-xs text-gray-400 dark:text-gray-600 font-medium tracking-widest uppercase animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
          Powered by SurveyKhaosat Engine
        </div>
      </div>
    </div>
  );
}