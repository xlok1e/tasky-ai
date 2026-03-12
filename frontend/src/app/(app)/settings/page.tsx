"use client";

import { useRouter } from "next/navigation";
import { Button } from "ui/button";
import { useAuthStore } from "@shared/store/auth.store";

export default function SettingsPage() {
  const router = useRouter();
  const { user, clearToken } = useAuthStore();

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <p className="text-sm text-muted-foreground">
        Вы вошли как:{" "}
        <span className="font-medium text-foreground">
          {user?.username ?? "—"}
        </span>
      </p>
      <Button variant="outline" className="w-fit" onClick={handleLogout}>
        Выйти из аккаунта
      </Button>
    </div>
  );
}
