import { useState, useEffect, useMemo, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineSearch } from "react-icons/md";
import { LuPenLine, LuLayoutGrid, LuLayoutList } from "react-icons/lu";
import { FiFilter } from "react-icons/fi";
import { Button, Input, Skeleton } from "@/components/common";
import { getArticles, likeArticle, saveArticle, getPostInteraction } from "@/features/articles/api/articleApi";
import type { Article } from "@/features/articles/api/articleApi";
import { getTags } from "@/features/articles/api/tagApi";
import { ArticleCard } from "@/features/articles/components/ArticleCard";
import { toast } from "@/hooks/useToast";

interface DisplayArticle {
  id: string;
  authorId?: string;
  title: string;
  excerpt: string;
  tagNames: string[];
  category?: string;
  coverImage?: string;
  status?: "draft" | "published" | "scheduled" | "archived";
  authorInfo?: string[];
  authorName?: string;
  authoruserName?: string;
  authorAvatar?: string;
  authorRole?: string;
  createdAt: string;
  readTimeMinutes?: number;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
}

function getArticleAuthor(art: Article): { name: string; userName: string; avatar?: string } {
  if (art.author && typeof art.author === "object") {
    const a = art.author;
    const name =(a.userName && a.userName.trim()) || (a.name && a.name.trim());
    if (name) {
      return {
        name,
        avatar: a.avatarUrl || undefined,
        userName: a.userName as string
      };
    }
  }
  if (typeof art.authorName === "string" && art.authorName.trim()) {
    return {
      name: art.authorName.trim(),
      avatar: undefined,
      userName: "" as string
    };
  }
  return { name: "DevSpace Author", userName: "devspace", avatar: undefined };
}

function mapArticle(art: Article): DisplayArticle {
  const { name: authoruserName, avatar: authorAvatar } = getArticleAuthor(art);
  const raw = art as unknown as Record<string, unknown>;

  const likeCount =
    typeof raw.likeCount === "number"
      ? raw.likeCount
      : typeof raw.likes === "number"
        ? raw.likes
        : typeof art.likeCount === "number"
          ? art.likeCount
          : typeof art.likes === "number"
            ? art.likes
            : 0;

  const isLiked =
    typeof raw.liked === "boolean"
      ? raw.liked
      : typeof raw.isLiked === "boolean"
        ? raw.isLiked
        : Boolean(art.liked ?? art.isLiked);

  const commentCount =
    typeof raw.commentCount === "number"
      ? raw.commentCount
      : typeof raw.comments === "number"
        ? raw.comments
        : typeof art.commentCount === "number"
          ? art.commentCount
          : typeof art.comments === "number"
            ? art.comments
            : 0;

  return {
    id: art.id,
    authorId: art.author?.id || art.authorId,
    title: art.title || "Untitled Article",
    excerpt: art.excerpt || art.content || "",
    tagNames: art.tags && art.tags.length > 0 ? art.tags : (art.tagNames || []),
    category: art.series || "General",
    coverImage: art.coverImageUrl || art.coverImage,
    status: art.status as DisplayArticle["status"],
    authoruserName,
    authorAvatar: authorAvatar || (art as unknown as { authorAvatar?: string }).authorAvatar,
    authorRole: undefined,
    createdAt: art.createdAt || new Date().toISOString(),
    readTimeMinutes:
      art.readingTimeMinutes ??
      art.readingTime ??
      Math.max(1, Math.ceil((art.content?.length || 0) / 500)),
    likes: likeCount,
    comments: commentCount,
    isLiked,
  };
}

export function ArticlesPage(): JSX.Element {
  const navigate = useNavigate();

  const [articles, setArticles] = useState<DisplayArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<"list" | "grid">("list");

  // Fetch articles and map directly with author from feed
  useEffect(() => {
    let isSubscribed = true;

    async function loadFeed(): Promise<void> {
      try {
        setIsLoading(true);
        const data = await getArticles();
        if (!isSubscribed) return;

        // Sort feed by most recent first
        const sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Set initial articles immediately from feed response
        const initialArticles = sortedData.map(mapArticle);
        setArticles(initialArticles);

        // Check user post interactions (liked, saved) concurrently
        const token = typeof window !== "undefined" ? localStorage.getItem("devspace_token") : null;
        if (token && sortedData.length > 0) {
          const interactionResults = await Promise.allSettled(
            sortedData.map((art) => getPostInteraction(art.id)),
          );

          if (!isSubscribed) return;

          const updatedBookmarked = new Set<string>();
          const updatedArticles = sortedData.map((art, idx) => {
            const mapped = mapArticle(art);
            const interactionRes = interactionResults[idx];
            if (interactionRes && interactionRes.status === "fulfilled" && interactionRes.value) {
              const inter = interactionRes.value;
              if (typeof inter.liked === "boolean") {
                mapped.isLiked = inter.liked;
              }
              if (inter.saved) {
                updatedBookmarked.add(art.id);
              }
            }
            return mapped;
          });

          setArticles(updatedArticles);
          if (updatedBookmarked.size > 0) {
            setBookmarkedIds(updatedBookmarked);
          }
        }
      } catch {
        if (isSubscribed) {
          setArticles([]);
          toast.error("Failed to load articles. Please try again later.");
        }
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    void loadFeed();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Fetch tags for filter pills
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await getTags();
        if (tags.length > 0) {
          setCategories(["All", ...tags.map((t) => t.name)]);
        }
      } catch {
        // Silently fall back — "All" is always present
      }
    }
    loadTags();
  }, []);

  const toggleBookmark = async (id: string) => {
    const isCurrentlyBookmarked = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyBookmarked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    try {
      await saveArticle(id);
      if (isCurrentlyBookmarked) {
        toast.success("Removed from bookmarks");
      } else {
        toast.success("Saved to bookmarks");
      }
    } catch {
      // Revert on failure
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyBookmarked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      toast.error("Failed to update bookmark");
    }
  };

  const handleLike = async (articleId: string): Promise<void> => {
    const target = articles.find((a) => a.id === articleId);
    if (!target) return;

    const wasLiked = Boolean(target.isLiked);
    const prevLikes = target.likes ?? 0;
    const newLikes = Math.max(0, prevLikes + (wasLiked ? -1 : 1));

    // Immediate optimistic update
    setArticles((prev) =>
      prev.map((art) =>
        art.id === articleId
          ? {
              ...art,
              isLiked: !wasLiked,
              likes: newLikes,
            }
          : art,
      ),
    );

    try {
      await likeArticle(articleId);
    } catch {
      // Revert on failure
      setArticles((prev) =>
        prev.map((art) =>
          art.id === articleId
            ? {
                ...art,
                isLiked: wasLiked,
                likes: prevLikes,
              }
            : art,
        ),
      );
      toast.error("Failed to update like status");
    }
  };

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return articles.filter((art) => {
      const matchesSearch =
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.tagNames.some((t) => t.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "All" ||
        art.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        art.tagNames.some((t) => t.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight">
            Technical Articles
          </h1>
          <p className="text-text/60 text-sm">
            Curated guides, architectural insights, and tutorials written by developers.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<LuPenLine className="w-4 h-4" />}
          onClick={() => navigate("/articles/new")}
          className="shrink-0 font-semibold w-full sm:w-auto"
        >
          Write Article
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-start justify-between gap-4">
        <div className="w-full md:w-64 shrink-0">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keyword or tag..."
            inputSize="md"
            leftIcon={<MdOutlineSearch className="text-text/40 text-lg" />}
            className="bg-white border-border"
          />
        </div>

        <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
          {/* Tags list wrapping after 5 */}
          <div className="flex flex-wrap items-center gap-2 max-w-xl">
            <FiFilter className="w-4 h-4 text-text/40 shrink-0 hidden sm:block mr-0.5" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white border border-border text-text/70 hover:bg-slate-50 hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Layout toggle */}
          <div className="flex items-center bg-white border border-border rounded-lg overflow-hidden shrink-0 ml-auto self-start">
            <button
              type="button"
              id="layout-list"
              onClick={() => setLayout("list")}
              title="List view"
              className={`p-2 transition-colors ${
                layout === "list"
                  ? "bg-primary text-white"
                  : "text-text/50 hover:bg-slate-50 hover:text-text"
              }`}
            >
              <LuLayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="layout-grid"
              onClick={() => setLayout("grid")}
              title="Grid view"
              className={`p-2 transition-colors ${
                layout === "grid"
                  ? "bg-primary text-white"
                  : "text-text/50 hover:bg-slate-50 hover:text-text"
              }`}
            >
              <LuLayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading ? (
        layout === "list" ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton variant="circular" width={36} height={36} />
                  <div className="space-y-1">
                    <Skeleton variant="text" width={120} height={14} />
                    <Skeleton variant="text" width={160} height={12} />
                  </div>
                </div>
                <div className="flex gap-4 sm:gap-5">
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="85%" height={20} />
                    <Skeleton variant="text" width="100%" height={14} />
                    <Skeleton variant="text" width="70%" height={14} />
                    <div className="flex gap-2 pt-1">
                      <Skeleton variant="rounded" width={60} height={22} />
                      <Skeleton variant="rounded" width={60} height={22} />
                    </div>
                  </div>
                  <Skeleton
                    variant="rounded"
                    width={176}
                    height={112}
                    className="hidden sm:block shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-border rounded-2xl overflow-hidden shadow-xs"
              >
                <Skeleton variant="rectangular" width="100%" height={180} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="text" width={100} height={12} />
                  </div>
                  <Skeleton variant="text" width="90%" height={16} />
                  <Skeleton variant="text" width="100%" height={12} />
                  <Skeleton variant="text" width="60%" height={12} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredArticles.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 bg-white border border-border rounded-2xl text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <LuPenLine className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-base font-bold text-text">No articles found</h3>
            <p className="text-xs text-text/60">
              {searchQuery || selectedCategory !== "All"
                ? "Nothing matched your search or filter. Try clearing them."
                : "No articles have been published yet. Be the first to write one!"}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            {(searchQuery || selectedCategory !== "All") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LuPenLine className="w-4 h-4" />}
              onClick={() => navigate("/articles/new")}
            >
              Write Article
            </Button>
          </div>
        </div>
      ) : layout === "list" ? (
        /* Feed list */
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              authorId={article.authorId}
              title={article.title}
              excerpt={article.excerpt}
              tagNames={article.tagNames}
              coverImage={article.coverImage}
              authorName={article.authoruserName}
              authorAvatar={article.authorAvatar}
              authorRole={article.authorRole}
              createdAt={article.createdAt}
              readTimeMinutes={article.readTimeMinutes}
              likes={article.likes}
              comments={article.comments}
              isLiked={article.isLiked}
              isBookmarked={bookmarkedIds.has(article.id)}
              onBookmark={() => toggleBookmark(article.id)}
              onLike={handleLike}
              variant="horizontal"
            />
          ))}
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              authorId={article.authorId}
              title={article.title}
              excerpt={article.excerpt}
              tagNames={article.tagNames}
              coverImage={article.coverImage}
              authorName={article.authoruserName}
              authorAvatar={article.authorAvatar}
              authorRole={article.authorRole}
              createdAt={article.createdAt}
              readTimeMinutes={article.readTimeMinutes}
              likes={article.likes}
              comments={article.comments}
              isLiked={article.isLiked}
              isBookmarked={bookmarkedIds.has(article.id)}
              onBookmark={() => toggleBookmark(article.id)}
              onLike={handleLike}
              variant="vertical"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ArticlesPage;
