import { SettingsSection } from "../ui/SettingsSection";
import { ThemeModeSelector } from "../ui/ThemeModeSelector";

export function AppearanceSection() {
	return (
		<SettingsSection title="Внешний вид">
			<ThemeModeSelector />
		</SettingsSection>
	);
}
