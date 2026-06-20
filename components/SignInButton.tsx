"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("github")}
      className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors cursor-pointer"
    >
      Sign in with GitHub
    </button>
  );
}