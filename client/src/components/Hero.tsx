export default function Hero() {
  return (
    <section
    id="home"
      className="relative min-h-screen flex items-center text-white bg-cover bg-center"
      style={{ backgroundImage: "url('/modern-bg.jpg')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10">
        <div>
          <p className="text-[#d4af37] uppercase tracking-wide">
            You're in great hands
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mt-4">
            How can we <span className="text-[#d4af37]">help?</span>
          </h1>

          <p className="mt-6 text-gray-300 max-w-lg">
            Trusted, professional legal services across Kenya.
          </p>
        </div>
      </div>
    </section>
  )
}
