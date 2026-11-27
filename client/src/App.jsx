import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import ProductCatalogue from "./pages/ProductCatalogue";
import ProductDetails from "./pages/ProductDetails";
import Designer from "./pages/Designer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyDesigns from "./pages/MyDesigns";
import MyOrders from "./pages/MyOrders";
import ProofReview from "./pages/ProofReview";
import AdminOrderDetails from "./pages/AdminOrderDetails";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

const ComingSoon = ({ title }) => (
  <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-24">
    <h1 className="text-4xl font-black">{title}</h1>
    <p className="mt-4 text-gray-600">
      This module is the next development milestone.
    </p>
  </main>
);

function AppLayout() {
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminPage && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/products/:division" element={<ProductCatalogue />} />

        <Route path="/product/:slug" element={<ProductDetails />} />

        <Route path="/designer/:slug" element={<Designer />} />

        <Route path="/designer/:slug/:designId" element={<Designer />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer protected routes */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route
            path="/dashboard"
            element={<ComingSoon title="Customer Dashboard" />}
          />

          <Route path="/my-designs" element={<MyDesigns />} />
          <Route path="/my-orders" element={<MyOrders />} />

          <Route path="/orders/:orderId/proof" element={<ProofReview />} />
        </Route>

        {/* Admin protected routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
