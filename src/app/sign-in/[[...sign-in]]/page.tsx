import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] flex flex-col items-center">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-[32px] font-bold text-white tracking-tight">
            Welcome to FlowVault
          </h1>
          <p className="text-[#a1a1aa] text-[15px] font-normal">
            Advanced workflow lifecycle management for n8n
          </p>
        </div>
        <SignIn 
            appearance={{
                elements: {
                    headerTitle: "cl-headerTitle",
                    headerSubtitle: "cl-headerSubtitle",
                    socialButtonsBlockButton: "cl-socialButtonsBlockButton",
                    formFieldInput: "cl-formFieldInput",
                    formButtonPrimary: "cl-formButtonPrimary",
                    footerActionText: "cl-footerActionText",
                    footerActionLink: "cl-footerActionLink",
                    card: "cl-signIn"
                }
            }}
        />
      </div>
    </div>
  );
}