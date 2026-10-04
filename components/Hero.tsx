export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/50 to-white py-16 sm:py-24 lg:py-28 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Subtle Region Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-1 text-xs sm:text-sm font-medium text-teal-800 mb-6">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-600"></span>
            Serving Bhopal and nearby locations
          </div>

          {/* Hero Title */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Find the Right Doctor for You
          </h1>

          {/* Hero Description */}
          <p className="mt-6 text-lg sm:text-xl leading-8 text-slate-600 max-w-2xl mx-auto">
            Discover healthcare professionals and book appointments at a time
            that works for you.
          </p>

          {/* Hero Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <a
              href="#specialities"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-teal-600 px-6 py-3.5 text-base font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Find a Doctor
            </a>
            <a
              href="#specialities"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Explore Specialities
            </a>
          </div>

          {/* Authentic Core Highlights (No fake stats/ratings) */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100 shadow-2xs">
              <div className="p-2 rounded-md bg-teal-50 text-teal-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Verified Profiles
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authentic medical credentials & specialties
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100 shadow-2xs">
              <div className="p-2 rounded-md bg-teal-50 text-teal-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Real-Time Slots
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Convenient appointment timing selection
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100 shadow-2xs">
              <div className="p-2 rounded-md bg-teal-50 text-teal-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Local Discovery
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accessible clinics across Bhopal districts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
