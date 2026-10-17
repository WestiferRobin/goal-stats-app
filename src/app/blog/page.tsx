import ViewNavigation from "@/components/view-navigation";

export default function BlogPage() {
    return (
      <main className="min-h-screen bg-cover bg-center bg-fixed px-8 py-16 text-white"
          style={{
          backgroundImage:
          "linear-gradient(rgba(0, 10, 20, 0.88), rgba(0, 10, 20, 0.92)), url('/images/soccer-field-bg.jpg')",
        }}>
        {/* Navigation Bar */}
        <div className="mx-auto max-w-6xl">
          <ViewNavigation currentPath="/blog" />
        </div>
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 font-bold uppercase tracking-widest text-pink-500">
            TEAM SQUARED
          </p>
  
          <h1 className="text-5xl font-bold mb-6">
            Goal Stats Blog
          </h1>
  
          <p className="text-xl text-gray-300">
            Welcome to the Goal Stats development blog!
            Here, our team shares our journey creating a
            database-driven application for the 2027 FIFA
            Women&apos;s World Cup.
          </p>
  
          <div className="mt-10 rounded-2xl border border-white/10 bg-[#071825] p-8">
          <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
            <h2 className="text-2xl font-bold mb-3">
              Meet Team Squared
            </h2>
  
            <p className="text-gray-300">
              Our mission is to combine soccer, technology,
              and data analytics while bringing more
              recognition to women&apos;s football.
            </p>
          </div>

            {/* Team Member Blog Posts */}
            <section className="mt-12">
            <h2 className="mt-14 mb-6 text-3xl font-bold">
                Meet Our Developers
            </h2>

            <div className="space-y-6">

                {/* Esteban */}  
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
                <h3 className="text-2xl font-bold text-pink-500">
                    Esteban Naranjo
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    Web Designer & Application Developer
                </p>
                <p className="mt-5 leading-relaxed text-gray-300">
                  I think Goal Stats is unique because it brings football 
                  data, match analysis, predictions, and deeper analytics 
                  together in one application. My role has focused on designing 
                  and developing the website while helping connect the frontend 
                  to the Flask backend so the system is easy to use and understand. 
                  I worked on features such as match scenarios, win probabilities, 
                  expected goals, momentum, team comparisons, saved prediction 
                  snapshots, model backtesting, and Monte Carlo tournament 
                  simulations. What interests me most about Goal Stats is its 
                  potential to keep growing beyond this class and eventually 
                  support analysis for the 2027 FIFA Women’s World Cup.
                </p>
                </article>

                {/* Wesley */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
                <h3 className="text-2xl font-bold text-pink-500">
                    Wesley Webb
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    Database Designer & Integration Developer
                </p>
                <p className="mt-5 leading-relaxed text-gray-300">
                  For our project Goal Stats, we are developing a database 
                  driven football prediction and analytics application 
                  focused on the Women’s World Cup. I think the project is 
                  unique because it combines team and match data with prediction 
                  models to give users match predictions and deeper statistical 
                  insights in one application. My role has focused on the 
                  technical direction of the project, including defining the 
                  application architecture, organizing the product scope, 
                  planning the database integration, and helping coordinate 
                  how the existing prototype will evolve into the final 
                  database driven application.
                </p>
                </article>

                {/* Nikita */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
                <h3 className="text-2xl font-bold text-pink-500">
                    Nikita Bordbar
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    Web/Backend Designer & Database Integration
                </p>
                <p className="mt-5 leading-relaxed text-gray-300">
                  For our Goal Stats project, our team, Team Squared, 
                  is developing a database application focused on the 
                  Women’s World Cup that allows users to explore teams, 
                  players, match statistics, and performance analytics 
                  in one place. I think Goal Stats is unique because we 
                  wanted to create something that not only uses data in 
                  an interesting way, but also brings more attention to 
                  women’s football. Men’s sports often receive significantly 
                  more attention and coverage, so our team wanted to build 
                  a platform that highlights women athletes, their teams, 
                  and their accomplishments while making their statistics 
                  easy and interesting to explore. My role focuses on 
                  helping design the website and backend while integrating 
                  our database with the application so users can easily 
                  access and interact with the data. I am excited to be 
                  part of a project that combines my interest in sports 
                  and technology while also helping give more visibility 
                  and recognition to women’s football.
                </p>
                </article>

                {/* Mehla */}
                <article className="rounded-2xl border border-white/10 bg-[#071825] p-8">
                <div className="mb-4 h-1 w-16 rounded-full bg-pink-500" />
                <h3 className="text-2xl font-bold text-pink-500">
                    Mehla Abebe
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    Data / Frontend & UI Integration
                </p>
                <p className="mt-5 leading-relaxed text-gray-300">
                  The Goal Stats project is designed to provide predictive 
                  analytics for women’s football teams. What I find most 
                  interesting about it is that it serves a dual purpose and 
                  involves multiple stakeholders. Its most obvious purpose 
                  is to allow countries to gain a better understanding of 
                  who they are drafting for their teams in the 2027 FIFA 
                  Women’s World Cup. A hidden purpose may be its power to 
                  change how fans approach sports betting by using statistics 
                  versus emotional judgments. My role in this project focuses 
                  on discovering data that needs to be used for predictive 
                  analytics. This data will be seeded into the system to find 
                  patterns in wins and losses among players and teams. The 
                  overall software will be accessible to end users through 
                  an easy to navigate web application built with React.
                </p>
                </article>

            </div>
            </section>

        </div>
      </main>
    );
  }
  