"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import SearchableCodeSelect from "@/components/form/SearchableCodeSelect";
import { isAddressQuestionType } from "@/lib/vietnam-address-api";

const getToken = () =>
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export default function ConditionEditor({
  survey,
  conditions,
  setConditions,
}: any) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<any>({
    sourceQuestionId: "",
    targetQuestionId: "",
    sourceValueIds: [] as number[],
    sourceAddressProvinceTokens: [] as string[],
    sourceAddressWardTokens: [] as string[],
    action: "SHOW",
  });
  const [provinceOptions, setProvinceOptions] = useState<
    { code: number; name: string }[]
  >([]);
  const [wardOptions, setWardOptions] = useState<{ code: number; name: string }[]>(
    []
  );
  const [addressProvinceCode, setAddressProvinceCode] = useState<number | null>(null);
  const [addressWardCode, setAddressWardCode] = useState<number | null>(null);

  // ======================
  // GET ALL QUESTIONS
  // ======================
  const allQuestions = survey.pages.flatMap((p: any) => p.questions || []);

  // ======================
  // HELPERS
  // ======================
  const getQuestionText = (id: number) => {
    return allQuestions.find((q: any) => q.id === id)?.questionText || `Q${id}`;
  };

  const getOptionText = (questionId: number, value: string) => {
    const q = allQuestions.find((q: any) => q.id === questionId);
    if (!q) return value;
    const ids = String(value)
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length === 0) return value;
    const labels = ids
      .map((id) =>
        q.options?.find((o: any) => o.id === id)?.optionText || `#${id}`
      )
      .filter(Boolean);
    return labels.join(", ");
  };

  // ======================
  // SELECTED QUESTION
  // ======================
  const selectedSourceQuestion = allQuestions.find(
    (q: any) => q.id === form.sourceQuestionId
  );
  const sourceOptions = selectedSourceQuestion?.options || [];
  const isSourceAddressQuestion = isAddressQuestionType(selectedSourceQuestion || {});
  const isSourceChoiceQuestion = sourceOptions.length > 0 && !isSourceAddressQuestion;

  useEffect(() => {
    let cancelled = false;
    fetch("https://provinces.open-api.vn/api/v2/")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { name: string; code: number }[]) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []).map((p) => ({
          name: p.name,
          code: p.code,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setProvinceOptions(list);
      })
      .catch(() => {
        if (!cancelled) setProvinceOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (addressProvinceCode == null || !Number.isFinite(addressProvinceCode)) {
      setWardOptions([]);
      return;
    }
    let cancelled = false;
    fetch(`https://provinces.open-api.vn/api/v2/p/${addressProvinceCode}?depth=2`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: {
        wards?: { name: string; code: number }[];
        districts?: { wards?: { name: string; code: number }[] }[];
      }) => {
        if (cancelled) return;
        const flat: { name: string; code: number }[] = [];
        if (Array.isArray(data.wards) && data.wards.length) {
          flat.push(...data.wards);
        } else if (Array.isArray(data.districts)) {
          for (const d of data.districts) {
            if (d.wards?.length) flat.push(...d.wards);
          }
        }
        flat.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setWardOptions(flat);
      })
      .catch(() => {
        if (!cancelled) setWardOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [addressProvinceCode]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      sourceQuestionId: "",
      targetQuestionId: "",
      sourceValueIds: [],
      sourceAddressProvinceTokens: [],
      sourceAddressWardTokens: [],
      action: "SHOW",
    });
    setAddressProvinceCode(null);
    setAddressWardCode(null);
  };

  const reloadConditions = async () => {
    const res = await fetch(`${API_URL}/survey/${survey.id}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    setConditions(data.conditions || []);
  };

  const toSourceValuePayload = () => {
    if (isSourceAddressQuestion) {
      const tokens = [
        ...(form.sourceAddressProvinceTokens || []),
        ...(form.sourceAddressWardTokens || []),
      ]
        .map((x: string) => String(x).trim())
        .filter(Boolean);
      return tokens.join(",");
    }
    return form.sourceValueIds.join(",");
  };

  // ======================
  // CREATE
  // ======================
  const saveCondition = async () => {
    if (!form.sourceQuestionId || !form.targetQuestionId) {
      alert("Vui lòng chọn câu hỏi nguồn và câu hỏi đích");
      return;
    }

    if (isSourceAddressQuestion) {
      const addressTokensCount =
        (form.sourceAddressProvinceTokens?.length || 0) +
        (form.sourceAddressWardTokens?.length || 0);
      if (addressTokensCount <= 0) {
        alert("Vui lòng chọn ít nhất 1 tỉnh/thành hoặc xã/phường cho điều kiện ADDRESS");
        return;
      }
    } else {
      if (!isSourceChoiceQuestion) {
        alert("Câu nguồn phải là câu hỏi có options (single/multiple choice) hoặc ADDRESS");
        return;
      }
      if (!form.sourceValueIds.length) {
        alert("Vui lòng chọn ít nhất 1 đáp án điều kiện");
        return;
      }
    }

    const payload = {
      sourceQuestionId: Number(form.sourceQuestionId),
      targetQuestionId: Number(form.targetQuestionId),
      sourceValue: toSourceValuePayload(),
      action: String(form.action || "").toUpperCase(),
    };

    const endpoint =
      editingId == null
        ? `${API_URL}/survey/conditions`
        : `${API_URL}/survey/conditions/${editingId}`;
    const method = editingId == null ? "POST" : "PUT";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Lưu điều kiện thất bại");
      return;
    }

    await reloadConditions();
    resetForm();
  };

  // ======================
  // DELETE
  // ======================
  const deleteCondition = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa điều kiện này?")) return;

    await fetch(`${API_URL}/survey/conditions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await reloadConditions();
  };

  const startEdit = (c: any) => {
    const sourceQuestion = allQuestions.find((q: any) => q.id === c.sourceQuestionId);
    const sourceIsAddress = isAddressQuestionType(sourceQuestion || {});
    const rawTokens = String(c.sourceValue || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const ids = rawTokens
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);
    const provinceNameSet = new Set(
      provinceOptions.map((p) => p.name.toLocaleLowerCase("vi"))
    );
    const provinceTokens: string[] = [];
    const wardTokens: string[] = [];
    if (sourceIsAddress) {
      for (const t of rawTokens) {
        if (provinceNameSet.has(t.toLocaleLowerCase("vi"))) provinceTokens.push(t);
        else wardTokens.push(t);
      }
    }
    setEditingId(c.id);
    setForm({
      sourceQuestionId: c.sourceQuestionId,
      targetQuestionId: c.targetQuestionId,
      sourceValueIds: ids,
      sourceAddressProvinceTokens: provinceTokens,
      sourceAddressWardTokens: wardTokens,
      action: c.action || "SHOW",
    });
    setAddressProvinceCode(null);
    setAddressWardCode(null);
  };

  const toggleSourceOption = (optionId: number) => {
    setForm((prev: any) => {
      const exists = prev.sourceValueIds.includes(optionId);
      const next = exists
        ? prev.sourceValueIds.filter((x: number) => x !== optionId)
        : [...prev.sourceValueIds, optionId];
      return {
        ...prev,
        sourceValueIds: next,
      };
    });
  };

  const addAddressProvinceToken = (code: number | null) => {
    if (code == null || !Number.isFinite(code)) return;
    setAddressProvinceCode(code);
    const name = provinceOptions.find((p) => p.code === code)?.name;
    if (!name) return;
    setForm((prev: any) => {
      const curr = prev.sourceAddressProvinceTokens || [];
      if (curr.includes(name)) return prev;
      return { ...prev, sourceAddressProvinceTokens: [...curr, name] };
    });
  };

  const addAddressWardToken = (code: number | null) => {
    if (code == null || !Number.isFinite(code)) return;
    const name = wardOptions.find((w) => w.code === code)?.name;
    if (!name) return;
    setForm((prev: any) => {
      const curr = prev.sourceAddressWardTokens || [];
      if (curr.includes(name)) return prev;
      return { ...prev, sourceAddressWardTokens: [...curr, name] };
    });
  };

  const removeAddressToken = (kind: "province" | "ward", value: string) => {
    setForm((prev: any) => {
      if (kind === "province") {
        return {
          ...prev,
          sourceAddressProvinceTokens: (prev.sourceAddressProvinceTokens || []).filter(
            (x: string) => x !== value
          ),
        };
      }
      return {
        ...prev,
        sourceAddressWardTokens: (prev.sourceAddressWardTokens || []).filter(
          (x: string) => x !== value
        ),
      };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
          Điều kiện logic
        </h2>
        <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 text-xs font-semibold">
          {conditions.length} điều kiện
        </span>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {conditions.map((c: any) => (
          <div
            key={c.id}
            className="group flex justify-between items-center bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-4 rounded-xl hover:border-brand-500/30 transition-all"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Luật logic</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Nếu <b className="text-gray-900 dark:text-white">{getQuestionText(c.sourceQuestionId)}</b> ∈ "
                <span className="text-brand-500 font-medium">
                  {isAddressQuestionType(
                    allQuestions.find((q: any) => q.id === c.sourceQuestionId) || {}
                  )
                    ? String(c.sourceValue || "")
                        .split(",")
                        .map((x: string) => x.trim())
                        .filter(Boolean)
                        .join(", ")
                    : getOptionText(c.sourceQuestionId, c.sourceValue)}
                </span>
                " → <b className={c.action === "SHOW" ? "text-green-600" : "text-error-500"}>{c.action === "SHOW" ? "HIỆN" : "ẨN"}</b>{" "}
                <b className="text-gray-900 dark:text-white">{getQuestionText(c.targetQuestionId)}</b>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(c)}
                className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                title="Sửa điều kiện"
              >
                <FiEdit2 size={17} />
              </button>
              <button
                onClick={() => deleteCondition(c.id)}
                className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all"
                title="Xóa điều kiện"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {conditions.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-gray-400 text-sm">
            Chưa có điều kiện nào được thiết lập
          </div>
        )}
      </div>

      {/* FORM */}
      <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SOURCE QUESTION */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Câu hỏi nguồn</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer"
              value={form.sourceQuestionId}
              onChange={(e) => {
                setAddressProvinceCode(null);
                setAddressWardCode(null);
                setForm({
                  ...form,
                  sourceQuestionId: Number(e.target.value),
                  sourceValueIds: [],
                  sourceAddressProvinceTokens: [],
                  sourceAddressWardTokens: [],
                });
              }}
            >
              <option value="">-- Chọn câu hỏi nguồn --</option>
              {allQuestions.map((q: any) => (
                <option key={q.id} value={q.id}>
                  {q.questionText}
                </option>
              ))}
            </select>
          </div>

          {/* SOURCE VALUE */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Giá trị so sánh</label>
            {selectedSourceQuestion ? (
              isSourceAddressQuestion ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Tỉnh/Thành (ADDRESS)</p>
                    <SearchableCodeSelect
                      className="[&_input]:rounded-xl"
                      aria-label="Thêm tỉnh/thành cho điều kiện"
                      placeholder="Chọn tỉnh/thành để thêm"
                      options={provinceOptions}
                      value={addressProvinceCode}
                      onChange={addAddressProvinceToken}
                      allowNull
                      nullLabel="— Bỏ chọn —"
                      allowCodeInput={false}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(form.sourceAddressProvinceTokens || []).map((name: string) => (
                        <button
                          key={`p-${name}`}
                          type="button"
                          onClick={() => removeAddressToken("province", name)}
                          className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {name} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Xã/Phường (ADDRESS)</p>
                    <SearchableCodeSelect
                      className="[&_input]:rounded-xl"
                      aria-label="Thêm xã/phường cho điều kiện"
                      placeholder={
                        addressProvinceCode == null
                          ? "Chọn tỉnh trước để lọc xã/phường"
                          : "Chọn xã/phường để thêm"
                      }
                      options={wardOptions}
                      value={addressWardCode}
                      onChange={addAddressWardToken}
                      disabled={addressProvinceCode == null || wardOptions.length === 0}
                      allowNull
                      nullLabel="— Bỏ chọn —"
                      allowCodeInput={false}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(form.sourceAddressWardTokens || []).map((name: string) => (
                        <button
                          key={`w-${name}`}
                          type="button"
                          onClick={() => removeAddressToken("ward", name)}
                          className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                          {name} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] text-gray-500">
                      SourceValue sẽ gửi dạng text tách dấu phẩy: ví dụ Hà Nội,Ba Đình.
                    </p>
                  </div>
                </div>
              ) : isSourceChoiceQuestion ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2 max-h-44 overflow-auto">
                  {sourceOptions.map((o: any) => {
                    const checked = form.sourceValueIds.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-500"
                          checked={checked}
                          onChange={() => toggleSourceOption(o.id)}
                        />
                        <span>{o.optionText}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  Câu nguồn này không có options và cũng không phải ADDRESS nên chưa hỗ trợ SourceValue.
                </div>
              )
            ) : (
              <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">
                Chọn câu hỏi nguồn để chọn đáp án điều kiện
              </div>
            )}
          </div>

          {/* ACTION */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Hành động</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer"
              value={form.action}
              onChange={(e) =>
                setForm({ ...form, action: e.target.value })
              }
            >
              <option value="SHOW">HIỆN câu hỏi đích</option>
              <option value="HIDE">ẨN câu hỏi đích</option>
            </select>
          </div>

          {/* TARGET QUESTION */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Câu hỏi đích</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer"
              value={form.targetQuestionId}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetQuestionId: Number(e.target.value),
                })
              }
            >
              <option value="">-- Chọn câu hỏi đích --</option>
              {allQuestions.map((q: any) => (
                <option key={q.id} value={q.id}>
                  {q.questionText}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          {editingId != null && (
            <button
              onClick={resetForm}
              className="mr-3 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              <FiX size={16} />
              Hủy sửa
            </button>
          )}
          <button
            onClick={saveCondition}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 text-sm font-semibold transition-all active:scale-95"
          >
            <FiPlus size={18} />
            {editingId == null ? "Thêm điều kiện" : "Lưu chỉnh sửa"}
          </button>
        </div>
      </div>
    </div>
  );
}