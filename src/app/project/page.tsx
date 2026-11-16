
import Link from "next/link";
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
            <ViewNavigation currentPath="/project" />
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
          application for exploring historical FIFA Women&apos;s World Cup results
          and hypothetical match predictions. Supporting the 2027 FIFA
          Women&apos;s World Cup is a future direction.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white hover:bg-pink-600" href="/">
            Launch Goal Stats
          </Link>
          <a className="text-pink-400 underline" href="#phase-1-deliverables">
            View Phase 1 Deliverables
          </a>
        </div>

        {/* Project Overview */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">

          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />

          <h2 className="mb-4 text-2xl font-bold">
            Project Overview
          </h2>

          <p className="leading-relaxed text-gray-300">
            Developed by Team Squared, Goal Stats aims to make women&apos;s
            football statistics and match predictions more accessible.
            The application lets users explore
            international teams, compare historical match information,
            create match scenarios, and generate predictions.

            Our deployed application uses a PostgreSQL relational database
            to store teams, competitions, matches, scenarios, and
            prediction results.
          </p>

        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">
          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
          <h2 className="mb-4 text-2xl font-bold">Production Architecture & Historical Catalog</h2>
          <p className="leading-relaxed text-gray-300">
            Browser → Next.js API proxy → Flask → SQLAlchemy → PostgreSQL.
            The Next.js / React frontend runs on Vercel; the Flask service and PostgreSQL database run on Render.
            The historical catalog contains 44 national teams, nine Women&apos;s World Cup editions (1991–2023),
            348 matches and 1,081 goals. These are historical records, not 2027 fixtures or live match feeds.
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
                Users select two teams, enter hypothetical strengths, and provide match details,
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
                Users can explore international women&apos;s football
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
                Goal Stats displays saved hypothetical prediction results, including
                momentum, possession, and expected goals. History compares
                saved scenario revisions rather than live match telemetry.
            </p>
            </div>

        </div>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">
          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
          <h2 className="mb-4 text-2xl font-bold">How to Use Goal Stats</h2>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed text-gray-300">
            <li>Open Teams to explore the historical catalog and compare teams.</li>
            <li>Open Matches to browse historical matches or use the hypothetical scenario form. Browsing a historical match does not populate hypothetical inputs.</li>
            <li>Select two distinct teams in the scenario form.</li>
            <li>Enter both teams&apos; match statistics, score and Minute. Possession must total 100%.</li>
            <li>Enter all ten hypothetical strength assumptions: offense, defense, form, star power and clutch for each team (0–100). These are your assumptions, not verified FIFA rankings.</li>
            <li>Select Generate Preview → to open the prediction preview.</li>
            <li>Review win/draw/loss probabilities, expected goals, likely scoreline and supported explanations. An unsaved preview is temporary and is not a persistent database record.</li>
            <li>Select Save new scenario and prediction to persist the scenario and its result.</li>
            <li>Return to Predictions to browse saved scenarios, use Reopen scenario # to edit supported match state, or Open predictions to inspect saved history. Save scenario changes updates match state without generating a prediction. Generating a saved prediction explicitly appends a result without replacing earlier predictions.</li>
            <li>From a saved prediction, select View Analytics → to inspect its saved results and input snapshot.</li>
          </ol>
          <p className="mt-6 leading-relaxed text-gray-300">
            Saving a new scenario and prediction uses two requests: first the scenario is stored,
            then a prediction is calculated and saved with its input snapshot. If prediction generation
            fails after the scenario is saved, the scenario remains available for another attempt.
            Editing a scenario does not change earlier prediction snapshots or results.
          </p>
          <p className="mt-6 leading-relaxed text-gray-300">
            Saved scenarios and predictions are shared classroom-prototype records. Tournament simulation
            and backtesting execution are future work and are not available through the current interface.
          </p>
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
            Goal Stats uses a PostgreSQL relational database
            to organize and store football information. The database
            provides persistent storage for teams, competitions,
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
                    description: "Primary key: team_id. Stores team identity and attributed ratings when available; hypothetical strengths are supplied explicitly."
                },
                {
                    name: "Competitions",
                    description: "Primary key: competition_id. Stores tournament edition information."
                },
                {
                    name: "Matches",
                    description: "Primary key: match_id. Foreign keys: competition_id, home_team_id and away_team_id reference competitions and teams. Stores historical results and source provenance."
                },
                {
                    name: "Scenarios",
                    description: "Primary key: scenario_id. Foreign keys: team1_id and team2_id reference teams; nullable match_id optionally references one historical match. Match state is editable; changing teams or strength assumptions requires a new scenario."
                },
                {
                    name: "Predictions",
                    description: "Primary key: prediction_id. Foreign key: scenario_id references one scenario. Stores results, model_version, generated_at and the original input_snapshot (JSONB). One scenario can have many saved predictions."
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
                <a className="text-pink-400 underline" href="/images/goal-stats-er-diagram.png">Open full-size ER diagram</a><br />
                PK = Primary Key | FK = Foreign Key |
                0..1 = Zero or one | 0..N = Zero or many. Selected keys and snapshot field shown.
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
                    detail: "Each match belongs to exactly one competition; a competition can contain zero or many matches."
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
                    detail: "Each saved prediction belongs to exactly one scenario; a scenario can have zero or many saved predictions."
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
                from the scenarios that generated them. Scenario match state can be edited.
                Each saved prediction preserves its original input_snapshot and outputs;
                supported application operations append predictions and do not overwrite
                prediction history when a scenario changes. This is application behavior,
                not a claim that database administrators cannot modify records.
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
                for women&apos;s football. Our application connects
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
                    technology: "Python, Flask & SQLAlchemy",
                    description:
                    "The Goal Stats implementation uses Flask & Python for backend functionality. Our project builds on this foundation to support application logic, process match scenarios, and connect prediction features with stored football data."
                },
                {
                    name: "Database Management",
                    technology: "PostgreSQL",
                    description:
                    "Our deployed PostgreSQL relational database organizes teams, competitions, historical matches, scenarios, and prediction results. Primary and foreign keys connect related records and help maintain data consistency."
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

        <section id="phase-1-deliverables" aria-labelledby="deliverables-heading" className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">
          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
          <h2 id="deliverables-heading" className="mb-4 text-2xl font-bold">Phase 1 Deliverables</h2>
          <ul className="list-disc space-y-3 pl-5 leading-relaxed text-gray-300">
            <li><a className="text-pink-400 underline" href="/deliverables/goal-stats-phase1-presentation.pptx" download="goal-stats-phase1-presentation.pptx">Presentation</a></li>
            <li><Link className="text-pink-400 underline" href="/about">About Page</Link></li>
            <li><a className="text-pink-400 underline" href="/deliverables/product-overview-instructions.pdf">Database Product Overview &amp; Instructions</a></li>
            <li><Link className="text-pink-400 underline" href="/blog">Blog</Link></li>
            <li>
              <a className="text-pink-400 underline" href="/deliverables/source-code-executable.pdf">Source Code &amp; Executable</a>
              <p className="mt-2">Repository links, the working application, and a summary of original development and AI assistance.</p>
            </li>
            <li><a className="text-pink-400 underline" href="/deliverables/database-product-document.pdf">Database Product Document</a></li>
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-[#071825] p-8">
          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
          <h2 className="mb-4 text-2xl font-bold">Original Development & AI Assistance</h2>
          <p className="leading-relaxed text-gray-300">
            Goal Stats builds upon the earlier RoadToTheFinal football prediction prototype. Team Squared
            expanded the project with a React/Next.js frontend, Flask REST APIs, a PostgreSQL database,
            historical Women&apos;s World Cup data integration, persistent match scenarios, prediction history,
            automated testing, and cloud deployment.
          </p>
          <p className="mt-4 leading-relaxed text-gray-300">
            AI tools, including ChatGPT and Codex, assisted with development, debugging, refactoring, testing,
            and documentation. The team adapted and integrated AI-assisted work, corrected implementation
            issues, and verified functionality through automated and application testing.
          </p>
          <p className="mt-4 leading-relaxed text-gray-300">
            <strong>Reference:</strong> RoadToTheFinal — <a className="text-pink-400 underline" href="https://github.com/Estebansito1/RoadToTheFinal">https://github.com/Estebansito1/RoadToTheFinal</a>
          </p>
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
                The frontend, API proxy, Flask service and PostgreSQL database are integrated.
                Current work focuses on documentation, data quality and validation.
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
                    <li>Integrated the website pages with the normalized backend API.</li>
                    <li>Created the Phase 1 Entity Relationship (ER) diagram.</li>
                    <li>Implemented the five PostgreSQL tables and their relationships.</li>
                    <li>Implemented historical browsing, scenario persistence and saved prediction analytics.</li>
                </ul>
                </article>

                {/* Current Development */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Current Development
                </h3>

                <ul className="list-disc space-y-3 pl-5 leading-relaxed text-gray-300">
                    <li>Reviewing the linked Phase 1 deliverables for submission.</li>
                    <li>Documenting team contributions and review of AI-assisted work.</li>
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
                    <li>Obtaining reliable historical women&apos;s football data.</li>
                    <li>Maintaining data accuracy and database consistency.</li>
                    <li>Monitoring the integrated frontend, backend, and database components.</li>
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
                to make women&apos;s football data easier to explore while promoting
                greater recognition of women&apos;s teams and athletes.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

                {/* Goal 1 */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Accessible Football Analytics
                </h3>

                <p className="leading-relaxed text-gray-300">
                    Provide users with an easy way to explore women&apos;s football
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
                    Maintain the implemented PostgreSQL relational database to organize teams,
                    competitions, historical matches, prediction scenarios,
                    and generated results while maintaining data accuracy,
                    consistency, and accessibility.
                </p>
                </article>

                {/* Goal 3 */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-6 h-1 w-16 rounded-full bg-pink-500" />

                <h3 className="mb-4 text-2xl font-bold text-white">
                    Promoting Women&apos;s Football
                </h3>

                <p className="leading-relaxed text-gray-300">
                    Increase awareness and recognition of women&apos;s football
                    by creating a platform that highlights international
                    teams, historical results, and statistical insights
                    leading toward the 2027 FIFA Women&apos;s World Cup.
                </p>
                </article>

            </div>
            </section>
      </div>
    </main>
  );
}
