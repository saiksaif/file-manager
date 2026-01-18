import type { Category, Document, Notification, Paginated, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4050";
const API_BASE = `${API_URL.replace(/\/$/, "")}/api`;

export const getApiBase = () => API_BASE;
export const getApiOrigin = () => API_URL.replace(/\/$/, "");

const parseError = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string };
    if (data?.message) {
      return data.message;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
};

const refreshSession = async () => {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  return response.ok;
};

const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers ?? {}),
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const login = async (payload: { email: string; password: string }) => {
  return apiFetch<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const register = async (payload: {
  name?: string;
  email: string;
  password: string;
}) => {
  return apiFetch<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const logout = async () => {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
  });
};

export const getMe = async () => {
  return apiFetch<{ user: User }>("/auth/me");
};

export const listDocuments = async (params: {
  page: number;
  limit: number;
  category?: string;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }

  return apiFetch<Paginated<Document>>(`/documents?${searchParams.toString()}`);
};

export const uploadDocument = async (params: {
  file: File;
  name?: string;
  description?: string;
  categoryId?: number;
  onProgress?: (percent: number) => void;
}) => {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.name) {
    formData.append("name", params.name);
  }
  if (params.description) {
    formData.append("description", params.description);
  }
  if (params.categoryId) {
    formData.append("categoryId", String(params.categoryId));
  }

  const attemptUpload = async (retry: boolean): Promise<{ document: Document }> => {
    const response = await new Promise<Response>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${API_BASE}/documents/upload`, true);
      request.withCredentials = true;
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable || !params.onProgress) return;
        params.onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        resolve(new Response(request.responseText, { status: request.status }));
      };
      request.onerror = () => {
        reject(new Error("Upload failed"));
      };
      request.send(formData);
    });

    if (response.status === 401 && retry) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return attemptUpload(false);
      }
    }

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return response.json() as Promise<{ document: Document }>;
  };

  return attemptUpload(true);
};

export const getDocument = async (id: number) => {
  return apiFetch<{ document: Document }>(`/documents/${id}`);
};

export const updateDocument = async (params: {
  id: number;
  name?: string;
  description?: string | null;
  categoryId?: number | null;
}) => {
  return apiFetch<{ document: Document }>(`/documents/${params.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      categoryId: params.categoryId,
    }),
  });
};

export const deleteDocument = async (id: number) => {
  return apiFetch<void>(`/documents/${id}`, {
    method: "DELETE",
  });
};

export const listCategories = async () => {
  return apiFetch<{ categories: Category[] }>("/categories");
};

export const listNotifications = async (params: { page: number; limit: number }) => {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));
  return apiFetch<Paginated<Notification>>(`/notifications?${searchParams.toString()}`);
};

export const markNotificationRead = async (id: number) => {
  return apiFetch<void>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
};
