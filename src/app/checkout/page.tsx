"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, MapPin, Mail, Smartphone } from "lucide-react";
import styles from "../page.module.css";

// Extend window interface to recognize Paytm
declare global {
  interface Window {
    Paytm: any;
  }
}

function CheckoutContent() {
  const [ticketData, setTicketData] = useState({
    name: "",
    email: "",
    phone: "",
    event: "neon-nights",
    type: "general",
    address: "",
    category: "Dance"
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

  const TICKET_PRICES: Record<string, number> = {
    general: 1,
    vip: 1,
    earlyBird: 1
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const amount = Math.round(TICKET_PRICES[ticketData.type]);

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, ticketData })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Failed to initiate payment. Please try again.");
        setIsProcessing(false);
        return;
      }

      const host = data.host || 'https://securestage.paytmpayments.com';
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
      const scriptUrl = `${cleanHost}/merchantpgpui/checkoutjs/merchants/${data.mid}.js`;

      const loadScript = () => {
        return new Promise((resolve, reject) => {
          // Check if already loaded
          if (window.Paytm && window.Paytm.CheckoutJS) {
            resolve(true);
            return;
          }
          const script = document.createElement("script");
          script.type = "application/javascript";
          script.src = scriptUrl;
          script.crossOrigin = "anonymous";
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error(`Failed to load Paytm SDK from ${scriptUrl}`));
          document.body.appendChild(script);
        });
      };

      try {
        await loadScript();

        const config = {
          "root": "",
          "flow": "CHECKOUT",
          "data": {
            "orderId": data.orderId,
            "token": data.txnToken,
            "tokenType": "TXN_TOKEN",
            "amount": data.amount
          },
          "merchant": {
            "mid": data.mid,
            "redirect": true
          },
          "payMode": {
            "labels": {},
            "filter": { "exclude": [] },
            "order": ["UPI", "CARD", "NB"]
          },
          "handler": {
            "notifyMerchant": function (eventName: string, data: any) {
              console.log("Paytm Notification => ", eventName, data);
            },
            "transactionStatus": function (statusData: any) {
              window.Paytm.CheckoutJS.close();
              const form = document.createElement('form');
              form.action = '/api/verify-payment';
              form.method = 'POST';
              const orderInput = document.createElement('input');
              orderInput.type = 'hidden';
              orderInput.name = 'ORDERID';
              orderInput.value = data.orderId;
              form.appendChild(orderInput);
              document.body.appendChild(form);
              form.submit();
            }
          }
        };

        if (window.Paytm && window.Paytm.CheckoutJS) {
          window.Paytm.CheckoutJS.onLoad(function executeAfterCompleteLoad() {
            window.Paytm.CheckoutJS.init(config).then(function onSuccess() {
              window.Paytm.CheckoutJS.invoke();
            }).catch(function onError(error: any) {
              console.error("Paytm init error", error);
              setIsProcessing(false);
            });
          });
        }
      } catch (scriptErr) {
        console.error("Script load error:", scriptErr);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during payment processing.");
      setIsProcessing(false);
    }
  };

  return (
    <main className={styles.main} style={{ background: '#05020a', minHeight: '100vh', padding: '100px 5%' }}>
      <nav className={styles.navbar}>
        <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div className={styles.logoIcon}><span>H</span></div>
          <div className={styles.logoTextContainer}>
            <span className={styles.logoTitle}>HUBO EVENTS</span>
            <span className={styles.logoSubtitle}>NIGHTLIFE / ENTERTAINMENT</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
          fontWeight: 900, 
          color: '#fff', 
          marginBottom: '20px',
          textAlign: 'center',
          textTransform: 'uppercase'
        }}>Checkout</h1>
        
        <div className={styles.paymentSection} style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}>
          {ticketStatus === "success" ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: '80px', height: '80px', background: '#00ffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#000' }}>
                <ShieldCheck size={40} />
              </div>
              <h3 style={{ fontSize: '2rem', marginBottom: '15px', color: '#00ffff' }}>Payment Successful!</h3>
              <p style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '30px' }}>
                Your registration is confirmed. We have sent the tickets to your registered email address and WhatsApp.
              </p>
              <button className="button-primary" onClick={() => router.push('/')}>
                Back to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handlePayment}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input type="text" required placeholder="John Doe" value={ticketData.name} onChange={e => setTicketData({ ...ticketData, name: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input type="email" required placeholder="john@example.com" value={ticketData.email} onChange={e => setTicketData({ ...ticketData, email: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input type="tel" required placeholder="+91 98765 43210" value={ticketData.phone} onChange={e => setTicketData({ ...ticketData, phone: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>Select Event</label>
                  <select value={ticketData.event} onChange={e => setTicketData({ ...ticketData, event: e.target.value })}>
                    <option value="neon-nights">Neon Nights Festival - Oct 15</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Category</label>
                  <select value={ticketData.category} onChange={e => setTicketData({ ...ticketData, category: e.target.value })}>
                    <option value="Dance">Dance</option>
                    <option value="Singing">Singing</option>
                    <option value="Dialogue Mimicry">Dialogue Mimicry</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Full Address</label>
                  <textarea required placeholder="123 Street Name, City, State" value={ticketData.address} onChange={e => setTicketData({ ...ticketData, address: e.target.value })} className={styles.textareaCustom} style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '15px' }}></textarea>
                </div>
              </div>

              <div className={styles.ticketSummary}>
                <div className={styles.summaryRow}>
                  <span>1x Ticket Registration</span>
                  <span>₹{TICKET_PRICES[ticketData.type]}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.total}`}>
                  <span>Total Payable</span>
                  <span>₹{Math.round(TICKET_PRICES[ticketData.type])}</span>
                </div>
              </div>

              <button type="submit" className={`button-primary ${styles.submitBtn}`} disabled={isProcessing}>
                {isProcessing ? "Redirecting to Paytm..." : (
                  <>Proceed to Payment <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ background: '#05020a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
