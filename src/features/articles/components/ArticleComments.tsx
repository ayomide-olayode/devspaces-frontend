import { useState, useEffect, type JSX } from "react";

import { Avatar, Button, Skeleton } from "@/components/common";

import { toast } from "@/hooks/useToast";

import { useAuthStore } from "@/stores/useAuthStore";

import { AiOutlineLike } from "react-icons/ai";

import {
  getArticleComments,
  createComment,
  type Comment,
} from "@/features/articles/api/articleApi";

import { getApiErrorMessage } from "@/lib/utils/apiError";

interface ArticleCommentsProps {
  articleId: string;
  onCommentCountChange?: (count: number) => void;
}

export function ArticleComments({
  articleId,
  onCommentCountChange,
}: ArticleCommentsProps): JSX.Element {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useAuthStore((state) => state.user);

  // Load comments
  useEffect(() => {
    async function loadComments() {
      try {
        setIsLoading(true);

        const data = await getArticleComments(articleId);

        setComments(data);

        onCommentCountChange?.(data.length);
      } catch (err: unknown) {
        console.error("Error loading comments:", err);

        toast.error(
          getApiErrorMessage(err) || "Failed to load comments"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadComments();
  }, [articleId, onCommentCountChange]);

  const handleSubmitComment = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to comment");
      return;
    }

    try {
      setIsSubmitting(true);

      const newCommentObj = await createComment(
        articleId,
        newComment.trim()
      );

      setComments((prev) => [newCommentObj, ...prev]);

      setNewComment("");

      onCommentCountChange?.(comments.length + 1);

      toast.success("Comment posted successfully!");
    } catch (err: unknown) {
      console.error("Error posting comment:", err);

      toast.error(
        getApiErrorMessage(err) || "Failed to post comment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (
    commentId: string
  ) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
          };
        }

        return comment;
      })
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);

    const diffInSeconds = Math.floor(
      (now.getTime() - date.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return "just now";
    }

    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    }

    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }

    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div
      className="
        w-full
        bg-white
        border border-gray-200
        rounded-lg
        p-4
        space-y-5
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xs sm:text-sm text-gray-900">
          Comments ({comments.length})
        </h2>
      </div>

      {/* Comment Input */}
      {user ? (
        <form
          onSubmit={handleSubmitComment}
          className="space-y-3"
        >
          <div className="flex gap-3">
            <Avatar
              src={user.avatarUrl || undefined}
              alt={user.userName || "You"}
              size="sm"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
            />

            <textarea
              value={newComment}
              onChange={(e) =>
                setNewComment(e.target.value)
              }
              placeholder="Add a thoughtful comment..."
              className="
                flex-1
                min-w-0
                p-2.5
                sm:p-3
                border border-gray-200
                rounded-lg
                text-[10px]
                sm:text-xs
                focus:ring-2
                focus:ring-blue-500
                focus:border-transparent
                resize-none
                outline-none
                transition-all
              "
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setNewComment("")}
              className="
                px-3
                py-1.5
                text-[10px]
                sm:text-xs
                font-medium
                text-gray-500
                hover:text-gray-900
                transition-colors
              "
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={
                isSubmitting || !newComment.trim()
              }
              className="text-[10px] sm:text-xs"
            >
              {isSubmitting
                ? "Posting..."
                : "Post Comment"}
            </Button>
          </div>
        </form>
      ) : (
        <div
          className="
            p-3
            sm:p-4
            bg-gray-50
            border border-gray-200
            rounded-lg
            text-center
            text-[10px]
            sm:text-xs
            text-gray-600
          "
        >
          <p>
            Sign in to comment on this article.{" "}
            <a
              href="/auth/sign-in"
              className="
                text-blue-600
                hover:underline
                font-semibold
              "
            >
              Sign in here
            </a>
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3"
            >
              <Skeleton
                variant="circular"
                width={36}
                height={36}
              />

              <div className="flex-1 space-y-2">
                <Skeleton
                  variant="text"
                  width={120}
                  height={14}
                />

                <Skeleton
                  variant="text"
                  width="100%"
                  height={12}
                  count={2}
                />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <p className="text-[10px] sm:text-xs">
              No comments yet. Be the first to share
              your thoughts!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="
                flex
                gap-3
                pb-4
                border-b border-gray-100
                last:border-b-0
                last:pb-0
              "
            >
              {/* Avatar */}
              <Avatar
                src={undefined}
                alt={comment.userId}
                size="sm"
                className="
                  w-8
                  h-8
                  sm:w-9
                  sm:h-9
                  shrink-0
                "
              />

              {/* Comment Content */}
              <div className="flex-1 min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-x-2
                    gap-y-0.5
                    mb-1
                  "
                >
                  <p
                    className="
                      font-semibold
                      text-[10px]
                      sm:text-xs
                      text-gray-900
                    "
                  >
                    {comment.userId}
                  </p>

                  <span
                    className="
                      text-[9px]
                      sm:text-[10px]
                      text-gray-400
                    "
                  >
                    {formatTimeAgo(
                      comment.createdAt
                    )}
                  </span>
                </div>

                <p
                  className="
                    text-[10px]
                    sm:text-xs
                    text-gray-700
                    leading-relaxed
                    mb-2.5
                    wrap-break-words
                  "
                >
                  {comment.message}
                </p>

                {/* Comment Actions */}
                <div
                  className="
                    flex
                    items-center
                    gap-3
                    sm:gap-4
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleLikeComment(comment.id)
                    }
                    className="
                      flex
                      items-center
                      gap-1
                      text-[9px]
                      sm:text-[10px]
                      text-gray-500
                      hover:text-blue-600
                      transition-colors
                      group
                    "
                  >
                    <AiOutlineLike
                      className="
                        w-3.5
                        h-3.5
                        group-hover:text-blue-600
                      "
                    />

                    <span>Like</span>
                  </button>

                  <button
                    type="button"
                    className="
                      text-[9px]
                      sm:text-[10px]
                      text-gray-500
                      hover:text-blue-600
                      transition-colors
                      font-medium
                    "
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ArticleComments;