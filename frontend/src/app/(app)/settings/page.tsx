import { Button } from "ui/button";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <p className="text-sm text-muted-foreground">
        Вы вошли как: <span className="font-medium text-foreground">—</span>
      </p>
      <Button variant="outline" className="w-fit">
        Выйти из аккаунта
      </Button>
    </div>
  );
}
