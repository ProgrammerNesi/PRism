"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
      className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
    >
      <LogOut size={16} strokeWidth={2} />
    </button>
  );
}