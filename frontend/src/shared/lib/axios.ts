import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getCookie, deleteCookie } from 'cookies-next'
import { toast } from 'sonner'

const TOKEN_COOKIE = 'access_token'
const DEFAULT_LOCAL_API_URL = 'http://localhost:5050'
const ERROR_TOAST_COOLDOWN_MS = 4000

const lastErrorToastAtByMessage = new Map<string, number>()

type ApiErrorPayload = {
	message?: unknown
	error?: unknown
	title?: unknown
}

function hasStringValue(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
	return typeof value === 'object' && value !== null
}

function isLikelyHtmlResponse(value: string): boolean {
	const normalizedValue = value.toLowerCase()
	return (
		normalizedValue.includes('<!doctype html') ||
		normalizedValue.includes('<html')
	)
}

function shouldShowErrorToast(message: string): boolean {
	const currentTimestamp = Date.now()
	const lastShownTimestamp = lastErrorToastAtByMessage.get(message) ?? 0

	lastErrorToastAtByMessage.forEach((timestamp, key) => {
		if (currentTimestamp - timestamp > ERROR_TOAST_COOLDOWN_MS) {
			lastErrorToastAtByMessage.delete(key)
		}
	})

	if (currentTimestamp - lastShownTimestamp < ERROR_TOAST_COOLDOWN_MS) {
		return false
	}

	lastErrorToastAtByMessage.set(message, currentTimestamp)
	return true
}

function getEnvironmentApiUrl(): string {
	const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL
	if (process.env.NODE_ENV === 'development') {
		if (hasStringValue(configuredApiUrl)) {
			return configuredApiUrl.trim()
		}

		return DEFAULT_LOCAL_API_URL
	}

	// In production we proxy API through the same host, so relative URLs avoid /api/api duplication.
	return ''
}

function getFriendlyErrorMessage(error: AxiosError<unknown>): string {
	const status = error.response?.status
	const requestUrl = error.config?.url ?? ''
	const responseData = error.response?.data

	if (status === 401) {
		return 'Сессия истекла. Войдите снова.'
	}

	if (status === 403) {
		return 'Недостаточно прав для выполнения действия.'
	}

	if (status === 404) {
		if (requestUrl.startsWith('/api/')) {
			return 'Сервис временно недоступен. Попробуйте обновить страницу.'
		}

		return 'Страница не найдена.'
	}

	if (status === 502 || status === 503 || status === 504) {
		return 'Сервер временно недоступен. Попробуйте чуть позже.'
	}

	if (status !== undefined && status >= 500) {
		return 'Произошла ошибка на сервере. Попробуйте позже.'
	}

	if (
		hasStringValue(error.message) &&
		error.message.toLowerCase().includes('network')
	) {
		return 'Не удалось подключиться к серверу. Проверьте соединение.'
	}

	if (
		hasStringValue(error.message) &&
		error.message.toLowerCase().includes('timeout')
	) {
		return 'Сервер отвечает слишком долго. Повторите попытку.'
	}

	if (hasStringValue(error.message) && error.message === 'canceled') {
		return ''
	}

	if (hasStringValue(responseData)) {
		const message = responseData.trim()
		if (!isLikelyHtmlResponse(message)) {
			return message
		}
	}

	if (isApiErrorPayload(responseData)) {
		if (hasStringValue(responseData.message)) {
			return responseData.message
		}

		if (hasStringValue(responseData.error)) {
			return responseData.error
		}

		if (hasStringValue(responseData.title)) {
			return responseData.title
		}
	}

	return 'Что-то пошло не так. Попробуйте ещё раз.'
}

export const API_URL = getEnvironmentApiUrl()

const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
})

apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getCookie(TOKEN_COOKIE)
		config.headers['ngrok-skip-browser-warning'] = 'true'
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	error => Promise.reject(error),
)

apiClient.interceptors.response.use(
	response => response,
	(error: AxiosError<unknown>) => {
		if (error.response?.status === 401) {
			deleteCookie(TOKEN_COOKIE, { path: '/' })
			if (typeof window !== 'undefined') {
				window.location.href = '/login'
			}
			return Promise.reject(error)
		}

		const message = getFriendlyErrorMessage(error)
		if (hasStringValue(message) && shouldShowErrorToast(message)) {
			toast.error(message)
		}

		return Promise.reject(error)
	},
)

export default apiClient
