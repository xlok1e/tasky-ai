'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@shared/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@shared/ui/select'
import { Separator } from '@shared/ui/separator'
import { PageLoader } from '@shared/ui/page-loader'
import { useListsStore } from '@modules/lists/store/lists.store'
import { fetchTasks as apiFetchTasks } from '../api/tasks.api'
import { useTaskModal } from '../store/task-modal.store'
import { useTasksStore } from '../store/tasks.store'
import type { Task, TaskListProps } from '../types/task.types'
import { mapTaskResponseToTask } from '../utils/tasks.utils'
import { TaskListSection } from './TaskListSection'

const TASKS_PAGE_SIZE = 20

type SortDirection = 'asc' | 'desc'

const DATE_SORT_OPTIONS: Array<{ value: SortDirection; label: string }> = [
	{ value: 'asc', label: 'По дате' },
	{ value: 'desc', label: 'Сначала поздние' },
]

const PRIORITY_SORT_OPTIONS: Array<{ value: SortDirection; label: string }> = [
	{ value: 'desc', label: 'По приоритету' },
	{ value: 'asc', label: 'Сначала низкий' },
]

interface LoadTasksOptions {
	offset: number
	limit: number
	append: boolean
	showLoader: boolean
}

function isSortDirection(value: string): value is SortDirection {
	return value === 'asc' || value === 'desc'
}

export function TaskList({
	listId,
	tasks: tasksProp,
	isLoading: isLoadingProp,
	error: errorProp,
}: TaskListProps = {}) {
	const [dateOrder, setDateOrder] = useState<SortDirection>('asc')
	const [priorityOrder, setPriorityOrder] = useState<SortDirection>('desc')
	const [fetchedTasks, setFetchedTasks] = useState<Task[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasMore, setHasMore] = useState(true)
	const requestIdRef = useRef(0)

	const dataVersion = useTasksStore(state => state.dataVersion)
	const openNew = useTaskModal(state => state.openNew)
	const listName = useListsStore(state =>
		listId === undefined
			? 'Входящие'
			: (state.lists.find(list => list.id === listId)?.name ?? 'Список'),
	)

	const shouldUseExternalData =
		tasksProp !== undefined ||
		isLoadingProp !== undefined ||
		errorProp !== undefined
	const queryParams = useMemo(
		() => ({
			listId,
			inboxOnly: listId === undefined,
			dateOrder,
			priorityOrder,
		}),
		[listId, dateOrder, priorityOrder],
	)

	const loadTasks = useCallback(
		async ({ offset, limit, append, showLoader }: LoadTasksOptions) => {
			const requestId = ++requestIdRef.current

			if (showLoader) {
				setIsLoading(true)
			} else if (append) {
				setIsLoadingMore(true)
			}

			try {
				const response = await apiFetchTasks({
					listId: queryParams.listId,
					inboxOnly: queryParams.inboxOnly,
					dateOrder: queryParams.dateOrder,
					priorityOrder: queryParams.priorityOrder,
					offset,
					limit,
				})

				if (requestId !== requestIdRef.current) {
					return
				}

				const mappedTasks = response.map(mapTaskResponseToTask)
				setFetchedTasks(currentTasks =>
					append ? [...currentTasks, ...mappedTasks] : mappedTasks,
				)
				setHasMore(response.length >= limit)
				setError(null)
			} catch {
				if (requestId !== requestIdRef.current) {
					return
				}

				setError('Не удалось загрузить задачи')
				if (!append) {
					setFetchedTasks([])
				}
			} finally {
				if (requestId === requestIdRef.current) {
					setIsLoading(false)
					setIsLoadingMore(false)
				}
			}
		},
		[queryParams],
	)

	useEffect(() => {
		if (shouldUseExternalData) {
			return
		}

		void loadTasks({
			offset: 0,
			limit: TASKS_PAGE_SIZE,
			append: false,
			showLoader: true,
		})
	}, [loadTasks, shouldUseExternalData])

	useEffect(() => {
		if (shouldUseExternalData || dataVersion === 0) {
			return
		}

		void loadTasks({
			offset: 0,
			limit: Math.max(fetchedTasks.length, TASKS_PAGE_SIZE),
			append: false,
			showLoader: false,
		})
	}, [dataVersion, fetchedTasks.length, loadTasks, shouldUseExternalData])

	const handleFetchMoreTasks = async () => {
		if (
			shouldUseExternalData ||
			hasMore === false ||
			isLoading ||
			isLoadingMore
		) {
			return
		}

		await loadTasks({
			offset: fetchedTasks.length,
			limit: TASKS_PAGE_SIZE,
			append: true,
			showLoader: false,
		})
	}

	const resolvedTasks = tasksProp ?? fetchedTasks
	const resolvedIsLoading = isLoadingProp ?? isLoading
	const resolvedError = errorProp ?? error
	const shouldShowLoadMore = shouldUseExternalData ? false : hasMore

	const pendingTasks = resolvedTasks.filter(task => !task.isCompleted)
	const completedTasks = resolvedTasks.filter(task => task.isCompleted)

	if (resolvedIsLoading) {
		return <PageLoader />
	}

	if (resolvedError) {
		return (
			<p className='py-8 text-center text-sm text-destructive'>
				{resolvedError}
			</p>
		)
	}

	return (
		<div className='flex w-full flex-col gap-[45px]'>
			<div className='flex w-full items-end justify-between gap-6'>
				<div className='flex flex-col gap-[22px]'>
					<h1 className='text-[22px] leading-6 font-bold text-foreground'>
						{listName}
					</h1>
					<Button
						type='button'
						variant='outline'
						size='default'
						onClick={() => openNew({ listId: listId ?? null })}
						className='h-auto w-fit rounded-[6px] border-border bg-secondary px-4 py-2 text-[18px] leading-6 font-normal text-foreground shadow-none hover:bg-secondary/90'
					>
						Добавить задачу
					</Button>
				</div>

				<div className='flex items-center gap-2'>
					<Select
						value={dateOrder}
						onValueChange={value => {
							if (isSortDirection(value)) {
								setDateOrder(value)
							}
						}}
					>
						<SelectTrigger className='h-auto w-[204px] rounded-[6px] border-border bg-card px-3 py-2 text-[14px] leading-6 text-foreground shadow-none'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className='border border-border bg-background'>
							{DATE_SORT_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={priorityOrder}
						onValueChange={value => {
							if (isSortDirection(value)) {
								setPriorityOrder(value)
							}
						}}
					>
						<SelectTrigger className='h-auto w-[204px] rounded-[6px] border-border bg-card px-3 py-2 text-[14px] leading-6 text-foreground shadow-none'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className='border border-border bg-background'>
							{PRIORITY_SORT_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className='flex w-full flex-col gap-6'>
				<TaskListSection title='Не выполнено' tasks={pendingTasks} />
				<Separator className='bg-border' />
				<TaskListSection title='Выполнено' tasks={completedTasks} />
			</div>

			{shouldShowLoadMore && (
				<Button
					variant='outline'
					className='w-fit mx-auto'
					onClick={handleFetchMoreTasks}
					disabled={resolvedIsLoading || isLoadingMore}
				>
					{isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
				</Button>
			)}
		</div>
	)
}
