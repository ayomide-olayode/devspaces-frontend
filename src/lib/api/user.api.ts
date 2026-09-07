import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import { useAuthStore } from "@/stores/useAuthStore";

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
  [key: string]: unknown;
}

export async function getUserProfile(id?: string): Promise<UserProfile> {
  const currentAuthUser = useAuthStore.getState().user;

  // If requesting the logged-in user's own profile
  if (!id || (currentAuthUser?.id && id === currentAuthUser.id)) {
    const response = await apiClient.get<UserProfile>(ENDPOINTS.USER.PROFILE);
    return response.data;
  }

  // If requesting another author's profile, query by specific ID route
  try {
    const response = await apiClient.get<UserProfile>(`/api/User/${id}`);
    if (response.data) {
      return response.data;
    }
  } catch {
    // Endpoint may not be available for other users
  }

  return { id };
}

const profileCache = new Map<string, Promise<UserProfile>>();

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
