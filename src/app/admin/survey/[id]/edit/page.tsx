"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiArrowUp,
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiGitBranch,
  FiList,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import QuestionEditor from "@/components/surveys/QuestionEditor";
import ConditionEditor from "@/components/surveys/ConditionEditor";
import MediaUploader from "@/components/surveys/MediaUploader";
import ApiNotFound from "@/components/common/ApiNotFound";
import { API_PAGES, API_SURVEYS } from "@/lib/api";

type SurveyPage = {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  questions: any[];
  [key: string]: any;
};

type Survey = {
  id: number;
  title: string;
  description?: string;
  pages: SurveyPage[];
  [key: string]: any;
};

const getToken = () =>
  typeof window === "undefined"
    ? ""
    : localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const getValidOrderIndex = (item: any, fallback: number) => {
  const rawOrderIndex = item?.orderIndex ?? item?.OrderIndex;
  const orderIndex =
    typeof rawOrderIndex === "string" && rawOrderIndex.trim() === ""
      ? NaN
      : Number(rawOrderIndex);

  return Number.isInteger(orderIndex) && orderIndex > 0 ? orderIndex : fallback;
};

export default function EditSurvey() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageOrderSaving, setPageOrderSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [showConditions, setShowConditions] = useState(false);
  const [expandedPageIds, setExpandedPageIds] = useState<Record<number, boolean>>({});
  const [activeNavId, setActiveNavId] = useState("survey-info");
  const [desktopQuickNavOpen, setDesktopQuickNavOpen] = useState(false);
  const [desktopQuickNavHovered, setDesktopQuickNavHovered] = useState(false);
  const [desktopQuickNavPanelRight, setDesktopQuickNavPanelRight] = useState(80);
  const [mobileQuickNavOpen, setMobileQuickNavOpen] = useState(false);
  const desktopQuickNavRailRef = useRef<HTMLDivElement>(null);
  const desktopQuickNavHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (desktopQuickNavHoverTimeoutRef.current) clearTimeout(desktopQuickNavHoverTimeoutRef.current);
  }, []);

  const reloadSurvey = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_SURVEYS}/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.status === 404) {
        setNotFound(true);
        setSurvey(null);
        return;
      }
      if (!response.ok) throw new Error(`Không tải được khảo sát (${response.status})`);
      const data = await response.json();
      data.pages = (Array.isArray(data.pages) ? data.pages : []).map((page: any, index: number) => ({
        ...page,
        title: page.title ?? page.Title ?? "",
        description: page.description ?? page.Description ?? "",
        orderIndex: getValidOrderIndex(page, index + 1),
        questions: (Array.isArray(page.questions) ? page.questions : []).map((question: any) => ({
          ...question,
          options: Array.isArray(question.options) ? question.options : [],
        })),
      }));
      setSurvey(data);
      setConditions(data.conditions || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Có lỗi khi tải khảo sát.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reloadSurvey();
  }, [reloadSurvey]);

  const updateSurvey = async () => {
    if (!survey || !id) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_SURVEYS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title: survey.title, description: survey.description }),
      });
      if (!response.ok) throw new Error(`Không lưu được khảo sát (${response.status})`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không lưu được khảo sát.");
    } finally {
      setSaving(false);
    }
  };

  const pagesOrdered = (survey?.pages || [])
    .map((page, index) => ({
      page,
      index,
      orderIndex: getValidOrderIndex(page, index + 1),
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex || a.index - b.index)
    .map((item) => item.page);
  const pageNavKey = pagesOrdered.map((page) => page.id).join(",");

  useEffect(() => {
    if (!survey) return;

    const ids = ["survey-info", ...pagesOrdered.map((page) => `survey-page-${page.id}`)];
    const updateActiveSection = () => {
      const current = ids.reduce((active, sectionId) => {
        const element = document.getElementById(sectionId);
        if (!element) return active;
        return element.getBoundingClientRect().top <= 150 ? sectionId : active;
      }, ids[0]);
      setActiveNavId(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [survey?.id, pageNavKey]);

  const savePageRequest = async (page: SurveyPage, orderIndex = page.orderIndex) => {
    const response = await fetch(`${API_PAGES}/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ title: page.title, description: page.description || "", orderIndex }),
    });
    if (!response.ok) throw new Error(`Không lưu được trang (${response.status})`);
  };

  const persistPageOrder = async (orderedPages: SurveyPage[]) => {
    setPageOrderSaving(true);
    setError("");
    try {
      await Promise.all(
        orderedPages.map((page, index) =>
          savePageRequest({ ...page, orderIndex: index + 1 }, index + 1)
        )
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không lưu được thứ tự trang.");
    } finally {
      setPageOrderSaving(false);
    }
  };

  const setPageOrder = (pageId: number, nextOrderIndex: number) => {
    const fromIndex = pagesOrdered.findIndex((page) => page.id === pageId);
    if (fromIndex < 0) return;

    const toIndex = Math.max(0, Math.min(pagesOrdered.length - 1, nextOrderIndex - 1));
    if (toIndex === fromIndex) return;

    const nextOrdered = [...pagesOrdered];
    const [item] = nextOrdered.splice(fromIndex, 1);
    nextOrdered.splice(toIndex, 0, item);
    const normalized = nextOrdered.map((page, index) => ({ ...page, orderIndex: index + 1, OrderIndex: index + 1 }));

    setSurvey((current) => current && ({ ...current, pages: normalized }));
    void persistPageOrder(normalized);
  };

  const addPage = async (insertAt?: number) => {
    if (!survey || !id) return;
    const insertIndex = Math.max(
      0,
      Math.min(Number.isInteger(insertAt) ? Number(insertAt) : pagesOrdered.length, pagesOrdered.length)
    );
    const response = await fetch(API_PAGES, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ surveyId: id, title: "Trang mới", orderIndex: insertIndex + 1 }),
    });
    if (!response.ok) {
      setError(`Không thêm được trang (${response.status})`);
      return;
    }
    const data = await response.json().catch(() => null);
    if (!data?.id) {
      await reloadSurvey();
      return;
    }

    const newPage: SurveyPage = {
      ...data,
      title: data.title || "Trang mới",
      description: data.description || "",
      orderIndex: insertIndex + 1,
      questions: Array.isArray(data.questions) ? data.questions : [],
    };
    const nextOrdered = [...pagesOrdered];
    nextOrdered.splice(insertIndex, 0, newPage);
    const normalized = nextOrdered.map((page, index) => ({ ...page, orderIndex: index + 1, OrderIndex: index + 1 }));
    setSurvey((current) => current && ({ ...current, pages: normalized }));
    await persistPageOrder(normalized);
  };

  const savePage = async (page: SurveyPage) => {
    const response = await fetch(`${API_PAGES}/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ title: page.title, description: page.description || "", orderIndex: page.orderIndex }),
    });
    if (!response.ok) setError(`Không lưu được trang (${response.status})`);
  };

  const deletePage = async (pageId: number) => {
    if (!window.confirm("Xóa trang này cùng toàn bộ câu hỏi bên trong?")) return;
    const response = await fetch(`${API_PAGES}/${pageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) {
      setError(`Không xóa được trang (${response.status})`);
      return;
    }
    await reloadSurvey();
  };

  const patchPage = (pageId: number, patch: Partial<SurveyPage>) => {
    setSurvey((current) => current && ({
      ...current,
      pages: current.pages.map((page) => page.id === pageId ? { ...page, ...patch } : page),
    }));
  };

  const scrollToSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToSectionFromMobileNav = (targetId: string) => {
    scrollToSection(targetId);
    setMobileQuickNavOpen(false);
  };

  const togglePageNav = (pageId: number) => {
    setExpandedPageIds((current) => ({ ...current, [pageId]: !current[pageId] }));
  };

  const alignDesktopQuickNavPanel = () => {
    const rail = desktopQuickNavRailRef.current;
    if (!rail) return;
    setDesktopQuickNavPanelRight(Math.max(8, window.innerWidth - rail.getBoundingClientRect().left));
  };

  const showDesktopQuickNav = () => {
    if (desktopQuickNavHoverTimeoutRef.current) clearTimeout(desktopQuickNavHoverTimeoutRef.current);
    alignDesktopQuickNavPanel();
    setDesktopQuickNavHovered(true);
  };

  const hideDesktopQuickNav = () => {
    if (desktopQuickNavHoverTimeoutRef.current) clearTimeout(desktopQuickNavHoverTimeoutRef.current);
    desktopQuickNavHoverTimeoutRef.current = setTimeout(() => setDesktopQuickNavHovered(false), 180);
  };

  if (notFound) {
    return <ApiNotFound title="Không tìm thấy khảo sát" description="Khảo sát này không tồn tại hoặc đã bị xóa." href="/admin/survey" linkLabel="Về danh sách khảo sát" />;
  }

  if (loading && !survey) {
    return <div className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-gray-500">Đang tải khảo sát…</div>;
  }

  if (!survey) {
    return <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-error-500">{error || "Không tải được khảo sát."}</div>;
  }


  const QuickNav = ({ mobile = false }: { mobile?: boolean }) => {
    const navItems = [
      { id: "survey-info", label: "Thông tin khảo sát", shortLabel: "i" },
      ...pagesOrdered.map((page, index) => ({
        id: `survey-page-${page.id}`,
        label: `Page ${index + 1}: ${page.title || "Chưa có tên"}`,
        shortLabel: String(index + 1),
        page,
        index,
      })),
    ];

    if (!mobile) {
      return (
        <nav className="group pointer-events-none absolute inset-y-0 right-4 z-40 hidden h-full items-start md:flex" aria-label="Mục lục khảo sát">
          <div ref={desktopQuickNavRailRef} onMouseEnter={showDesktopQuickNav} onMouseLeave={hideDesktopQuickNav} className="pointer-events-auto sticky top-24 flex shrink-0 flex-col items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-2 py-3 shadow-lg backdrop-blur transition-all dark:border-gray-800 dark:bg-gray-900/95">
            <button type="button" onClick={() => { alignDesktopQuickNavPanel(); setDesktopQuickNavOpen((open) => !open); }} aria-expanded={desktopQuickNavOpen} aria-label={desktopQuickNavOpen ? "Đóng mục lục" : "Mở mục lục"} title={desktopQuickNavOpen ? "Đóng mục lục" : "Mở mục lục"} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-500/10">
              {desktopQuickNavOpen ? <FiX size={14} /> : <FiList size={14} />}
            </button>
            {navItems.map((item) => {
              const active = activeNavId === item.id;
              return (
                <button key={item.id} type="button" onClick={() => scrollToSection(item.id)} aria-label={item.label} title={item.label} className={`flex h-3 w-3 items-center justify-center rounded-full transition ${active ? "bg-brand-500 opacity-100 shadow-sm shadow-brand-500/30" : "bg-gray-400 opacity-35 hover:opacity-70 dark:bg-gray-500"}`}>
                  <span className="sr-only">{item.shortLabel}</span>
                </button>
              );
            })}
            <span className="my-1 h-px w-5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            <button type="button" onClick={() => scrollToSection("survey-info")} aria-label="Lên đầu trang" title="Lên đầu trang" className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-400">
              <FiArrowUp size={15} />
            </button>
          </div>
          <div onMouseEnter={showDesktopQuickNav} onMouseLeave={hideDesktopQuickNav} style={{ right: desktopQuickNavPanelRight }} className={`fixed top-24 z-40 hidden w-72 transition-[opacity,transform] duration-200 lg:block ${desktopQuickNavOpen || desktopQuickNavHovered ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-2 opacity-0"}`}>
            <div className="max-h-[72vh] overflow-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Mục lục</p>
              <button type="button" onClick={() => scrollToSection("survey-info")} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${activeNavId === "survey-info" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10"}`}>
                <FiFileText size={15} />
                Thông tin khảo sát
              </button>
              <div className="mt-1 space-y-1">
                {pagesOrdered.map((page, index) => {
                  const expanded = expandedPageIds[page.id] ?? false;
                  const questions = Array.isArray(page.questions) ? page.questions : [];
                  const pageNavId = `survey-page-${page.id}`;
                  const active = activeNavId === pageNavId;
                  return (
                    <div key={page.id} className="rounded-lg">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => togglePageNav(page.id)} aria-label={expanded ? "Thu gọn trang" : "Mở danh sách câu hỏi"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800">
                          {expanded ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                        </button>
                        <button type="button" onClick={() => scrollToSection(pageNavId)} className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${active ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10"}`}>
                          <span className="block truncate">Page {index + 1}: {page.title || "Chưa có tên"}</span>
                        </button>
                      </div>
                      {expanded && (
                        <div className="ml-8 mt-1 space-y-1 border-l border-gray-100 pl-2 dark:border-gray-800">
                          {questions.length > 0 ? questions.map((question: any, questionIndex: number) => (
                            <button key={question.id || questionIndex} type="button" onClick={() => scrollToSection(`survey-question-${question.id}`)} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-gray-500 transition hover:bg-gray-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800">
                              Câu {questionIndex + 1}: {question.questionText || "Chưa có nội dung"}
                            </button>
                          )) : (
                            <p className="px-2 py-1.5 text-xs text-gray-400">Chưa có câu hỏi</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      );
    }

    return (
      <nav className="sticky top-16 z-30 -mx-4 mb-5 border-y border-gray-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95">
        <button type="button" onClick={() => setMobileQuickNavOpen((open) => !open)} aria-expanded={mobileQuickNavOpen} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10">
          <span className="flex min-w-0 items-center gap-2">
            <FiList size={16} className="shrink-0" />
            <span className="truncate">Mục lục</span>
          </span>
          {mobileQuickNavOpen ? <FiX size={16} className="shrink-0" /> : <FiChevronDown size={16} className="shrink-0" />}
        </button>
        {mobileQuickNavOpen && (
          <div className="mt-2 max-h-[70vh] space-y-1 overflow-y-auto border-t border-gray-100 pt-2 dark:border-gray-800">
            <button type="button" onClick={() => scrollToSectionFromMobileNav("survey-info")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10">
              <FiFileText size={15} />
              Thông tin khảo sát
            </button>
            {pagesOrdered.map((page, index) => {
              const expanded = expandedPageIds[page.id] ?? false;
              const questions = Array.isArray(page.questions) ? page.questions : [];
              return (
                <div key={page.id} className="rounded-lg">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => togglePageNav(page.id)} aria-label={expanded ? "Thu gọn trang" : "Mở danh sách câu hỏi"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800">
                      {expanded ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                    </button>
                    <button type="button" onClick={() => scrollToSectionFromMobileNav(`survey-page-${page.id}`)} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-brand-500/10">
                      <span className="block truncate">Page {index + 1}: {page.title || "Chưa có tên"}</span>
                    </button>
                  </div>
                  {expanded && (
                    <div className="ml-8 mt-1 space-y-1 border-l border-gray-100 pl-2 dark:border-gray-800">
                      {questions.length > 0 ? questions.map((question: any, questionIndex: number) => (
                        <button key={question.id || questionIndex} type="button" onClick={() => scrollToSectionFromMobileNav(`survey-question-${question.id}`)} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-gray-500 transition hover:bg-gray-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800">
                          Câu {questionIndex + 1}: {question.questionText || "Chưa có nội dung"}
                        </button>
                      )) : (
                        <p className="px-2 py-1.5 text-xs text-gray-400">Chưa có câu hỏi</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    );
  };

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:py-9">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Quay lại" className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <FiArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-gray-500"><FiFileText className="text-brand-500" /> Khảo sát / Chỉnh sửa</p>
            <h1 className="mt-1 truncate text-xl font-semibold text-gray-900 dark:text-white">{survey.title || "Khảo sát chưa có tên"}</h1>
          </div>
        </div>
        <button type="button" onClick={() => void updateSurvey()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60">
          <FiSave size={16} /> {saving ? "Đang lưu…" : "Lưu thông tin"}
        </button>
      </header>
      <QuickNav mobile />
      <QuickNav />

      <div className="min-w-0 md:pr-16">
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      <section id="survey-info" className="mb-8 scroll-mt-24 grid gap-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Tên khảo sát
            <input className={`${fieldClass} mt-1.5 text-base font-medium`} value={survey.title || ""} onChange={(event) => setSurvey({ ...survey, title: event.target.value })} placeholder="Nhập tên khảo sát" />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Mô tả
            <textarea className={`${fieldClass} mt-1.5 resize-y`} rows={3} value={survey.description || ""} onChange={(event) => setSurvey({ ...survey, description: event.target.value })} placeholder="Mục đích hoặc hướng dẫn cho người trả lời" />
          </label>
        </div>
        <aside className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500">Ảnh bìa khảo sát</p>
          <MediaUploader compact ownerType="SURVEY" ownerId={Number(survey.id)} values={survey} onChange={(field, value) => setSurvey((current) => current && ({ ...current, [field]: value }))} />
        </aside>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Các trang</h2>
          <p className="mt-0.5 text-sm text-gray-500">{survey.pages.length} trang trong khảo sát</p>
        </div>
        <div className="flex items-center gap-3">
          {pageOrderSaving && <span className="text-xs font-medium text-gray-400">Đang lưu thứ tự...</span>}
          <button type="button" onClick={() => void addPage()} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"><FiPlus size={16} /> Thêm trang</button>
        </div>
      </div>

      {survey.pages.length === 0 && <div className="mb-6 rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500 dark:border-gray-700">Khảo sát chưa có trang. Thêm trang để bắt đầu tạo câu hỏi.</div>}

      <div className="space-y-5">
        {pagesOrdered.map((page, index) => (
          <div key={page.id} className="space-y-5">
            {index === 0 && (
              <div className="flex items-center justify-center">
                <button type="button" onClick={() => void addPage(0)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:border-brand-500 hover:bg-brand-50 dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/10"><FiPlus size={13} /> Thêm trang ở đầu</button>
              </div>
            )}
            <section id={`survey-page-${page.id}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-brand-100 bg-brand-50/60 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white shadow-sm shadow-brand-500/20">{index + 1}</span>
                <input aria-label={"T\u00ean trang"} className="min-w-0 flex-1 rounded-lg border border-transparent bg-white/70 px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:bg-gray-950/40 dark:text-white dark:focus:bg-gray-950" value={page.title || ""} onChange={(event) => patchPage(page.id, { title: event.target.value })} placeholder={"T\u00ean trang"} />
                <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-gray-500">Thứ tự
                  <select className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200" value={getValidOrderIndex(page, index + 1)} onChange={(event) => setPageOrder(page.id, Number(event.target.value))}>
                    {pagesOrdered.map((_, pageIndex) => <option key={pageIndex} value={pageIndex + 1}>{pageIndex + 1}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => void savePage(page)} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 active:scale-95"><FiSave size={14} /> Lưu trang</button>
                <button type="button" onClick={() => void deletePage(page.id)} aria-label="Xóa trang" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><FiTrash2 size={16} /></button>
              </div>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-gray-500">
                  {"M\u00f4 t\u1ea3 trang"}
                  <textarea className={`${fieldClass} mt-1.5 resize-y bg-white/90`} rows={3} value={page.description || ""} onChange={(event) => patchPage(page.id, { description: event.target.value })} placeholder={"M\u00f4 t\u1ea3 ho\u1eb7c h\u01b0\u1edbng d\u1eabn cho trang (kh\u00f4ng b\u1eaft bu\u1ed9c)"} />
                </label>
                <div className="rounded-lg border border-brand-200/70 bg-brand-50/80 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
                  <p className="mb-2 text-xs font-medium text-gray-500">Media trang</p>
                  <MediaUploader compact ownerType="PAGE" ownerId={Number(page.id)} values={page} onChange={(field, value) => patchPage(page.id, { [field]: value })} />
                </div>
              </div>
            </div>
            <div className="space-y-5 p-4 sm:p-5">
              <QuestionEditor page={page} survey={survey} setSurvey={setSurvey} conditions={conditions} />
            </div>
            </section>
            <div className="flex items-center justify-center">
              <button type="button" onClick={() => void addPage(index + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:border-brand-500 hover:bg-brand-50 dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/10"><FiPlus size={13} /> {index === pagesOrdered.length - 1 ? "Thêm trang cuối" : "Thêm trang ở đây"}</button>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button type="button" onClick={() => setShowConditions((open) => !open)} aria-expanded={showConditions} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="flex items-center gap-2.5"><FiGitBranch className="text-brand-500" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">Điều kiện hiển thị</span><span className="mt-0.5 block text-xs text-gray-500">{conditions.length} điều kiện</span></span></span>
          <FiChevronDown className={`text-gray-400 transition-transform ${showConditions ? "rotate-180" : ""}`} />
        </button>
        {showConditions && <div className="border-t border-gray-100 p-4 dark:border-gray-800"><ConditionEditor survey={survey} conditions={conditions} setConditions={setConditions} /></div>}
      </section>
      </div>
    </main>
  );
}
