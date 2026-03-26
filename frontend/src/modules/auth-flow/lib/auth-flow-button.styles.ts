import { cva } from "class-variance-authority";

export const authFlowButtonVariants = cva(
	"h-[50px] rounded-[6px] px-6 text-[18px] font-normal shadow-none transition-colors",
	{
		variants: {
			tone: {
				primary: "bg-[#dadcc9] text-[#251818] hover:bg-[#d2d5c0]",
				secondary:
					"bg-secondary text-foreground hover:bg-secondary/90",
				muted:
					"bg-secondary text-muted-foreground hover:bg-secondary/90",
				outline:
					"border border-border bg-transparent text-muted-foreground hover:bg-secondary/30",
			},
		},
		defaultVariants: {
			tone: "primary",
		},
	},
);
