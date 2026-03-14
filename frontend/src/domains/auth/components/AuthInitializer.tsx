"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";

export function AuthInitializer() {
	const initFromCookie = useAuthStore((s) => s.initFromCookie);

	useEffect(() => {
		initFromCookie();
	}, [initFromCookie]);

	return null;
}
