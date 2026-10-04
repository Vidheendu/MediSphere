export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
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
                    strokeWidth={2.2}
                    d="M12 4v16m8-8H4"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    strokeWidth={2}
                    stroke="currentColor"
                    strokeDasharray="1 3"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Medi<span className="text-teal-400">Sphere</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              MediSphere helps patients discover healthcare professionals and book
              clinic appointments with ease across Bhopal and nearby locations.
            </p>

            <div className="pt-2 text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
              Dedicated to Bhopal & Madhya Pradesh
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Navigation
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Find Doctors
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Specialities
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#locations"
                  className="hover:text-white transition-colors"
                >
                  Bhopal Locations
                </a>
              </li>
            </ul>
          </div>

          {/* Specialities */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Specialities
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Dermatology
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  ENT
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Dentistry
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Cardiology
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Neurology
                </a>
              </li>
              <li>
                <a
                  href="#specialities"
                  className="hover:text-white transition-colors"
                >
                  Orthopedics
                </a>
              </li>
            </ul>
          </div>

          {/* For Doctors / Portals */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              For Providers
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  Doctor Login
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="hover:text-white transition-colors"
                >
                  Patient Login
                </button>
              </li>
              <li>
                <a
                  href="#locations"
                  className="hover:text-white transition-colors"
                >
                  Register Practice
                </a>
              </li>
              <li>
                <span className="text-xs text-slate-500">
                  Phase 1 Preview Mode
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom divider and disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Disclaimer: MediSphere is a doctor discovery and appointment coordination
            platform. MediSphere does not provide direct medical diagnoses or emergency medical
            services. If you are experiencing a medical emergency, please visit the nearest hospital immediately.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} MediSphere. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-300 cursor-pointer">Contact</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
