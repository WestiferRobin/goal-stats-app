
import ViewNavigation from "@/components/view-navigation";

export default function ProjectPage() {
  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed px-8 py-16 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0, 10, 20, 0.88), rgba(0, 10, 20, 0.94)), url('/images/soccer-field-bg.jpg')",
      }}
    >
      {/* Navigation Bar */}
      <div className="mx-auto max-w-6xl">
            <ViewNavigation currentPath="/about" />
        </div>

      {/* Project Content */}
      <div className="mx-auto max-w-6xl mt-10">

        {/* Page Header */}
        <p className="text-sm font-bold uppercase tracking-widest text-pink-500">
          TEAM SQUARED | CS 514 DATABASE PROJECT
        </p>

        <h1 className="mt-4 text-5xl font-bold">
          Goal Stats Project
        </h1>

        <p className="mt-6 max-w-4xl text-lg leading-relaxed text-gray-300">
          Goal Stats is a database-driven football prediction and analytics
          application focused on the 2027 FIFA Women's World Cup.
          Our project combines historical match data, team statistics,
          and prediction models to help users explore women's football
          through interactive data analysis.
        </p>

        {/* Project Overview */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">

          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />

          <h2 className="mb-4 text-2xl font-bold">
            Project Overview
          </h2>

          <p className="leading-relaxed text-gray-300">
            Developed by Team Squared, Goal Stats aims to make women's
            football statistics and match predictions more accessible.
            The application is designed to allow users to explore
            international teams, compare historical match information,
            create match scenarios, and generate predictions.

            Our project builds a platform that introduces a MySQL relational database
            to store teams, competitions, matches, scenarios, and
            prediction results.
          </p>

        </section>

        {/* How Goal Stats Works */}
        <section className="mt-12">
        <p className="mb-3 font-bold uppercase tracking-widest text-pink-500">
            APPLICATION FEATURES
        </p>

        <h2 className="mb-4 text-3xl font-bold">
            How Goal Stats Works
        </h2>

        <p className="mb-8 max-w-4xl leading-relaxed text-gray-300">
            Goal Stats allows users to select two teams and create
            a match scenario using information such as the current
            score, match minute, possession, and other match statistics.
            The prediction system uses this information to generate
            match probabilities and statistical insights.
        </p>

        <div className="grid gap-6 md:grid-cols-2">

            {/* Match Scenarios */}
            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h3 className="mb-3 text-xl font-bold">
                Match Scenarios
            </h3>
            <p className="leading-relaxed text-gray-300">
                Users can select two teams and enter match details,
                including scores, match time, possession, and
                other available statistics to create custom
                match scenarios.
            </p>
            </div>

            {/* Match Predictions */}
            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h3 className="mb-3 text-xl font-bold">
                Match Predictions
            </h3>
            <p className="leading-relaxed text-gray-300">
                The prediction system provides win, draw, and
                loss probabilities, expected goals, likely
                scorelines, prediction confidence, and
                explanations of prediction results.
            </p>
            </div>

            {/* Team Exploration */}
            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h3 className="mb-3 text-xl font-bold">
                Team Exploration
            </h3>
            <p className="leading-relaxed text-gray-300">
                Users can explore international women's football
                teams, compare team information, and examine
                historical match performances.
            </p>
            </div>

            {/* Analytics */}
            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">
            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h3 className="mb-3 text-xl font-bold">
                Match Analytics
            </h3>
            <p className="leading-relaxed text-gray-300">
                Goal Stats presents match momentum, possession,
                expected goals, and additional statistical
                insights to help users understand team
                performance and match trends.
            </p>
            </div>

        </div>
        </section>

            {/* Database Design */}
            <section className="mt-12">

            <p className="mb-3 font-bold uppercase tracking-widest text-pink-500">
            DATABASE STRUCTURE
            </p>

            <h2 className="mb-4 text-3xl font-bold">
            Database Design
            </h2>

            <p className="mb-8 max-w-4xl leading-relaxed text-gray-300">
            Goal Stats is designed to use a MySQL relational database
            to organize and store football information. The database
            will provide persistent storage for teams, competitions,
            historical matches, user-created scenarios, and prediction
            results. Primary and foreign keys connect related
            information while reducing unnecessary data duplication.
            </p>

            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">

            <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />

            <h3 className="mb-6 text-2xl font-bold">
                Main Database Tables
            </h3>

            <div className="grid gap-4 md:grid-cols-2">

                {[
                {
                    name: "Teams",
                    description: "Stores team information and prediction model inputs."
                },
                {
                    name: "Competitions",
                    description: "Stores tournament and competition information."
                },
                {
                    name: "Matches",
                    description: "Stores historical match data and results."
                },
                {
                    name: "Scenarios",
                    description: "Stores user-created match scenarios and statistics."
                },
                {
                    name: "Predictions",
                    description: "Stores generated prediction results for match scenarios."
                }
                ].map((table) => (
                <div
                    key={table.name}
                    className={`rounded-xl border border-white/10 bg-white/5 p-5 ${
                        table.name === "Predictions" ? "md:col-span-2" : ""
                      }`}
                >
                    <h4 className="mb-2 text-lg font-bold text-pink-500">
                    {table.name}
                    </h4>

                    <p className="text-gray-300">
                    {table.description}
                    </p>
                </div>
                ))}

            </div>

            </div>

            </section>

            {/* ER Diagram & Normalization */}
            <section className="mx-auto mt-16 max-w-6xl">
            <p className="mb-3 font-bold uppercase tracking-widest text-pink-500">
                Database Relationships
            </p>

            <h2 className="mb-5 text-3xl font-bold">
                ER Diagram & Normalization
            </h2>

            <p className="mb-8 text-lg leading-relaxed text-gray-300">
                Our Phase 1 Entity Relationship (ER) diagram illustrates how
                the five main database tables connect through primary and
                foreign keys. These relationships help organize football
                information, reduce unnecessary data duplication, and
                maintain consistency throughout the application.
            </p>

            <div className="rounded-2xl border border-white/10 bg-[#071825] p-6 md:p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-6 text-2xl font-bold">
                Goal Stats — Phase 1 ER Diagram
                </h3>

                <div className="overflow-hidden rounded-xl bg-white p-4">
                <img
                    src="/images/goal-stats-er-diagram.png"
                    alt="Goal Stats Phase 1 Entity Relationship Diagram"
                    className="h-auto w-full object-contain"
                />
                </div>

                <p className="mt-5 text-sm text-gray-400">
                PK = Primary Key | FK = Foreign Key |
                1:N = One-to-Many Relationship
                </p>
            </div>
            </section>

            {/* Database Normalization */}
            <section className="mx-auto mt-8 max-w-6xl">
            <div className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-5 text-2xl font-bold">
                Database Relationships & Normalization
                </h3>

                <p className="mb-6 leading-relaxed text-gray-300">
                Our Phase 1 database design separates teams, competitions,
                historical matches, prediction scenarios, and prediction
                results into individual tables. This helps reduce unnecessary
                data duplication by storing shared information once and
                connecting related records through primary and foreign keys.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                {[
                    {
                    name: "Competitions → Matches",
                    detail: "One competition can contain multiple matches."
                    },
                    {
                    name: "Teams → Matches",
                    detail: "One team can participate in multiple matches as either the home or away team."
                    },
                    {
                    name: "Teams → Scenarios",
                    detail: "One team can appear in multiple prediction scenarios as team 1 or team 2."
                    },
                    {
                    name: "Matches → Scenarios",
                    detail: "One match can be associated with zero or many scenarios. A scenario may optionally reference a historical match."
                    },
                    {
                    name: "Scenarios → Predictions",
                    detail: "One scenario can have multiple generated prediction results."
                    }
                ].map((item) => (
                    <div
                    key={item.name}
                    className="rounded-xl border border-white/10 bg-white/5 p-5"
                    >
                    <h4 className="mb-2 font-bold text-pink-500">
                        {item.name}
                    </h4>
                    <p className="text-gray-300">
                        {item.detail}
                    </p>
                    </div>
                ))}
                </div>

                <p className="mt-6 leading-relaxed text-gray-300">
                Teams and competitions are not repeated inside historical
                match records, while prediction results are stored separately
                from the scenarios that generated them. Each scenario preserves
                the model inputs used for a prediction, allowing saved results
                to remain reproducible even if team ratings change over time.
                </p>
            </div>
            </section>

            {/* Technology Stack & Implementation */}
            <section className="mx-auto mt-16 max-w-6xl">
            <p className="mb-3 font-bold uppercase tracking-widest text-pink-500">
                TECHNOLOGY & DEVELOPMENT
            </p>

            <h2 className="mb-5 text-3xl font-bold">
                Technology Stack & Implementation
            </h2>

            <p className="mb-8 text-lg leading-relaxed text-gray-300">
                Goal Stats combines web development, database technology,
                and predictive analytics to create an interactive platform
                for women's football. Our application is designed to connect
                a user-friendly interface with backend services and a
                relational database to organize match information and
                generate statistical predictions.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
                {[
                {
                    name: "Frontend Development",
                    technology: "Next.js, React, TypeScript & Tailwind CSS",
                    description:
                    "The Goal Stats website uses Next.js and React to build interactive pages for exploring teams, matches, predictions, and analytics. TypeScript supports application development, while Tailwind CSS provides consistent styling and responsive layouts."
                },
                {
                    name: "Backend Development",
                    technology: "Python & Flask",
                    description:
                    "The Goal Stats implementation uses Flask & Python for backend functionality. Our project builds on this foundation to support application logic, process match scenarios, and connect prediction features with stored football data."
                },
                {
                    name: "Database Management",
                    technology: "MySQL",
                    description:
                    "Our planned MySQL relational database organizes teams, competitions, historical matches, scenarios, and prediction results. Primary and foreign keys connect related records and help maintain data consistency."
                },
                {
                    name: "Predictive Analytics",
                    technology: "Statistical Models & Football Data",
                    description:
                    "Goal Stats uses football statistics and prediction models to analyze match scenarios. Features include win, draw, and loss probabilities, expected goals, match momentum, and statistical comparisons."
                }
                ].map((item) => (
                <article
                    key={item.name}
                    className="rounded-2xl border border-white/10 bg-[#071825] p-8"
                >
                    <div className="mb-5 h-1 w-16 rounded-full bg-pink-500" />

                    <h3 className="mb-2 text-2xl font-bold">
                    {item.name}
                    </h3>

                    <p className="mb-4 font-semibold text-pink-500">
                    {item.technology}
                    </p>

                    <p className="leading-relaxed text-gray-300">
                    {item.description}
                    </p>
                </article>
                ))}
            </div>
            </section>

            {/* Current Progress & Development */}

            <section className="mt-16">
            <p className="mb-3 font-semibold uppercase tracking-widest text-pink-500">
                PROJECT DEVELOPMENT
            </p>

            <h2 className="mb-6 text-3xl font-bold text-white">
                Current Progress & Next Steps
            </h2>

            <p className="mb-10 text-lg leading-relaxed text-gray-300">
                Team Squared is developing Goal Stats in phases, beginning with
                application planning, database design, and website development.
                Our current focus is connecting the different components into
                a functional database-driven football analytics platform.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

                {/* Completed Work */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Completed Work
                </h3>

                <ul className="list-disc space-y-3 pl-5 leading-relaxed text-gray-300">
                    <li>Established the Goal Stats project concept and objectives.</li>
                    <li>Developed the initial website pages and navigation.</li>
                    <li>Created the Phase 1 Entity Relationship (ER) diagram.</li>
                    <li>Identified the main database tables and relationships.</li>
                    <li>Documented the application features and technology stack.</li>
                </ul>
                </article>

                {/* Current Development */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Current Development
                </h3>

                <ul className="list-disc space-y-3 pl-5 leading-relaxed text-gray-300">
                    <li>Preparing the MySQL database implementation.</li>
                    <li>Planning database integration with backend services.</li>
                    <li>Refining match scenarios and prediction functionality.</li>
                    <li>Improving website design and user experience.</li>
                    <li>Reviewing the consistency of football data and statistics.</li>
                </ul>
                </article>

                {/* Challenges & Next Steps */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Challenges & Next Steps
                </h3>

                <ul className="list-disc space-y-3 pl-5 leading-relaxed text-gray-300">
                    <li>Obtaining reliable historical women's football data.</li>
                    <li>Maintaining data accuracy and database consistency.</li>
                    <li>Connecting frontend, backend, and database components.</li>
                    <li>Testing prediction results and application functionality.</li>
                    <li>Preparing the platform for future tournament analysis.</li>
                </ul>
                </article>

            </div>
            </section>

            {/* Project Goals & Expected Outcomes */}

            <section className="mt-16">
            <p className="mb-3 font-semibold uppercase tracking-widest text-pink-500">
                PROJECT OBJECTIVES
            </p>

            <h2 className="mb-6 text-3xl font-bold text-white">
                Project Goals & Expected Outcomes
            </h2>

            <p className="mb-10 text-lg leading-relaxed text-gray-300">
                Our goal is to develop an interactive, database-driven platform
                that combines football statistics, predictive analytics, and
                accessible technology. Through Goal Stats, Team Squared hopes
                to make women's football data easier to explore while promoting
                greater recognition of women's teams and athletes.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

                {/* Goal 1 */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Accessible Football Analytics
                </h3>

                <p className="leading-relaxed text-gray-300">
                    Provide users with an easy way to explore women's football
                    teams, compare historical performances, analyze match
                    statistics, and generate predictions through an
                    interactive website.
                </p>
                </article>

                {/* Goal 2 */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Database-Driven Application
                </h3>

                <p className="leading-relaxed text-gray-300">
                    Implement a MySQL relational database to organize teams,
                    competitions, historical matches, prediction scenarios,
                    and generated results while maintaining data accuracy,
                    consistency, and accessibility.
                </p>
                </article>

                {/* Goal 3 */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Promoting Women's Football
                </h3>

                <p className="leading-relaxed text-gray-300">
                    Increase awareness and recognition of women's football
                    by creating a platform that highlights international
                    teams, player achievements, and statistical insights
                    leading toward the 2027 FIFA Women's World Cup.
                </p>
                </article>

            </div>
            </section>








      </div>
    </main>
  );
}
