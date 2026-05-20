import { useEffect } from "react"
import {
    initializeBetterAuth
} from "@/features/auth/lib/initialize-better-auth"

export function useBetterAuth() {
  useEffect(() => {
    return initializeBetterAuth()
  }, [])
}
