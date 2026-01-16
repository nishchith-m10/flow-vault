import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Welcome back to FlowVault
          </h1>
          <p className="text-[var(--text-secondary)]">
            Sign in to manage your n8n workflows
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}