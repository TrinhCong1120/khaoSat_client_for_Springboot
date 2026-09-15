import Link from "next/link";
import Image from "next/image";
import { Home, Building, ArrowRight } from "lucide-react";
import { FaCheckCircle, FaUserShield, FaRocket } from "react-icons/fa";

export default function SurveyNavigationPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      

      <header className="bg-white py-4 px-6 md:px-12 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">

          <div className="relative w-12 h-12 flex-shrink-0">
            <Image 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Emblem_of_Vietnam.svg/960px-Emblem_of_Vietnam.svg.png" 
              alt="Logo Sở Xây Dựng Đà Nẵng" 
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900 leading-tight uppercase">Sở Xây Dựng Đà Nẵng</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Cổng thông tin khảo sát nhà ở</p>
          </div>
        </div>
        
        <nav>
          <Link href="/" className="text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors">
            Trang chủ
          </Link>
        </nav>
      </header>


      <section className="relative w-full h-[400px] md:h-[450px]">
     
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1555109307-f7d9da25c244?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
            alt="Đà Nẵng Banner"
            fill
            className="object-cover"
            priority
          />
          
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-900/40 to-slate-50/90"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pt-8 md:pt-16 pb-24">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md uppercase">
            Khảo Sát Nhu Cầu Nhà Ở Xã Hội
          </h2>
          <p className="text-blue-50 md:text-lg max-w-2xl font-medium drop-shadow text-sm">
            Ý kiến của bạn giúp chúng tôi xây dựng chính sách nhà ở tốt hơn cho cộng đồng
          </p>
        </div>
      </section>

   
      <section className="relative z-20 w-full max-w-5xl mx-auto px-4 -mt-32 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
       
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col items-center text-center p-8 md:p-10 border border-slate-100 transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Home className="w-8 h-8 text-blue-700" strokeWidth={2} />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Thuê nhà ở Xã hội
            </h3>
            
            <p className="text-slate-500 text-sm md:text-base leading-relaxed flex-grow mb-8 px-2 md:px-4">
              Khảo sát nhu cầu thuê nhà ở xã hội dành cho cá nhân, hộ gia đình đang sinh sống và làm việc tại Đà Nẵng.
            </p>
            
            <Link 
              href="/survey/8" 
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-700/30"
            >
              Bắt đầu khảo sát
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

        
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col items-center text-center p-8 md:p-10 border border-slate-100 transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
              <Building className="w-8 h-8 text-green-600" strokeWidth={2} />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Mua nhà ở Xã hội
            </h3>
            
            <p className="text-slate-500 text-sm md:text-base leading-relaxed flex-grow mb-8 px-2 md:px-4">
              Khảo sát nhu cầu mua nhà ở xã hội dành cho cá nhân, hộ gia đình có nguyện vọng sở hữu nhà ở xã hội tại Đà Nẵng.
            </p>
            
            <Link 
              href="/survey/7" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-green-600/30"
            >
              Bắt đầu khảo sát
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

        </div>
      </section>


      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-blue-900 mb-12">
            Tại sao cần thực hiện khảo sát?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <FaCheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-3">Chính xác</h4>
              <p className="text-slate-500 text-sm px-4 leading-relaxed">
                Số liệu thực tế giúp Sở Xây dựng lập kế hoạch phát triển sát với nhu cầu dân cư.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4">
                <FaUserShield className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-3">Bảo mật</h4>
              <p className="text-slate-500 text-sm px-4 leading-relaxed">
                Thông tin cá nhân của người dân được bảo mật tuyệt đối theo quy định.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4">
                <FaRocket className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-3">Nhanh chóng</h4>
              <p className="text-slate-500 text-sm px-4 leading-relaxed">
                Chỉ mất 5 phút để hoàn thành phiếu khảo sát trực tuyến.
              </p>
            </div>

          </div>
        </div>
      </section>

    
      <footer className="mt-auto bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center py-8">
            <h2 className="text-lg font-semibold tracking-wide">
                SỞ XÂY DỰNG THÀNH PHỐ ĐÀ NẴNG
            </h2>

            <p className="mt-2 text-sm text-gray-200">
                Địa chỉ: 24 Pasteur, Hải Châu, Đà Nẵng | Điện thoại: 0236 3822 000
            </p>

            <p className="mt-3 text-xs text-gray-400">
                © {new Date().getFullYear()} Bản quyền thuộc về Sở Xây dựng Đà Nẵng
            </p>
      </footer>
    </div>
  );
}
