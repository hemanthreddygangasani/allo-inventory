"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type StockInfo = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalQty: number;
  reservedQty: number;
  availableQty: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  imageUrl: string;
  stocks: StockInfo[];
};

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      console.log("products data", data);
      setProducts(data);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve() {
    if (!selectedProduct || !selectedWarehouse) return;

    setReserving(true);
    setError("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          warehouseId: selectedWarehouse,
          qty,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error || "Not enough stock available");
        setReserving(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setReserving(false);
        return;
      }

      router.push(`/checkout/${data.id}`);
    } catch {
      setError("Failed to create reservation");
      setReserving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Allo Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse products and reserve items for checkout
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h2 className="text-xl font-semibold mb-1">{selectedProduct.name}</h2>
              <p className="text-sm text-gray-500 mb-4">SKU: {selectedProduct.sku}</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Warehouse
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Choose a warehouse</option>
                  {selectedProduct.stocks.map((s) => (
                    <option
                      key={s.warehouseId}
                      value={s.warehouseId}
                      disabled={s.availableQty === 0}
                    >
                      {s.warehouseName} - {s.availableQty} available
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReserve}
                  disabled={!selectedWarehouse || reserving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {reserving ? "Reserving..." : "Reserve Now"}
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setSelectedWarehouse("");
                    setQty(1);
                    setError("");
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h2>
                  <span className="text-lg font-bold text-green-600">
                    ₹{product.price}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>
                <p className="text-sm text-gray-600 mb-3">{product.description}</p>

                <div className="border-t border-gray-100 pt-3 mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Stock by Warehouse
                  </p>
                  {product.stocks.map((s) => (
                    <div
                      key={s.warehouseId}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-gray-600">{s.warehouseName}</span>
                      <div className="text-right flex flex-col items-end">
                        <span
                          className={
                            s.availableQty > 0 ? "text-green-600 font-medium" : "text-red-500"
                          }
                        >
                          {s.availableQty > 0
                            ? `${s.availableQty} available`
                            : "Out of stock"}
                        </span>
                        <span className="text-[10px] text-orange-500 mt-0.5 font-medium bg-orange-50 px-1.5 rounded border border-orange-100">
                          {s.reservedQty} reserved
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setError("");
                  }}
                  disabled={product.stocks.every((s) => s.availableQty === 0)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {product.stocks.every((s) => s.availableQty === 0)
                    ? "Out of Stock"
                    : "Reserve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
