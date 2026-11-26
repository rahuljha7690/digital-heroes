const Footer = () => {
  return (
    <footer id="contact" className="bg-gray-950 px-5 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row">

        <div>
          <h2 className="text-2xl font-black">
            DIGITAL<span className="text-orange-500">HEROES.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
            Custom print solutions, creative freedom and production-ready quality.
          </p>
        </div>

        <div>
          <h3 className="font-semibold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li>Labels & Stickers</li>
            <li>Race & Event Numbers</li>
            <li>MTB Boards</li>
            <li>Stamps & Trophies</li>
            <li>Laser-Cut Work</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Contact</h3>
          <p className="mt-3 text-sm text-gray-400">
            Have a project in mind? Let's make it happen.
          </p>
        </div>

      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-gray-800 pt-6 text-xs text-gray-500">
        © {new Date().getFullYear()} Digital Heroes. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;