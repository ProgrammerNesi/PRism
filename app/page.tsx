import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";
import SignInButton from "@/components/SignInButton";
import Logo from "@/components/Logo";
import { GitPullRequest, ShieldCheck, Network } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#05070D]" style={{ position: "relative" }}>

      {/* Blobs in a fixed layer — never clipped, never affects layout */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}
      >
        <div style={{
          position: "absolute", width: 640, height: 640,
          top: -220, left: -180, borderRadius: "50%",
          background: "#3D7FFF", filter: "blur(130px)", opacity: 0.18,
        }} />
        <div style={{
          position: "absolute", width: 540, height: 540,
          top: "35%", right: -180, borderRadius: "50%",
          background: "#8B5CF6", filter: "blur(130px)", opacity: 0.18,
          animationDelay: "4s",
        }} />
      </div>

      {/* Header — sits at root level, sticky works correctly here */}
      {/* <header className="glass-nav sticky top-0" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <div
          style={{
            maxWidth: 1152,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Logo />
        </div>
      </header> */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 32,
          zIndex: 20,
        }}
      >
        <Logo size={50} />
      </div>

      {/* Page content */}
      <main style={{ position: "relative", zIndex: 1 }}>
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "112px 24px 80px", textAlign: "center" }}>

          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs mb-8" style={{ color: "var(--text-secondary)" }}>

          </div>

          <h1
            className="animate-fade-up text-gradient"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              marginBottom: 12,
              animationDelay: "0.05s",
            }}
          >
            See the full spectrum
          </h1>
          <h1
            className="animate-fade-up"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: 24,
              animationDelay: "0.07s",
            }}
          >
            of every pull request
          </h1>

          <p
            className="animate-fade-up"
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              maxWidth: 460,
              margin: "0 auto 40px",
              lineHeight: 1.7,
              animationDelay: "0.1s",
            }}
          >
            PRism indexes your codebase, reviews each pull request against existing
            patterns, and scores merge risk — posted directly on GitHub.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: "0.14s" }}>
            <SignInButton />
          </div>
        </section>

        <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 72px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { Icon: GitPullRequest, title: "Context-aware review", body: "Comments grounded in how your codebase already works, not just the diff." },
              { Icon: ShieldCheck, title: "Risk scoring", body: "Every review run is scored 0–100 so you know how much attention it needs." },
              { Icon: Network, title: "Merge impact", body: "See what areas of the codebase a change touches before it ships." },
            ].map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className="animate-fade-up glass-panel rounded-2xl"
                style={{ padding: 20, animationDelay: `${0.18 + i * 0.05}s` }}
              >
                <Icon size={18} style={{ color: "var(--accent-blue)", marginBottom: 12, strokeWidth: 1.75 }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}