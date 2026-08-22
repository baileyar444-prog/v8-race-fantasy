import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";
import { NavLinks } from "./NavLinks";
import { ActivityHeartbeat } from "./ActivityHeartbeat";
import { RoundStatusBanner } from "./RoundStatusBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ActivityHeartbeat />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-4">
          <Link href="/" className="min-w-0 flex items-center gap-2 font-black sm:gap-3">
            <img
              src="/v8-race-fantasy-logo.png"
              alt="V8 Race Fantasy"
              className="h-9 w-9 shrink-0 rounded-xl border border-white/10 object-cover shadow-glow sm:h-12 sm:w-12 sm:rounded-2xl"
            />
            <div>
              <div className="truncate text-sm sm:text-base">V8 Race Fantasy</div>
              <div className="hidden text-xs text-track-muted sm:block">Free-to-play fantasy racing</div>
            </div>
          </Link>

          <NavLinks />

          <ProfileMenu />
        </div>
      </header>

      <RoundStatusBanner />

      <main className="mx-auto max-w-7xl px-3 py-4 pb-32 sm:px-5 sm:py-8 lg:pb-8">{children}</main>


      <footer className="mx-auto max-w-7xl px-3 pb-32 sm:px-5 lg:pb-8">
        <div className="rounded-2xl border border-track-orange/25 bg-track-orange/10 p-3 text-center shadow-glow sm:rounded-3xl sm:p-4">
          <div className="text-xs font-black uppercase tracking-[.22em] text-orange-100">Contact V8 Race Fantasy</div>
          <a className="mt-1 block break-all text-sm font-black text-white underline decoration-track-orange underline-offset-4 sm:text-lg" href="mailto:makesupercarsv8again@gmail.com">
            makesupercarsv8again@gmail.com
          </a>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0b1220]/95 px-2 pb-[calc(.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 text-center text-[10px] font-black sm:gap-2 sm:text-[11px]">
          <Link className="rounded-xl bg-white/5 px-1 py-2 hover:bg-white/10 sm:rounded-2xl sm:px-2 sm:py-3" href="/">Home</Link>
          <Link className="rounded-xl bg-track-orange/20 px-1 py-2 text-orange-100 hover:bg-track-orange/30 sm:rounded-2xl sm:px-2 sm:py-3" href="/pick-team">Pick</Link>
          <Link className="rounded-xl bg-white/5 px-1 py-2 hover:bg-white/10 sm:rounded-2xl sm:px-2 sm:py-3" href="/get-started">Start</Link>
          <Link className="rounded-xl bg-white/5 px-1 py-2 hover:bg-white/10 sm:rounded-2xl sm:px-2 sm:py-3" href="/leagues">Leagues</Link>
          <Link className="rounded-xl bg-white/5 px-1 py-2 hover:bg-white/10 sm:rounded-2xl sm:px-2 sm:py-3" href="/leaderboard">Ladder</Link>
        </div>
      </nav>
    </div>
  );
}
