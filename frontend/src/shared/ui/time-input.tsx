import * as React from 'react'
import { cn } from '@/shared/lib/utils'

interface TimeInputProps {
	id?: string
	value: string // "HH:MM"
	onChange: (value: string) => void
	onBlur?: () => void
	className?: string
	disabled?: boolean
}

function TimeInput({
	id,
	value,
	onChange,
	onBlur,
	className,
	disabled,
}: TimeInputProps) {
	const [hours, minutes] = (value || '00:00').split(':').map(Number)

	function handleHours(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value.replace(/\D/g, '')
		const h = Math.min(23, Math.max(0, Number(raw)))
		onChange(
			`${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
		)
	}

	function handleMinutes(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value.replace(/\D/g, '')
		const m = Math.min(59, Math.max(0, Number(raw)))
		onChange(`${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
	}

	const inputClass = cn(
		'w-[2.5ch] min-w-0 bg-transparent text-sm text-center outline-none border-none shadow-none p-0 leading-none self-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
		'[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[18px]!',
	)

	return (
		<div
			className={cn(
				'border-secondary flex h-9 items-center rounded-md border bg-transparent px-3 text-sm shadow-xs',
				'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
				className,
			)}
		>
			<input
				id={id}
				type='number'
				min={0}
				max={23}
				disabled={disabled}
				value={String(hours).padStart(2, '0')}
				onChange={handleHours}
				onBlur={onBlur}
				className={inputClass}
				aria-label='часы'
			/>
			<span className='mx-0 select-none text-foreground self-center leading-none mb-[4px] text-[18px]!'>
				:
			</span>
			<input
				type='number'
				min={0}
				max={59}
				disabled={disabled}
				value={String(minutes).padStart(2, '0')}
				onChange={handleMinutes}
				onBlur={onBlur}
				className={inputClass}
				aria-label='минуты'
			/>
		</div>
	)
}

export { TimeInput }
