import { useState, useEffect, type JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AiOutlineHeart,
  AiFillHeart,
  AiOutlineComment,
  AiOutlineShareAlt,
} from "react-icons/ai";
import { LuBookmark, LuBookmarkCheck, LuClock } from "react-icons/lu";
import { HiOutlineEllipsisHorizontal } from "react-icons/hi2";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Avatar, Skeleton, Tag } from "@/components/common";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { getArticleById, likeArticle, deleteArticle, saveArticle, getPostInteraction, type Article } from "@/features/articles/api/articleApi";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import ArticleComments from "@/features/articles/components/ArticleComments";
import RelatedArticles from "@/features/articles/components/RelatedArticles";
import AuthorCard from "@/features/articles/components/AuthorCard";

// Extended Article type with optional display properties
interface DisplayArticle extends Article {
  authorName?: string;
  authorAvatar?: string;
  likes?: number;
  comments?: number;
}

export function ArticleDetailsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [article, setArticle] = useState<DisplayArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Fetch article
  useEffect(() => {
    if (!id) {
      navigate("/articles");
      return;
    }

    let isSubscribed = true;

    async function loadArticle() {
      try {
        setIsLoading(true);
        const [articleRes, interactionRes] = await Promise.allSettled([
          getArticleById(id as string),
          getPostInteraction(id as string),
        ]);

        if (isSubscribed && articleRes.status === "fulfilled" && articleRes.value) {
          const data = articleRes.value;
          // Add display properties to article
          const dataRecord = data as unknown as Record<string, unknown>;
          const initialLikes =
            (data.likeCount as number | undefined) ??
            (data.likes as number | undefined) ??
            (dataRecord.likes as number | undefined) ??
            (dataRecord.likeCount as number | undefined) ??
            0;

          const interaction = interactionRes.status === "fulfilled" ? interactionRes.value : null;

          const initialLiked = interaction && typeof interaction.liked === "boolean"
            ? interaction.liked
            : Boolean(
                data.liked ??
                data.isLiked ??
                (dataRecord.liked as boolean | undefined) ??
                (dataRecord.isLiked as boolean | undefined) ??
                false,
              );

          const initialSaved = interaction && typeof interaction.saved === "boolean"
            ? interaction.saved
            : Boolean(
                (dataRecord.isBookmarked as boolean | undefined) ??
                (dataRecord.isSaved as boolean | undefined) ??
                (dataRecord.saved as boolean | undefined) ??
                false,
              );

          const authorObj = data.author;
          const resolvedAuthorName =
            (authorObj && (authorObj.name?.trim() || authorObj.userName?.trim())) ||
            (dataRecord.authorName as string | undefined)?.trim() ||
            "DevSpace Author";
          const resolvedAuthorAvatar =
            (authorObj && authorObj.avatarUrl) ||
            (dataRecord.authorAvatar as string | undefined);

          const displayArticle: DisplayArticle = {
            ...data,
            authorName: resolvedAuthorName,
            authorAvatar: resolvedAuthorAvatar || undefined,
            likes: initialLikes,
            comments: (dataRecord.comments as number | undefined) || (data.commentCount as number | undefined) || 0,
          };

          setArticle(displayArticle);
          setIsLiked(initialLiked);
          setIsBookmarked(initialSaved);
          setLikeCount(initialLikes);
          setCommentCount(displayArticle.comments || 0);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err) || "Failed to load article");
        if (isSubscribed) {
          navigate("/articles");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadArticle();
    return () => {
      isSubscribed = false;
    };
  }, [id, navigate]);

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLiking || !article) return;

    const wasLiked = isLiked;
    const offsetDelta = wasLiked ? -1 : 1;

    // Optimistic toggle
    setIsLiked(!wasLiked);
    setLikeCount((prev) => Math.max(0, prev + offsetDelta));
    setIsLiking(true);

    try {
      await likeArticle(article.id);
      if (!wasLiked) {
        toast.success("Liked article");
      } else {
        toast.info("Removed like");
      }
    } catch (error: unknown) {
      // Revert optimistic update
      setIsLiked(wasLiked);
      setLikeCount((prev) => Math.max(0, prev - offsetDelta));
      toast.error(getApiErrorMessage(error) || "Failed to update like status");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSaving || !article) return;

    const wasBookmarked = isBookmarked;
    setIsSaving(true);
    setIsBookmarked(!wasBookmarked);

    try {
      await saveArticle(article.id);
      toast.success(!wasBookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch (error: unknown) {
      // Revert optimistic update
      setIsBookmarked(wasBookmarked);
      toast.error(getApiErrorMessage(error) || "Failed to save article");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    if (navigator.share && article) {
      navigator.share({
        title: article.title,
        text: article.excerpt || "",
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleEdit = () => {
    navigate(`/articles/${article?.id}/edit`);
  };

  const handleDelete = async () => {
    if (!article) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this article? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deleteArticle(article.id);
      toast.success("Article deleted successfully");
      navigate("/articles");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) || "Failed to delete article");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="hidden lg:flex flex-col items-center gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="circular" width={40} height={40} />
              ))}
            </div>
            <div className="lg:col-span-6">
              <Skeleton variant="text" width={200} height={12} className="mb-4" />
              <Skeleton variant="text" width="100%" height={32} className="mb-4" count={2} />
              <Skeleton variant="rounded" width="100%" height={300} className="mb-4" />
              <Skeleton variant="text" width="100%" height={16} className="mb-2" count={5} />
            </div>
            <div className="hidden lg:block lg:col-span-4">
              <Skeleton variant="rounded" width="100%" height={200} className="mb-4" />
              <Skeleton variant="rounded" width="100%" height={200} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-2">Article not found</h1>
          <p className="text-text/60 mb-4">The article you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/articles")} variant="primary">
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === article.authorId;
  const formattedDate = new Date(article.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const readingTime = Math.max(1, Math.ceil((article.content?.length || 0) / 200));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-2">
        {/* Header bar */}
        <div className="mb-8 h-1 bg-linear-to-r from-primary to-blue-500 rounded-full" />

        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar - Actions */}
          <div className="hidden lg:flex lg:col-span-1 bg-white flex-col items-center gap-2 sticky top-8 h-fit rounded-lg shadow-sm">
            {/* Like button */}
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 disabled:opacity-50 group cursor-pointer",
                isLiked
                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                  : "text-gray-400 hover:text-red-500 hover:bg-gray-100",
              )}
              title={isLiked ? "Unlike" : "Like"}
              aria-label={isLiked ? "Unlike article" : "Like article"}
            >
              {isLiked ? (
                <AiFillHeart className="w-6 h-6 text-red-500 transition-transform active:scale-125" />
              ) : (
                <AiOutlineHeart className="w-6 h-6 transition-colors group-hover:text-red-500" />
              )}
              <span className={cn("text-xs font-bold", isLiked ? "text-red-600" : "text-gray-600")}>
                {likeCount}
              </span>
            </button>

            {/* Comment button */}
            <button
              type="button"
              onClick={() => document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" })}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 group cursor-pointer"
              title="Comments"
              aria-label="Jump to comments"
            >
              <AiOutlineComment className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
              <span className="text-xs font-bold text-gray-600">{commentCount}</span>
            </button>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={handleBookmark}
              disabled={isSaving}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 group disabled:opacity-50 cursor-pointer",
                isBookmarked
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-gray-400 hover:text-primary hover:bg-gray-100",
              )}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {isBookmarked ? (
                <LuBookmarkCheck className="w-6 h-6 text-primary" />
              ) : (
                <LuBookmark className="w-6 h-6 group-hover:text-primary transition-colors" />
              )}
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
              title="Share"
            >
              <AiOutlineShareAlt className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
            </button>

            {/* More options */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                title="More options"
              >
                <HiOutlineEllipsisHorizontal className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-14 top-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-44 py-1">
                  {isAuthor ? (
                    <>
                      <button
                        onClick={() => {
                          handleEdit();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Edit Article
                      </button>
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete Article
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        Report Article
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        Block Author
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6 space-y-6">
            {/* Article header */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                {article.title}
              </h1>

              <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
                {article.excerpt}
              </p>

              {/* Tags */}
              {article.tagNames && article.tagNames.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {article.tagNames.map((tag) => (
                    <Tag key={tag} variant="outline" size="sm">
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            {/* Author info bar */}
            <div className="flex items-center justify-between py-4 border-t border-b border-gray-200">
              <div className="flex items-center gap-4">
                <Avatar
                src={article.authorAvatar ?? undefined}
                alt={article.authorName ?? "Author profile"}
                name={article.authorName ?? "Author"}
                size="md"
                className="w-12 h-12"
                />
                <div>
                  <p className="font-semibold text-gray-900">{article.authorName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formattedDate}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <LuClock className="w-3 h-3" />
                      {readingTime} min read
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="primary" size="md" className="whitespace-nowrap">
                Follow
              </Button>
            </div>

            {/* Cover image */}
            {article.coverImage && (
              <div className="rounded-lg overflow-hidden shadow-md">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-96 object-cover"
                />
              </div>
            )}

            {/* Article content */}
            <article className="prose prose-sm max-w-none 
              prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-6 prose-headings:mb-3
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900
              prose-code:bg-gray-100 prose-code:rounded prose-code:px-2 prose-code:py-1 prose-code:text-sm prose-code:text-gray-800
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
              prose-li:text-gray-700
              prose-img:rounded-lg prose-img:shadow-md
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            </article>

            {/* Mobile action buttons */}
            <div className="lg:hidden flex items-center gap-2 py-4 border-t border-gray-200 overflow-x-auto">
              <button
                type="button"
                onClick={handleLike}
                disabled={isLiking}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer",
                  isLiked
                    ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50",
                )}
                aria-label={isLiked ? "Unlike article" : "Like article"}
              >
                {isLiked ? (
                  <AiFillHeart className="w-5 h-5 text-red-500" />
                ) : (
                  <AiOutlineHeart className="w-5 h-5 text-gray-500" />
                )}
                <span className={cn("text-sm font-semibold", isLiked && "text-red-600")}>{likeCount}</span>
              </button>

              <button
                type="button"
                onClick={handleBookmark}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer",
                  isBookmarked
                    ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50",
                )}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {isBookmarked ? (
                  <LuBookmarkCheck className="w-5 h-5 text-primary" />
                ) : (
                  <LuBookmark className="w-5 h-5 text-gray-500" />
                )}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <AiOutlineShareAlt className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-8 sticky top-8 h-fit">
            {/* Author Card */}
            <AuthorCard
              authorId={article.authorId}
              authorName={article.authorName}
              authorAvatar={article.authorAvatar}
              isAuthor={isAuthor}
            />

            {/* Related Articles */}
            <RelatedArticles currentArticleId={article.id} />
            {/* Comments section */}
            <div id="comments-section" className="space-y-6 pt-8 border-t border-gray-200">
              <ArticleComments
                articleId={article.id}
                onCommentCountChange={setCommentCount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleDetailsPage;
