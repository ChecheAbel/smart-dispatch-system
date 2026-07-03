import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Something went wrong. Please try again.";
      return Promise.reject(new Error(message));
    }

    return Promise.reject(
      error instanceof Error ? error : new Error("Something went wrong. Please try again."),
    );
  },
);
