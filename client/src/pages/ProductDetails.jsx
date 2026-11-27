import { useEffect, useState } from "react";
import { Link, useParams ,useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import axios from "axios";
import {
  ArrowLeft,
  Minus,
  Plus,
  Package,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const ProductDetails = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const designId = searchParams.get("design");

  const [product, setProduct] = useState(null);
  const [options, setOptions] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [quote, setQuote] = useState(null);
  const navigate = useNavigate();
const { user } = useAuth();

const [placingOrder, setPlacingOrder] = useState(false);
const [orderError, setOrderError] = useState("");

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState("");
  const [quoteError, setQuoteError] = useState("");


  const handlePlaceOrder = async () => {
  if (!user) {
    navigate("/login");
    return;
  }

  if (!product || !quote || loadingQuote || placingOrder) {
    return;
  }

  try {
    setPlacingOrder(true);
    setOrderError("");

    const { data } = await api.post("/orders", {
      productId: product._id,
      quantity: Number(quantity),
      options,
      designId: designId || undefined,
    });

    navigate("/my-orders", {
      state: { orderNumber: data.order.orderNumber },
    });
  } catch (err) {
    setOrderError(
      err.response?.data?.message || "Unable to place your order."
    );
  } finally {
    setPlacingOrder(false);
  }
};
  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoadingProduct(true);
        setError("");
        setProduct(null);
        setOptions(null);
        setQuote(null);

        const response = await axios.get(`${API_URL}/products/${slug}`);

        const fetchedProduct = response.data.product;

        setProduct(fetchedProduct);

        // Select the first available value for each configurable option
        const defaults = {};

        Object.entries(fetchedProduct.configuration || {}).forEach(
          ([key, values]) => {
            if (Array.isArray(values) && values.length > 0) {
              defaults[key] = values[0];
            }
          },
        );

        if (fetchedProduct.configuration?.dimensions?.enabled) {
          defaults.widthCm = 20;
          defaults.heightCm = 10;
        }

        setOptions(defaults);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load this product.");
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Calculate price whenever quantity or options change
  useEffect(() => {
    if (!product || options === null) return;

    let isCurrentRequest = true;

    const calculateQuote = async () => {
      try {
        setLoadingQuote(true);
        setQuoteError("");

        const response = await axios.post(`${API_URL}/products/${slug}/quote`, {
          quantity,
          options,
        });

        if (isCurrentRequest) {
          setQuote(response.data.quote);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setQuote(null);
          setQuoteError(
            err.response?.data?.message || "Unable to calculate price.",
          );
        }
      } finally {
        if (isCurrentRequest) {
          setLoadingQuote(false);
        }
      }
    };

    const timer = setTimeout(calculateQuote, 350);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timer);
    };
  }, [product, slug, quantity, options]);

  const updateOption = (key, value) => {
    setOptions((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: quote?.currency || product?.pricing?.currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loadingProduct) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-orange-600" size={32} />
        <span className="ml-3 text-gray-500">Loading product...</span>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-7xl px-5 py-20">
        <h1 className="text-3xl font-black">Product unavailable</h1>
        <p className="mt-3 text-gray-600">
          {error || "This product could not be found."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 font-semibold text-orange-600"
        >
          <ArrowLeft size={17} />
          Back to homepage
        </Link>
      </main>
    );
  }

  const configurableOptions = Object.entries(
    product.configuration || {},
  ).filter(([, values]) => Array.isArray(values) && values.length > 0);

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          to={`/products/${product.division}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-600"
        >
          <ArrowLeft size={17} />
          Back to products
        </Link>

        <div className="mt-9 grid gap-10 lg:grid-cols-2">
          {/* Product information */}
          <section>
            <div className="flex min-h-90 items-center justify-center overflow-hidden rounded-3xl border border-gray-200 bg-white md:min-h-120">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full max-h-120 w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Package size={76} className="mx-auto text-gray-300" />
                  <p className="mt-4 text-sm text-gray-400">
                    Product preview coming soon
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">
                Digital Heroes / Custom Print
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 md:text-5xl">
                {product.name}
              </h1>

              <p className="mt-5 leading-7 text-gray-600">
                {product.description}
              </p>

              <div className="mt-7 flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={18} className="text-green-600" />
                Customisable product
              </div>
            </div>
          </section>

          {/* Product configuration */}
          <section className="h-fit rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <div className="border-b border-gray-100 pb-6">
              <p className="text-sm font-bold uppercase tracking-widest text-orange-600">
                Configure your product
              </p>

              <h2 className="mt-2 text-2xl font-black text-gray-950">
                Make it yours.
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Choose your options and see the price update automatically.
              </p>
            </div>

            {/* Dynamic options */}
            <div className="space-y-6 py-7">
              {configurableOptions.map(([key, values]) => (
                <div key={key}>
                  <label
                    htmlFor={`option-${key}`}
                    className="mb-2 block text-sm font-bold capitalize text-gray-800"
                  >
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>

                  <select
                    id={`option-${key}`}
                    value={options?.[key] || ""}
                    onChange={(event) => updateOption(key, event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Custom dimensions */}
              {product.configuration?.dimensions?.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="widthCm"
                      className="mb-2 block text-sm font-bold text-gray-800"
                    >
                      Width ({product.configuration.dimensions.unit || "cm"})
                    </label>

                    <input
                      id="widthCm"
                      type="number"
                      min={product.configuration.dimensions.minWidthCm}
                      max={product.configuration.dimensions.maxWidthCm}
                      value={options?.widthCm ?? ""}
                      onChange={(event) =>
                        updateOption("widthCm", event.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="heightCm"
                      className="mb-2 block text-sm font-bold text-gray-800"
                    >
                      Height ({product.configuration.dimensions.unit || "cm"})
                    </label>

                    <input
                      id="heightCm"
                      type="number"
                      min={product.configuration.dimensions.minHeightCm}
                      max={product.configuration.dimensions.maxHeightCm}
                      value={options?.heightCm ?? ""}
                      onChange={(event) =>
                        updateOption("heightCm", event.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label
                  htmlFor="quantity"
                  className="mb-2 block text-sm font-bold text-gray-800"
                >
                  Quantity
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="rounded-xl border border-gray-200 p-3 transition hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus size={18} />
                  </button>

                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={quantity}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value === "") {
                        setQuantity("");
                        return;
                      }

                      setQuantity(Number(value));
                    }}
                    onBlur={() => {
                      setQuantity((current) => {
                        if (!Number.isInteger(current) || current < 1) return 1;
                        return Math.min(current, 100000);
                      });
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center font-bold outline-none focus:border-orange-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(100000, (Number(current) || 0) + 1),
                      )
                    }
                    disabled={quantity >= 100000}
                    aria-label="Increase quantity"
                    className="rounded-xl border border-gray-200 p-3 transition hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Enter a quantity between 1 and 100,000.
                </p>
              </div>
            </div>

            {/* Live price summary */}
            <div className="rounded-2xl bg-gray-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Price summary</h3>

                {loadingQuote && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin text-orange-400"
                  />
                )}
              </div>

              {quoteError ? (
                <p className="mt-5 text-sm text-red-300">{quoteError}</p>
              ) : quote ? (
                <div className="mt-5 space-y-4">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Price per piece</span>
                    <span>{formatPrice(quote.unitPrice)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Subtotal ({quote.quantity} pieces)</span>
                    <span>{formatPrice(quote.subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-green-400">
                    <span>Quantity discount ({quote.discountPercent}%)</span>
                    <span>- {formatPrice(quote.discountAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Tax</span>
                    <span>{formatPrice(quote.taxAmount)}</span>
                  </div>

                  <div className="border-t border-gray-700 pt-5">
                    <div className="flex items-end justify-between gap-3">
                      <span className="font-bold">Estimated total</span>
                      <span className="text-3xl font-black text-orange-400">
                        {formatPrice(quote.total)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Final pricing will be confirmed at checkout.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-gray-400">
                  {loadingQuote
                    ? "Calculating your price..."
                    : "Select options to calculate your price."}
                </p>
              )}
            </div>

            {orderError && (
  <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
    {orderError}
  </p>
)}
<div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-sm">
              {designId ? (
                <p className="flex flex-wrap items-center justify-between gap-2 text-gray-700">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} className="text-green-600" /> Your saved design is attached to this order.
                  </span>
                  <Link to={`/designer/${slug}/${designId}`} className="font-bold text-orange-600">Edit design</Link>
                </p>
              ) : (
                <p className="flex flex-wrap items-center justify-between gap-2 text-gray-600">
                  <span>No artwork yet? Design it in the browser (or upload finished files after ordering).</span>
                  <Link to={`/designer/${slug}`} className="font-bold text-orange-600">Open designer</Link>
                </p>
              )}
            </div>
<button
  type="button"
  onClick={handlePlaceOrder}
  disabled={!quote || loadingQuote || placingOrder}
  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-4 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  {placingOrder
    ? "Placing your order..."
    : user
      ? "Place order"
      : "Login to place order"}
</button>

<p className="mt-3 text-center text-xs text-gray-400">
  Your final price is verified securely by our server.
  Payment integration will follow in a separate phase.
</p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductDetails;
