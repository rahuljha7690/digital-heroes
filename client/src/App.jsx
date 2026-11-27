import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ProductCatalogue from "./pages/ProductCatalogue";
import ProductDetails from "./pages/ProductDetails";

const ComingSoon = ({ title }) => (
  <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-24">
    <h1 className="text-4xl font-black">{title}</h1>
    <p className="mt-4 text-gray-600">
      This page is coming in the next development step.
    </p>
  </main>
);

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:division" element={<ProductCatalogue />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route
          path="/products/:division"
          element={<ComingSoon title="Product Catalogue" />}
        />
        <Route path="/login" element={<ComingSoon title="Login" />} />
        <Route
          path="/register"
          element={<ComingSoon title="Create Account" />}
        />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
