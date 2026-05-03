import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";   

const NAV_ITEMS = [
  { label: "Services", id: "Our Practice Areas" },
  { label: "About", id: "about" },
  { label: "Testimonials", id: "testimonials" },
  { label: "Contact", id: "contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;

    const offset = -80;
    const y =
      section.getBoundingClientRect().top +
      window.pageYOffset +
      offset;

    window.scrollTo({ top: y, behavior: "smooth" });
    setOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const handleScroll = () => {
      NAV_ITEMS.forEach(({ id }) => {
        const section = document.getElementById(id);
        if (!section) return;

        const rect = section.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) {
          setActive(id);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo */}
        <button
          onClick={() => scrollToSection("home")}
          className="text-xl font-bold heading-font text-[#d4af37]"
        >
          Albert Smith law firm
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8 text-gray-700 font-medium">
          {NAV_ITEMS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`transition ${
                active === id
                  ? "text-[#d4af37] font-semibold"
                  : "hover:text-[#d4af37]"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Auth Section */}
          {user ? (
            <>
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-[#d4af37] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#d4af37] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-gray-700 font-medium"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white px-6 pb-6 space-y-4 shadow-inner">
          {NAV_ITEMS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`block w-full text-left ${
                active === id
                  ? "text-[#d4af37] font-semibold"
                  : "text-gray-700 hover:text-[#d4af37]"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Mobile Auth */}
          {user ? (
            <>
              <div className="text-sm text-gray-600">{user.email}</div>
              <button
                onClick={handleLogout}
                className="w-full bg-[#d4af37] text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="block w-full bg-[#d4af37] text-white px-4 py-2 rounded-lg text-center"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
