import Link from "next/link";
import { HomeDashboard } from "@/components/HomeDashboard";
import { LaunchMode } from "@/components/LaunchMode";
import { fallbackEvents } from "@/lib/mock-data";

export default function HomePage() {
  const runHome = fallbackEvents.filter((event) => event.slug !== "perth");

  return (
    <div className="space-y-3 sm:space-y-8">
      <LaunchMode />

      <HomeDashboard />

      <section className="card">
        <div className="mb-3 flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
          <div>
            <div className="pill mb-2">New user path</div>
            <h2 className="text-xl font-black sm:text-3xl">Get on the grid in minutes</h2>
            <p className="mt-1 hidden text-track-muted sm:block">Create your garage, save your team, join a league and share your team card.</p>
          </div>
          <Link className="btn btn-primary" href="/get-started">Open quick start</Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/pick-team">
            <div className="text-base font-black sm:text-xl">Pick team</div>
            <p className="mt-1 hidden text-sm text-track-muted sm:block">Choose your six drivers and captaincy.</p>
          </Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/leagues?join=GRID88">
            <div className="text-base font-black sm:text-xl">Join GRID88</div>
            <p className="mt-1 hidden text-sm text-track-muted sm:block">Jump into the community league.</p>
          </Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/share-team">
            <div className="text-base font-black sm:text-xl">Share team</div>
            <p className="mt-1 hidden text-sm text-track-muted sm:block">Download a team card or copy a caption.</p>
          </Link>
          <Link className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 sm:rounded-2xl sm:p-4" href="/story-assets">
            <div className="text-base font-black sm:text-xl">Story assets</div>
            <p className="mt-1 hidden text-sm text-track-muted sm:block">Download Instagram-ready promo cards.</p>
          </Link>
        </div>
      </section>

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
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">Categories</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-4xl">A–F</div><p className="mt-2 hidden text-sm text-track-muted sm:block">A–D have four drivers. E has five and F has six for the 27-car Ipswich grid.</p></div>
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">Captain</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-4xl">2x</div><p className="mt-2 hidden text-sm text-track-muted sm:block">Vice-captain scores 1.5x and must be a different driver.</p></div>
        <div className="card"><div className="text-[10px] font-black text-track-muted sm:text-sm">History</div><div className="mt-1 text-2xl font-black sm:mt-2 sm:text-4xl">Saved</div><p className="mt-2 hidden text-sm text-track-muted sm:block">Every event remembers picks, captaincy and points snapshots.</p></div>
      </div>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="pill mb-2">The run home</div>
            <h2 className="text-xl font-black sm:text-3xl">V8 Race Fantasy run home</h2>
            <p className="mt-1 hidden text-track-muted sm:block">Perth is done. The chase now runs through Ipswich, The Bend, Bathurst, Gold Coast, Sandown and Adelaide.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link className="btn px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/round-preview">Preview</Link>
            <Link className="btn btn-primary px-2 py-2 text-xs sm:px-4 sm:text-sm" href="/pick-team">Pick Ipswich</Link>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-6">
          {runHome.map((event, index) => (
            <div key={event.id} className={`min-w-[128px] rounded-xl border p-3 sm:min-w-0 sm:rounded-2xl sm:p-4 ${event.is_open_event ? "border-track-orange/40 bg-track-orange/15 shadow-glow" : "border-white/10 bg-white/5"}`}>
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
