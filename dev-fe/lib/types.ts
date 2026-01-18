export type UserRole = "USER" | "ADMIN";

export type User = {
  id: number;
  email: string;
  name?: string | null;
  role: UserRole;
};

export type Category = {
  id: number;
  name: string;
  color?: string | null;
};

export type Document = {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  s3Key: string;
  s3Url: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
};

export type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message?: string | null;
  read: boolean;
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
