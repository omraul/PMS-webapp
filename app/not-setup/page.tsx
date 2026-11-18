import { SignOutButton } from "@clerk/nextjs";

export default function NotSetup() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <h1 className="text-xl font-semibold">Your account is not yet set up</h1>
        <p className="mt-2 text-sm text-slate-600">We could not find an active employee record for your email. Please contact HR to be added, then sign in again.</p>
        <div className="mt-6"><SignOutButton><button className="btn-ghost">Sign out</button></SignOutButton></div>
      </div>
    </main>
  );
}
