"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  deleteDocument,
  getApiOrigin,
  getMe,
  listCategories,
  listDocuments,
  listNotifications,
  logout,
  markNotificationRead,
  updateDocument,
  uploadDocument,
} from "@/lib/api";
import type { Category, Document, Notification, User } from "@/lib/types";
import { formatDate, formatFileSize, formatTime } from "@/lib/format";
import ToastStack, { type Toast } from "@/components/ToastStack";
import Skeleton from "@/components/Skeleton";

const PAGE_SIZE = 8;

type UploadState = {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    progress: 0,
    status: "idle",
  });
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [toast, ...prev].slice(0, 4));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setDocsLoading(true);
      setDocsError(null);
      const response = await listDocuments({
        page,
        limit: PAGE_SIZE,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setDocuments(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : "Failed to load documents.");
    } finally {
      setDocsLoading(false);
    }
  }, [page, categoryFilter, search]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await listNotifications({ page: 1, limit: 20 });
      setNotifications(response.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const response = await getMe();
        if (!active) return;
        setUser(response.user);
        const categoriesResponse = await listCategories();
        if (!active) return;
        setCategories(categoriesResponse.categories);
        await fetchNotifications();
      } catch (error) {
        if (active) {
          router.push("/login");
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [fetchDocuments, fetchNotifications, router]);

  useEffect(() => {
    if (!user) return;
    fetchDocuments();
  }, [fetchDocuments, user]);

  useEffect(() => {
    if (!user) return;

    const socket = io(`${getApiOrigin()}/users`, {
      transports: ["websocket"],
      withCredentials: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("online");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("offline");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("offline");
    });

    socket.on("connection:status", (payload: { status: string }) => {
      const status =
        payload.status === "connected" || payload.status === "online"
          ? "online"
          : "offline";
      setConnectionStatus(status);
    });

    socket.on("document:uploaded", () => {
      fetchDocuments();
      addToast({
        id: crypto.randomUUID(),
        title: "Document uploaded",
        message: "A new document is now available.",
        tone: "info",
      });
    });

    socket.on("document:updated", () => {
      fetchDocuments();
      addToast({
        id: crypto.randomUUID(),
        title: "Document updated",
        message: "Changes synced in realtime.",
        tone: "info",
      });
    });

    socket.on("document:deleted", () => {
      fetchDocuments();
    });

    socket.on("notification:new", (payload: { notification?: Notification }) => {
      if (payload?.notification) {
        setNotifications((prev) => [payload.notification, ...prev]);
        addToast({
          id: crypto.randomUUID(),
          title: payload.notification.title,
          message: payload.notification.message ?? "",
          tone: "success",
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [addToast, fetchDocuments, user]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setUploadState({ file, progress: 0, status: "idle" });
    setUploadName(file.name.replace(/\.[^/.]+$/, ""));
    setUploadDescription("");
    setUploadCategory("");
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadState.file) {
      setUploadState((prev) => ({
        ...prev,
        status: "error",
        message: "Choose a file to upload.",
      }));
      return;
    }

    try {
      setUploadState((prev) => ({ ...prev, status: "uploading", progress: 0 }));
      const response = await uploadDocument({
        file: uploadState.file,
        name: uploadName.trim() || undefined,
        description: uploadDescription.trim() || undefined,
        categoryId: uploadCategory ? Number(uploadCategory) : undefined,
        onProgress: (percent) => {
          setUploadState((prev) => ({ ...prev, progress: percent }));
        },
      });
      setUploadState({ file: null, progress: 100, status: "success" });
      setUploadName("");
      setUploadDescription("");
      setUploadCategory("");
      addToast({
        id: crypto.randomUUID(),
        title: "Upload complete",
        message: response.document.name,
        tone: "success",
      });
      fetchDocuments();
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      }));
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditDescription(doc.description ?? "");
    setEditCategory(doc.categoryId ? String(doc.categoryId) : "");
  };

  const handleUpdate = async () => {
    if (!editingDoc) return;

    try {
      const response = await updateDocument({
        id: editingDoc.id,
        name: editName.trim() || undefined,
        description: editDescription.trim() ? editDescription.trim() : null,
        categoryId: editCategory ? Number(editCategory) : null,
      });
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === response.document.id ? response.document : doc))
      );
      setEditingDoc(null);
      addToast({
        id: crypto.randomUUID(),
        title: "Document updated",
        message: response.document.name,
        tone: "success",
      });
    } catch (error) {
      addToast({
        id: crypto.randomUUID(),
        title: "Update failed",
        message: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    const confirmed = window.confirm(`Delete ${doc.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      addToast({
        id: crypto.randomUUID(),
        title: "Document deleted",
        message: doc.name,
        tone: "info",
      });
    } catch (error) {
      addToast({
        id: crypto.randomUUID(),
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen px-6 pb-16 pt-8 sm:px-10">
      <ToastStack toasts={toasts} onDismiss={removeToast} />

      <header className="glass mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl px-6 py-6 shadow-soft sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">DocuFlow</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "online"
                    ? "bg-emerald-500"
                    : connectionStatus === "connecting"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              {connectionStatus === "online"
                ? "Live"
                : connectionStatus === "connecting"
                ? "Connecting"
                : "Offline"}
            </span>
            <div className="relative">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                Notifications
                {unreadCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <button
                      type="button"
                      className="text-xs text-slate-500"
                      onClick={() => setShowNotifications(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border px-3 py-2 text-xs ${
                            item.read
                              ? "border-slate-200 bg-white"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <span className="text-[10px] text-slate-500">
                              {formatTime(item.createdAt)}
                            </span>
                          </div>
                          {item.message ? (
                            <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                          ) : null}
                          {!item.read ? (
                            <button
                              type="button"
                              className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                              onClick={() => handleMarkRead(item.id)}
                            >
                              Mark as read
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass rounded-3xl px-6 py-6 shadow-soft">
          <h2 className="text-xl font-semibold text-slate-900">Upload a document</h2>
          <p className="mt-2 text-sm text-slate-600">
            Add a file and enrich it with metadata for instant organization.
          </p>

          <div
            className={`mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragActive
                ? "border-slate-400 bg-white/80"
                : "border-slate-200 bg-white/60"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <p className="text-sm font-semibold text-slate-800">
              Drag & drop your file here
            </p>
            <p className="mt-2 text-xs text-slate-500">
              PDF, DOCX, TXT, PNG, JPG up to 10MB
            </p>
            <button
              type="button"
              className="mt-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Document name
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                value={uploadName}
                onChange={(event) => setUploadName(event.target.value)}
                placeholder="Quarterly brief"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Description
              <textarea
                className="min-h-[90px] rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                value={uploadDescription}
                onChange={(event) => setUploadDescription(event.target.value)}
                placeholder="Optional context to help others search"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Category
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value)}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {uploadState.file ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{uploadState.file.name}</span>
                  <span>{formatFileSize(uploadState.file.size)}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                {uploadState.message ? (
                  <p className="mt-2 text-xs text-rose-600">{uploadState.message}</p>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleUpload}
              disabled={uploadState.status === "uploading"}
            >
              {uploadState.status === "uploading" ? "Uploading..." : "Upload document"}
            </button>
            {uploadState.status === "error" && uploadState.message ? (
              <p className="text-xs text-rose-600">{uploadState.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl px-6 py-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
                <p className="text-sm text-slate-600">
                  {total} files indexed. Updated in realtime.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="h-10 rounded-full border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                  placeholder="Search documents"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <select
                  className="h-10 rounded-full border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {docsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="glass rounded-2xl px-4 py-4 shadow-soft">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-3 h-3 w-2/3" />
                    <Skeleton className="mt-6 h-3 w-1/2" />
                  </div>
                ))
              ) : docsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {docsError}
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No documents found. Try uploading one.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="glass rounded-2xl px-4 py-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{doc.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.category?.name ?? "Uncategorized"} · {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                        {doc.fileType.split("/").pop()?.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                      {doc.description || "No description provided."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700"
                          onClick={() => window.open(doc.s3Url, "_blank")}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700"
                          onClick={() => handleEdit(doc)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600"
                          onClick={() => handleDelete(doc)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {editingDoc ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="glass w-full max-w-lg rounded-3xl px-6 py-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit metadata</h3>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setEditingDoc(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Name
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Description
                <textarea
                  className="min-h-[90px] rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Category
                <select
                  className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                onClick={() => setEditingDoc(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                onClick={handleUpdate}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
