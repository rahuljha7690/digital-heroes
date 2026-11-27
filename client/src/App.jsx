import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductCatalogue from './pages/ProductCatalogue';
import ProductDetails from './pages/ProductDetails';
import Designer from './pages/Designer';
import Login from './pages/Login';
import Register from './pages/Register';
import MyDesigns from './pages/MyDesigns';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

const ComingSoon = ({ title }) => (
  <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-24">
    <h1 className="text-4xl font-black">{title}</h1>
    <p className="mt-4 text-gray-600">This module is the next development milestone.</p>
  </main>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:division" element={<ProductCatalogue />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/designer/:slug" element={<Designer />} />
          <Route path="/designer/:slug/:designId" element={<Designer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/dashboard" element={<ComingSoon title="Customer Dashboard" />} />
            <Route path="/my-designs" element={<MyDesigns />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<ComingSoon title="Admin Dashboard" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
