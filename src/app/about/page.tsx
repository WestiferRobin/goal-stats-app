
export default function AboutPage() {
    return (
      <main className="min-h-screen bg-zinc-950 px-8 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 font-bold uppercase tracking-widest text-pink-500">
            About Us
          </p>
  
          <h1 className="mb-6 text-5xl font-bold">
            About Goal Stats
          </h1>
  
          <p className="mb-10 text-lg text-gray-300">
            Team Squared is a hypothetical sports technology company
            developing Goal Stats, a women's football analytics and
            prediction application focused on the 2027 FIFA Women's
            World Cup. Our goal is to combine football statistics,
            database technology, and predictive analytics into an
            accessible platform that helps fans explore team
            performances, compare matches, and better understand
            women's football.
          </p>
  
          
            {/* About Information Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Our Mission */}
            <section className="rounded-2xl bg-zinc-900 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">Our Mission</h2>
            <p className="leading-relaxed text-gray-300">
                Our mission is to combine sports, technology, and data
                analytics to make women's football statistics more
                accessible while bringing greater recognition to women
                athletes, their teams, and their achievements.
            </p>
            </section>

            {/* The Problem We're Solving */}
            <section className="rounded-2xl bg-zinc-900 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                The Problem We're Solving
            </h2>
            <p className="leading-relaxed text-gray-300">
                Women's football continues to grow worldwide, yet
                women athletes often receive less media coverage and
                recognition compared to men's football. Through Goal
                Stats, Team Squared hopes to highlight women's football
                and make statistics more accessible to fans.
            </p>
            </section>

            {/* Our Solution & User Value */}
            <section className="rounded-2xl bg-zinc-900 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Our Solution & User Value
            </h2>
            <p className="leading-relaxed text-gray-300">
                Goal Stats brings together football statistics, team
                information, match analysis, and predictive analytics
                into one platform. By making this information easier
                to access, our application helps fans compare team
                performances, understand match trends, and explore
                data-driven predictions. Goal Stats also supports
                greater recognition of women's football by making
                team statistics and achievements more visible.
            </p>
            </section>

            {/* Technology & Approach */}
            <section className="rounded-2xl bg-zinc-900 p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Technology & Approach
            </h2>
            <p className="leading-relaxed text-gray-300">
                Our project combines database design, web development,
                and statistical analysis to create an accessible
                football analytics application. We use database
                technology to organize information and support
                data-driven match predictions.
            </p>
            </section>

            {/* Future Goals & Vision */}
            <section className="rounded-2xl bg-zinc-900 p-8 md:col-span-2">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="mb-4 text-2xl font-bold">
                Future Goals & Vision
            </h2>
            <p className="leading-relaxed text-gray-300">
                As we prepare for the 2027 FIFA Women's World Cup,
                our goal is to expand Goal Stats with additional team
                statistics, predictive features, and interactive
                analytics. We hope to create a platform that celebrates
                women's football while encouraging fans to explore
                the sport through statistics and technology.
            </p>
            </section>

            </div>

        </div>

        {/* Meet Our Team */}
        <section className="mx-auto mt-12 max-w-8xl rounded-2xl bg-zinc-900 p-6">
        <h2 className="mb-6 text-4xl font-bold text-white">
            Meet Our Team
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
            {
                name: "Esteban Naranjo",
                role: "Web Designer & Application Developer",
                image: "/team/Esteban.png",
            },
            {
                name: "Nikita Bordbar",
                role: "Web/Backend Designer & Database Integration",
                image: "/team/Nikita.png",
            },
            {
                name: "Wesley Webb",
                role: "Architecture & Datbase Integration",
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
  