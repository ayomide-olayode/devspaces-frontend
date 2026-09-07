export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const ENDPOINTS = {
  AUTH: {
    SIGN_UP: `${API_BASE_URL}/api/Auth/signup`,
    SIGN_IN: `${API_BASE_URL}/api/Auth/signin`,
    GOOGLE_INIT: `${API_BASE_URL}/api/Auth/google`,
    GITHUB_INIT: `${API_BASE_URL}/api/Auth/github`,
    GOOGLE_CALLBACK: `${API_BASE_URL}/api/Auth/google/callback`,
    GITHUB_CALLBACK: `${API_BASE_URL}/api/Auth/github/callback`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/Auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/Auth/reset-password`,
    VERIFY_ACCOUNT: `${API_BASE_URL}/api/Auth/verify-email`,
    RESEND_OTP: `${API_BASE_URL}/api/Auth/resend-otp`,
    LOGOUT: `${API_BASE_URL}/api/Auth/logout`,
  },

  USER: {
    PROFILE: `${API_BASE_URL}/api/User/profile`,
  },

  POSTS: {
    FEED: `${API_BASE_URL}/api/posts/feed`,

    CREATE: `${API_BASE_URL}/api/posts`,

    DETAIL: (id: string) =>
      `${API_BASE_URL}/api/posts/${id}`,

    LIKE: (id: string) =>
      `${API_BASE_URL}/api/posts/${id}/like`,

    COMMENTS: (id: string) =>
      `${API_BASE_URL}/api/posts/${id}/comments`,

    CREATE_COMMENT: (id: string) =>
      `${API_BASE_URL}/api/posts/${id}/comment`,

    SAVE: (id: string) =>
      `${API_BASE_URL}/api/posts/${id}/save`,
  },

  TAGS: {
    LIST: `${API_BASE_URL}/api/tags`,
  },
} as const;
