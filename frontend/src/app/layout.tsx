import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const interSans = Inter({
	subsets: ["latin", "cyrillic"],
	variable: "--font-inter",
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
		<html lang="en">
			<body
				className={`${interSans.variable} antialiased bg-background`}
				suppressHydrationWarning={true}
			>
				{children}
				<Toaster />
			</body>
		</html>
	);
}
