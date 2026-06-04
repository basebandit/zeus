import { useEffect } from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { getCartCount, getCurrentUser, logout } from '../lib/server/fns'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Zeus Shop' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    const cartCount = user ? await getCartCount() : 0
    return { user, cartCount }
  },
  shellComponent: RootDocument,
})

function Nav() {
  const { user, cartCount } = Route.useRouteContext()
  const router = useRouter()

  async function onLogout() {
    await logout()
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <Link to="/" className="text-xl font-bold text-indigo-600">
        ⚡ Zeus Shop
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/" className="hover:text-indigo-600">
          Store
        </Link>
        {user ? (
          <>
            <Link
              to="/cart"
              data-testid="nav-cart"
              className="relative inline-flex items-center gap-1 hover:text-indigo-600"
            >
              Cart
              {cartCount > 0 && (
                <span
                  data-testid="cart-count"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white"
                >
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/orders" className="hover:text-indigo-600">
              Orders
            </Link>
            <span className="text-gray-500">{user.name}</span>
            <button
              onClick={onLogout}
              className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-indigo-600">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Hydration sentinel: marks the document interactive once React has mounted on
  // the client, so e2e tests can wait for it before driving the UI.
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])

  return (
    // suppressHydrationWarning: browser extensions (e.g. ColorZilla's
    // `cz-shortcut-listen`) inject attributes onto <html>/<body> before React
    // hydrates; this silences that benign one-level attribute mismatch.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning>
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
