import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { ArticleFormData } from "../schemas/articleSchema";



export interface Article extends Partial<ArticleFormData> {
  id: string;
  authorId: string;
  title: string;
  content: string;

  slug?: string;
  excerpt?: string;

  tags?: string[];
  tagNames?: string[];

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

  status?:
    | "draft"
    | "published"
    | "scheduled"
    | "archived";

  createdAt: string;
  updatedAt?: string;
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
export async function getArticles(): Promise<Article[]> {
  const response = await apiClient.get<
    Article[] | { data?: Article[] }
  >(ENDPOINTS.POSTS.FEED);

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (
    response.data &&
    Array.isArray(response.data.data)
  ) {
    return response.data.data;
  }

  return [];
}

export async function getArticleById(
  id: string,
): Promise<Article> {
  const response =
    await apiClient.get<Article>(
      ENDPOINTS.POSTS.DETAIL(id),
    );

  return response.data;
}

export async function createArticle(
  data: ArticleFormData,
): Promise<Article> {
  const payload: Partial<ArticleFormData> = {
    ...data,
  };

  // scheduledFor is only relevant for scheduled posts.
  if (payload.status !== "scheduled") {
    delete payload.scheduledFor;
  }

  const response =
    await apiClient.post<Article>(
      ENDPOINTS.POSTS.CREATE,
      payload,
    );

  return response.data;
}

export async function updateArticle(
  id: string,
  data: Partial<ArticleFormData>,
): Promise<Article> {
  const payload: Partial<ArticleFormData> = {
    ...data,
  };

  // scheduledFor is only relevant for scheduled posts.
  if (payload.status !== "scheduled") {
    delete payload.scheduledFor;
  }

  const response =
    await apiClient.put<Article>(
      ENDPOINTS.POSTS.DETAIL(id),
      payload,
    );

  return response.data;
}

export async function deleteArticle(
  id: string,
): Promise<void> {
  await apiClient.delete(
    ENDPOINTS.POSTS.DETAIL(id),
  );
}

export async function likeArticle(
  id: string,
): Promise<void> {
  await apiClient.post(
    ENDPOINTS.POSTS.LIKE(id),
  );
}

export async function saveArticle(
  id: string,
): Promise<void> {
  await apiClient.post(
    ENDPOINTS.POSTS.SAVE(id),
  );
}


export async function getArticleComments(
  id: string,
): Promise<Comment[]> {
  const response =
    await apiClient.get<Comment[]>(
      ENDPOINTS.POSTS.COMMENTS(id),
    );

  return response.data;
}


export async function createComment(
  id: string,
  message: string,
  parentId?: string,
): Promise<Comment> {
  const response =
    await apiClient.post<Comment>(
      ENDPOINTS.POSTS.CREATE_COMMENT(id),
      {
        message,
        parentId: parentId ?? null,
      },
    );

  return response.data;
}
