import CreateBandForm from "@/components/CreateBandForm";
import TopNav from "@/components/TopNav";
import { Music4, Users, ThumbsUp, Search, Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <>
      <TopNav />
      <main className="min-h-screen flex flex-col">

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-4 pt-24 pb-20">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-500 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full border border-violet-500/20 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Free &amp; no account required
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-5 leading-tight max-w-2xl">
            Vote on your band&apos;s
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-pink-500">
              next covers
            </span>
          </h1>
          <p className="text-muted text-lg max-w-lg mx-auto mb-10">
            Create a shared pool of songs, invite your bandmates via a link,
            and let everyone vote on what makes the setlist — no login needed.
          </p>

          {/* CTA form */}
          <div className="w-full max-w-sm rounded-2xl border border-border-base bg-surface p-8 shadow-xl">
            <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
              <Music4 className="h-4 w-4 text-violet-500" />
              Start a new band
            </h2>
            <CreateBandForm />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border-base bg-surface-2 px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-2xl font-black text-foreground mb-12">
              How it works
            </h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {([
                {
                  step: "1",
                  icon: Music4,
                  color: "text-violet-500",
                  bg: "bg-violet-500/10",
                  title: "Create your band",
                  desc: "Give your band a name. You get a unique link to share with your bandmates.",
                },
                {
                  step: "2",
                  icon: Search,
                  color: "text-pink-500",
                  bg: "bg-pink-500/10",
                  title: "Build the song pool",
                  desc: "Search Last.fm or paste a whole list at once. Songs get tagged and color-coded by genre automatically.",
                },
                {
                  step: "3",
                  icon: ThumbsUp,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                  title: "Vote &amp; rank",
                  desc: "Everyone votes on their favorites. The list stays live-ranked so you always know what the band wants to play.",
                },
              ] as const).map(({ step, icon: Icon, color, bg, title, desc }) => (
                <div key={step} className="flex flex-col items-center text-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center`}>
                    <Icon className={`h-7 w-7 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-2 uppercase tracking-widest mb-1">Step {step}</p>
                    <h3 className="text-base font-bold text-foreground mb-2" dangerouslySetInnerHTML={{ __html: title }} />
                    <p className="text-sm text-muted" dangerouslySetInnerHTML={{ __html: desc }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border-base px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-2xl font-black text-foreground mb-12">
              Everything your band needs
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {([
                { icon: Users, color: "text-violet-500", title: "Invite via link", desc: "No accounts, no app installs. Share a URL and your bandmates are in." },
                { icon: Search, color: "text-pink-500", title: "Last.fm powered search", desc: "Thousands of tracks with album art, duration, and genre tags pulled in automatically." },
                { icon: Music4, color: "text-amber-500", title: "Bulk paste from a spreadsheet", desc: "Got an existing setlist in Google Sheets? Copy the columns and paste them in one go." },
                { icon: ThumbsUp, color: "text-emerald-500", title: "Live ranked voting", desc: "The list re-orders in real time as votes come in. Hit Refresh to sync." },
              ] as const).map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="rounded-xl border border-border-base bg-surface p-5 flex gap-4">
                  <div className="shrink-0 mt-0.5">
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                    <p className="text-sm text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-border-base bg-gradient-to-br from-violet-500/10 to-pink-500/10 px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-black text-foreground mb-3">Ready to start voting?</h2>
            <p className="text-muted mb-8">It takes 30 seconds to set up your band.</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Create your band
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <footer className="border-t border-border-base px-4 py-6 text-center text-xs text-muted-2">
          Cover Lover — built for bands, not boardrooms.
        </footer>
      </main>
    </>
  );
}

