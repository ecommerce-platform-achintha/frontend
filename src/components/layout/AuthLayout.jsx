import { Outlet } from 'react-router-dom'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'

// Centered card layout for sign in, registration and change password.
export default function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-50/60 to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-4 pb-12 sm:pt-10">
        <Outlet />
      </main>
    </div>
  )
}
