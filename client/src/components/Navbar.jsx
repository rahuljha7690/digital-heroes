import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

        <Link to="/" className="text-2xl font-black tracking-tight">
          DIGITAL<span className="text-orange-600">HEROES.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className="text-sm font-medium hover:text-orange-600">
            Home
          </NavLink>

          <a href="/#divisions" className="text-sm font-medium hover:text-orange-600">
            Products
          </a>

          <a href="/#about" className="text-sm font-medium hover:text-orange-600">
            About
          </a>

          <a href="/#contact" className="text-sm font-medium hover:text-orange-600">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm font-semibold hover:text-orange-600 sm:block"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Get Started
          </Link>

          <button className="rounded-lg p-2 md:hidden" aria-label="Menu">
            <Menu size={23} />
          </button>
        </div>

      </nav>
    </header>
  );
};

export default Navbar;