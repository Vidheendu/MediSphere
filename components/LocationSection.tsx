export default function LocationSection() {
  const localities = [
    { name: "MP Nagar", detail: "Zone I & Zone II medical complexes" },
    { name: "Arera Colony", detail: "Speciality clinics & wellness centers" },
    { name: "Kolar Road", detail: "Neighborhood family & dental practices" },
    { name: "TT Nagar & New Market", detail: "Central clinical practitioners" },
    { name: "Hoshangabad Road", detail: "Multi-speciality healthcare centers" },
    { name: "Shahpura & Bawadiya", detail: "Consultation chambers & clinics" },
    { name: "Ayodhya Bypass", detail: "North Bhopal clinical care hubs" },
    { name: "Nearby Regions", detail: "Connecting Sehore, Raisen & Vidisha" },
  ];

  return (
    <section id="locations" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3.5 py-1 text-xs font-semibold text-teal-800 mb-4 shadow-2xs">
            <svg
              className="h-3.5 w-3.5 text-teal-600"
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
            Local Healthcare Network
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Bhopal and Nearby Locations
          </h2>

          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            MediSphere connects patients with verified healthcare practitioners,
            neighborhood clinics, and specialist consultation chambers across Bhopal
            and nearby locations.
          </p>
        </div>

        {/* Localities Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {localities.map((loc) => (
            <div
              key={loc.name}
              className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-500"
            >
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                {loc.name}
              </div>
              <p className="mt-1 text-xs text-slate-500">{loc.detail}</p>
            </div>
          ))}
        </div>

        {/* Clean Clinic Callout Banner */}
        <div className="mt-10 rounded-xl border border-teal-200 bg-teal-50/70 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-teal-950">
              Practicing doctor or clinic in Bhopal?
            </h3>
            <p className="text-sm text-teal-800/90 mt-1">
              Join the MediSphere provider directory to help local patients find your consultation hours.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-teal-800 transition-colors"
          >
            Doctor Registration
          </button>
        </div>
      </div>
    </section>
  );
}
