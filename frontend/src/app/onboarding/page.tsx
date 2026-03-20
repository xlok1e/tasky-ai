"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { getGoogleAuthUrl } from "@/domains/google/api/google.api";
import { useGoogleStore } from "@/domains/google/store/google.store";
import { useUserStore } from "@/domains/user/store/user.store";
import { CheckCircle } from "lucide-react";

type Step = "calendar" | "google-connect" | "google-success" | "work-time" | "notifications";

const TIMEZONES = [
  "Europe/Moscow",
  "Europe/Kiev",
  "Europe/Minsk",
  "Europe/Kaliningrad",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Sakhalin",
  "Asia/Kamchatka",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const disconnect = useGoogleStore((s) => s.disconnect);
  const { updateSettings } = useUserStore();

  const [step, setStep] = useState<Step>("calendar");
  const [calendarChoice, setCalendarChoice] = useState<"builtin" | "google">("builtin");
  const [workDayStart, setWorkDayStart] = useState("09:00");
  const [workDayEnd, setWorkDayEnd] = useState("18:00");
  const [timeZone, setTimeZone] = useState("Europe/Moscow");
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const googleStep = searchParams.get("step");
    if (googleStep === "google-success") {
      setStep("google-success");
    }
  }, [searchParams]);

  const handleCalendarNext = async () => {
    if (calendarChoice === "builtin") {
      setIsLoading(true);
      await updateSettings({ useBuiltinCalendar: true });
      setIsLoading(false);
      setStep("work-time");
    } else {
      setStep("google-connect");
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/onboarding?step=google-success`;
      const authUrl = await getGoogleAuthUrl(redirectUri);
      window.location.href = authUrl;
    } catch {
      setIsLoading(false);
    }
  };

  const handleGoogleCancel = async () => {
    setIsLoading(true);
    await disconnect();
    await updateSettings({ useBuiltinCalendar: true });
    setIsLoading(false);
    setStep("calendar");
  };

  const handleWorkTimeNext = async () => {
    setIsLoading(true);
    await updateSettings({
      workDayStart: workDayStart + ":00",
      workDayEnd: workDayEnd + ":00",
      timeZone,
    });
    setIsLoading(false);
    setStep("notifications");
  };

  const handleFinish = async () => {
    setIsLoading(true);
    await updateSettings({
      morningNotificationsEnabled: morningEnabled,
      eveningNotificationsEnabled: eveningEnabled,
    });
    localStorage.setItem("onboarding_done", "1");
    setIsLoading(false);
    router.replace("/inbox");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Tasky</h1>
          <p className="text-muted-foreground text-sm mt-1">Настройка аккаунта</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
          {step === "calendar" && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Выберите календарь</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Где хранить ваши задачи и события
                </p>
              </div>
              <RadioGroup
                value={calendarChoice}
                onValueChange={(v) => setCalendarChoice(v as "builtin" | "google")}
                className="space-y-3"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                  <RadioGroupItem value="builtin" id="builtin" />
                  <Label htmlFor="builtin" className="cursor-pointer flex-1">
                    <span className="font-medium">Встроенный календарь</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Все данные хранятся внутри приложения
                    </p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                  <RadioGroupItem value="google" id="google" />
                  <Label htmlFor="google" className="cursor-pointer flex-1">
                    <span className="font-medium">Google Calendar</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Синхронизация с вашим Google аккаунтом
                    </p>
                  </Label>
                </div>
              </RadioGroup>
              <Button onClick={handleCalendarNext} disabled={isLoading} className="w-full">
                Далее
              </Button>
            </>
          )}

          {step === "google-connect" && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Подключить Google Calendar</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Войдите в Google аккаунт для синхронизации задач
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Переход..." : "Войти через Google"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep("calendar")}
                  disabled={isLoading}
                  className="w-full"
                >
                  Назад
                </Button>
              </div>
            </>
          )}

          {step === "google-success" && (
            <>
              <div className="text-center space-y-3">
                <CheckCircle className="mx-auto text-green-500" size={48} />
                <h2 className="text-lg font-semibold">Google Calendar подключён</h2>
                <p className="text-sm text-muted-foreground">
                  Ваши задачи будут синхронизироваться с Google Calendar
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleGoogleCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={() => setStep("work-time")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Далее
                </Button>
              </div>
            </>
          )}

          {step === "work-time" && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Рабочее время</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Настройте свой рабочий день
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="work-start">Начало рабочего дня</Label>
                  <Input
                    id="work-start"
                    type="time"
                    value={workDayStart}
                    onChange={(e) => setWorkDayStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="work-end">Конец рабочего дня</Label>
                  <Input
                    id="work-end"
                    type="time"
                    value={workDayEnd}
                    onChange={(e) => setWorkDayEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Часовой пояс</Label>
                  <Select value={timeZone} onValueChange={setTimeZone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleWorkTimeNext} disabled={isLoading} className="w-full">
                Далее
              </Button>
            </>
          )}

          {step === "notifications" && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Уведомления</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Получайте напоминания о задачах
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium">Утренние уведомления</p>
                    <p className="text-xs text-muted-foreground">В начале рабочего дня</p>
                  </div>
                  <Switch
                    checked={morningEnabled}
                    onCheckedChange={setMorningEnabled}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium">Вечерние уведомления</p>
                    <p className="text-xs text-muted-foreground">В конце рабочего дня</p>
                  </div>
                  <Switch
                    checked={eveningEnabled}
                    onCheckedChange={setEveningEnabled}
                  />
                </div>
              </div>
              <Button onClick={handleFinish} disabled={isLoading} className="w-full">
                {isLoading ? "Сохранение..." : "Завершить"}
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-center gap-2">
          {(["calendar", "work-time", "notifications"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ||
                (step === "google-connect" && i === 0) ||
                (step === "google-success" && i === 0)
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
