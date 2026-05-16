export default function About() {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-16 items-center">

          {/* Left: Text Content */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <p className="text-[#d4af37] uppercase tracking-[3px] text-sm font-medium mb-3">
                ABOUT ALBERT SMITH LAW FIRM
              </p>
              <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-none tracking-tight">
                Excellence.<br />
                Integrity.GIT<br />
                Results.
              </h2>
            </div>

            <div className="max-w-2xl text-lg text-gray-700 leading-relaxed space-y-6">
              <p>
                Established to serve with distinction, our law firm has grown into a trusted legal partner 
                for individuals, corporations, and institutions across Kenya. From our offices in Westlands, 
                Nairobi, we deliver strategic, ethical, and results-driven legal representation.
              </p>

              <p>
                Our approach combines deep legal expertise with a practical understanding of our clients’ needs. 
                We pride ourselves on clear communication, absolute confidentiality, and an unwavering 
                commitment to protecting our clients’ interests.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-6">
              <div>
                <p className="text-4xl font-semibold text-[#d4af37]">15+</p>
                <p className="text-gray-600 mt-2 text-sm">Years of Experience</p>
              </div>
              <div>
                <p className="text-4xl font-semibold text-[#d4af37]">500+</p>
                <p className="text-gray-600 mt-2 text-sm">Cases Handled</p>
              </div>
              <div>
                <p className="text-4xl font-semibold text-[#d4af37]">98%</p>
                <p className="text-gray-600 mt-2 text-sm">Client Satisfaction</p>
              </div>
              <div>
                <p className="text-4xl font-semibold text-[#d4af37]">24/7</p>
                <p className="text-gray-600 mt-2 text-sm">Client Support</p>
              </div>
            </div>
          </div>

          {/* Right: Image - Smooth & Elegant */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/tools-of-justice.jpg"
                alt="Legal Expertise - Tools of Justice"
                className="w-full h-full object-cover aspect-[4/3] 
                           transition-transform duration-700 hover:scale-105"
              />
            </div>

            {/* Subtle decorative overlay */}
            <div className="absolute -bottom-6 -right-6 w-40 h-40 border border-[#d4af37]/20 rounded-3xl hidden xl:block" />
          </div>

        </div>
      </div>
    </section>
  );
}