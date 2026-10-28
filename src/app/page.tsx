import Link from "next/link";
import { HomeDashboard } from "@/components/HomeDashboard";
import { LaunchMode } from "@/components/LaunchMode";
import { HomeQuickStart } from "@/components/HomeQuickStart";
import { fallbackEvents } from "@/lib/mock-data";

export default function HomePage() {
  const runHome = fallbackEvents.filter((event) => !["perth", "ipswich", "the-bend"].includes(event.slug));

  return (
    <div className="space-y-3 sm:space-y-8">
      <LaunchMode />

      <HomeDashboard />

      <HomeQuickStart />

      <section className="card hidden border-track-orange/25 bg-track-orange/10 sm:block">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="pill mb-3">Contact</div>
            <h2 className="text-2xl font-black">Need help or want to partner?</h2>
            <p className="mt-2 text-track-muted">Questions, sponsorship, feedback or support — email the creator team directly.</p>
          </div>
          <a className="btn btn-primary text-center" href="mailto:makesupercarsv8again@gmail.com">makesupercarsv8again@gmail.com</a>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 sm:gap-4 lg:grid-cols-3">
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">Categories</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">A–F</div><p className="mt-2 hidden text-sm text-track-muted sm:block">Sandown has 24 selectable drivers, with four drivers in every category A–F.</p></div>
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">Captain</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">2x</div><p className="mt-2 hidden text-sm text-track-muted sm:block">Vice-captain scores 1.5x and must be a different driver.</p></div>
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">History</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">Saved</div><p className="mt-2 hidden text-sm text-track-muted sm:block">Every event remembers picks, captaincy and points snapshots.</p></div>
      </div>



      <section className="card finals-panel">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="pill finals-pill mb-3">Supercars Finals</div>
            <h2 className="text-2xl font-black sm:text-3xl">The Supercars Finals continue at Sandown.</h2>
            <p className="mt-2 text-sm text-track-muted sm:text-base">The Gold Coast 500 is complete and Sandown is the next Finals showdown. Pick your six drivers from the updated championship categories, choose captain and vice-captain, and follow the live ownership trends.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <Link className="btn btn-primary px-3 py-2 text-sm" href="/pick-team">Pick Sandown</Link>
            <Link className="btn px-3 py-2 text-sm" href="/leagues?join=GRID88">Invite friends</Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="pill finals-pill mb-2">The Finals run home</div>
            <h2 className="text-xl font-black sm:text-2xl">V8 Race Fantasy Finals run</h2>
            <p className="mt-1 hidden text-track-muted sm:block">Gold Coast scores are published and Sandown is now open for fantasy selections. Follow the live picks, captaincy trends and differentials ahead of lockout.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link className="btn px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/round-preview">Preview</Link>
            <Link className="btn btn-primary px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/pick-team">Pick Sandown</Link>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-6">
          {runHome.map((event, index) => (
            <div key={event.id} className={`min-w-[128px] rounded-xl border p-3 sm:min-w-0 sm:rounded-2xl sm:p-4 ${event.is_open_event ? "border-[#f6c453]/40 bg-[#f6c453]/10 shadow-glow" : "border-white/10 bg-white/5"}`}>
              <div className="text-xs font-black uppercase tracking-[.18em] text-track-muted">Stop {index + 1}</div>
              <div className="mt-1 text-base font-black sm:text-xl">{event.name}</div>
              <div className="mt-1 text-xs text-track-muted sm:text-sm">
                {event.is_open_event ? "Open now · " : ""}{event.number_of_races} race{event.number_of_races === 1 ? "" : "s"}{event.event_multiplier === 2 ? " · double points" : ""}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
