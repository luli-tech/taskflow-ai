import { toast } from "sonner";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

// Request interceptor
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle different status codes
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("authToken");
        window.location.href = "/auth";
        throw new Error("Session expired. Please login again.");
      }

      if (response.status === 403) {
        throw new Error("You don't have permission to perform this action.");
      }

      if (response.status === 404) {
        throw new Error("Resource not found.");
      }

      if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      // Try to get error message from response
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "An error occurred");
    }

    // Handle no content responses
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      toast.error(error.message);
      throw error;
    }
    toast.error("An unexpected error occurred");
    throw new Error("An unexpected error occurred");
  }
}

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      }),

    signup: (email: string, password: string, name: string) =>
      apiRequest<{ token: string; user: any }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
        requiresAuth: false,
      }),

    logout: () =>
      apiRequest<void>("/auth/logout", {
        method: "POST",
      }),

    me: () => apiRequest<any>("/auth/me"),
  },

  // Task endpoints
  tasks: {
    list: (filters?: any) =>
      apiRequest<any[]>(`/tasks${filters ? `?${new URLSearchParams(filters)}` : ""}`),

    get: (id: string) => apiRequest<any>(`/tasks/${id}`),

    create: (data: any) =>
      apiRequest<any>("/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      apiRequest<any>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/tasks/${id}`, {
        method: "DELETE",
      }),

    addComment: (taskId: string, comment: string) =>
      apiRequest<any>(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),

    addAttachment: (taskId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      return fetch(`${API_BASE_URL}/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: formData,
      }).then(res => res.json());
    },
  },

  // Dashboard endpoints
  dashboard: {
    stats: () => apiRequest<any>("/dashboard/stats"),
    activity: () => apiRequest<any[]>("/dashboard/activity"),
  },

  // Chat endpoints
  chat: {
    conversations: () => apiRequest<any[]>("/chat/conversations"),
    
    messages: (conversationId: string) =>
      apiRequest<any[]>(`/chat/conversations/${conversationId}/messages`),

    sendMessage: (conversationId: string, content: string) =>
      apiRequest<any>(`/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),

    createConversation: (participantIds: string[]) =>
      apiRequest<any>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds }),
      }),
  },
};
