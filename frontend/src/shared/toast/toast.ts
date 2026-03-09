import {toast} from "sonner";

export const toastMessage = {
  showSuccess: (message: string) => toast.success(message),
  showError: (message: string) => toast.error(message)
}

