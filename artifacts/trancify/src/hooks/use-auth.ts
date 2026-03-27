import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const token = localStorage.getItem("trancify_token");

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("trancify_token", data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

        if (data.user.role === "super_admin") {
          setLocation("/admin");
        } else {
          setLocation("/dashboard");
        }
      },
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        localStorage.removeItem("trancify_token");
        queryClient.clear();
        setLocation("/");
      },
    },
  });

  return {
    user,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    token,
  };
}
