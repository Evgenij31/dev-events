## Problem

After submitting credentials on `/auth`, the app navigates to `/favorites`, briefly renders the favorited events, then "logs out" and redirects back to `/auth`.

## Root cause

`src/hooks/useAuth.tsx` has a race between two async paths that both write to the same `user`/`session` state:

1. `supabase.auth.onAuthStateChange(...)` — fires `SIGNED_IN` immediately when the user signs in and sets `user` to the new user.
2. `supabase.auth.getSession().then(...)` — kicked off once at mount. If it resolves *after* the `SIGNED_IN` callback (common when sign-in happens before the initial `getSession` promise settles), its callback runs with whatever it captured and overwrites `user`/`session`. In the brief window where the new session hasn't been persisted yet, this can clobber the just-signed-in user back to `null`.

That null `user` then trips `Favorites`'s guard (`if (!user) return <Navigate to="/auth" replace />`), which is what the user sees as "logged out" after the events flash.

## Fix

Refactor `src/hooks/useAuth.tsx` to follow the documented Supabase pattern:

- Subscribe to `onAuthStateChange` first, and treat it as the single source of truth for `session`/`user`/`username`. Supabase v2 fires `INITIAL_SESSION` on subscribe, so this alone covers the bootstrap case.
- Still call `getSession()` once, but only use it to flip `loading` to `false` after the initial restore — do NOT call `setUser`/`setSession` from its callback.
- Keep the `setTimeout(() => fetch profile, 0)` pattern inside the auth listener (avoids deadlocks per Supabase guidance).
- Clear `username` whenever the listener delivers a falsy session, so we don't show stale data.

No other files need to change. `Favorites`, `EditProfile`, and `Auth` already gate on `loading`/`user` correctly once the underlying state is consistent.

## Technical details

`src/hooks/useAuth.tsx` becomes roughly:

```text
useEffect:
  subscription = onAuthStateChange((_event, sess) => {
    setSession(sess)
    setUser(sess?.user ?? null)
    if (sess?.user) {
      setTimeout(() => fetch profile.username, 0)
    } else {
      setUsername(null)
    }
  })
  getSession().then(() => setLoading(false))   // no setUser/setSession here
  return () => subscription.unsubscribe()
```

## Verification

1. Sign in with email/password from `/auth` → should land on `/favorites` and stay signed in (no flash, no redirect back).
2. Refresh `/favorites` while signed in → still signed in, favorites load once.
3. Sign out from the navbar dropdown → redirected away from protected pages as before.
4. Google OAuth round-trip still works (it uses `supabase.auth.setSession`, which the listener will pick up).
