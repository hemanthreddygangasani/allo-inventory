"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

type ReservationData = {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetchReservation();
  }, [id]);

  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING") return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(reservation.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setExpired(true);
        clearInterval(timer);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation]);

  async function fetchReservation() {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        setError("Could not find this reservation");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReservation(data);
    } catch {
      setError("Failed to load reservation");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.status === 410) {
        setError(data.error || "Reservation has expired");
        setExpired(true);
        setProcessing(false);
        setReservation((prev) =>
          prev ? { ...prev, status: "RELEASED" } : prev
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not confirm reservation");
        setProcessing(false);
        return;
      }

      setSuccess("Purchase confirmed! Your order has been placed.");
      setReservation((prev) =>
        prev ? { ...prev, status: "CONFIRMED" } : prev
      );
    } catch {
      setError("Something went wrong");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not cancel reservation");
        setProcessing(false);
        return;
      }

      setSuccess("Reservation cancelled. Stock has been released.");
      setReservation((prev) =>
        prev ? { ...prev, status: "RELEASED" } : prev
      );
    } catch {
      setError("Something went wrong");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500">Loading reservation...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error || "Reservation not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING" && !expired;
  const totalPrice = reservation.productPrice * reservation.qty;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            ← Back to Products
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{reservation.productName}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reservation.status === "PENDING" && !expired
                    ? "bg-yellow-100 text-yellow-800"
                    : reservation.status === "CONFIRMED"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {expired && reservation.status === "PENDING"
                  ? "EXPIRED"
                  : reservation.status}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Warehouse</span>
                <span className="text-gray-900">{reservation.warehouseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity</span>
                <span className="text-gray-900">{reservation.qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unit Price</span>
                <span className="text-gray-900">₹{reservation.productPrice}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-900 font-medium">Total</span>
                <span className="text-gray-900 font-bold text-lg">₹{totalPrice}</span>
              </div>
            </div>
          </div>

          {isPending && (
            <div className="bg-yellow-50 border-t border-yellow-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-800">
                  Reservation expires in
                </span>
                <span
                  className={`text-2xl font-mono font-bold ${
                    timeLeft && parseInt(timeLeft.split(":")[0]) < 2
                      ? "text-red-600"
                      : "text-yellow-800"
                  }`}
                >
                  {timeLeft || "..."}
                </span>
              </div>
            </div>
          )}

          {expired && reservation.status === "PENDING" && (
            <div className="bg-red-50 border-t border-red-100 px-6 py-4">
              <p className="text-sm text-red-700">
                This reservation has expired. The stock has been released back.
              </p>
            </div>
          )}

          <div className="p-6 bg-gray-50 border-t border-gray-200">
            {isPending ? (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {processing ? "Processing..." : "Confirm Purchase"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 bg-red-100 text-red-700 py-3 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push("/")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Back to Products
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">
            Reservation ID: {reservation.id}
          </p>
          <p className="text-xs text-gray-400">
            Created: {new Date(reservation.createdAt).toLocaleString()}
          </p>
        </div>
      </main>
    </div>
  );
}
