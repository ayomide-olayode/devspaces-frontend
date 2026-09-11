import {
  useEffect,
  useState,
  type JSX,
} from "react";

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

/**
 * The API currently returns userId only.
 *
 * This interface supports the response shape if your backend
 * later includes the user's profile information.
 */
interface CommentUser {
  id?: string;
  userName?: string;
  name?: string;
  avatarUrl?: string | null;
}

/**
 * We extend Comment locally so the component can support
 * optional user information from the API without breaking
 * the existing Comment interface.
 */
type DisplayComment = Comment & {
  user?: CommentUser | null;
  userName?: string;
  userAvatar?: string | null;
  avatarUrl?: string | null;
};

/**
 * Recursively adds a reply to the correct comment.
 *
 * Example:
 *
 * Comment A
 *   └── Reply B
 *        └── Reply C
 *
 * If Reply C is created, this function finds Reply B
 * anywhere in the tree and adds Reply C to its replies.
 */
function addReplyToComment(
  comments: DisplayComment[],
  parentId: string,
  newReply: DisplayComment,
): DisplayComment[] {
  return comments.map((comment) => {
    /**
     * The parent comment was found.
     */
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [
          ...(comment.replies ?? []),
          newReply,
        ],
      };
    }

    /**
     * The parent may be nested deeper in the tree.
     */
    if (
      comment.replies &&
      comment.replies.length > 0
    ) {
      return {
        ...comment,
        replies: addReplyToComment(
          comment.replies as DisplayComment[],
          parentId,
          newReply,
        ),
      };
    }

    return comment;
  });
}

/**
 * Counts all comments including nested replies.
 */
function countAllComments(
  comments: DisplayComment[],
): number {
  return comments.reduce((total, comment) => {
    const repliesCount = comment.replies
      ? countAllComments(
          comment.replies as DisplayComment[],
        )
      : 0;

    return total + 1 + repliesCount;
  }, 0);
}

/**
 * Recursively renders a single comment and its replies.
 */
interface CommentItemProps {
  comment: DisplayComment;
  depth: number;
  replyingTo: string | null;
  replyText: string;
  isReplying: boolean;
  currentUserId?: string;
  onReplyClick: (comment: DisplayComment) => void;
  onReplyTextChange: (value: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (
    event: React.FormEvent,
    parentId: string,
  ) => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  onLike: (commentId: string) => void;
}

function CommentItem({
  comment,
  depth,
  replyingTo,
  replyText,
  isReplying,
  currentUserId,
  onReplyClick,
  onReplyTextChange,
  onCancelReply,
  onSubmitReply,
  formatTimeAgo,
  onLike,
}: CommentItemProps): JSX.Element {
  /**
   * Limit indentation so deeply nested replies do not
   * make the comment content too narrow on mobile.
   */
  const indentation =
    Math.min(depth, 4) * 16;

  /**
   * Resolve user information.
   *
   * The preferred API shape is:
   *
   * comment.user.userName
   * comment.user.avatarUrl
   *
   * But the fallback also supports:
   *
   * comment.userName
   * comment.avatarUrl
   *
   * Finally we use userId when nothing else exists.
   */
  const displayName =
    comment.user?.userName?.trim() ||
    comment.user?.name?.trim() ||
    comment.userName?.trim() ||
    comment.userId ||
    "User";

  const displayAvatar =
    comment.user?.avatarUrl ||
    comment.userAvatar ||
    comment.avatarUrl ||
    undefined;

  const isOwnComment =
    currentUserId === comment.userId;

  return (
    <div
      className="space-y-3"
      style={{
        marginLeft:
          indentation > 0
            ? `${indentation}px`
            : undefined,
      }}
    >
      {/* ============================================================ */}
      {/* COMMENT                                                       */}
      {/* ============================================================ */}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          src={displayAvatar}
          name={displayName}
          alt={displayName}
          size="sm"
          className="
            h-8
            w-8
            shrink-0
            sm:h-9
            sm:w-9
          "
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* User information */}
          <div
            className="
              mb-1
              flex
              flex-wrap
              items-center
              gap-x-2
              gap-y-0.5
            "
          >
            <p
              className="
                wrap-break-word
                text-[10px]
                font-semibold
                text-gray-900
                sm:text-xs
              "
            >
              {displayName}
            </p>

            {isOwnComment && (
              <span
                className="
                  rounded-full
                  bg-blue-50
                  px-1.5
                  py-0.5
                  text-[8px]
                  font-medium
                  text-blue-600
                  sm:text-[9px]
                "
              >
                You
              </span>
            )}

            <span
              className="
                text-[9px]
                text-gray-400
                sm:text-[10px]
              "
            >
              {formatTimeAgo(
                comment.createdAt,
              )}
            </span>
          </div>

          {/* Message */}
          <p
            className="
              mb-2.5
              wrap-break-words
              text-[10px]
              leading-relaxed
              text-gray-700
              sm:text-xs
            "
          >
            {comment.message}
          </p>

          {/* Actions */}
          <div
            className="
              flex
              items-center
              gap-3
              sm:gap-4
            "
          >
            {/* Like */}
            <button
              type="button"
              onClick={() =>
                onLike(comment.id)
              }
              className="
                group
                flex
                items-center
                gap-1
                text-[9px]
                text-gray-500
                transition-colors
                hover:text-blue-600
                sm:text-[10px]
              "
            >
              <AiOutlineLike
                className="
                  h-3.5
                  w-3.5
                  group-hover:text-blue-600
                "
              />

              <span>Like</span>
            </button>

            {/* Reply */}
            <button
              type="button"
              onClick={() =>
                onReplyClick(comment)
              }
              className="
                text-[9px]
                font-medium
                text-gray-500
                transition-colors
                hover:text-blue-600
                sm:text-[10px]
              "
            >
              Reply
            </button>
          </div>

          {/* ======================================================== */}
          {/* REPLY INPUT                                               */}
          {/* ======================================================== */}

          {replyingTo === comment.id && (
            <form
              onSubmit={(event) =>
                onSubmitReply(
                  event,
                  comment.id,
                )
              }
              className="
                mt-3
                rounded-lg
                border
                border-gray-200
                bg-gray-50
                p-2.5
                sm:p-3
              "
            >
              <div className="flex gap-2.5">
                <Avatar
                  src={undefined}
                  name="You"
                  alt="You"
                  size="sm"
                  className="
                    h-7
                    w-7
                    shrink-0
                    sm:h-8
                    sm:w-8
                  "
                />

                <textarea
                  value={replyText}
                  onChange={(event) =>
                    onReplyTextChange(
                      event.target.value,
                    )
                  }
                  placeholder={`Reply to ${displayName}...`}
                  rows={2}
                  autoFocus
                  className="
                    min-w-0
                    flex-1
                    resize-none
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    p-2
                    text-[10px]
                    text-gray-900
                    outline-none
                    transition-all
                    placeholder:text-gray-400
                    focus:border-blue-400
                    focus:ring-2
                    focus:ring-blue-500/20
                    sm:text-xs
                  "
                />
              </div>

              <div
                className="
                  mt-2
                  flex
                  justify-end
                  gap-1.5
                  sm:gap-2
                "
              >
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="
                    px-2.5
                    py-1.5
                    text-[9px]
                    font-medium
                    text-gray-500
                    transition-colors
                    hover:text-gray-900
                    sm:text-[10px]
                  "
                >
                  Cancel
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isReplying ||
                    !replyText.trim()
                  }
                  className="
                    text-[9px]
                    sm:text-[10px]
                  "
                >
                  {isReplying
                    ? "Replying..."
                    : "Reply"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* NESTED REPLIES                                               */}
      {/* ============================================================ */}

      {comment.replies &&
        comment.replies.length > 0 && (
          <div
            className="
              space-y-4
              border-l
              border-gray-200
              pl-3
              sm:pl-4
            "
          >
            {comment.replies.map(
              (reply) => (
                <CommentItem
                  key={reply.id}
                  comment={
                    reply as DisplayComment
                  }
                  depth={depth + 1}
                  replyingTo={
                    replyingTo
                  }
                  replyText={replyText}
                  isReplying={
                    isReplying
                  }
                  currentUserId={
                    currentUserId
                  }
                  onReplyClick={
                    onReplyClick
                  }
                  onReplyTextChange={
                    onReplyTextChange
                  }
                  onCancelReply={
                    onCancelReply
                  }
                  onSubmitReply={
                    onSubmitReply
                  }
                  formatTimeAgo={
                    formatTimeAgo
                  }
                  onLike={onLike}
                />
              ),
            )}
          </div>
        )}
    </div>
  );
}

export function ArticleComments({
  articleId,
  onCommentCountChange,
}: ArticleCommentsProps): JSX.Element {
  const [comments, setComments] = useState<
    DisplayComment[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [newComment, setNewComment] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /**
   * ID of the comment currently being replied to.
   *
   * null = no reply box open.
   */
  const [replyingTo, setReplyingTo] =
    useState<string | null>(null);

  /**
   * Text inside the currently active reply box.
   */
  const [replyText, setReplyText] =
    useState("");

  const [isReplying, setIsReplying] =
    useState(false);

  const user = useAuthStore(
    (state) => state.user,
  );
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  // ================================================================
  // LOAD COMMENTS
  // ================================================================

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      try {
        setIsLoading(true);

        const data =
          await getArticleComments(
            articleId,
          );

        if (!isMounted) {
          return;
        }

        const displayComments =
          data as DisplayComment[];

        setComments(displayComments);

        /**
         * Count nested replies as comments too.
         */
        onCommentCountChange?.(
          countAllComments(
            displayComments,
          ),
        );
      } catch (err: unknown) {
        console.error(
          "Error loading comments:",
          err,
        );

        if (isMounted) {
          toast.error(
            getApiErrorMessage(err) ||
              "Failed to load comments",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [
    articleId,
    onCommentCountChange,
  ]);

  // ================================================================
  // CREATE TOP-LEVEL COMMENT
  // ================================================================

  const handleSubmitComment = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const message = newComment.trim();

    if (!message) {
      toast.error(
        "Comment cannot be empty",
      );
      return;
    }

    if (!isAuthenticated && !user) {
      toast.error(
        "You must be logged in to comment",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      /**
       * No parentId means this is a top-level
       * comment.
       */
      const createdComment =
        await createComment(
          articleId,
          message,
          undefined,
        );

      setComments((previous) => [
        createdComment as DisplayComment,
        ...previous,
      ]);

      setNewComment("");

      /**
       * Calculate the new count from the
       * current state instead of relying on
       * a potentially stale `comments.length`.
       */
      setComments((previous) => {
        const updated = [
          createdComment as DisplayComment,
          ...previous,
        ];

        onCommentCountChange?.(
          countAllComments(updated),
        );

        return updated;
      });

      toast.success(
        "Comment posted successfully!",
      );
    } catch (err: unknown) {
      console.error(
        "Error posting comment:",
        err,
      );

      toast.error(
        getApiErrorMessage(err) ||
          "Failed to post comment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================================================================
  // OPEN REPLY BOX
  // ================================================================

  const handleReplyClick = (
    comment: DisplayComment,
  ) => {
    if (!isAuthenticated && !user) {
      toast.error(
        "You must be logged in to reply",
      );
      return;
    }

    /**
     * Clicking Reply on the currently open
     * comment closes the reply box.
     */
    if (replyingTo === comment.id) {
      setReplyingTo(null);
      setReplyText("");
      return;
    }

    setReplyingTo(comment.id);
    setReplyText("");
  };

  // ================================================================
  // SUBMIT REPLY
  // ================================================================

  const handleSubmitReply = async (
    event: React.FormEvent,
    parentId: string,
  ) => {
    event.preventDefault();

    const message = replyText.trim();

    if (!message) {
      toast.error(
        "Reply cannot be empty",
      );
      return;
    }

    if (!isAuthenticated && !user) {
      toast.error(
        "You must be logged in to reply",
      );
      return;
    }

    try {
      setIsReplying(true);

      /**
       * THIS is the important part.
       *
       * parentId is the ID of the comment
       * being replied to.
       */
      const createdReply =
        await createComment(
          articleId,
          message,
          parentId,
        );

      /**
       * Add the reply to the correct comment,
       * even if that comment is already nested.
       */
      setComments((previous) => {
        const updated =
          addReplyToComment(
            previous,
            parentId,
            createdReply as DisplayComment,
          );

        onCommentCountChange?.(
          countAllComments(updated),
        );

        return updated;
      });

      setReplyText("");
      setReplyingTo(null);

      toast.success(
        "Reply posted successfully!",
      );
    } catch (err: unknown) {
      console.error(
        "Error posting reply:",
        err,
      );

      toast.error(
        getApiErrorMessage(err) ||
          "Failed to post reply",
      );
    } finally {
      setIsReplying(false);
    }
  };

  // ================================================================
  // LIKE COMMENT
  // ================================================================

  const handleLikeComment = (
    commentId: string,
  ) => {
    /**
     * Your current API does not have a
     * comment-like endpoint.
     *
     * Keep this function here so the UI
     * can be connected later.
     */
    setComments((previous) =>
      previous.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
          };
        }

        if (
          comment.replies &&
          comment.replies.length > 0
        ) {
          return {
            ...comment,
            replies:
              updateCommentLike(
                comment.replies as DisplayComment[],
                commentId,
              ),
          };
        }

        return comment;
      }),
    );
  };

  // ================================================================
  // FORMAT TIME
  // ================================================================

  const formatTimeAgo = (
    dateString: string,
  ) => {
    const now = new Date();
    const date = new Date(dateString);

    const diffInSeconds = Math.floor(
      (now.getTime() -
        date.getTime()) /
        1000,
    );

    if (diffInSeconds < 60) {
      return "just now";
    }

    if (diffInSeconds < 3600) {
      return `${Math.floor(
        diffInSeconds / 60,
      )}m ago`;
    }

    if (diffInSeconds < 86400) {
      return `${Math.floor(
        diffInSeconds / 3600,
      )}h ago`;
    }

    if (diffInSeconds < 604800) {
      return `${Math.floor(
        diffInSeconds / 86400,
      )}d ago`;
    }

    if (diffInSeconds < 2592000) {
      return `${Math.floor(
        diffInSeconds / 604800,
      )}w ago`;
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !==
          now.getFullYear()
            ? "numeric"
            : undefined,
      },
    );
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div
      className="
        w-full
        space-y-5
        rounded-lg
        border
        border-gray-200
        bg-white
        p-4
      "
    >
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}

      <div className="flex items-center justify-between">
        <h2
          className="
            text-xs
            font-bold
            text-gray-900
            sm:text-sm
          "
        >
          Comments ({countAllComments(
            comments,
          )})
        </h2>
      </div>

      {/* ============================================================ */}
      {/* NEW COMMENT INPUT                                             */}
      {/* ============================================================ */}

      {user || isAuthenticated ? (
        <form
          onSubmit={
            handleSubmitComment
          }
          className="space-y-3"
        >
          <div className="flex gap-3">
            <Avatar
              src={
                user?.avatarUrl ||
                undefined
              }
              name={
                user?.userName ||
                "You"
              }
              alt={
                user?.userName ||
                "You"
              }
              size="sm"
              className="
                h-9
                w-9
                shrink-0
                sm:h-10
                sm:w-10
              "
            />

            <textarea
              value={newComment}
              onChange={(event) =>
                setNewComment(
                  event.target.value,
                )
              }
              placeholder="Add a thoughtful comment..."
              rows={3}
              className="
                min-w-0
                flex-1
                resize-none
                rounded-lg
                border
                border-gray-200
                p-2.5
                text-[10px]
                outline-none
                transition-all
                placeholder:text-gray-400
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-500/20
                sm:p-3
                sm:text-xs
              "
            />
          </div>

          {/* Actions */}
          <div
            className="
              flex
              justify-end
              gap-1.5
              sm:gap-2
            "
          >
            <button
              type="button"
              onClick={() =>
                setNewComment("")
              }
              className="
                px-3
                py-1.5
                text-[10px]
                font-medium
                text-gray-500
                transition-colors
                hover:text-gray-900
                sm:text-xs
              "
            >
              Cancel
            </button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={
                isSubmitting ||
                !newComment.trim()
              }
              className="
                text-[10px]
                sm:text-xs
              "
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
            rounded-lg
            border
            border-gray-200
            bg-gray-50
            p-3
            text-center
            text-[10px]
            text-gray-600
            sm:p-4
            sm:text-xs
          "
        >
          <p>
            Sign in to comment on this
            article.{" "}
            <a
              href="/auth/sign-in"
              className="
                font-semibold
                text-blue-600
                hover:underline
              "
            >
              Sign in here
            </a>
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMMENTS LIST                                                 */}
      {/* ============================================================ */}

      <div className="space-y-5">
        {isLoading ? (
          Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className="flex gap-3"
            >
              <Skeleton
                variant="circular"
                width={36}
                height={36}
              />

              <div className="min-w-0 flex-1 space-y-2">
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
            <p
              className="
                text-[10px]
                sm:text-xs
              "
            >
              No comments yet. Be the first
              to share your thoughts!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              replyingTo={replyingTo}
              replyText={replyText}
              isReplying={isReplying}
              currentUserId={user?.id}
              onReplyClick={
                handleReplyClick
              }
              onReplyTextChange={
                setReplyText
              }
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyText("");
              }}
              onSubmitReply={
                handleSubmitReply
              }
              formatTimeAgo={
                formatTimeAgo
              }
              onLike={
                handleLikeComment
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Recursively finds a comment and returns
 * an updated comment tree.
 *
 * Currently this is just a placeholder for
 * the comment-like UI because your provided
 * API does not yet expose a like-comment
 * endpoint.
 */
function updateCommentLike(
  comments: DisplayComment[],
  commentId: string,
): DisplayComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
      };
    }

    if (
      comment.replies &&
      comment.replies.length > 0
    ) {
      return {
        ...comment,
        replies:
          updateCommentLike(
            comment.replies as DisplayComment[],
            commentId,
          ),
      };
    }

    return comment;
  });
}

export default ArticleComments;
