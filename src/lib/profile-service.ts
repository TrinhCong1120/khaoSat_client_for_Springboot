import { API_USERS } from "@/lib/api";
import { getToken } from "@/lib/auth";

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  roles: string[];
  telegramChatId: number | null;
  zaloChatId: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  botNotificationEnabled: boolean;
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  botNotificationEnabled?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BotLinkCodeResponse {
  code: string;
  channel: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  deepLink?: string;
  appLink?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getMyProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_USERS}/me`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Lỗi lấy thông tin tài khoản (HTTP ${res.status})`);
  }
  return res.json();
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const res = await fetch(`${API_USERS}/me`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Không thể cập nhật hồ sơ (HTTP ${res.status})`);
  }
  const updatedUser: UserProfile = await res.json();
  
  // Đồng bộ lại user lưu trong storage để Header/Sidebar cập nhật ngay lập tức
  if (typeof window !== "undefined") {
    const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
    const existingStr = storage.getItem("user");
    if (existingStr) {
      try {
        const existing = JSON.parse(existingStr);
        const merged = {
          ...existing,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl,
        };
        storage.setItem("user", JSON.stringify(merged));
        window.dispatchEvent(new Event("userChanged"));
      } catch {
        // ignore
      }
    }
  }

  return updatedUser;
}

export async function changeMyPassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const res = await fetch(`${API_USERS}/me/password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Đổi mật khẩu thất bại (HTTP ${res.status})`);
  }
  return res.json();
}

export async function unlinkBotAccount(channel: "TELEGRAM" | "ZALO"): Promise<UserProfile> {
  const res = await fetch(`${API_USERS}/me/bot-link?channel=${channel}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Hủy liên kết ${channel} thất bại (HTTP ${res.status})`);
  }
  return res.json();
}

export async function toggleBotNotifications(enabled: boolean): Promise<UserProfile> {
  const res = await fetch(`${API_USERS}/me/bot-notifications?enabled=${enabled}`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Cập nhật thông báo thất bại (HTTP ${res.status})`);
  }
  return res.json();
}

export async function generateBotOtpCode(channel: "TELEGRAM" | "ZALO"): Promise<BotLinkCodeResponse> {
  const res = await fetch(`${API_USERS}/me/bot-link-code?channel=${channel}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Không thể tạo mã liên kết (HTTP ${res.status})`);
  }
  return res.json();
}
