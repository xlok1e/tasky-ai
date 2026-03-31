import axios, { InternalAxiosRequestConfig } from 'axios'
import { getCookie, deleteCookie } from 'cookies-next'
import { toast } from 'sonner'

const TOKEN_COOKIE = 'access_token'

export const API_URL =
	process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050'

const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
})

apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getCookie(TOKEN_COOKIE)
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	error => Promise.reject(error),
)

apiClient.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401) {
			deleteCookie(TOKEN_COOKIE, { path: '/' })
			if (typeof window !== 'undefined') {
				window.location.href = '/login'
			}
			return Promise.reject(error)
		}

		const message: string =
			error.response?.data?.message ??
			error.response?.data ??
			'Что-то пошло не так'
		toast.error(typeof message === 'string' ? message : 'Что-то пошло не так')

		return Promise.reject(error)
	},
)

export default apiClient
