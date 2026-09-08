import { useState, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FiMessageCircle, FiMoreHorizontal } from "react-icons/fi";
import { LuBookmark, LuBookmarkCheck, LuClock } from "react-icons/lu";
import { Avatar } from "@/components/common";
import { toast } from "@/hooks/useToast";
import articlePlaceholder from "@/assets/images/article-placeholder.jpg";
import {
  getUserProfileById,
  formatProfileName,
  getProfileAvatar,
  getProfileRole,
  type UserProfile,
} from "@/lib/api/user.api";

export interface ArticleCardProps {
  id: string;
  authorId?: string;
  title: string;
  excerpt: string;
  tagNames: string[];
  coverImage?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  /** When true, turns the author avatar into a clickable link */
  isAvatarLink?: boolean;
  /** Optional custom URL for the avatar link (defaults to /profile/:authorId or /profile) */
  authorLink?: string;
  /** Custom navigation destination URL when card is clicked (defaults to /articles/:id or /articles/:id/edit if isEditable) */
  targetHref?: string;
  /** When true, clicking card navigates to edit mode /articles/:id/edit */
  isEditable?: boolean;
  status?: "draft" | "published" | 0 | 1 | string | number;
  createdAt: string;
  readTimeMinutes?: number;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: (id: string) => Promise<void>;
  onBookmark?: () => void;
  /** "horizontal" = feed list row · "vertical" = grid card */
  variant?: "horizontal" | "vertical";
}

const getStatusLabel = (
  status?: "draft" | "published" | 0 | 1 | string | number,
): "published" | "draft" | null => {
  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();
    if (normalized === "published" || normalized === "1") return "published";
    if (normalized === "draft" || normalized === "0") return "draft";
  }
  if (status === 1) return "published";
  if (status === 0) return "draft";
  return null;
};

function DifficultyDots({ readingTime = 0 }: { readingTime?: number }): JSX.Element {
  const filled = readingTime <= 3 ? 1 : readingTime <= 6 ? 2 : readingTime <= 10 ? 3 : 4;
  return (
    <span className="flex items-center gap-1" aria-label={`Difficulty: ${filled} of 4`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i < filled ? "bg-emerald-500" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

function CoverImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className: string;
}): JSX.Element {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`overflow-hidden bg-slate-900 ${className}`}>
      <img
        key={src ?? "placeholder"}
        src={hasError || !src ? articlePlaceholder : src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function ArticleCard({
  id,
  authorId,
  title,
  excerpt,
  tagNames,
  coverImage,
  authorName = "DevSpace Author",
  authorAvatar,
  authorRole,
  isAvatarLink = false,
  authorLink,
  targetHref,
  isEditable = false,
  status,
  createdAt,
  readTimeMinutes = 4,
  likes = 0,
  comments = 0,
  isLiked = false,
  isBookmarked = false,
  onLike,
  onBookmark,
  variant = "horizontal",
}: ArticleCardProps): JSX.Element {
  const navigate = useNavigate();
  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const [likeOffset, setLikeOffset] = useState<number>(0);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);

  const statusLabel = getStatusLabel(status);

  const isAvatarLinkEnabled = Boolean(isAvatarLink || authorLink);
  const targetAuthorHref = authorLink || (authorId ? `/profile/${authorId}` : "/profile");
  const destinationHref = targetHref || (isEditable ? `/articles/${id}/edit` : `/articles/${id}`);

  const hasLiked = likedOverride !== null ? likedOverride : isLiked;
  const localLikes = Math.max(0, likes + likeOffset);

  useEffect(() => {
    if (!authorId || (authorName && authorName !== "DevSpace Author")) {
      return;
    }
    let cancelled = false;

    async function loadAuthorProfile(): Promise<void> {
      try {
        const profile = await getUserProfileById(authorId as string);
        if (!cancelled) {
          setFetchedProfile(profile);
        }
      } catch {
        // Keep fallback values gracefully on network failure
      }
    }

    void loadAuthorProfile();
    return () => {
      cancelled = true;
    };
  }, [authorId, authorName]);

  const displayAuthorName =
    authorName && authorName !== "DevSpace Author"
      ? authorName
      : formatProfileName(fetchedProfile, authorName || "DevSpace Author");

  const displayAuthorAvatar = authorAvatar ?? getProfileAvatar(fetchedProfile);
  const displayAuthorRole = authorRole ?? getProfileRole(fetchedProfile);

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const authorMeta = [displayAuthorRole, formattedDate].filter(Boolean).join(" · ");

  const handleCardClick = (e: React.MouseEvent<HTMLElement>): void => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) {
      return;
    }
    navigate(destinationHref);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select")) {
        return;
      }
      e.preventDefault();
      navigate(destinationHref);
    }
  };

  const handleLike = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;
    const wasLiked = hasLiked;
    const offsetDelta = wasLiked ? -1 : 1;
    // Optimistic toggle
    setLikedOverride(!wasLiked);
    setLikeOffset((prev) => prev + offsetDelta);
    setIsLiking(true);
    try {
      if (onLike) await onLike(id);
    } catch {
      // Revert on failure
      setLikedOverride(wasLiked);
      setLikeOffset((prev) => prev - offsetDelta);
      toast.error("Failed to update like status");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.();
  };

  /* ── Vertical (grid) variant ──────────────────────────────────────── */
  if (variant === "vertical") {
    return (
      <article
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={0}
        role="article"
        aria-label={title}
        className="bg-white border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-border/80 transition-all duration-200 flex flex-col group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Cover */}
        <CoverImage
          src={coverImage}
          alt={title}
          className="w-full aspect-video group-hover:opacity-90 transition-opacity"
        />

        <div className="p-4 flex flex-col flex-1 gap-3">
          {/* Author & Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                src={displayAuthorAvatar}
                name={displayAuthorName}
                size="xs"
                href={isAvatarLinkEnabled ? targetAuthorHref : undefined}
              />
              <div className="leading-tight min-w-0">
                <p className="text-xs font-semibold text-text truncate">{displayAuthorName}</p>
                <p className="text-[11px] text-text/50 truncate">{authorMeta || formattedDate}</p>
              </div>
            </div>

            {statusLabel && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                  statusLabel === "published"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    statusLabel === "published" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {statusLabel === "published" ? "Published" : "Draft"}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-sm font-bold text-text line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {title}
          </h2>

          {/* Excerpt */}
          <p className="text-xs text-text/60 line-clamp-2 leading-relaxed flex-1">{excerpt}</p>

          {/* Tags */}
          {tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagNames.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[11px] border border-border text-text/60 hover:border-primary hover:text-primary transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-3 text-xs text-text/50">
              {/* Like */}
              <button
                type="button"
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
                  hasLiked ? "text-red-500" : "hover:text-red-500"
                }`}
                aria-label={hasLiked ? "Unlike article" : "Like article"}
              >
                {hasLiked ? (
                  <AiFillHeart className="w-3.5 h-3.5" />
                ) : (
                  <AiOutlineHeart className="w-3.5 h-3.5" />
                )}
                <span>{localLikes}</span>
              </button>

              {/* Comments */}
              <button
                type="button"
                className="flex items-center gap-1 hover:text-primary transition-colors"
                aria-label="View comments"
              >
                <FiMessageCircle className="w-3.5 h-3.5" />
                <span>{comments}</span>
              </button>

              {/* Bookmark */}
              <button
                type="button"
                onClick={handleBookmark}
                className={`flex items-center gap-1 transition-colors ${
                  isBookmarked ? "text-primary" : "hover:text-primary"
                }`}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {isBookmarked ? (
                  <LuBookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <LuBookmark className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-text/50">
              <LuClock className="w-3 h-3" />
              <span>{readTimeMinutes}m</span>
              <DifficultyDots readingTime={readTimeMinutes} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  /* ── Horizontal (feed) variant ─────────────────────────────────────── */
  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="article"
      aria-label={title}
      className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-border/80 transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar
            src={displayAuthorAvatar}
            name={displayAuthorName}
            size="sm"
            href={isAvatarLinkEnabled ? targetAuthorHref : undefined}
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text">{displayAuthorName}</p>
            <p className="text-xs text-text/50">{authorMeta || formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusLabel && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                statusLabel === "published"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusLabel === "published" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {statusLabel === "published" ? "Published" : "Draft"}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="p-1.5 rounded-lg text-text/40 hover:text-text hover:bg-slate-100 transition-colors"
            aria-label="More options"
          >
            <FiMoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: text + image (image hidden on mobile) */}
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <h2 className="text-sm sm:text-base font-bold text-text line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {title}
          </h2>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm text-text/60 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {excerpt}
          </p>

          {/* Tags */}
          {tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tagNames.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-xs border border-border text-text/70 hover:border-primary hover:text-primary transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cover — hidden on mobile, shown sm+ */}
        <div className="shrink-0 hidden sm:block">
          <CoverImage
            src={coverImage}
            alt={title}
            className="w-36 h-24 sm:w-44 sm:h-28 rounded-xl group-hover:opacity-90 transition-opacity"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
        <div className="flex items-center gap-3 sm:gap-4 text-text/50">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
              hasLiked ? "text-red-500" : "hover:text-red-500"
            }`}
            aria-label={hasLiked ? "Unlike article" : "Like article"}
          >
            {hasLiked ? (
              <AiFillHeart className="w-4 h-4" />
            ) : (
              <AiOutlineHeart className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">{localLikes}</span>
          </button>

          {/* Comments */}
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
            aria-label="View comments"
          >
            <FiMessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{comments}</span>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 transition-colors ${
              isBookmarked ? "text-primary" : "hover:text-primary"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Save article"}
          >
            {isBookmarked ? (
              <LuBookmarkCheck className="w-4 h-4" />
            ) : (
              <LuBookmark className="w-4 h-4" />
            )}
            <span className="text-xs font-medium hidden sm:inline">
              {isBookmarked ? "Saved" : "Save"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-text/50">
          <LuClock className="w-3.5 h-3.5 hidden sm:block" />
          <span className="hidden sm:inline">{readTimeMinutes} min read</span>
          <span className="sm:hidden text-[11px]">{readTimeMinutes}m</span>
          <DifficultyDots readingTime={readTimeMinutes} />
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
