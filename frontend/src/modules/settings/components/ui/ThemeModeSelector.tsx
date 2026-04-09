'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@shared/lib/utils'
import {
	THEME_MODE_OPTIONS,
	type ThemeMode,
} from '../../constants/settings.constants'

export function ThemeModeSelector() {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const currentTheme: ThemeMode = mounted
		? theme === 'light' || theme === 'dark'
			? theme
			: 'system'
		: 'system'

	return (
		<div className='inline-flex w-fit items-center gap-1 rounded-md bg-background p-1'>
			{THEME_MODE_OPTIONS.map(option => {
				const isActive = mounted && option.value === currentTheme

				return (
					<button
						key={option.value}
						type='button'
						onClick={() => setTheme(option.value)}
						className={cn(
							'rounded-[4px] px-3 py-1.5 text-[18px] leading-5 font-normal transition-colors cursor-pointer',
							isActive
								? 'bg-secondary text-foreground'
								: 'bg-background text-foreground',
						)}
					>
						{option.label}
					</button>
				)
			})}
		</div>
	)
}
