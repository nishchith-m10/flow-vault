import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back to FlowVault
          </h1>
          <p className="text-muted-foreground">
            Sign in to manage your n8n workflows
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}