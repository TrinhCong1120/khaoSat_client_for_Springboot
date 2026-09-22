"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QuestionEditor from "@/components/surveys/QuestionEditor";
import ConditionEditor from "@/components/surveys/ConditionEditor";
import { FiPlus, FiTrash2, FiFileText, FiSave, FiArrowLeft } from "react-icons/fi";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { API_PAGES, API_SURVEYS } from "@/lib/api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function EditSurvey() {
  const { id } = useParams();

  const [survey, setSurvey] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // LOAD
  const reloadSurvey = async () => {
    const res = await fetch(`${API_SURVEYS}/${id}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await res.json();

    data.pages = data.pages || [];
    data.pages.forEach((p: any) => {
      p.questions = p.questions || [];
      p.questions.forEach((q: any) => {
        q.options = q.options || [];
      });
    });

    setSurvey(data);
    setConditions(data.conditions || []);
  };

  useEffect(() => {
    if (!id) return;
    reloadSurvey();
  }, [id]);

  // UPDATE SURVEY
  const updateSurvey = async () => {
    setLoading(true);
    try {
      await fetch(`${API_SURVEYS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
        }),
      });
      alert("Đã lưu thông tin khảo sát!");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ADD PAGE
  const addPage = async () => {
    await fetch(API_PAGES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        surveyId: id,
        title: "Trang mới",
        orderIndex: survey.pages.length + 1,
      }),
    });

    reloadSurvey();
  };

  // UPDATE PAGE
  const updatePage = async (page: any) => {
    await fetch(`${API_PAGES}/${page.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        title: page.title,
        orderIndex: page.orderIndex,
      }),
    });

    reloadSurvey();
  };

  // DELETE PAGE
  const deletePage = async (pageId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa trang này cùng toàn bộ câu hỏi bên trong?")) return;
    
    await fetch(`${API_PAGES}/${pageId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    reloadSurvey();
  };

  if (!survey) {
    return (
      <div className="p-12 text-center text-gray-400 italic animate-pulse">
        Đang tải dữ liệu khảo sát...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-(--breakpoint-2xl) mx-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20">
              <FiFileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                Thiết kế Khảo sát
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Quản lý cấu trúc trang, câu hỏi và logic điều kiện
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
               onClick={() => window.history.back()}
               className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <FiArrowLeft size={18} />
              Quay lại
            </button>
            
            <Button
              onClick={updateSurvey}
              disabled={loading}
              className="shadow-lg shadow-brand-500/20"
            >
               <FiSave size={18} />
               {loading ? "Đang lưu..." : "Lưu khảo sát"}
            </Button>
          </div>
        </div>

        {/* INFO CARD */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm border-t-4 border-t-brand-500 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Tiêu đề khảo sát</label>
            <Input
              value={survey.title || ""}
              onChange={(e) =>
                setSurvey({ ...survey, title: e.target.value })
              }
              placeholder="Nhập tiêu đề khảo sát..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Mô tả tổng quát</label>
            <textarea
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white/90 placeholder-gray-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all resize-none"
              rows={3}
              value={survey.description || ""}
              onChange={(e) =>
                setSurvey({ ...survey, description: e.target.value })
              }
              placeholder="Mô tả mục đích của khảo sát này..."
            />
          </div>
        </div>

        {/* PAGES SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Cấu trúc trang ({survey.pages.length})
            </h2>

            <button
              onClick={addPage}
              className="flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-xl font-bold text-sm hover:bg-brand-500 hover:text-white transition-all border border-brand-200 dark:border-brand-500/20 shadow-sm"
            >
              <FiPlus size={18} />
              Thêm trang mới
            </button>
          </div>

          <div className="space-y-8">
            {survey.pages.map((page: any, index: number) => (
              <div
                key={page.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden"
              >
                {/* PAGE HEADER */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-black text-gray-400">
                      {index + 1}
                    </span>
                    <Input
                      className="flex-1 !py-2 !h-10 border-transparent bg-transparent focus:bg-white dark:focus:bg-gray-950 font-bold"
                      value={page.title}
                      onChange={(e) => {
                        const newPages = survey.pages.map((p: any) =>
                          p.id === page.id
                            ? { ...p, title: e.target.value }
                            : p
                        );
                        setSurvey({ ...survey, pages: newPages });
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={page.orderIndex}
                      onChange={(e) => {
                        const newPages = survey.pages.map((p: any) =>
                          p.id === page.id
                            ? {
                                ...p,
                                orderIndex: Number(e.target.value),
                              }
                            : p
                        );
                        setSurvey({ ...survey, pages: newPages });
                      }}
                      className="px-3 py-2 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 outline-none focus:border-brand-500 transition-all cursor-pointer"
                    >
                      {survey.pages.map((_: any, i: number) => (
                        <option key={i} value={i + 1}>
                          Thứ tự: {i + 1}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => updatePage(page)}
                      className="px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-md shadow-brand-500/10 transition-all"
                    >
                      Lưu trang
                    </button>

                    <button
                      onClick={() => deletePage(page.id)}
                      className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all"
                      title="Xóa trang"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-transparent">
                  <QuestionEditor
                    page={page}
                    survey={survey}
                    setSurvey={setSurvey}
                    conditions={conditions}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONDITIONS */}
        <div className="pt-4">
          <ConditionEditor
            survey={survey}
            conditions={conditions}
            setConditions={setConditions}
          />
        </div>
      </div>
    </div>
  );
}