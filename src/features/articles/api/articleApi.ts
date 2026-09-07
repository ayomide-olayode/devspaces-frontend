import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { ArticleFormData } from "../schemas/articleSchema";

export interface Attachment {
  id?: string;
  type?: string;
  url?: string | null;
  originalFileName?: string | null;
  format?: string | null;
  bytes?: number | null;
  linkTitle?: string | null;
  linkUrl?: string | null;
}

export interface AuthorInfo {
  id?: string;
  name?: string;
  userName?: string;
  avatarUrl?: string | null;
}

export interface Article extends Partial<ArticleFormData> {
  id: string;
  authorId: string;
  author?: AuthorInfo | null;
  authorName?: string;
  title: string;
  content: string;
  slug?: string;
  excerpt?: string | null;
  tags?: string[];
  tagNames?: string[];
  attachments?: Attachment[];
  coverImageUrl?: string | null;
  coverImage?: string;
  readingTimeMinutes?: number;
  readingTime?: number;
  likeCount?: number;
  likes?: number;
  liked?: boolean;
  isLiked?: boolean;
  viewCount?: number;
  commentCount?: number;
  comments?: number;
  status?: "draft" | "published"; // | "scheduled" | "archived"
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
  // scheduledFor?: string | null;
  isEditable?: boolean;
  editDeadline?: string | null;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FeedResponse {
  success: boolean;
  message: string;
  data: Article[];
  pagination?: Pagination;
}

export interface MyPostsResponse {
  success: boolean;
  message: string;
  data: Article[];
  pagination?: Pagination;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  message: string;
  parentId: string | null;
  createdAt: string;
  replies: Comment[];
}

export interface PostInteraction {
  id?: string;
  liked: boolean;
  likedAt?: string | null;
  saved: boolean;
  savedAt?: string | null;
  viewed?: boolean;
  viewedAt?: string | null;
  userId?: string;
  postId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/posts/{id}/interaction — fetch user interaction state on a post */
export async function getPostInteraction(id: string): Promise<PostInteraction | null> {
  try {
    const response = await apiClient.get<PostInteraction | { data?: PostInteraction }>(
      ENDPOINTS.POSTS.INTERACTION(id),
    );
    if (response.data && typeof response.data === "object") {
      const d = response.data as Record<string, unknown>;
      if (d.data && typeof d.data === "object") {
        return d.data as PostInteraction;
      }
      return response.data as PostInteraction;
    }
    return null;
  } catch {
    return null;
  }
}

/** GET /api/posts/feed — fetch the post feed */
export async function getArticles(): Promise<Article[]> {
  const response = await apiClient.get<FeedResponse | Article[] | { data?: Article[] }>(
    ENDPOINTS.POSTS.FEED,
  );
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray((response.data as FeedResponse).data)) {
    return (response.data as FeedResponse).data;
  }
  return [];
}

/** GET /api/posts/my-posts — fetch posts created by the current user */
export async function getMyPosts(): Promise<Article[]> {
  const response = await apiClient.get<MyPostsResponse | Article[] | { data?: Article[] }>(
    ENDPOINTS.POSTS.MY_POSTS,
  );
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray((response.data as MyPostsResponse).data)) {
    return (response.data as MyPostsResponse).data;
  }
  return [];
}

/** GET /api/posts/{id} — fetch a single post */
export async function getArticleById(id: string): Promise<Article> {
  const response = await apiClient.get<Article>(ENDPOINTS.POSTS.DETAIL(id));
  return response.data;
}

/** POST /api/posts — create a new post */
export async function createArticle(data: ArticleFormData): Promise<Article> {
  const payload = {
    title: data.title,
    content: data.content,
    slug: data.slug || undefined,
    excerpt: data.excerpt || null,
    tags: data.tagNames || [],
    coverImageUrl: data.coverImage || null,
    status: data.status,
  };
  const response = await apiClient.post<Article>(ENDPOINTS.POSTS.CREATE, payload);
  return response.data;
}

/** PUT /api/posts/{id} — update an existing post */
export async function updateArticle(id: string, data: Partial<ArticleFormData>): Promise<Article> {
  const payload = {
    ...data,
    tags: data.tagNames !== undefined ? data.tagNames : undefined,
    coverImageUrl: data.coverImage !== undefined ? data.coverImage || null : undefined,
  };
  const response = await apiClient.put<Article>(ENDPOINTS.POSTS.DETAIL(id), payload);
  return response.data;
}

/** DELETE /api/posts/{id} — delete a post */
export async function deleteArticle(id: string): Promise<void> {
  await apiClient.delete(ENDPOINTS.POSTS.DETAIL(id));
}

/** POST /api/posts/{id}/like — like or unlike a post */
export async function likeArticle(id: string): Promise<void> {
  await apiClient.post(ENDPOINTS.POSTS.LIKE(id), {});
}

/** POST /api/posts/{id}/save — save or unsave a post */
export async function saveArticle(id: string): Promise<void> {
  await apiClient.post(`/api/posts/${id}/save`, {});
}

/** GET /api/posts/{id}/comments — fetch comments for a post */
export async function getArticleComments(id: string): Promise<Comment[]> {
  const response = await apiClient.get<Comment[]>(`/api/posts/${id}/comments`);
  return response.data;
}

/** POST /api/posts/{id}/comment — create a comment on a post */
export async function createComment(id: string, message: string, parentId?: string): Promise<Comment> {
  const response = await apiClient.post<Comment>(`/api/posts/${id}/comment`, {
    message,
    parentId: parentId || null,
  });
  return response.data;
}
