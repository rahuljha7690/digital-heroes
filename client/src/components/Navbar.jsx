import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const navClass = ({ isActive }) =>
    `text-sm font-medium transition hover:text-orange-600 ${isActive ? "text-orange-600" : "text-gray-700"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link to="/" className="text-2xl font-black tracking-tight">
          DIGITAL<span className="text-orange-600">HEROES.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className={navClass}>
            Home
          </NavLink>
          <a
            href="/#divisions"
            className="text-sm font-medium text-gray-700 transition hover:text-orange-600"
          >
            Products
          </a>
          <a
            href="/#about"
            className="text-sm font-medium text-gray-700 transition hover:text-orange-600"
          >
            About
          </a>
          <a
            href="/#contact"
            className="text-sm font-medium text-gray-700 transition hover:text-orange-600"
          >
            Contact
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {user.role === "customer" && (
                <>
                  <Link
                    to="/my-orders"
                    className="text-sm font-semibold text-gray-700 hover:text-orange-600"
                  >
                    My orders
                  </Link>
                  <Link
                    to="/my-designs"
                    className="text-sm font-semibold text-gray-700 hover:text-orange-600"
                  >
                    My designs
                  </Link>
                </>
              )}
              <Link
                to={user.role === "admin" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600"
              >
                <UserRound size={17} /> {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold transition hover:border-orange-600 hover:text-orange-600"
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold hover:text-orange-600"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              onClick={() => setMenuOpen(false)}
              to="/"
              className="text-sm font-medium"
            >
              Home
            </Link>
            <a
              onClick={() => setMenuOpen(false)}
              href="/#divisions"
              className="text-sm font-medium"
            >
              Products
            </a>
            <a
              onClick={() => setMenuOpen(false)}
              href="/#about"
              className="text-sm font-medium"
            >
              About
            </a>
            {user ? (
              <>
                {user.role === "customer" && (
                  <>
                    <Link
                      onClick={() => setMenuOpen(false)}
                      to="/my-orders"
                      className="text-sm font-semibold"
                    >
                      My orders
                    </Link>
                    <Link
                      onClick={() => setMenuOpen(false)}
                      to="/my-designs"
                      className="text-sm font-semibold"
                    >
                      My designs
                    </Link>
                  </>
                )}{" "}
                <Link
                  onClick={() => setMenuOpen(false)}
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="text-sm font-semibold"
                >
                  My account
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm font-semibold text-orange-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-4 border-t border-gray-100 pt-4">
                <Link
                  onClick={() => setMenuOpen(false)}
                  to="/login"
                  className="text-sm font-semibold"
                >
                  Login
                </Link>
                <Link
                  onClick={() => setMenuOpen(false)}
                  to="/register"
                  className="text-sm font-semibold text-orange-600"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
