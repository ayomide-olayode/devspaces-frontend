import { useState, useEffect, type JSX } from "react";
import { useParams } from "react-router-dom";
import {
  FiMapPin,
  FiLink,
  FiGithub,
  FiTwitter,
  FiShare2,
  FiMail,
  FiUsers,
  FiUserPlus,
  FiFileText,
  FiBookOpen,
  FiActivity,
  FiUser,
  FiFolder,
  FiCheck,
} from "react-icons/fi";
import { BsPatchCheckFill } from "react-icons/bs";
import {
  Avatar,
  Button,
  Tabs,
  Skeleton,
  EmptyState,
  type TabItem,
} from "@/components/common";
import {
  getUserProfile,
  formatProfileName,
  getProfileAvatar,
  type UserProfile,
} from "@/lib/api/user.api";
import { getArticles, getMyPosts, type Article } from "@/features/articles/api/articleApi";
import { ArticleCard } from "@/features/articles/components/ArticleCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/hooks/useToast";

type ProfileTab = "articles" | "resources" | "activity" | "about";

const PROFILE_TABS: TabItem[] = [
  { id: "articles", label: "Articles", icon: <FiFileText className="w-4 h-4" /> },
  { id: "resources", label: "Resources", icon: <FiFolder className="w-4 h-4" /> },
  { id: "activity", label: "Activity", icon: <FiActivity className="w-4 h-4" /> },
  { id: "about", label: "About", icon: <FiUser className="w-4 h-4" /> },
];

export default function ProfilePage(): JSX.Element {
  const { id } = useParams<{ id?: string }>();
  const currentUser = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("articles");
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      try {
        setIsLoading(true);
        const [profileData, articlesData] = await Promise.allSettled([
          getUserProfile(id),
          isOwnProfile ? getMyPosts() : getArticles(),
        ]);

        if (!cancelled) {
          if (profileData.status === "fulfilled" && profileData.value) {
            setProfile(profileData.value);
          }
          if (articlesData.status === "fulfilled" && Array.isArray(articlesData.value)) {
            const fetchedArticles = articlesData.value;
            setArticles(
              isOwnProfile
                ? fetchedArticles
                : fetchedArticles.filter((art) => art.authorId === id),
            );
          }
        }
      } catch {
        // Keep fallback data gracefully on network error
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [id, isOwnProfile]);

  const displayName = formatProfileName(
    profile,
    currentUser?.username || "DevSpace Member",
  );
  const username =
    (profile?.username as string | undefined) ||
    (profile?.userName as string | undefined) ||
    currentUser?.username ||
    "member";

  const bio =
    (profile?.bio as string | undefined) ||
    (profile?.role as string | undefined) ||
    "Software Engineer building on DevSpace.";

  const avatarUrl = getProfileAvatar(profile);

  const location = (profile?.location as string | undefined) || "";
  const website = (profile?.website as string | undefined) || "";
  const github = (profile?.github as string | undefined) || "";
  const twitter = (profile?.twitter as string | undefined) || "";

  const followersCount = (profile?.followersCount as string | number | undefined) ?? 0;
  const followingCount = (profile?.followingCount as string | number | undefined) ?? 0;
  const articlesCount = articles.length;
  const resourcesCount = (profile?.resourcesCount as string | number | undefined) ?? 0;

  const handleFollowToggle = (): void => {
    setIsFollowing((prev) => {
      const next = !prev;
      if (next) {
        toast.success(`You are now following ${displayName}`);
      } else {
        toast.info(`Unfollowed ${displayName}`);
      }
      return next;
    });
  };

  const handleShare = async (): Promise<void> => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Profile link copied to clipboard!");
      } else {
        toast.info("Sharing not supported in this browser");
      }
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleMessage = (): void => {
    toast.info(`Starting conversation with ${displayName}...`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-inter">
      {/* ── Profile Header Card ───────────────────────────────────────── */}
      {isLoading ? (
        <section className="relative bg-white border border-border/70 rounded-2xl md:rounded-3xl shadow-xs overflow-hidden">
          <div className="h-28 sm:h-32 bg-slate-100 animate-pulse" />
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 -mt-14 sm:-mt-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
                <Skeleton
                  variant="circular"
                  width={112}
                  height={112}
                  className="ring-4 ring-white rounded-full shrink-0 shadow-md"
                />
                <div className="space-y-2 flex-1 min-w-0 w-full">
                  <Skeleton variant="text" width={200} height={28} />
                  <Skeleton variant="text" width={110} height={16} />
                  <Skeleton variant="text" width="85%" height={16} />
                  <div className="flex items-center gap-3 pt-1">
                    <Skeleton variant="text" width={80} height={14} />
                    <Skeleton variant="text" width={100} height={14} />
                  </div>
                </div>
              </div>
              <div className="lg:pl-8 lg:border-l lg:border-border/60 shrink-0 w-full sm:w-auto">
                <div className="grid grid-cols-2 divide-x divide-y divide-border/60 border border-border/60 rounded-2xl bg-white/80 overflow-hidden text-center min-w-[240px] sm:min-w-[270px]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3.5 sm:p-4 flex flex-col items-center justify-center gap-1.5">
                      <Skeleton variant="circular" width={18} height={18} />
                      <Skeleton variant="text" width={40} height={22} />
                      <Skeleton variant="text" width={50} height={12} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative bg-white border border-border/70 rounded-2xl md:rounded-3xl shadow-xs overflow-hidden">
          {/* Soft atmospheric gradient banner */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-100/60 via-purple-100/40 to-indigo-100/30" />

          <div className="px-6 pb-6 sm:px-8 sm:pb-8 -mt-14 sm:-mt-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Avatar + Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 flex-1 min-w-0">
                {/* Shared Avatar Component with 2xl size & status dot */}
                <Avatar
                  src={avatarUrl}
                  alt={displayName}
                  name={displayName}
                  size="2xl"
                  status="online"
                  href={false}
                  className="ring-4 ring-white shadow-md shrink-0"
                />

                {/* User Identity & Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
                        {displayName}
                      </h1>
                      <BsPatchCheckFill
                        className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-blue-600 shrink-0"
                        title="Verified member"
                        aria-label="Verified member"
                      />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-text/50">@{username}</p>
                  </div>

                  <p className="text-xs sm:text-sm text-text/80 leading-relaxed max-w-2xl">
                    {bio}
                  </p>

                  {/* Social & Meta Links */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text/60 pt-0.5">
                    {location && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-3.5 h-3.5 text-text/40 shrink-0" />
                        <span>{location}</span>
                      </span>
                    )}

                    {website && (
                      <>
                        {location && <span className="text-border/80 hidden sm:inline">|</span>}
                        <a
                          href={`https://${website.replace(/^https?:\/\//, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                        >
                          <FiLink className="w-3.5 h-3.5 shrink-0" />
                          <span>{website}</span>
                        </a>
                      </>
                    )}

                    {github && (
                      <>
                        {(location || website) && (
                          <span className="text-border/80 hidden sm:inline">|</span>
                        )}
                        <a
                          href={`https://${github.replace(/^https?:\/\//, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-text/70 hover:text-text font-medium"
                        >
                          <FiGithub className="w-3.5 h-3.5 shrink-0" />
                          <span>{github}</span>
                        </a>
                      </>
                    )}

                    {twitter && (
                      <>
                        {(location || website || github) && (
                          <span className="text-border/80 hidden sm:inline">|</span>
                        )}
                        <a
                          href={`https://x.com/${twitter.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#1DA1F2] hover:underline font-medium"
                        >
                          <FiTwitter className="w-3.5 h-3.5 shrink-0" />
                          <span>{twitter}</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* Action Buttons using shared Button component */}
                  <div className="flex items-center gap-2.5 pt-2">
                    {!isOwnProfile && (
                      <Button
                        variant={isFollowing ? "secondary" : "primary"}
                        size="sm"
                        onClick={handleFollowToggle}
                        leftIcon={
                          isFollowing ? (
                            <FiCheck className="w-4 h-4" />
                          ) : (
                            <FiUserPlus className="w-4 h-4" />
                          )
                        }
                        className="rounded-xl px-5 h-9 font-semibold"
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                    )}

                    {isOwnProfile && (
                      <Button
                        href="/articles/new"
                        variant="primary"
                        size="sm"
                        className="rounded-xl px-5 h-9 font-semibold"
                      >
                        Write Article
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleShare}
                      aria-label="Share profile"
                      title="Share profile"
                      className="h-9 w-9 p-0 rounded-xl"
                    >
                      <FiShare2 className="w-4 h-4" />
                    </Button>

                    {!isOwnProfile && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleMessage}
                        aria-label="Send message"
                        title="Send message"
                        className="h-9 w-9 p-0 rounded-xl"
                      >
                        <FiMail className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: 2x2 Stats Grid */}
              <div className="lg:pl-8 lg:border-l lg:border-border/60 shrink-0 w-full sm:w-auto">
                <div className="grid grid-cols-2 divide-x divide-y divide-border/60 border border-border/60 rounded-2xl bg-white/80 overflow-hidden text-center min-w-[240px] sm:min-w-[270px]">
                  {/* Followers */}
                  <div className="p-3.5 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <FiUsers className="w-4.5 h-4.5 text-text/40" />
                    <span className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                      {followersCount}
                    </span>
                    <span className="text-[11px] font-medium text-text/50">Followers</span>
                  </div>

                  {/* Following */}
                  <div className="p-3.5 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <FiUserPlus className="w-4.5 h-4.5 text-text/40" />
                    <span className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                      {followingCount}
                    </span>
                    <span className="text-[11px] font-medium text-text/50">Following</span>
                  </div>

                  {/* Articles */}
                  <div className="p-3.5 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <FiFileText className="w-4.5 h-4.5 text-text/40" />
                    <span className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                      {articlesCount}
                    </span>
                    <span className="text-[11px] font-medium text-text/50">Articles</span>
                  </div>

                  {/* Resources */}
                  <div className="p-3.5 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <FiBookOpen className="w-4.5 h-4.5 text-text/40" />
                    <span className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                      {resourcesCount}
                    </span>
                    <span className="text-[11px] font-medium text-text/50">Resources</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Navigation Tabs using shared Tabs component ──────────────── */}
      <Tabs
        value={activeTab}
        onChange={(val) => setActiveTab(val as ProfileTab)}
        items={PROFILE_TABS}
        variant="line"
      />

      {/* ── Tab Panels Content ────────────────────────────────────────── */}
      <section aria-label="Profile content" className="pt-2">
        {activeTab === "articles" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" className="h-72 w-full rounded-2xl" />
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((art) => (
                  <ArticleCard
                    key={art.id}
                    id={art.id}
                    authorId={art.authorId}
                    title={art.title}
                    excerpt={art.excerpt || art.content.slice(0, 110) + "..."}
                    tagNames={art.tags || art.tagNames || []}
                    coverImage={art.coverImageUrl || art.coverImage}
                    authorName={displayName}
                    authorAvatar={avatarUrl}
                    authorRole={profile?.role as string | undefined}
                    createdAt={art.createdAt}
                    readTimeMinutes={art.readingTimeMinutes ?? art.readingTime ?? 4}
                    likes={art.likeCount ?? art.likes ?? 0}
                    comments={art.commentCount ?? art.comments ?? 0}
                    isLiked={Boolean(art.liked ?? art.isLiked)}
                    isEditable={isOwnProfile}
                    targetHref={isOwnProfile ? `/articles/${art.id}/edit` : `/articles/${art.id}`}
                    variant="vertical"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FiFileText className="w-10 h-10 text-text/30" />}
                title="No articles published yet"
                description={
                  isOwnProfile
                    ? "You haven't written any articles yet."
                    : `${displayName} hasn't written any articles yet.`
                }
                bordered
                action={
                  <Button href="/articles/new" size="sm" className="rounded-xl">
                    Write an Article
                  </Button>
                }
              />
            )}
          </div>
        )}

        {activeTab === "resources" && (
          <div className="bg-white border border-border rounded-2xl p-8 sm:p-12 text-center space-y-3">
            <FiBookOpen className="w-10 h-10 text-text/30 mx-auto" />
            <h3 className="text-base font-semibold text-text">Curated Developer Resources</h3>
            <p className="text-xs sm:text-sm text-text/50 max-w-md mx-auto">
              Checklists, boilerplates, and recommended libraries shared by {displayName}.
            </p>
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              {[
                {
                  title: "Modern React Architecture",
                  type: "Guide & Cheatsheet",
                  stars: "1.2k",
                },
                {
                  title: "Accessible Design Tokens",
                  type: "Tailwind UI Kit",
                  stars: "840",
                },
                {
                  title: "Frontend Testing Checklist",
                  type: "Playwright & RTL",
                  stars: "520",
                },
              ].map((res) => (
                <div
                  key={res.title}
                  className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-slate-50/50"
                >
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
                    {res.type}
                  </span>
                  <h4 className="text-sm font-bold text-text line-clamp-1">{res.title}</h4>
                  <p className="text-xs text-text/50 mt-1">★ {res.stars} saves</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-text">Recent Activity</h3>
            <div className="space-y-3 divide-y divide-border/60">
              {[
                {
                  action: "Published a new article",
                  target: "Architecting Resilient Web Applications in 2026",
                  time: "2 days ago",
                },
                {
                  action: "Liked an article",
                  target: "Understanding TypeScript 5.8 Decorators",
                  time: "4 days ago",
                },
                {
                  action: "Commented on",
                  target: "State Management in Modern React with Zustand",
                  time: "1 week ago",
                },
              ].map((act, index) => (
                <div key={index} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-text/60">
                      {act.action}: <span className="font-semibold text-text">{act.target}</span>
                    </p>
                    <p className="text-[11px] text-text/40">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-text mb-2">About {displayName}</h3>
              <p className="text-sm text-text/70 leading-relaxed max-w-3xl">
                {bio} Passionate about building fast, accessible web applications and developer
                tooling. Writing regularly about React, TypeScript, design systems, and software
                craftsmanship.
              </p>
            </div>

            <div className="border-t border-border/60 pt-4">
              <h4 className="text-xs font-bold text-text/50 uppercase tracking-wider mb-2.5">
                Skills & Technologies
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "React",
                  "TypeScript",
                  "Next.js",
                  "Tailwind CSS",
                  "Node.js",
                  "Accessibility (a11y)",
                  "State Management",
                  "GraphQL",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-text border border-border/60"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
