import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { divisions } from "../data/divisions";

const ProductCatalogue = () => {
  const { division } = useParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDivision = divisions.find((item) => item.id === division);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get("http://localhost:5000/api/products", {
          params: {
            division: selectedDivision?.id,
          },
        });

        setProducts(response.data.products);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load products. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (selectedDivision) {
      fetchProducts();
    } else {
      setLoading(false);
      setError("Product division not found.");
    }
  }, [selectedDivision]);

  if (!selectedDivision) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-20">
        <h1 className="text-3xl font-black">Division not found</h1>
        <Link to="/" className="mt-5 inline-block text-orange-600">
          Back to homepage
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/#divisions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          <ArrowLeft size={17} />
          All divisions
        </Link>

        <div className="mt-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
            Division {selectedDivision.number}
          </p>

          <h1 className="mt-3 text-4xl font-black text-gray-950 md:text-5xl">
            {selectedDivision.name}
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-gray-600">
            {selectedDivision.description}
          </p>
        </div>

        <div className="mt-12">
          {loading ? (
            <p className="py-16 text-center text-gray-500">
              Loading products...
            </p>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <Package size={42} className="mx-auto text-gray-400" />

              <h2 className="mt-5 text-2xl font-bold text-gray-900">
                Products coming soon
              </h2>

              <p className="mt-3 text-gray-500">
                We're preparing products for this division. Please check back
                soon.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500">
                {products.length} product(s) available
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <article
                    key={product._id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex h-56 items-center justify-center bg-gray-100">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={48} className="text-gray-300" />
                      )}
                    </div>

                    <div className="p-6">
                      <h2 className="text-xl font-bold text-gray-950">
                        {product.name}
                      </h2>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-gray-600">
                        {product.description}
                      </p>

                      <Link
                        to={`/product/${product.slug}`}
                        className="mt-6 inline-flex items-center gap-2 font-bold text-orange-600 hover:text-orange-700"
                      >
                        Configure product
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default ProductCatalogue;
