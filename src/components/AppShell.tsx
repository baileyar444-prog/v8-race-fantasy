import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";
import { NavLinks } from "./NavLinks";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3 font-black">
            <img
              src="/v8-race-fantasy-logo.png"
              alt="V8 Race Fantasy"
              className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-glow"
            />
            <div>
              <div>V8 Race Fantasy</div>
              <div className="text-xs text-track-muted">Free-to-play fantasy racing</div>
            </div>
          </Link>

          <NavLinks />

          <ProfileMenu />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 pb-28 lg:pb-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0b1220]/95 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-2 text-center text-[11px] font-black">
          <Link className="rounded-2xl bg-white/5 px-2 py-3 hover:bg-white/10" href="/">Home</Link>
          <Link className="rounded-2xl bg-track-orange/20 px-2 py-3 text-orange-100 hover:bg-track-orange/30" href="/pick-team">Pick</Link>
          <Link className="rounded-2xl bg-white/5 px-2 py-3 hover:bg-white/10" href="/team-history">My Team</Link>
          <Link className="rounded-2xl bg-white/5 px-2 py-3 hover:bg-white/10" href="/leagues">Leagues</Link>
          <Link className="rounded-2xl bg-white/5 px-2 py-3 hover:bg-white/10" href="/leaderboard">Ladder</Link>
        </div>
      </nav>
    </div>
  );
}
