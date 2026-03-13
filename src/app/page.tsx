"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Calendar, MapPin, Users, Building, Video, ArrowRight, Instagram, Twitter, Facebook, ExternalLink, ShieldCheck, Mail, Smartphone, Tent } from "lucide-react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import gsap from "gsap";
import styles from "./page.module.css";

const Particles = () => {
  const [particles, setParticles] = useState<{
    id: number, x: number, y: number, size: number, duration: number, delay: number, color: string
  }[]>([]);

  useEffect(() => {
    const pts = [...Array(60)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 3,
      // Neon/star themes
      color: ["#ffffff", "#silver", "#8a2be2", "#00ffff"][Math.floor(Math.random() * 4)]
    }));
    setParticles(pts);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 1, 0.8, 0],
            scale: [0, 1, 1.2, 1, 0],
            y: [`${p.y}%`, `${p.y - 10}%`]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: "50%",
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
          }}
        />
      ))}
    </div>
  );
};



const ParticleSphere = ({ isExiting }: { isExiting: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Create sphere particles
  const [positions] = useState(() => {
    const coords = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      // Start scattered, will animate to sphere
      const scatter = Math.random() * 5 + 1;
      const r = 2 * scatter; 
      
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[i * 3 + 2] = r * Math.cos(phi);
    }
    return coords;
  });

  const [colors] = useState(() => {
    const c = new Float32Array(3000 * 3);
    const colorChoices = [
      new THREE.Color("#8a2be2"), // Purple
      new THREE.Color("#00ffff"), // Cyan
      new THREE.Color("#ffffff"), // White
      new THREE.Color("#c0c0c0")  // Silver
    ];
    for (let i = 0; i < 3000; i++) {
      const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    return c;
  });

  useEffect(() => {
    if (!pointsRef.current) return;
    
    const positionsAttr = pointsRef.current.geometry.attributes.position;
    const array = positionsAttr.array as Float32Array;
    
    // Initial gathering animation
    const targets = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 1.5; // Final sphere radius
      
      targets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      targets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      targets[i * 3 + 2] = r * Math.cos(phi);
    }

    const tl = gsap.timeline();
    
    // Gather into sphere
    tl.to(array, {
      endArray: Array.from(targets),
      duration: 3,
      ease: "power2.inOut",
      onUpdate: () => {
        if(pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    });

    if (isExiting) {
      // Explode outwards towards camera (tunnel effect)
      const explodeTargets = new Float32Array(3000 * 3);
      for (let i = 0; i < 3000; i++) {
        const x = array[i*3];
        const y = array[i*3+1];
        const z = array[i*3+2];
        const dist = Math.sqrt(x*x + y*y + z*z);
        
        // Push particles past camera Z and spread them wide
        explodeTargets[i*3] = (x/dist) * (Math.random() * 20 + 10);
        explodeTargets[i*3+1] = (y/dist) * (Math.random() * 20 + 10);
        explodeTargets[i*3+2] = Math.random() * 10 + 5; 
      }

      gsap.to(array, {
        endArray: Array.from(explodeTargets),
        duration: 1.5,
        ease: "power3.in",
        onUpdate: () => {
          if(pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
        }
      });
      
      // Also scale the whole thing up
      gsap.to(pointsRef.current.scale, {
        x: 5, y: 5, z: 5,
        duration: 1.5,
        ease: "power3.in"
      });
    }

    return () => { tl.kill(); };
  }, [isExiting]);

  useFrame((state) => {
    if (pointsRef.current && !isExiting) {
      // Slow rotation mimicking disco ball
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      
      // Pulse scale slightly to fake music beat
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.02;
      pointsRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors}>
      <PointMaterial
        transparent
        vertexColors
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

const CinematicLoader = ({ onComplete }: { onComplete: () => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
    // Trigger the exit animation sequence after loading time
    const finishTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 1500); // 1.5s for explosion animation
    }, 4500);

    return () => {
      clearTimeout(finishTimer);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [onComplete]);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 1 }} // Fade out background very end
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#05020a", // Deep luxury violet-black
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        perspective: "1000px"
      }}
    >
      {/* Background Fog & Atmosphere */}
      <motion.div
        animate={{ opacity: isExiting ? 0 : 0.6 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 70%)",
          zIndex: 1,
          pointerEvents: "none"
        }}
      />

      {/* Laser Light Sweeps */}
      {!isExiting && [...Array(2)].map((_, i) => (
        <motion.div
          key={`laser-${i}`}
          initial={{ rotate: i === 0 ? -45 : 45, opacity: 0 }}
          animate={{
            rotate: i === 0 ? [-45, 45, -45] : [45, -45, 45],
            opacity: [0, 0.4, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 3 }}
          style={{
            position: "absolute",
            width: "200%",
            height: "100px",
            background: "linear-gradient(90deg, transparent 40%, rgba(0,255,255,0.08) 50%, transparent 60%)",
            top: "50%",
            left: "-50%",
            transformOrigin: "center",
            zIndex: 2,
            filter: "blur(8px)",
            pointerEvents: "none"
          }}
        />
      ))}

      {/* 3D Particle Sphere Canvas */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <ParticleSphere isExiting={isExiting} />
        </Canvas>
      </div>

      {/* Branding Overlay (Fades out when zooming) */}
      <motion.div
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "absolute",
          bottom: "15%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 10
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1 }}
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            fontWeight: 800,
            letterSpacing: "4px",
            color: "#fff",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(138,43,226,0.8), 0 0 40px rgba(0,255,255,0.4)",
            margin: "0 0 20px 0"
          }}
        >
          HubO Events
        </motion.h1>

        {/* Minimal Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          style={{
            width: "150px",
            height: "2px",
            background: "rgba(255,255,255,0.1)",
            position: "relative",
            overflow: "hidden",
            borderRadius: "2px"
          }}
        >
          <motion.div
            animate={{ left: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, #8a2be2, #00ffff, transparent)",
              boxShadow: "0 0 10px rgba(0,255,255,0.8)"
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default function Home() {
  const [isLoaderActive, setIsLoaderActive] = useState(true);
  const [ticketData, setTicketData] = useState({
    name: "",
    email: "",
    phone: "",
    event: "neon-nights",
    type: "general",
    aadhaar: "",
    address: "",
    category: "Dance"
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeEventIdx, setActiveEventIdx] = useState(1);

  const eventsList = [
    { title: "Neon Nights Festival", date: "Oct 15, 2026", loc: "Mumbai Arena", img: "https://images.unsplash.com/photo-1502444330042-d1a1ddf9d261?q=80&w=1200&auto=format&fit=crop" },
    { title: "The Rhythm Project", date: "Nov 02, 2026", loc: "Delhi State", img: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1200&auto=format&fit=crop" },
    { title: "Midnight Sun Gala", date: "Dec 31, 2026", loc: "Goa Beach Club", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop" }
  ];

  const nextEvent = () => setActiveEventIdx((prev) => (prev + 1) % eventsList.length);
  const prevEvent = () => setActiveEventIdx((prev) => (prev - 1 + eventsList.length) % eventsList.length);

  const TICKET_PRICES: Record<string, number> = {
    general: 1,
    vip: 1,
    earlyBird: 1
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const amount = Math.round(TICKET_PRICES[ticketData.type]); // Removed * quantity

      // 1. Register user as pending in DB
      let registrationId = null;
      try {
        const regRes = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ticketData, amount })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.message || "Registration failed");
        registrationId = regData.id;
      } catch (e: unknown) {
        alert("Failed to register: " + (e instanceof Error ? e.message : String(e)));
        setIsProcessing(false);
        return;
      }

      // 2. Create Paytm order
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, registrationId })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Failed to create complete payment initiation! Please try again.");
        setIsProcessing(false);
        return;
      }

      // Build Paytm Form Submission
      const paytmForm = document.createElement('form');
      paytmForm.action = `https://${data.environment}/theia/api/v1/showPaymentPage?mid=${data.mid}&orderId=${data.orderId}`;
      paytmForm.method = 'POST';

      const fields = {
        'mid': data.mid,
        'orderId': data.orderId,
        'txnToken': data.txnToken,
      };

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value || '';
        paytmForm.appendChild(input);
      }

      document.body.appendChild(paytmForm);
      paytmForm.submit();

    } catch (err) {
      console.error(err);
      alert("An error occurred during payment processing.");
      setIsProcessing(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8 }
  };

  return (
    <>
      <AnimatePresence>
        {isLoaderActive && (
          <CinematicLoader onComplete={() => setIsLoaderActive(false)} />
        )}
      </AnimatePresence>
      <main className={styles.main}>
        {/* NAVBAR */}
        <nav className={styles.navbar}>
          <div className={styles.navLinks}>
            <a href="#events" className={styles.navLink}>Upcoming Shows</a>
            <a href="#about" className={styles.navLink}>About Us</a>
          </div>

          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <span>H</span>
            </div>
            <div className={styles.logoTextContainer}>
              <span className={styles.logoTitle}>HUBO EVENTS</span>
              <span className={styles.logoSubtitle}>NIGHTLIFE / ENTERTAINMENT</span>
            </div>
          </div>

          <div className={styles.navLinks}>
            <a href="#gallery" className={styles.navLink}>Past Events</a>
            <a href="#tickets" className={styles.navLink}>Contact Us</a>
          </div>
        </nav>

        {/* 1. HERO SECTION */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8))', position: 'absolute', zIndex: 1 }} />
            {/* using Unsplash high-res image for now to simulate cinematic nightlife */}
            <img src="https://images.unsplash.com/photo-1540039155732-680e74e4ce42?q=80&w=2000&auto=format&fit=crop" alt="Nightlife Event" />
          </div>

        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          style={{ position: "relative", display: "inline-block" }}
        >
          <motion.h1
            className={styles.headline}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            style={{ whiteSpace: "nowrap", fontSize: "clamp(1.5rem, 5vw, 6rem)", letterSpacing: "2px" }}
          >
            INSTAGRAM KE DHURANDAR
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{
              position: "absolute",
              bottom: "-20px",
              right: "0",
              fontFamily: "var(--font-outfit)",
              fontSize: "clamp(0.45rem, 0.8vw, 0.75rem)",
              fontWeight: 400,
              letterSpacing: "3px",
              color: "rgba(255, 255, 255, 0.7)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)"
            }}
          >
            PRESENTED BY HUBO EVENTS
          </motion.p>
        </motion.div>
      </section>

        {/* 3. ABOUT HUBO EVENTS & STATS */}
        <section className={styles.aboutSection} id="about">
          <div className={styles.aboutBg}>
            <div className={styles.aboutOverlay} />
            <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=2000&auto=format&fit=crop" alt="About Nightlife" />
          </div>

          <div className={styles.aboutGrid}>
            <div className={styles.aboutLeft}>
              <h2 className={styles.aboutTitle}>
                HUBO <br />EVENTS
              </h2>
              <p className={styles.aboutSubtitle}>
                THE MASTERMIND BEHIND INNOVATIVE NIGHTLIFE EXPERIENCES
              </p>
            </div>

            <div className={styles.aboutCenter}>
              <div className={styles.circleContainer}>
                <div className={styles.circleTextWrapper}>
                  <svg viewBox="0 0 100 100" className={styles.circleSvg}>
                    <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="transparent" />
                    <text>
                      <textPath href="#circlePath" startOffset="0%">
                        - ABOUT US - ABOUT US - ABOUT US - ABOUT US
                      </textPath>
                    </text>
                  </svg>
                </div>
                <div className={styles.circleArrow}>↗</div>
              </div>
            </div>

            <div className={styles.aboutRight}>
              <div className={`${styles.statPillar} ${styles.pillarDark}`}>
                <div className={styles.statContent}>
                  <p>CELEBRITY<br />EVENTS</p>
                  <h3>100+</h3>
                </div>
              </div>
              <div className={`${styles.statPillar} ${styles.pillarPink}`}>
                <div className={styles.statContent}>
                  <p>REACH</p>
                  <h3>350M+</h3>
                </div>
              </div>
              <div className={`${styles.statPillar} ${styles.pillarDarker}`}>
                <div className={styles.statContent}>
                  <p>FOLLOWERS</p>
                  <h3>60k</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. UPCOMING SHOWS CAROUSEL */}
        <section className={styles.carouselSection} id="events">
          <div className={styles.carouselContainer}>
            <div className={`${styles.navCircle} ${styles.prev}`} onClick={prevEvent}>
              Prev
            </div>

            {eventsList.map((event, idx) => {
              let itemClass = styles.inactive;
              if (idx === activeEventIdx) itemClass = styles.active;

              return (
                <div
                  key={idx}
                  className={`${styles.carouselItem} ${itemClass}`}
                  onClick={() => { if (idx !== activeEventIdx) setActiveEventIdx(idx); }}
                >
                  <img src={event.img} alt={event.title} />
                  {idx === activeEventIdx && (
                    <div className={styles.carouselOverlayCenter}>
                      <button className={styles.carouselOverlayBtn} onClick={(e) => { e.stopPropagation(); scrollToSection('tickets'); }}>
                        Grab Your Tickets
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className={`${styles.navCircle} ${styles.next}`} onClick={nextEvent}>
              Next
            </div>
          </div>

          <div className={styles.carouselDots}>
            {eventsList.map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx === activeEventIdx ? styles.dotActive : ''}`}
                onClick={() => setActiveEventIdx(idx)}
              />
            ))}
          </div>
        </section>

        {/* 6. PAST EVENTS GALLERY */}
        <section className={styles.gallerySection} id="gallery">
          <div className={styles.galleryHeader}>
            <h2 className={styles.galleryTitle}>100,000 SMILES CAPTURED AT OUR EVENTS</h2>
            <p className={styles.galleryDesc}>
              showcases the passion, energy, and unforgettable experiences we&apos;ve created with every event. From electrifying performances to seamless execution, each moment tells a story of collaboration and creativity, bringing together the finest artists and audiences.
            </p>
          </div>
          <div className={styles.galleryGridNew}>
            <img src="https://images.unsplash.com/photo-1540039155732-680e74e4ce42?q=80&w=800&auto=format&fit=crop" alt="Past Event 1" />
            <img src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop" alt="Past Event 2" />
            <img src="https://images.unsplash.com/photo-1470229722913-7c092bb45803?q=80&w=800&auto=format&fit=crop" alt="Past Event 3" />
          </div>
        </section>

        {/* 7. COMMUNITY TESTIMONIALS */}
        <section className={styles.communitySection} id="community">
          <div className={styles.communityHeader}>
            <h4 className={styles.communitySubtitle}>Community</h4>
            <h2 className={styles.communityTitle}>What People Say</h2>
          </div>
          <div className={styles.testimonialsGrid}>
            {[
              { quote: "The best concert experience I've ever had. HubO knows how to put on a show!", author: "Sarah J.", role: "Attendee" },
              { quote: "Seamless organization and an absolutely electric atmosphere from start to finish.", author: "Rahul M.", role: "Music Blogger" },
              { quote: "Partnering with HubO Events elevated our brand launch to a completely new level.", author: "Priya K.", role: "Marketing Director" }
            ].map((testimonial, idx) => (
              <motion.div key={idx} className={styles.testimonialCard} {...fadeIn} transition={{ delay: idx * 0.2 }}>
                <p className={styles.testimonialText}>&quot;{testimonial.quote}&quot;</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{testimonial.author.charAt(0)}</div>
                  <div>
                    <h4 className={styles.authorName}>{testimonial.author}</h4>
                    <span className={styles.authorRole}>{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 8. PARTNER BRANDS */}
        <section className={styles.brandsSection}>
          <div className={styles.brandsMarquee}>
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'inline-block' }}>
                {["Redbull", "Spotify", "BookMyShow", "MTV", "VH1", "Sunburn", "Tomorrowland", "Smirnoff"].map((brand, idx) => (
                  <span key={idx} className={styles.brandItem}>{brand}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* 9. TICKETS & PAYMENT SECTION */}
        <section className={`${styles.section} ${styles.tickets}`} id="tickets">
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionSubtitle}>Quick Checkout</h4>
            <h2 className={styles.sectionTitle}>Secure Your Spot</h2>
          </div>

          <motion.div className={styles.paymentSection} {...fadeIn}>
            {ticketStatus === "success" ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#000' }}>
                  <ShieldCheck size={40} />
                </div>
                <h3 style={{ fontSize: '2rem', marginBottom: '15px', color: 'var(--accent-blue)' }}>Payment Successful!</h3>
                <p style={{ color: '#aaa', fontSize: '1.2rem', marginBottom: '30px' }}>
                  Your tickets for {ticketData.event.replace('-', ' ').toUpperCase()} have been sent to <strong>{ticketData.email}</strong>.
                </p>
                <button className="button-primary" onClick={() => setTicketStatus("idle")}>
                  Book Another Event
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

                  <div className={styles.formGroup}>
                    <label>Aadhaar Card ID</label>
                    <input type="text" required placeholder="1234 5678 9012" value={ticketData.aadhaar} onChange={e => setTicketData({ ...ticketData, aadhaar: e.target.value })} />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Full Address</label>
                    <textarea required placeholder="123 Street Name, City, State" value={ticketData.address} onChange={e => setTicketData({ ...ticketData, address: e.target.value })} className={styles.textareaCustom}></textarea>
                  </div>
                </div>

                <div className={styles.ticketSummary}>
                  <div className={styles.summaryRow}>
                    <span>1x Ticket</span>
                    <span>₹{TICKET_PRICES[ticketData.type]}</span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Total Payable</span>
                    <span>₹{Math.round(TICKET_PRICES[ticketData.type])}</span>
                  </div>
                </div>

                <button type="submit" className={`button-primary ${styles.submitBtn}`} disabled={isProcessing}>
                  {isProcessing ? "Processing via Razorpay..." : (
                    <>Buy Tickets Now <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </section>

        {/* 10. PRE-FOOTER BANNER & FOOTER */}
        <div className={styles.pinkBanner}>
          <h2 className={styles.bannerTitle}>HUBO EVENTS</h2>
          <p className={styles.bannerSubtitle}>NIGHTLIFE / ENTERTAINMENT</p>
        </div>

        <footer className={styles.newFooter}>
          <div className={styles.footerContent}>
            <div className={styles.footerLinksRow}>
              <a href="#home">. Home</a>
              <a href="#events">. Upcoming Shows</a>
              <a href="#gallery">. Past Events</a>
              <a href="#about">. About Us</a>
              <a href="#tickets">. Contact Us</a>
            </div>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.circleSocial}><Instagram size={18} /></a>
              <a href="#" className={styles.circleSocial}><Twitter size={18} /></a>
              <a href="#" className={styles.circleSocial}><Facebook size={18} /></a>
            </div>
          </div>
          <div className={styles.footerDivider} />
          <div className={styles.footerCopyright}>
            Team Innovation &copy; {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </footer>
      </main>
    </>
  );
}