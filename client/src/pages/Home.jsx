import { ArrowRight, CheckCircle2, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { divisions } from '../data/divisions';

const Home = () => {
  return (
    <main>
      {/* Hero */}
      <section className="bg-[#f5f4f0] px-5 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">

          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
              Print without limits
            </p>

            <h1 className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight text-gray-950 md:text-7xl">
              Your ideas.
              <br />
              Our precision.
              <br />
              <span className="text-orange-600">Made to print.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-gray-600">
              From custom labels to laser-cut creations, configure your product,
              create your design and bring your ideas to life.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#divisions"
                className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-4 font-bold text-white transition hover:bg-orange-700"
              >
                Explore Products <ArrowRight size={18} />
              </a>

              <Link
                to="/register"
                className="rounded-full border border-gray-300 px-7 py-4 font-bold text-gray-900 transition hover:border-gray-900"
              >
                Start a Project
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-5 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-orange-600" />
                Customisable products
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-orange-600" />
                Instant pricing
              </span>
            </div>
          </div>

          <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-3xl bg-gray-900 p-8 text-white md:min-h-[470px]">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-600/30 blur-3xl" />

            <div className="relative max-w-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
                Built for makers
              </p>
              <p className="mt-5 text-4xl font-black leading-tight md:text-5xl">
                From concept to creation.
              </p>
              <p className="mt-5 leading-7 text-gray-300">
                One platform. Six specialist print divisions. Endless ways to create.
              </p>
              <div className="mt-10 flex items-center gap-3">
                <div className="h-1 w-14 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Digital Heroes
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Product divisions */}
      <section id="divisions" className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">

          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                What we make
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-gray-950 md:text-5xl">
                Explore our divisions.
              </h2>
            </div>

            <p className="max-w-md text-gray-600">
              Specialist print solutions for events, businesses, creators
              and everything in between.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((division) => {
              const Icon = division.icon;

              return (
                <Link
                  key={division.id}
                  to={`/products/${division.id}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-orange-50 p-3 text-orange-600 transition group-hover:bg-orange-600 group-hover:text-white">
                      <Icon size={27} />
                    </div>

                    <span className="text-sm font-bold text-gray-400">
                      {division.number}
                    </span>
                  </div>

                  <h3 className="mt-9 text-xl font-bold text-gray-950">
                    {division.name}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-gray-600">
                    {division.description}
                  </p>

                  <div className="mt-7 flex items-center justify-between border-t border-gray-100 pt-5 text-sm font-bold">
                    <span>Explore division</span>
                    <MoveUpRight
                      size={18}
                      className="text-orange-600 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-gray-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            The Digital Heroes approach
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            Better tools for people who make things.
          </h2>

          <p className="mt-6 max-w-2xl leading-7 text-gray-400">
            Configure your product, see your pricing and prepare your artwork
            in one connected experience.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Home;