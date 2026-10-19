import ViewNavigation from "@/components/view-navigation";

export default function AboutPage() {
    return (
      <main className="min-h-screen bg-cover bg-center bg-fixed px-8 py-16 text-white"
            style={{
            backgroundImage:
            "linear-gradient(rgba(0, 10, 20, 0.88), rgba(0, 10, 20, 0.92)), url('/images/soccer-field-bg.jpg')",
            }}>
            {/* Navigation Bar */}
            <div className="mx-auto max-w-6xl">
                <ViewNavigation currentPath="/about" />
            </div>
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 font-bold uppercase tracking-widest text-pink-500">
            About Us
          </p>
  
          <h1 className="mb-6 text-5xl font-bold">
            About Team Squared
          </h1>
  
          <p className="mb-10 text-lg text-gray-300">
                Team Squared is developing Goal Stats, a women’s football analytics application focused on historical FIFA Women’s World Cup results, team comparisons, and hypothetical match predictions. It brings football data, database technology, and model-generated estimates into one easy-to-use application. The 2027 FIFA Women’s World Cup informs our future direction.
            </p>
  
          
            {/* About Information Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Our Mission */}
            <section className="rounded-2xl border border-white/10 bg-[#071725]/95 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">Our Mission</h2>
            <p className="leading-relaxed text-gray-300">
                Our mission is to make football data easier to explore and understand by giving users access to team information, match scenarios, predictions, expected goals, momentum, and other analytics in one place.
            </p>
            </section>

            {/* The Problem We're Solving */}
            <section className="rounded-2xl border border-white/10 bg-[#071725]/95 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                The Problem We Are Solving
            </h2>
            <p className="leading-relaxed text-gray-300">
                Football information is often spread across different websites, statistics pages, and data sources. Goal Stats brings important match and team information together and uses that data to generate predictions and analytics that are easier for users to understand.
            </p>
            </section>

            {/* Value to Users */}
            <section className="rounded-2xl border border-white/10 bg-[#071725]/95 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Value to Users
            </h2>
            <p className="leading-relaxed text-gray-300">
                Users can compare available team information and historical Women’s World Cup results, create hypothetical match scenarios, view predicted win/draw/loss probabilities and model-generated expected goals remaining and momentum estimates, and explicitly save predictions with their input snapshots for later review. Historical backtesting and tournament simulation are not available in Phase 1.
            </p>
            </section>

            {/* Phase 1 Workflow */}
            <section className="rounded-2xl border border-white/10 bg-[#071725]/95 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Phase 1 Workflow
            </h2>
            <p className="leading-relaxed text-gray-300">
                Prediction previews are temporary and do not save database records. Users can explicitly save predictions and their input snapshots, then reopen them in Analytics. Phase 1 does not provide live match feeds or player-level features.
            </p>
            </section>

            {/* Future Direction */}
            <section className="rounded-2xl border border-white/10 bg-[#071725]/95 p-8 md:col-span-2">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Future Direction
            </h2>
            <p className="leading-relaxed text-gray-300">
                The 2027 FIFA Women’s World Cup is a future direction for Goal Stats. Phase 1 focuses on historical tournament results and user-defined scenarios. Future development may include additional leagues, tournaments, larger datasets, backtesting, and tournament simulation.
            </p>
            </section>

            </div>

        </div>

        {/* Team Roles */}
        <section className="mx-auto mt-12 max-w-8xl rounded-2xl border border-white/10 bg-[#071725]/95 p-6">
        <h2 className="mb-6 text-4xl font-bold text-white">
            Team Roles
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
            {
                name: "Esteban Naranjo",
                role: "Frontend / Product & Application Integration",
                image: "/team/Esteban.png",
            },
            {
                name: "Nikita Bordbar",
                role: "Frontend / Backend & Database Integration",
                image: "/team/Nikita.png",
            },
            {
                name: "Wesley Webb",
                role: "Backend / Architecture & Database Integration",
                image: "/team/Wesley.png",
            },
            {
                name: "Mehla Abebe",
                role: "Data / Frontend & UI Integration",
                image: "/team/Mehla.png",
            },
            ].map((member) => (
            <div
                key={member.name}
                className="overflow-hidden rounded-2xl bg-zinc-900"
            >
                <img
                src={member.image}
                alt={member.name}
                className="h-[600px] w-full object-cover object-top"
                />

                <div className="p-5">
                <h3 className="text-xl font-bold text-white">
                    {member.name}
                </h3>
                <p className="mt-2 text-lg font-medium text-pink-500">
                    {member.role}
                </p>
                </div>
            </div>
            ))}
        </div>
        </section>
      </main>
    );
  }
  