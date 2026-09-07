import { z } from "zod";

export const articleSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title must not exceed 120 characters"),
    slug: z.string().optional().or(z.literal("")),
    excerpt: z
      .string()
      .max(160, "Excerpt must not exceed 160 characters")
      .nullable()
      .optional()
      .or(z.literal("")),
    content: z.string().min(1, "Content cannot be empty"),
    coverImage: z.string().nullable().optional().or(z.literal("")),
    coverImageAlt: z
      .string()
      .max(160, "Alt text must not exceed 160 characters")
      .nullable()
      .optional()
      .or(z.literal("")),
    tagNames: z.array(z.string()).max(4, "Maximum 4 tags allowed"),
    status: z.enum([
      "draft",
      "published",
      // "scheduled",
      // "archived",
    ]),
    // scheduledFor: z.string().optional().or(z.literal("")),
    visibility: z.enum(["public", "unlisted"]),
    series: z.string().optional().or(z.literal("")),
    readingTime: z.number().optional(),
  });
  // .superRefine((data, ctx) => {
  //   if (data.status === "scheduled" && !data.scheduledFor) {
  //     ctx.addIssue({
  //       code: z.ZodIssueCode.custom,
  //       message: "Please select a date and time to schedule this article",
  //       path: ["scheduledFor"],
  //     });
  //   }
  // });

export type ArticleFormData = z.infer<typeof articleSchema>;
