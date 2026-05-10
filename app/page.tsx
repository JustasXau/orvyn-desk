'use client'

import { LandingPage } from "@/components/landing-page"

// PRODUCTION: Landing page with auth links
// Users land here, then go to /auth/sign-up or /auth/login
// After login, they're redirected to /dashboard
export default function Page() {
  return <LandingPage />
}
