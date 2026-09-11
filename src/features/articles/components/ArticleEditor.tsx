import { useState, useEffect, useRef, type JSX, type KeyboardEvent, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  HiOutlineArrowLeft,
  HiOutlinePhoto,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineQuestionMarkCircle,
  HiOutlineLightBulb,
  HiOutlineChevronDown,
  HiOutlineInformationCircle,
} from "react-icons/hi2";
import {
  BsTypeBold,
  BsTypeItalic,
  BsTypeStrikethrough,
  BsLink45Deg,
  BsQuote,
  BsCodeSlash,
  BsListUl,
  BsListOl,
  BsCheck2Square,
  BsTable,
  BsImage,
  BsCodeSquare,
  BsThreeDots,
  BsArrowsFullscreen,
} from "react-icons/bs";

import { Button } from "@/components/common";
import { toast } from "@/hooks/useToast";
import { articleSchema, type ArticleFormData } from "../schemas/articleSchema";

export interface ArticleEditorProps {
  initialData?: Partial<ArticleFormData>;
  isEditing?: boolean;
  onSaveDraft?: (data: ArticleFormData, coverImageFile?: File | null) => Promise<void>;
  onPublish?: (data: ArticleFormData, coverImageFile?: File | null) => Promise<void>;
}

export function ArticleEditor({
  initialData,
  isEditing = false,
  onSaveDraft,
  onPublish,
}: ArticleEditorProps): JSX.Element {
  const [tagInput, setTagInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>(initialData?.coverImage ?? "");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      if (coverImagePreview && coverImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  const [prevInitialCover, setPrevInitialCover] = useState(initialData?.coverImage);
  if (initialData?.coverImage !== prevInitialCover) {
    setPrevInitialCover(initialData?.coverImage);
    if (!coverImageFile) {
      setCoverImagePreview(initialData?.coverImage ?? "");
    }
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      excerpt: initialData?.excerpt ?? "",
      content: initialData?.content ?? "",
      coverImage: initialData?.coverImage ?? "",
      coverImageAlt: initialData?.coverImageAlt ?? "",
      tagNames: initialData?.tagNames ?? [],
      status: initialData?.status ?? "draft",
      // scheduledFor: initialData?.scheduledFor ?? "",
      visibility: initialData?.visibility ?? "public",
      series: initialData?.series ?? "",
      readingTime: initialData?.readingTime ?? 0,
    },
  });

  const titleValue = useWatch({ control, name: "title" }) || "";
  const contentValue = useWatch({ control, name: "content" }) || "";
  const coverImageValue = useWatch({ control, name: "coverImage" }) || "";
  const tagNamesValue = useWatch({ control, name: "tagNames" }) || [];
  const visibilityValue = useWatch({ control, name: "visibility" }) || "public";
  const excerptValue = useWatch({ control, name: "excerpt" }) || "";
  const statusValue = useWatch({ control, name: "status" }) || "draft";

  // Auto-slugify title if slug is not manually altered
  useEffect(() => {
    if (!initialData?.slug && titleValue) {
      const generatedSlug = titleValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [titleValue, setValue, initialData]);

  // Word & Character count calculations
  const characterCount = contentValue.length;
  const wordCount = contentValue.trim() ? contentValue.trim().split(/\s+/).length : 0;
  const computedReadingTime = Math.ceil(wordCount / 200);

  // Sync computed reading time into the form payload
  useEffect(() => {
    setValue("readingTime", computedReadingTime, { shouldValidate: false });
  }, [computedReadingTime, setValue]);

  // Before you publish checklist calculation (2/4, 3/4, 4/4)
  const checklist = [
    { label: "Add a title", isMet: titleValue.trim().length >= 3 },
    { label: "Add at least one tag", isMet: tagNamesValue.length >= 1 },
    { label: "Add a cover image", isMet: Boolean(coverImageValue.trim()) },
    { label: "Write at least 300 characters", isMet: characterCount >= 300 },
  ];
  const completedChecklistCount = checklist.filter((c) => c.isMet).length;

  // Insert markdown syntax into content textarea at current cursor position
  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;

    const selectedText = previousText.substring(start, end) || "text";
    const replacement = `${before}${selectedText}${after}`;

    const newText = previousText.substring(0, start) + replacement + previousText.substring(end);

    setValue("content", newText, { shouldValidate: true });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length,
      );
    }, 0);
  };

  const handleAddTag = () => {
    const trimmed = tagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!trimmed) return;
    if (tagNamesValue.length >= 4) {
      toast.error("You can add a maximum of 4 tags");
      return;
    }
    if (tagNamesValue.includes(trimmed)) {
      toast.error("Tag already added");
      return;
    }
    setValue("tagNames", [...tagNamesValue, trimmed], { shouldValidate: true });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      "tagNames",
      tagNamesValue.filter((t) => t !== tagToRemove),
      { shouldValidate: true },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image size must be less than ${maxMb}MB`);
      return;
    }

    if (coverImagePreview && coverImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setCoverImageFile(file);
    setCoverImagePreview(previewUrl);
    setValue("coverImage", file.name, { shouldValidate: true });
    e.target.value = "";
  };

  const handleRemoveCoverImage = (): void => {
    if (coverImagePreview && coverImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImageFile(null);
    setCoverImagePreview("");
    setValue("coverImage", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveDraftHandler = async (data: ArticleFormData): Promise<void> => {
    setIsSaving(true);
    try {
      if (onSaveDraft) {
        await onSaveDraft({ ...data, status: "draft" }, coverImageFile);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishHandler = async (data: ArticleFormData): Promise<void> => {
    if (data.status === "draft") {
      await handleSaveDraftHandler(data);
      return;
    }
    setIsPublishing(true);
    try {
      if (onPublish) {
        await onPublish(data, coverImageFile);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish article");
    } finally {
      setIsPublishing(false);
    }
  };

  const { ref: registerContentRef, ...contentRegisterRest } = register("content");

  return (
    <div
      className={`w-full font-inter bg-background text-text min-h-screen ${isFullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-white p-6" : "p-4 sm:p-6"}`}
    >
      <div className="max-w-360 mx-auto space-y-5">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3.5 sm:px-6 sm:py-3.5 rounded-xl border border-border shadow-2xs">
          <div className="flex items-center gap-3">
            <Button
              href="/"
              variant="ghost"
              size="sm"
              leftIcon={<HiOutlineArrowLeft className="w-4 h-4 text-text/70" />}
              className="font-medium hover:bg-slate-100"
            >
              <span className="font-bold text-sm text-text">
                {isEditing ? "Edit Article" : "Create Article"}
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div
              className={`hidden md:flex items-center gap-1.5 text-xs font-medium mr-2 px-2.5 py-1 rounded-full border ${
                statusValue === "published"
                  ? "text-blue-600 bg-blue-50 border-blue-100"
                  : "text-emerald-600 bg-emerald-50 border-emerald-100"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] ${
                  statusValue === "published" ? "bg-blue-500" : "bg-emerald-500"
                }`}
              >
                <HiOutlineCheck className="w-3 h-3 stroke-3" />
              </span>
              <span>{statusValue === "published" ? "Published" : "Draft saved just now"}</span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-white border-border hover:bg-slate-50 text-text/80 font-medium"
            >
              Preview
            </Button>

            {statusValue !== "draft" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isSaving}
                onClick={handleSubmit(handleSaveDraftHandler)}
                className="border-primary/40 text-primary hover:bg-primary/5 font-medium"
              >
                Save Draft
              </Button>
            )}

            <div className="relative inline-flex">
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={statusValue === "draft" ? isSaving : isPublishing}
                onClick={
                  statusValue === "draft"
                    ? handleSubmit(handleSaveDraftHandler)
                    : handleSubmit(handlePublishHandler)
                }
                rightIcon={<HiOutlineChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {statusValue === "draft" ? "Save Draft" : "Publish"}
              </Button>
            </div>
          </div>
        </header>

        {/* 3-Column Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUMN 1: LEFT EDITOR (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Cover Image Block */}
            <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <HiOutlinePhoto className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text">Add a cover image</h3>
                    <p className="text-[11px] text-text/50">Recommended size: 1200x630px (16:9)</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  {coverImagePreview ? "Change Image" : "Upload Image"}
                </Button>
              </div>

              {coverImagePreview && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-slate-100 group shadow-2xs">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/95 hover:bg-white text-text text-xs shadow-sm"
                      >
                        Change
                      </Button>
                      <button
                        type="button"
                        onClick={handleRemoveCoverImage}
                        aria-label="Remove cover image"
                        title="Remove cover image"
                        className="p-2 rounded-lg bg-red-600/90 text-white hover:bg-red-600 transition-colors cursor-pointer shadow-sm"
                      >
                        <HiOutlineXMark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {coverImageFile && (
                    <div className="flex items-center justify-between text-[11px] text-text/50 px-1">
                      <span className="truncate max-w-[240px] font-medium text-text/70">
                        {coverImageFile.name}
                      </span>
                      <span>{(coverImageFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title & Tags Card */}
            <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-3">
              {/* Article Title Input */}
              <div>
                <input
                  type="text"
                  placeholder="Enter your article title..."
                  {...register("title")}
                  className="w-full text-xl sm:text-2xl font-bold text-text border-none outline-none focus:ring-0 bg-transparent py-1"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="h-px bg-border/60" />

              {/* Tags Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-border rounded-lg px-3 py-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add up to 4 tags"
                    className="w-full bg-transparent text-xs text-text border-none outline-none focus:ring-0"
                  />
                  <span className="text-[11px] font-mono font-medium text-text/40 shrink-0">
                    {tagNamesValue.length}/4
                  </span>
                </div>

                {tagNamesValue.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tagNamesValue.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <HiOutlineXMark className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Formatting Toolbar & Writing Textarea */}
            <div className="bg-white border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col">
              {/* Toolbar */}
              <div className="border-b border-border bg-slate-50/70 p-2 flex items-center gap-1 sm:gap-1.5 flex-wrap text-text/70">
                {/* Heading dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeadingMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold hover:bg-slate-200 text-text/80 transition-colors"
                  >
                    <span>H</span>
                    <HiOutlineChevronDown className="w-3 h-3" />
                  </button>
                  {headingMenuOpen && (
                    <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-border rounded-lg shadow-lg py-1 w-28 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdown("# ");
                          setHeadingMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100"
                      >
                        H1 Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdown("## ");
                          setHeadingMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100"
                      >
                        H2 Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          insertMarkdown("### ");
                          setHeadingMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100"
                      >
                        H3 Heading
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-border mx-0.5" />

                <button
                  type="button"
                  title="Bold"
                  onClick={() => insertMarkdown("**", "**")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsTypeBold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => insertMarkdown("*", "*")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsTypeItalic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough"
                  onClick={() => insertMarkdown("~~", "~~")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsTypeStrikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Link"
                  onClick={() => insertMarkdown("[", "](https://)")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsLink45Deg className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Blockquote"
                  onClick={() => insertMarkdown("> ")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsQuote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Inline Code"
                  onClick={() => insertMarkdown("`", "`")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsCodeSlash className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-border mx-0.5" />

                <button
                  type="button"
                  title="Unordered List"
                  onClick={() => insertMarkdown("- ")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsListUl className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Ordered List"
                  onClick={() => insertMarkdown("1. ")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsListOl className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Task List"
                  onClick={() => insertMarkdown("- [ ] ")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsCheck2Square className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-border mx-0.5" />

                <button
                  type="button"
                  title="Table"
                  onClick={() =>
                    insertMarkdown(
                      "\n| Feature | Support |\n| ------- | ------- |\n| Code    | ✓       |\n\n",
                    )
                  }
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsTable className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Image"
                  onClick={() => insertMarkdown("![Alt Text](", ")")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsImage className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Code Block"
                  onClick={() => insertMarkdown("```js\n", "\n```")}
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors"
                >
                  <BsCodeSquare className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="More options"
                  className="p-1.5 rounded hover:bg-slate-200 text-text/80 transition-colors ml-auto"
                >
                  <BsThreeDots className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <div className="p-4 flex-1 min-h-90">
                <textarea
                  {...contentRegisterRest}
                  ref={(e) => {
                    registerContentRef(e);
                    textareaRef.current = e;
                  }}
                  rows={14}
                  placeholder="Start writing your story..."
                  className="w-full h-full p-1 bg-transparent text-text font-inter text-sm leading-relaxed outline-none border-none focus:ring-0 resize-y min-h-80"
                />
                {errors.content && (
                  <p className="text-xs text-red-500 font-medium mt-1">{errors.content.message}</p>
                )}
              </div>

              {/* Footer status bar */}
              <div className="border-t border-border/60 bg-slate-50/50 px-4 py-2 flex items-center justify-between text-xs text-text/60 font-mono">
                <div className="flex items-center gap-1 text-text/70 cursor-pointer">
                  <span>Markdown</span>
                  <HiOutlineChevronDown className="w-3 h-3" />
                </div>

                <div className="flex items-center gap-3">
                  <span>Words: {wordCount}</span>
                  <span className="text-border">|</span>
                  <span>Characters: {characterCount}</span>
                  <span className="text-border">|</span>
                  <span>{computedReadingTime} min read</span>
                  <HiOutlineQuestionMarkCircle
                    className="w-4 h-4 text-text/40 hover:text-text cursor-pointer"
                    title="Estimated based on 200 words per minute"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="p-0.5 hover:text-text transition-colors"
                  >
                    <BsArrowsFullscreen
                      className="w-3.5 h-3.5"
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Card: Checklist & Tip */}
            <div className="bg-white border border-border rounded-xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text">Before you publish</h4>

                <div className="flex items-center gap-4">
                  {/* Circle Meter */}
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-slate-100"
                        fill="transparent"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray={113}
                        strokeDashoffset={113 - (113 * completedChecklistCount) / 4}
                        strokeLinecap="round"
                        className="text-teal transition-all duration-300"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-xs font-extrabold text-teal">
                      {completedChecklistCount}/4
                    </span>
                  </div>

                  {/* Checklist items */}
                  <div className="space-y-1.5 text-xs">
                    {checklist.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.isMet ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-teal text-white flex items-center justify-center shrink-0">
                            <HiOutlineCheck className="w-2.5 h-2.5 stroke-3" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={item.isMet ? "text-text font-medium" : "text-text/50"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tip Box */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                    <HiOutlineLightBulb className="w-4 h-4 text-indigo-600" />
                    <span>Tip</span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                    Great technical articles include code examples, clear explanations, and
                    takeaways.
                  </p>
                </div>
                <a
                  href="#guidelines"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(
                      "Writing guidelines: keep content engaging, well-formatted, and accurate!",
                    );
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 pt-1"
                >
                  View writing guidelines &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* COLUMN 2: CENTER LIVE PREVIEW (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-white border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col min-h-175">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-text/70 uppercase tracking-wider">
                Preview
              </span>
            </div>

            <div className="p-5 flex-1 space-y-4 font-inter leading-relaxed text-sm overflow-y-auto">
              {/* Formatted Title */}
              <h1 className="text-2xl font-bold text-text tracking-tight">
                {titleValue.trim() ? titleValue : "Your title will appear here"}
              </h1>

              {/* Formatted Tags */}
              <div className="flex flex-wrap gap-1.5">
                {tagNamesValue.length > 0 ? (
                  tagNamesValue.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-600"
                    >
                      #{t}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-400">
                      #tag1
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-400">
                      #tag2
                    </span>
                  </>
                )}
              </div>

              {/* Formatted Content Body */}
              <div
                className="prose prose-slate  w-full
                max-w-none overflow-y-auto max-h-175
                wrap-break-word text-xs sm:text-sm text-text/80 space-y-3"
              >
                {contentValue.trim() ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-3 border-indigo-500 bg-indigo-50/40 px-3 py-2 italic text-indigo-950 my-2 overflow rounded-r">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = Boolean(className);
                        const match = /language-(\w+)/.exec(className || "");
                        const lang = match ? match[1] : "js";
                        if (isBlock) {
                          return (
                            <div className="relative rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs my-3 overflow-x-auto not-italic">
                              <span className="absolute top-2 right-2 text-[10px] uppercase font-bold text-slate-400 select-none font-inter not-italic">
                                {lang}
                              </span>
                              <code className="not-italic">{children}</code>
                            </div>
                          );
                        }
                        return (
                          <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-xs not-italic">
                            {children}
                          </code>
                        );
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3 border border-border rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="bg-slate-50 p-2 border-b border-border font-bold text-text">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="p-2 border-b border-border/60 text-text/80">{children}</td>
                      ),
                    }}
                  >
                    {contentValue}
                  </ReactMarkdown>
                ) : (
                  <div className="space-y-3 pt-2 text-text/50">
                    <p>Your content preview will appear here as you write.</p>

                    <blockquote className="border-l-3 border-indigo-500 bg-indigo-50/40 px-3 py-2 italic text-indigo-950 rounded-r">
                      &gt; Blockquotes look like this.
                    </blockquote>

                    <h2 className="text-base font-bold text-text pt-1">## Heading 2</h2>
                    <h3 className="text-sm font-bold text-text">### Heading 3</h3>

                    <p>Lists look great in your articles:</p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>Item one</li>
                      <li>Item two</li>
                      <ul className="list-circle pl-4 space-y-1 text-xs">
                        <li>Nested item</li>
                      </ul>
                      <li>Item three</li>
                    </ul>

                    <p>Here's how code looks:</p>
                    <div className="relative rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs my-2 not-italic">
                      <span className="absolute top-2 right-2 text-[10px] uppercase font-bold text-slate-400 select-none font-inter not-italic">
                        js
                      </span>
                      <pre className="m-0 not-italic">
                        {`function hello(name) {\n  console.log('Hello, ' + name + '!');\n}`}
                      </pre>
                    </div>

                    <p className="pt-1">Tables are supported too:</p>
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-border">
                            <th className="p-2 font-bold">Feature</th>
                            <th className="p-2 font-bold">Support</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/60">
                            <td className="p-2">Code Blocks</td>
                            <td className="p-2 text-teal">✓</td>
                          </tr>
                          <tr className="border-b border-border/60">
                            <td className="p-2">Tables</td>
                            <td className="p-2 text-teal">✓</td>
                          </tr>
                          <tr>
                            <td className="p-2">Mermaid Diagrams</td>
                            <td className="p-2 text-teal">✓</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Footer */}
            <div className="border-t border-border px-4 py-2.5 bg-slate-50/50 flex items-center justify-between text-xs text-text/50 font-mono">
              <span>Reading time: {computedReadingTime} min</span>
              <span>Words: {wordCount}</span>
            </div>
          </div>

          {/* COLUMN 3: RIGHT PUBLICATION SIDEBAR (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider border-b border-border/60 pb-2.5">
                Publication
              </h3>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text">Status</label>
                <div className="relative">
                  <select
                    {...register("status")}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-slate-50 text-text font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  >
                    <option value="draft">• Draft</option>
                    <option value="published">• Published</option>
                    {/* <option value="scheduled">• Scheduled</option> */}
                    {/* <option value="archived">• Archived</option> */}
                  </select>
                  <HiOutlineChevronDown className="w-3.5 h-3.5 text-text/50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Scheduled For — shown only when status is "scheduled" */}
              {/* {statusValue === "scheduled" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text">Scheduled for</label>
                  <input
                    type="datetime-local"
                    {...register("scheduledFor")}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-slate-50 text-text font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {errors.scheduledFor && (
                    <p className="text-xs text-red-500 font-medium">{errors.scheduledFor.message}</p>
                  )}
                </div>
              )} */}

              {/* Publish To Radio Options */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-text">Publish to</label>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-border">
                    <input
                      type="radio"
                      value="public"
                      checked={visibilityValue === "public"}
                      onChange={() => setValue("visibility", "public")}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-text block">Public</span>
                      <span className="text-[11px] text-text/50 block">
                        Anyone can discover and read
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-border">
                    <input
                      type="radio"
                      value="unlisted"
                      checked={visibilityValue === "unlisted"}
                      onChange={() => setValue("visibility", "unlisted")}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-text block">Unlisted</span>
                      <span className="text-[11px] text-text/50 block">
                        Anyone with the link can read
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Series Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-1 text-xs font-medium text-text">
                  Series
                  <HiOutlineInformationCircle
                    className="w-3.5 h-3.5 text-text/40 cursor-pointer"
                    title="Organize related articles into a collection"
                  />
                </label>
                <div className="relative">
                  <select
                    {...register("series")}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-slate-50 text-text font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  >
                    <option value="">Select a series (optional)</option>
                    <option value="react-guides">Getting Started with React</option>
                    <option value="ts-patterns">Advanced TypeScript Patterns</option>
                    <option value="fullstack-devspace">Fullstack DevSpace Guide</option>
                  </select>
                  <HiOutlineChevronDown className="w-3.5 h-3.5 text-text/50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Excerpt Textarea */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-xs font-medium text-text">
                    Excerpt
                    <HiOutlineInformationCircle
                      className="w-3.5 h-3.5 text-text/40 cursor-pointer"
                      title="Summary shown on article feeds & search cards"
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  maxLength={160}
                  placeholder="Write a short summary of your article..."
                  {...register("excerpt")}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-slate-50 placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <div className="text-right text-[10px] font-mono text-text/40">
                  {excerptValue.length}/160
                </div>
              </div>

              {/* Cover Image Alt Text */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-medium text-text">
                  Cover image alt text
                  <HiOutlineInformationCircle
                    className="w-3.5 h-3.5 text-text/40 cursor-pointer"
                    title="Accessible text for screen readers"
                  />
                </label>
                <input
                  type="text"
                  placeholder="Describe your cover image..."
                  {...register("coverImageAlt")}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-slate-50 placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[10px] text-text/50">Helps with accessibility and SEO.</p>
              </div>

              {/* Advanced Collapsible */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-text/70 hover:text-text transition-colors py-1"
                >
                  <span className="flex items-center gap-1">
                    Advanced
                    <HiOutlineInformationCircle className="w-3.5 h-3.5 text-text/40" />
                  </span>
                  <HiOutlineChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="pt-3 space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-medium text-text">Custom Slug</label>
                      <input
                        type="text"
                        {...register("slug")}
                        className="w-full text-xs p-2 rounded-lg border border-border bg-slate-50 text-text font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-save Info Card */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-save is on</span>
              </div>
              <p className="text-[11px] text-emerald-950/70 leading-relaxed">
                Your changes are saved automatically as you type.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Autosave is enabled automatically.")}
                className="text-[11px] font-semibold text-emerald-700 hover:underline pt-0.5 inline-block"
              >
                Manage autosave settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleEditor;
