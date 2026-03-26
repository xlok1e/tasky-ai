import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@shared/ui/sonner";
import { Providers } from "./providers";

const lineSeedJP = localFont({
	src: [
		{ path: "../../public/fonts/LINESeedJP-Thin.ttf", weight: "100" },
		{ path: "../../public/fonts/LINESeedJP-Regular.ttf", weight: "400" },
		{ path: "../../public/fonts/LINESeedJP-Bold.ttf", weight: "700" },
		{ path: "../../public/fonts/LINESeedJP-ExtraBold.ttf", weight: "800" },
	],
	variable: "--font-line-seed-jp",
});

export const metadata: Metadata = {
	title: "Tasky",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${lineSeedJP.variable} antialiased bg-background`}
				suppressHydrationWarning={true}
			>
				<Providers>
					{children}
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
