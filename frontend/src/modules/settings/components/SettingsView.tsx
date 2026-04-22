"use client";

import { useSettingsView } from "../hooks/useSettingsView";
import { AccountSection } from "./sections/AccountSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { SyncSection } from "./sections/SyncSection";
import { WorkSettingsSection } from "./sections/WorkSettingsSection";
import { SettingsDivider } from "./ui/SettingsDivider";

export function SettingsView() {
  const settingsView = useSettingsView();

  return (
    <div className="flex w-full flex-col gap-[45px] pb-8">
      <header className="flex w-full items-center justify-between">
        <h1 className="text-[22px] leading-6 font-normal text-foreground">
          Настройки
        </h1>
      </header>

      <div className="flex w-full flex-col gap-6">
        <AppearanceSection />

        <SettingsDivider />

        <WorkSettingsSection
          workDayStart={settingsView.workDayStart}
          workDayEnd={settingsView.workDayEnd}
          timeZone={settingsView.timeZone}
          timezoneOptions={settingsView.timezoneOptions}
          morningEnabled={settingsView.morningEnabled}
          eveningEnabled={settingsView.eveningEnabled}
          morningNotificationTime={settingsView.morningNotificationTime}
          eveningNotificationTime={settingsView.eveningNotificationTime}
          onWorkDayStartChange={settingsView.setWorkDayStart}
          onWorkDayEndChange={settingsView.setWorkDayEnd}
          onTimeZoneChange={settingsView.handleTimeZoneChange}
          onWorkDayStartBlur={settingsView.handleWorkDayStartBlur}
          onWorkDayEndBlur={settingsView.handleWorkDayEndBlur}
          onMorningToggle={settingsView.handleMorningToggle}
          onEveningToggle={settingsView.handleEveningToggle}
          onMorningTimeChange={settingsView.setMorningNotificationTime}
          onEveningTimeChange={settingsView.setEveningNotificationTime}
          onMorningTimeBlur={settingsView.handleMorningTimeBlur}
          onEveningTimeBlur={settingsView.handleEveningTimeBlur}
        />

        <SettingsDivider />

        <SyncSection
          isConnected={settingsView.isConnected}
          isGoogleAuthLoading={settingsView.isGoogleAuthLoading}
          isDisconnectModalOpen={settingsView.isDisconnectModalOpen}
          isDisconnecting={settingsView.isDisconnecting}
          onGoogleAction={settingsView.handleGoogleAction}
          onDisconnectClick={settingsView.handleDisconnectClick}
          onDisconnectConfirm={settingsView.handleDisconnectConfirm}
          onDisconnectCancel={settingsView.handleDisconnectCancel}
        />

        <SettingsDivider />

        <AccountSection
          username={settingsView.username}
          phoneNumber={settingsView.phoneNumber}
          onLogout={settingsView.handleLogout}
        />
      </div>
    </div>
  );
}

export default SettingsView;
