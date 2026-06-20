import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">ReviewBot</h1>
      <p className="text-gray-500 text-center max-w-md">
        Automated AI code reviews for your GitHub pull requests. Connect a repo
        and every PR gets reviewed automatically.
      </p>
      <SignInButton />
    </main>
  );
}