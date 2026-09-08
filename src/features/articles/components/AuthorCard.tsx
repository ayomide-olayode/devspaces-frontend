import { useState, useEffect, type JSX } from "react";
import { Link } from "react-router-dom";
import { Card, Avatar, Button, Skeleton } from "@/components/common";
import {
  getUserProfileById,
  formatProfileName,
  getProfileAvatar,
  getProfileRole,
  type UserProfile,
} from "@/lib/api/user.api";

export interface AuthorCardProps {
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  company?: string;
  authorBio?: string;
  articlesCount?: number | string;
  followersCount?: number | string;
  followingCount?: number | string;
  isAuthor?: boolean;
}

export function AuthorCard({
  authorId,
  authorName ="DevSpace Author",
  authorAvatar,
  authorRole,
  company,
  authorBio,
  articlesCount,
  followersCount,
  followingCount,
  isAuthor = false,
}: AuthorCardProps): JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
     if (!authorId || (authorName && authorName !== "DevSpace Author")) {
       return;
     }

    let isSubscribed = true;

    async function loadAuthor(): Promise<void> {
      try {
        setIsLoading(true);
        const data = await getUserProfileById(authorId as string);
        if (isSubscribed) {
          setProfile(data);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void loadAuthor();
    return () => {
      isSubscribed = false;
    };
  }, [authorId, authorName]);

  const displayName =
    authorName && authorName !== "DevSpace Author"
      ? authorName
      : formatProfileName(profile, authorName || "DevSpace Author");
  
  const displayAvatar = authorAvatar ?? getProfileAvatar(profile);
  const displayRole = authorRole ?? getProfileRole(profile) ??"Community Author";
  const rawCompany = company || (profile?.company as string | undefined) || "";
  const displayCompany = rawCompany ? (rawCompany.startsWith("@") ? rawCompany : `@ ${rawCompany}`) : "";

  const displayBio =
    authorBio ||
    (profile?.bio as string | undefined) ||
    "Building accessible, resilient, and performant web applications.";

  const totalArticles =
    articlesCount ?? (profile?.articlesCount as number | string | undefined) ?? 0;
  const totalFollowers =
    followersCount ??
    (profile?.totalFollowers as number | string | undefined) ??
    (profile?.followersCount as number | string | undefined) ??
    0;
  const totalFollowing =
    followingCount ??
    (profile?.totalFollowed as number | string | undefined) ??
    (profile?.followingCount as number | string | undefined) ??
    0;

  const profileUrl = isAuthor
    ? "/profile"
    : authorId
      ? `/profile/${authorId}`
      : "/profile";

  if (isLoading) {
    return (
      <Card variant="default" padding="md" className="rounded-2xl border-border/80 shadow-xs bg-white">
        <Skeleton variant="text" width={140} height={18} className="mb-4" />
        <div className="flex items-center gap-3.5 mb-4">
          <Skeleton variant="circular" width={56} height={56} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="65%" height={16} />
            <Skeleton variant="text" width="80%" height={12} />
            <Skeleton variant="text" width="45%" height={12} />
          </div>
        </div>
        <Skeleton variant="text" width="100%" height={14} count={2} className="mb-4" />
        <div className="flex gap-4 mb-5">
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={60} height={14} />
        </div>
        <Skeleton variant="rounded" width="100%" height={40} className="rounded-xl" />
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      padding="md"
      className="rounded-2xl border-border/80 shadow-xs bg-white text-text font-inter"
    >
      {/* Header title */}
      <h3 className="font-bold text-base text-slate-900 tracking-tight mb-4">
        About the author
      </h3>

      {/* Author Identity: Avatar + Name + Role + Company */}
      <div className="flex items-center gap-3.5 mb-4">
        <Avatar
          src={displayAvatar}
          name={displayName}
          size="xl"
          shape="circle"
          href={profileUrl}
          className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 ring-1 ring-border/80 shadow-xs"
        />

        <div className="min-w-0 flex-1">
          <Link
            to={profileUrl}
            className="hover:underline focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary rounded-xs"
          >
            <h4 className="font-bold text-base text-slate-900 leading-snug truncate">
              {displayName}
            </h4>
          </Link>

          <p className="text-xs text-slate-600 font-medium leading-tight truncate mt-0.5">
            {displayRole}
          </p>

          <p className="text-xs text-slate-500 leading-tight truncate mt-0.5">
            {displayCompany}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
        {displayBio}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs mb-5">
        <div>
          <span className="font-bold text-slate-900">{totalArticles}</span>{" "}
          <span className="text-slate-500 font-medium">Articles</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">{totalFollowers}</span>{" "}
          <span className="text-slate-500 font-medium">Followers</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">{totalFollowing}</span>{" "}
          <span className="text-slate-500 font-medium">Following</span>
        </div>
      </div>

      {/* View profile button matching screenshot */}
      <Button
        href={profileUrl}
        variant="outline"
        size="md"
        fullWidth
        className="rounded-xl border-blue-400 text-blue-600 hover:bg-blue-50/60 hover:border-blue-500 font-semibold transition-colors py-2"
      >
        View profile
      </Button>
    </Card>
  );
}

export default AuthorCard;