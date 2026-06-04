import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { register } from '../lib/server/fns'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register({ data: { name, email, password } })
      await router.invalidate()
      router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            aria-label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            aria-label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            aria-label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
