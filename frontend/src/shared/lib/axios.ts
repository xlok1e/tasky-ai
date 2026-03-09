import axios, { InternalAxiosRequestConfig } from "axios";
import { getCookie } from "cookies-next";
import { toast } from "sonner";

export const serverLink = "http://77.239.97.156:5350";

const axiosInstance = axios.create({
	baseURL: `${serverLink}`,
	headers: {
		"Content-Type": "application/json",
	},
});

axiosInstance.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getCookie("token");
		if (token) config.headers.Authorization = `Bearer ${token}` as string;
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		toast.error("Что-то пошло не так");
		return Promise.reject(error);
	},
);

export default axiosInstance;
