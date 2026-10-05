"use client";

import { useEffect, useRef, useState } from "react";
import { FiImage, FiMusic, FiPlus, FiTrash2, FiUpload, FiVideo, FiX } from "react-icons/fi";
import { API_MEDIA } from "@/lib/api";
import { mediaField, MediaOwnerType, MediaType, uploadMedia } from "@/lib/media";

type Props = {
  ownerType: MediaOwnerType;
  ownerId: number;
  values?: Record<string, any>;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
};

const ACCEPT = "image/*,video/*,audio/*";

export default function MediaUploader({ ownerType, ownerId, values, onChange, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState<MediaType | null>(null);
  const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
  const token = typeof window === "undefined"
    ? ""
    : localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  const mediaFiles = Array.isArray(values?.mediaFiles) ? values.mediaFiles : [];
  const visibleMedia = mediaFiles.filter((media: any) => !removedMediaIds.includes(Number(media.id)));
  const savedType: MediaType | null = values?.imageUrl
    ? "IMAGE"
    : values?.videoUrl
      ? "VIDEO"
      : values?.audioUrl
        ? "AUDIO"
        : visibleMedia.some((media: any) => media.mediaType === "IMAGE")
          ? "IMAGE"
          : visibleMedia.some((media: any) => media.mediaType === "VIDEO")
            ? "VIDEO"
            : visibleMedia.some((media: any) => media.mediaType === "AUDIO")
              ? "AUDIO"
              : null;
  const activeType = previewType || savedType;
  const activeUrl = previewUrl || (savedType ? values?.[mediaField(savedType)] || visibleMedia.find((media: any) => media.mediaType === savedType)?.objectUrl || "" : "");
  const imageUrls = Array.from(new Set([
    ...visibleMedia.filter((media: any) => media.mediaType === "IMAGE").map((media: any) => media.objectUrl),
    ...(values?.imageUrl ? [values.imageUrl] : []),
    ...(previewUrl && previewType === "IMAGE" ? [previewUrl] : []),
  ].filter((url): url is string => typeof url === "string" && url.length > 0)));
  const hasAnyMedia = Boolean(activeUrl || values?.videoUrl || values?.audioUrl || visibleMedia.length);
  const compactLayout = compact && !(ownerType === "OPTION" && hasAnyMedia);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    const type: MediaType = file.type.startsWith("video/")
      ? "VIDEO"
      : file.type.startsWith("audio/")
        ? "AUDIO"
        : "IMAGE";
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return localUrl;
    });
    setPreviewType(type);
    setBusy(true);
    setError("");

    try {
      const result = await uploadMedia({ file, ownerType, ownerId, mediaType: type, token });
      onChange(mediaField(type), result.objectUrl);
      setPreviewUrl("");
      setPreviewType(null);
      URL.revokeObjectURL(localUrl);
    } catch (uploadError) {
      URL.revokeObjectURL(localUrl);
      setPreviewUrl("");
      setPreviewType(null);
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải tệp lên.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const deleteMedia = async (media: any) => {
    if (!media?.id || !token) return;
    setError("");
    try {
      const response = await fetch(`${API_MEDIA}/${media.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Không xóa được media (${response.status}).`);
      setRemovedMediaIds((current) => [...current, Number(media.id)]);
      if (values?.[mediaField(media.mediaType)] === media.objectUrl) {
        const replacement = visibleMedia.find((item: any) =>
          item.mediaType === media.mediaType && Number(item.id) !== Number(media.id)
        );
        onChange(mediaField(media.mediaType), replacement?.objectUrl || "");
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được media.");
    }
  };

  const clearMediaUrl = (type: MediaType) => {
    onChange(mediaField(type), "");
  };

  const activeMedia = activeUrl
    ? visibleMedia.find((media: any) => media?.objectUrl === activeUrl)
    : null;

  const TypeIcon = activeType === "VIDEO" ? FiVideo : activeType === "AUDIO" ? FiMusic : FiImage;
  const AddMediaIcon = ({ compact = false }: { compact?: boolean }) => (
    <span className="relative inline-flex items-center justify-center">
      <FiImage size={compact ? 18 : 20} />
      <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500 text-white ring-2 ring-white dark:ring-gray-900">
        <FiPlus size={9} />
      </span>
    </span>
  );

  if (ownerType === "OPTION" && !hasAnyMedia) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title="Thêm media"
          aria-label="Thêm media"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-100 bg-brand-50 text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
        >
          <AddMediaIcon compact />
          <span className="sr-only">{busy ? "Đang tải" : "Thêm media"}</span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} />
        {error && <p role="alert" className="col-span-full flex items-center justify-end gap-1 text-[11px] text-red-600 dark:text-red-400"><FiX size={12} />{error}</p>}
      </>
    );
  }

  return (
    <div className={`${ownerType === "OPTION" ? "col-span-full mt-2" : ""} w-full min-w-0`}>
        <div className={`${compactLayout ? "flex-wrap rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 dark:border-gray-800 dark:bg-gray-950/40" : ""} flex min-w-0 items-center gap-2.5`}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} title="Thêm media" aria-label="Thêm media" className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-brand-400 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800">
            {activeUrl && activeType === "IMAGE" ? <img src={activeUrl} alt="Ảnh minh họa" className="h-full w-full object-cover" /> : <TypeIcon size={18} />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><FiUpload size={15} /></span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">{busy ? "Đang tải lên…" : hasAnyMedia ? "Đã có media" : "Chưa có media"}</p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{error || (activeType === "VIDEO" ? "Video" : activeType === "AUDIO" ? "Âm thanh" : hasAnyMedia ? `${imageUrls.length} ảnh` : "Ảnh, video hoặc âm thanh")}</p>
          </div>
          {activeUrl && activeType !== "IMAGE" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800"><TypeIcon size={15} /></span>}
          {activeUrl && activeType && ownerType !== "OPTION" && (
            <button
              type="button"
              onClick={() => activeMedia?.id ? void deleteMedia(activeMedia) : clearMediaUrl(activeType)}
              disabled={busy}
              title="Xoa media"
              aria-label="Xoa media"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              <FiTrash2 size={15} />
            </button>
          )}
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={`${compactLayout ? "ml-14 sm:ml-0" : ""} inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-500/10`}>
            <AddMediaIcon compact /> {busy ? "Đang tải" : "Thêm media"}
          </button>
        </div>

      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} />

      {imageUrls.length > 0 && (
        <div className={`${compactLayout ? "pl-0" : "pl-[58px]"} mt-3`}>
          <p className="mb-2 text-[11px] font-medium text-gray-500">{imageUrls.length} ảnh</p>
          <div className={compactLayout ? "grid max-w-md grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3" : "grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"}>
            {imageUrls.map((url, index) => {
              const media = visibleMedia.find((item: any) => item?.objectUrl === url);
              return <div key={`${url}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <a href={url} target="_blank" rel="noreferrer" title={`Mở ảnh ${index + 1}`} className="block h-full w-full">
                  <img src={url} alt={`Ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                </a>
                <button type="button" onClick={() => media?.id ? void deleteMedia(media) : clearMediaUrl("IMAGE")} aria-label={`Xóa ảnh ${index + 1}`} title="Xóa ảnh" className="absolute right-1 top-1 rounded-full bg-black/65 p-1.5 text-white opacity-100 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"><FiTrash2 size={13} /></button>
              </div>;
            })}
          </div>
        </div>
      )}

      {activeUrl && activeType && activeType !== "IMAGE" && (
        <div className={`${compactLayout ? "pl-0" : "pl-[58px]"} mt-2`}>
          {activeType === "VIDEO" ? <video src={activeUrl} controls className="max-h-28 w-full rounded-md bg-black" /> : <audio src={activeUrl} controls className="h-8 w-full" />}
        </div>
      )}
      {error && <p role="alert" className={`${compactLayout ? "pl-0" : "pl-[58px]"} mt-1 flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400`}><FiX size={12} />{error}</p>}
    </div>
  );
}
