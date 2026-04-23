"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post<{ message: string }>("/auth/change-password", data),
  });
}
