export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 py-10 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-bold heading-font text-[#d4af37]">Albert Smith Law Firm</h3>
          <p className="mt-2 text-gray-400">Westlands, Nairobi, Kenya</p>
          <p className="text-gray-400">Email: info@asmith492@gmail.co.ke</p>
          <p className="text-gray-400">Phone: +254 791851659</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200">Quick Links</h4>
          <ul className="mt-2 space-y-2">
            <li><a href="#services" className="hover:text-[#d4af37]">Services</a></li>
            <li><a href="#about" className="hover:text-[#d4af37]">About</a></li>
            <li><a href="#testimonials" className="hover:text-[#d4af37]">Testimonials</a></li>
            <li><a href="#contact" className="hover:text-[#d4af37]">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200">Follow Us</h4>
          <ul className="mt-2 space-y-2">
            <li><a href="#" className="hover:text-[#d4af37]">LinkedIn:@Albrt Smith Law Firm</a></li>
            <li><a href="#" className="hover:text-[#d4af37]">Facebook:AlbertSmith firm ke</a></li>
            <li><a href="#" className="hover:text-[#d4af37]">Twitter:@ASmith Firms</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Albert Smith Law Firm. All rights reserved.
      </div>
    </footer>
  );
}