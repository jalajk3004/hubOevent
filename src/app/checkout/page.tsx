"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, Smartphone } from "lucide-react";
import { EDGE_BASE } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const [ticketData, setTicketData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "Music",
    address: ""
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<"idle" | "success" | "error">("idle");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentMsg = searchParams.get('msg');

    if (paymentStatus === 'success') {
      setTicketStatus('success');
      router.replace('/checkout?status=success');
    } else if (paymentStatus === 'failed' || paymentStatus === 'error') {
      alert(`Payment failed: ${paymentMsg || 'Unknown error. Please try again.'}`);
      setTicketStatus('error');
      router.replace('/checkout');
    }
  }, [searchParams, router]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const amount = 800;

      const res = await fetch(`${EDGE_BASE}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ amount, ticketData })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Failed to initiate payment. Please try again.");
        setIsProcessing(false);
        return;
      }

      const loadRazorpayScript = () => {
        return new Promise((resolve, reject) => {
          if (window.Razorpay) { resolve(true); return; }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      };

      try {
        await loadRazorpayScript();
        const options = {
          key: data.keyId,
          amount: data.amount * 100,
          currency: "INR",
          name: "Hubo Events",
          description: "Dhurandhar Ticket",
          order_id: data.orderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${EDGE_BASE}/verify-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                router.replace('/checkout?payment=success');
              } else {
                alert("Payment verification failed. Contact support with your payment ID: " + response.razorpay_payment_id);
                setIsProcessing(false);
              }
            } catch {
              alert("Verification error. Contact support with your payment ID: " + response.razorpay_payment_id);
              setIsProcessing(false);
            }
          },
          prefill: {
            name: ticketData.name,
            email: ticketData.email,
            contact: ticketData.phone
          },
          theme: { color: "#3B82F6" }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          alert("Payment Failed: " + response.error.description);
          setIsProcessing(false);
        });
        rzp.open();
      } catch (rErr) {
        console.error("Razorpay load error:", rErr);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during payment processing.");
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#05020a] text-white flex flex-col items-center pt-32 pb-12 px-4 md:px-8 font-sans relative w-full">
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-start z-10 md:px-12 bg-[#05020a]/80 backdrop-blur-sm border-b border-[#16121E]">
        <div onClick={() => router.push('/')} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <Image
            src="/hubologo.png"
            alt="Hubo Events Logo"
            width={200}
            height={74}
            style={{ objectFit: 'contain', height: '64px', width: 'auto' }}
            priority
          />
          <div className="flex flex-col" style={{ lineHeight: 1 }}>
            <span className="font-black text-xl tracking-widest text-white uppercase leading-none">HUBO EVENTS</span>
            <span className="text-[10px] text-gray-400 tracking-[0.2em] font-medium" style={{ marginTop: '4px' }}>NIGHTLIFE / ENTERTAINMENT</span>
          </div>
        </div>
      </nav>

      {ticketStatus !== "success" && (
        <div className="flex flex-col items-center text-center mb-8 w-full max-w-2xl mt-auto pt-8">
          <h1 className="text-4xl md:text-5xl font-black uppercase leading-tight flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-4">
            <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e0aaff 35%, #00ffff 65%, #ffffff 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DHURANDHAR
            </span>
            <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #ff2a85 35%, #e0aaff 65%, #ffffff 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              INSTA SE
            </span>
          </h1>
          <p className="text-gray-400 font-medium text-lg tracking-wider uppercase">
            Organized by Monika Gulati
          </p>
        </div>
      )}

      <div className="w-full max-w-lg bg-[#0F0C15] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden mb-auto h-fit">
        {ticketStatus === "success" ? (
          <div className="text-center p-10">
            <div className="w-20 h-20 bg-cyan-400 rounded-full flex items-center justify-center mx-auto mb-5 text-black">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-cyan-400">Payment Successful!</h3>
            <p className="text-gray-400 text-lg mb-8">
              Your registration is confirmed. We have sent the tickets to your registered email address and WhatsApp.
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
              onClick={() => router.push('/')}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 md:p-8 border-b border-gray-800 bg-[#16121E]">
              <div className="mb-6 flex justify-center">
                <p className="text-white flex items-center gap-2 text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-blue-900/40 py-3 px-6 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <span className="text-blue-400 animate-pulse">●</span>
                  <span className="text-gray-200 tracking-wide">Starting from</span>
                  <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] ml-1">30th May</span>
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[#0a080f] p-4 rounded-xl border border-gray-800">
                <Image
                  src="/hubologo.png"
                  alt="Hubo Events Logo"
                  width={150}
                  height={56}
                  style={{ objectFit: 'contain', height: '56px', width: 'auto' }}
                />
                <div>
                  <h3 className="font-semibold text-lg">Hubo Events</h3>
                  <p className="text-sm text-gray-400">Reserve your spot for INR 800 🚀</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePayment} className="p-6 md:p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={ticketData.name} onChange={e => setTicketData({ ...ticketData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a080f] border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600" placeholder="John Doe" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={ticketData.email} onChange={e => setTicketData({ ...ticketData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a080f] border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600" placeholder="john@example.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Whatsapp Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-lg">🇮🇳</span>
                    </div>
                    <input type="tel" required value={ticketData.phone} onChange={e => setTicketData({ ...ticketData, phone: e.target.value })}
                      className="w-full pl-10 px-4 py-3 bg-[#0a080f] border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600" placeholder="+91 98765 43210" />
                  </div>
                  <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                    You will get updates on your <Smartphone size={14} className="text-green-500" /> WhatsApp
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Category <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    {["Music", "Dancing", "Comedy & Mimicry", "Dialogue Delivery"].map((cat) => (
                      <div
                        key={cat}
                        onClick={() => setTicketData({ ...ticketData, category: cat })}
                        className={`cursor-pointer text-center px-1 py-2 sm:px-2 md:py-3 rounded-xl border transition-all duration-300 select-none flex items-center justify-center text-[11px] sm:text-xs md:text-sm leading-snug break-words hyphens-auto min-h-[44px] sm:min-h-[48px] ${ticketData.category === cat
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]'
                          : 'bg-[#0a080f] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 hover:bg-[#16121E]'
                          }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Address <span className="text-red-500">*</span></label>
                  <textarea required value={ticketData.address} onChange={e => setTicketData({ ...ticketData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a080f] border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600 min-h-[100px]" placeholder="123 Street Name, City, State"></textarea>
                </div>
              </div>

              <div className="pt-8">
                <button type="submit" disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
                  {isProcessing ? "Redirecting to Payment..." : "Register Now at ₹800"}
                </button>
              </div>

              <div className="flex justify-center items-center gap-4 pt-4 border-t border-gray-800/50 opacity-60">
                <span className="text-xs font-semibold tracking-wider">UPI</span>
                <span className="text-xs font-semibold tracking-wider">VISA</span>
                <span className="text-xs font-semibold tracking-wider">MasterCard</span>
                <span className="text-xs font-semibold tracking-wider">RuPay</span>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="bg-[#05020a] min-h-screen flex items-center justify-center text-white">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
