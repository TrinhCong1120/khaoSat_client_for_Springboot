import { API_MEDIA } from "@/lib/api";

export type MediaOwnerType = "SURVEY" | "PAGE" | "QUESTION" | "OPTION";
export type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

export interface UploadedMedia {
  id: number;
  ownerType: MediaOwnerType;
  ownerId: number;
  mediaType: MediaType;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  bucketName: string;
  objectKey: string;
  objectUrl: string;
  uploadedAt: string;
}

const responseMessage = async (response: Response) => {
  const body = await response.text().catch(() => "");
  try {
    const parsed = body ? JSON.parse(body) : null;
    const fieldErrors = parsed?.fieldErrors;
    const fields = fieldErrors && typeof fieldErrors === "object"
      ? Object.values(fieldErrors).flat().join(" ")
      : "";
    return parsed?.message || fields || parsed?.error || body;
  } catch {
    return body;
  }
};

export async function uploadMedia({
  file,
  ownerType,
  ownerId,
  mediaType,
  token,
}: {
  file: File;
  ownerType: MediaOwnerType;
  ownerId: number;
  mediaType: MediaType;
  token: string;
}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const presignedResponse = await fetch(`${API_MEDIA}/presigned-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ownerType,
      ownerId,
      mediaType,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });

  if (!presignedResponse.ok) {
    throw new Error((await responseMessage(presignedResponse)) || "Không tạo được presigned URL");
  }

  const presigned = await presignedResponse.json();
  if (!presigned?.uploadUrl || !presigned?.objectKey) {
    throw new Error("Backend khong tra ve uploadUrl/objectKey hop le.");
  }
  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: presigned.method || "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error((await responseMessage(uploadResponse)) || `Upload file that bai (${uploadResponse.status}).`);
  }

  const completeResponse = await fetch(`${API_MEDIA}/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ownerType,
      ownerId,
      mediaType,
      objectKey: presigned.objectKey,
      originalFilename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });

  if (!completeResponse.ok) {
    throw new Error((await responseMessage(completeResponse)) || "Không lưu được metadata media");
  }

  return (await completeResponse.json()) as UploadedMedia;
}

export const mediaField = (mediaType: MediaType) =>
  mediaType === "IMAGE" ? "imageUrl" : mediaType === "VIDEO" ? "videoUrl" : "audioUrl";
