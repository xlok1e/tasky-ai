'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SIDEBAR_ITEMS } from '@shared/config/sidebar.config'
import { SidebarItem } from './SidebarItem'
import { SidebarListItem } from './SidebarListItem'
import { useListsStore } from '@modules/lists/store/lists.store'
import { useGoogleStore } from '@/domains/google/store/google.store'
import {
	CirclePlus,
	LayoutList,
	PanelLeftClose,
	PanelLeftOpen,
	RefreshCcw,
	Send,
	Settings,
} from 'lucide-react'
import { Button } from '@shared/ui/button'
import { cn } from '@shared/lib/utils'
import { useListsModal } from '@modules/lists/store/lists-modal.store'

const EXPANDED_WIDTH = 280
const COLLAPSED_WIDTH = 68

export function Sidebar() {
	const pathname = usePathname()
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [isListsAtBottom, setIsListsAtBottom] = useState(false)

	function handleListsScroll(e: React.UIEvent<HTMLDivElement>) {
		const el = e.currentTarget
		setIsListsAtBottom(el.scrollHeight - el.scrollTop <= el.clientHeight + 1)
	}
	const lists = useListsStore(s => s.lists)
	const { onOpen: openListsModal } = useListsModal()
	const { isConnected, isSyncing, sync } = useGoogleStore()

	return (
		<aside
			style={{
				width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
				padding: isCollapsed ? '24px 8px' : ' 24px 16px',
			}}
			className='flex flex-col justify-between h-screen border-r bg-background shrink-0 transition-[width] duration-150 ease-in-out'
		>
			<div className='flex flex-col flex-1 min-h-0 overflow-hidden'>
				<div
					className={cn(
						'flex mb-9 items-center',
						isCollapsed ? 'justify-center' : 'justify-between',
					)}
				>
					<div
						className={cn(
							'transition-all duration-0',
							isCollapsed
								? 'max-w-0 opacity-0 pointer-events-none'
								: 'max-w-xs opacity-100',
						)}
					>
						<Link href='/calendar' className='flex items-center gap-[6px]'>
							<img
								src='/images/Logo.svg'
								alt='TaskyAI Logo'
								className='mb-[5px]'
							/>
							<img src='/images/LogoText.svg' alt='TaskyAI Logo' />
						</Link>
					</div>

					{isCollapsed ? (
						<button
							className='w-[35px] h-[35px] rounded-[6px] flex items-center justify-center hover:bg-accent/50 transition-colors shrink-0 group'
							onClick={() => setIsCollapsed(false)}
						>
							<span className='relative flex items-center justify-center'>
								<img
									src='/images/Logo.svg'
									alt='TaskyAI Logo'
									className='mb-[5px] transition-opacity duration-150 group-hover:opacity-0'
								/>
								<PanelLeftOpen className='size-[18px] absolute transition-opacity duration-150 opacity-0 group-hover:opacity-100' />
							</span>
						</button>
					) : (
						<Button
							className='w-[35px] h-[35px] rounded-[6px] shrink-0'
							variant='ghost'
							onClick={() => setIsCollapsed(v => !v)}
						>
							<PanelLeftClose className='size-[18px]' />
						</Button>
					)}
				</div>

				<nav
					className={cn('flex flex-col gap-1.5', isCollapsed && 'items-center')}
				>
					{SIDEBAR_ITEMS.filter(
						item => !(isConnected && item.id === 'inbox'),
					).map(item => (
						<SidebarItem
							key={item.id}
							item={item}
							isActive={pathname.startsWith(item.href)}
							isCollapsed={isCollapsed}
						/>
					))}
				</nav>
				{!isConnected && (
					<>
						<div
							className={cn(
								'transition-all duration-0',
								isCollapsed
									? 'max-h-0 opacity-0 overflow-hidden'
									: 'flex-1 min-h-0 flex flex-col opacity-100',
							)}
						>
							<div className='h-px bg-border my-4 -mx-[18px] ml-[1px]' />

							<div className='flex items-center w-full justify-between px-2.5 pr-0 mb-[8px]'>
								<div className='flex items-center gap-2'>
									<LayoutList className='size-[18px]' strokeWidth={1.5} />
									<label className='text-[18px] cursor-pointer whitespace-nowrap'>
										Списки
									</label>
								</div>
								<Button
									className='w-[32px] h-[32px] rounded-[6px] hover:bg-secondary/40'
									variant='ghost'
									onClick={openListsModal}
								>
									<CirclePlus className='size-[18px]' strokeWidth={1.5} />
								</Button>
							</div>

							<div className='relative flex-1 min-h-0'>
								<div
									className='flex flex-col gap-1.5 h-full overflow-y-auto no-scrollbar'
									onScroll={handleListsScroll}
								>
									{lists.map(list => (
										<SidebarListItem
											key={list.id}
											list={list}
											isActive={pathname === `/lists/${list.id}`}
											isCollapsed={isCollapsed}
										/>
									))}
								</div>
								<div
									className={cn(
										'pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent transition-opacity duration-200 ',
										isListsAtBottom ? 'opacity-0' : 'opacity-100',
									)}
								/>
							</div>
						</div>

						{isCollapsed && (
							<>
								<div className='h-px bg-border my-4 -mx-[18px]' />
								<Button
									className='w-[32px] h-[32px] rounded-[6px] mx-auto'
									variant='ghost'
									onClick={openListsModal}
								>
									<CirclePlus className='size-[18px]' strokeWidth={1.5} />
								</Button>
							</>
						)}
					</>
				)}
			</div>

			<div className={cn('flex flex-col gap-2', isCollapsed && 'items-center')}>
				{isConnected && (
					<button
						onClick={() => sync()}
						disabled={isSyncing}
						className={cn(
							'flex items-center rounded-[6px] transition-colors overflow-hidden hover:bg-accent/50 disabled:opacity-50',
							isCollapsed
								? 'w-[35px]! h-[35px]! justify-center'
								: 'gap-2 w-full px-2.5 py-1 text-[18px]',
						)}
					>
						<RefreshCcw
							className={cn(
								'size-[18px] shrink-0',
								isSyncing && 'animate-spin',
							)}
							strokeWidth={1.5}
						/>
						<span
							className={cn(
								'overflow-hidden whitespace-nowrap transition-all duration-0',
								isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100',
							)}
						>
							Синхронизовать
						</span>
					</button>
				)}
				<Link
					href='https://t.me/aitaskybot'
					target='_blank'
					rel='noopener noreferrer'
					className={cn(
						'flex items-center rounded-[6px] transition-colors overflow-hidden hover:bg-accent/50',
						isCollapsed
							? 'w-[35px] h-[35px] justify-center'
							: 'gap-2 w-full px-2.5 py-1 text-[18px]',
					)}
				>
					<Send className='size-[18px] shrink-0' strokeWidth={1.5} />
					<span
						className={cn(
							'overflow-hidden whitespace-nowrap transition-all duration-0',
							isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100',
						)}
					>
						Перейти в Telegram
					</span>
				</Link>
				<Link
					href='/settings'
					className={cn(
						'flex items-center rounded-[6px] transition-colors overflow-hidden',
						pathname === '/settings'
							? 'bg-accent text-accent-foreground'
							: 'hover:bg-accent/50',
						isCollapsed
							? 'w-[40px] h-[40px] justify-center'
							: 'gap-2 w-full px-2.5 py-1 text-[18px]',
					)}
				>
					<Settings className='size-[18px] shrink-0' strokeWidth={1.5} />
					<span
						className={cn(
							'overflow-hidden whitespace-nowrap transition-all duration-0',
							isCollapsed ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100',
						)}
					>
						Настройки
					</span>
				</Link>
			</div>
		</aside>
	)
}
