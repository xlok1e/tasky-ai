export function AuthFlowDecorativePanel() {
	return (
		<div
			aria-hidden="true"
			className="relative hidden overflow-hidden border-l border-border/60 md:block"
		>
			<div
				className="absolute inset-0 dark:opacity-0 transition-opacity duration-300"
				style={{
					background: `linear-gradient(145deg,
						#edf3ec 0%,
						#e4ede2 24%,
						#d9e7d6 55%,
						#c4d7bb 78%,
						#a6be95 100%
					)`,
				}}
			/>

			<div
				className="absolute -inset-10 dark:opacity-0 transition-opacity duration-300"
				style={{
					background: `
						radial-gradient(ellipse 125% 115% at 8% 10%, rgba(247,250,246,0.92) 0%, transparent 52%),
						radial-gradient(ellipse 120% 135% at 100% 100%, rgba(130,164,112,0.42) 0%, transparent 56%),
						radial-gradient(ellipse 85% 105% at 62% 70%, rgba(163,193,146,0.36) 0%, transparent 54%)
					`,
					animation: "meshShift 12s ease-in-out infinite alternate",
				}}
			/>

			<div
				className="absolute -inset-6 dark:opacity-0 transition-opacity duration-300"
				style={{
					background: `
						radial-gradient(ellipse 70% 75% at 72% 18%, rgba(231,240,226,0.82) 0%, transparent 48%),
						radial-gradient(ellipse 80% 90% at 16% 88%, rgba(176,201,160,0.38) 0%, transparent 48%)
					`,
					animation: "meshShift2 14s ease-in-out infinite alternate",
				}}
			/>

			<div
				className="absolute left-[10%] top-[12%] h-48 w-48 rounded-full dark:opacity-0 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(244,248,241,0.92) 0%, rgba(244,248,241,0.24) 44%, transparent 70%)",
					animation: "blobFloat1 9s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute bottom-[18%] right-[12%] h-56 w-56 rounded-full dark:opacity-0 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(135,169,116,0.4) 0%, rgba(135,169,116,0.12) 45%, transparent 68%)",
					animation: "blobFloat2 11s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute right-[20%] top-[42%] h-28 w-28 rounded-full dark:opacity-0 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(196,219,182,0.56) 0%, rgba(196,219,182,0.12) 48%, transparent 72%)",
					animation: "blobFloat3 8s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute left-[32%] top-[28%] h-40 w-40 rounded-full dark:opacity-0 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(217,234,206,0.48) 0%, rgba(217,234,206,0.1) 46%, transparent 72%)",
					animation: "blobFloat4 10s ease-in-out infinite",
					filter: "blur(2px)",
				}}
			/>

			<div
				className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-300"
				style={{
					background: `linear-gradient(145deg,
						#101714 0%,
						#121b15 22%,
						#16211a 55%,
						#19261d 78%,
						#223326 100%
					)`,
				}}
			/>

			<div
				className="absolute -inset-12 opacity-0 dark:opacity-100 transition-opacity duration-300"
				style={{
					background: `
						radial-gradient(ellipse 130% 120% at 8% 8%, rgba(238,248,232,0.14) 0%, transparent 55%),
						radial-gradient(ellipse 115% 135% at 100% 100%, rgba(90,124,72,0.42) 0%, transparent 58%),
						radial-gradient(ellipse 95% 120% at 66% 66%, rgba(55,84,45,0.5) 0%, transparent 55%)
					`,
					animation: "meshShift 12s ease-in-out infinite alternate",
				}}
			/>

			<div
				className="absolute left-[8%] top-[10%] h-52 w-52 rounded-full opacity-0 dark:opacity-100 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(215,233,204,0.18) 0%, rgba(215,233,204,0.05) 44%, transparent 70%)",
					animation: "blobFloat1 9s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute bottom-[15%] right-[10%] h-60 w-60 rounded-full opacity-0 dark:opacity-100 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(121,154,100,0.28) 0%, rgba(121,154,100,0.09) 44%, transparent 70%)",
					animation: "blobFloat2 11s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute left-[30%] top-[25%] h-44 w-44 rounded-full opacity-0 dark:opacity-100 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(circle, rgba(162,193,144,0.18) 0%, rgba(162,193,144,0.05) 48%, transparent 72%)",
					animation: "blobFloat4 10s ease-in-out infinite",
					filter: "blur(3px)",
				}}
			/>

			<div
				className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay dark:opacity-[0.08]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
				}}
			/>

			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
		</div>
	);
}
