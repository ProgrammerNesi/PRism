"use client";

import { signIn } from "next-auth/react";
import { GitMerge } from "lucide-react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("github")}
      className="btn-primary group inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-medium text-white cursor-pointer"
    >
      <GitMerge size={17} strokeWidth={2} />
      Continue with Github
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </button>
  );
}