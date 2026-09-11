import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AuthUser } from "@/types/auth.types";

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  userName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  profilePictureUrl?: string | null;
  role?: string;
  bio?: string;
  totalFollowers?: number;
  totalFollowed?: number;
  following?: boolean;
  isFollowing?: boolean;
  followersCount?: number | string;
  followingCount?: number | string;
  articlesCount?: number | string;
  resourcesCount?: number | string;
  [key: string]: unknown;
}

export interface FollowResponse {
  isFollowing?: boolean;
  followersCount?: number;
  message?: string;
}

export async function getUserProfile(id?: string): Promise<UserProfile> {
  const currentAuthUser = useAuthStore.getState().user;
  const isOwn = !id || (currentAuthUser?.id && id === currentAuthUser.id);

  if (isOwn) {
    let profileData: UserProfile = {};
    try {
      const response = await apiClient.get<Record<string, unknown>>(ENDPOINTS.USER.PROFILE);
      if (response.data && typeof response.data === "object") {
        if ("data" in response.data && response.data.data && typeof response.data.data === "object") {
          profileData = response.data.data as UserProfile;
        } else if ("user" in response.data && response.data.user && typeof response.data.user === "object") {
          profileData = response.data.user as UserProfile;
        } else {
          profileData = response.data as UserProfile;
        }
      }
    } catch {
      // Ignore user profile failure and try author details
    }

    const targetAuthorId =
      id ||
      (profileData.id as string | undefined) ||
      (profileData.userId as string | undefined) ||
      currentAuthUser?.id;

    if (
      targetAuthorId &&
      (profileData.totalFollowers === undefined || profileData.totalFollowed === undefined)
    ) {
      try {
        const authorRes = await apiClient.get<Record<string, unknown>>(
          ENDPOINTS.AUTHORS.DETAIL(targetAuthorId),
        );
        let authorData: UserProfile = {};
        if (authorRes.data && typeof authorRes.data === "object") {
          if ("data" in authorRes.data && authorRes.data.data && typeof authorRes.data.data === "object") {
            authorData = authorRes.data.data as UserProfile;
          } else {
            authorData = authorRes.data as UserProfile;
          }
        }
        profileData = { ...authorData, ...profileData, ...authorData };
      } catch {
        // Author detail fallback optional
      }
    }

    if (Object.keys(profileData).length > 0) {
      const resolvedUser: AuthUser = {
        id: (profileData.id as string) || (profileData.userId as string) || currentAuthUser?.id,
        email: (profileData.email as string) || currentAuthUser?.email,
        username: (profileData.username as string) || (profileData.userName as string) || currentAuthUser?.username,
        userName: (profileData.userName as string) || (profileData.username as string) || currentAuthUser?.userName,
        firstName: (profileData.firstName as string) || currentAuthUser?.firstName,
        lastName: (profileData.lastName as string) || currentAuthUser?.lastName,
        avatarUrl:
          (profileData.avatarUrl as string) ||
          (profileData.avatar as string) ||
          (profileData.profilePictureUrl as string) ||
          currentAuthUser?.avatarUrl ||
          null,
        role: (profileData.role as string) || currentAuthUser?.role,
      };
      useAuthStore.getState().setUser(resolvedUser);
      return profileData;
    }
  }

  // If requesting another author's profile, query GET /api/authors/{id}
  try {
    const response = await apiClient.get<Record<string, unknown>>(
      ENDPOINTS.AUTHORS.DETAIL(id || ""),
    );
    if (response.data && typeof response.data === "object") {
      if ("data" in response.data && response.data.data && typeof response.data.data === "object") {
        return response.data.data as UserProfile;
      }
      return response.data as UserProfile;
    }
  } catch {
    // Fallback
  }

  return { id };
}

const profileCache = new Map<string, Promise<UserProfile>>();

// follow user API

  export async function followAuthor(authorId: string): Promise<FollowResponse> {
    const response = await apiClient.post<FollowResponse>(ENDPOINTS.AUTHORS.FOLLOW(authorId),
  {}
);
    return response.data;
  }

/**
 * Fetches a user profile with deduplication and in-memory caching by user ID.
 */
export async function getUserProfileById(id: string): Promise<UserProfile> {
  if (!id) {
    throw new Error("A valid user ID is required to fetch a profile");
  }

  const existing = profileCache.get(id);
  if (existing) {
    return existing;
  }

  const request = getUserProfile(id).catch((err: unknown) => {
    // Evict failed request so subsequent attempts can retry
    profileCache.delete(id);
    throw err;
  });

  profileCache.set(id, request);
  return request;
}

/**
 * Formats a display name from a user profile, with graceful fallback.
 */
export function formatProfileName(
  profile?: UserProfile | null,
  fallback = "DevSpace Author",
): string {
  if (!profile) return fallback;
  const p = profile as Record<string, unknown>;
  const fullName = [
    profile.firstName || (p.FirstName as string | undefined),
    profile.lastName || (p.LastName as string | undefined),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;
  if (typeof profile.fullName === "string" && profile.fullName.trim()) return profile.fullName.trim();
  if (typeof p.FullName === "string" && p.FullName.trim()) return p.FullName.trim();
  if (typeof profile.name === "string" && profile.name.trim()) return profile.name.trim();
  if (typeof p.Name === "string" && p.Name.trim()) return p.Name.trim();
  if (typeof profile.userName === "string" && profile.userName.trim()) return profile.userName.trim();
  if (typeof p.UserName === "string" && p.UserName.trim()) return p.UserName.trim();
  if (typeof profile.username === "string" && profile.username.trim()) return profile.username.trim();
  if (typeof p.Username === "string" && p.Username.trim()) return p.Username.trim();
  return fallback;
}

/**
 * Retrieves the preferred avatar URL from a user profile.
 */
export function getProfileAvatar(profile?: UserProfile | null): string | undefined {
  if (!profile) return undefined;
  return (
    (profile.avatarUrl as string | undefined) ||
    (profile.avatar as string | undefined) ||
    (profile.profilePictureUrl as string | undefined) ||
    undefined
  );
}

/**
 * Retrieves the display role from a user profile.
 */
export function getProfileRole(profile?: UserProfile | null): string | undefined {
  if (!profile) return undefined;
  return typeof profile.role === "string" && profile.role.trim().length > 0
    ? profile.role.trim()
    : undefined;
}
