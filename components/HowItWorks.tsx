export default function HowItWorks() {
  const steps = [
    {
      stepNumber: "01",
      title: "Find a Doctor",
      description:
        "Filter and locate verified healthcare professionals by medical speciality, clinic location, or specific health concerns.",
      icon: (
        <svg
          className="h-6 w-6"
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
      ),
    },
    {
      stepNumber: "02",
      title: "Choose a Slot",
      description:
        "Review real-time schedule openings and pick a convenient consultation date and time that fits your day.",
      icon: (
        <svg
          className="h-6 w-6"
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
      ),
    },
    {
      stepNumber: "03",
      title: "Book Appointment",
      description:
        "Confirm your appointment with complete clinic address and consultation guidelines—no long wait times.",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Simple 3-Step Process
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-base text-slate-600">
            MediSphere makes doctor discovery and appointment scheduling quick, transparent, and hassle-free.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item) => (
            <div
              key={item.stepNumber}
              className="relative flex flex-col p-6 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 transition-colors"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-white shadow-2xs">
                  {item.icon}
                </div>
                <span className="text-2xl font-bold text-slate-300">
                  {item.stepNumber}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
