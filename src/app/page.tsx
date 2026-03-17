"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Music, Calendar, MapPin, Users, Building, Video, ArrowRight, Instagram, Twitter, Facebook, ExternalLink, ShieldCheck, Mail, Smartphone, Tent } from "lucide-react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import gsap from "gsap";
import styles from "./page.module.css";
import ScrollExpandHero from "@/components/blocks/scroll-expansion-hero";

// Extend window interface to recognize Paytm
declare global {
  interface Window {
    Paytm: any;
  }
}

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
        if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    });

    if (isExiting) {
      // Explode outwards towards camera (tunnel effect)
      const explodeTargets = new Float32Array(3000 * 3);
      for (let i = 0; i < 3000; i++) {
        const x = array[i * 3];
        const y = array[i * 3 + 1];
        const z = array[i * 3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);

        // Push particles past camera Z and spread them wide
        explodeTargets[i * 3] = (x / dist) * (Math.random() * 20 + 10);
        explodeTargets[i * 3 + 1] = (y / dist) * (Math.random() * 20 + 10);
        explodeTargets[i * 3 + 2] = Math.random() * 10 + 5;
      }

      gsap.to(array, {
        endArray: Array.from(explodeTargets),
        duration: 1.5,
        ease: "power3.in",
        onUpdate: () => {
          if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
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
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("INITIALIZING SYSTEM...");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Progress bar simulation
    const duration = 4000; // Load over 4 seconds
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      // Change loading text based on progress
      if (newProgress > 85) setLoadingText("WELCOME TO...");
      else if (newProgress > 60) setLoadingText("RENDERING NEON LIGHTS...");
      else if (newProgress > 35) setLoadingText("CONNECTING GUEST LIST...");
      else if (newProgress > 15) setLoadingText("CONFIGURING AUDIO ENGINES...");
    }, intervalTime);

    // Timing for exit
    const finishTimer = setTimeout(() => {
      setIsExiting(true);
      clearInterval(progressInterval);
      setTimeout(onComplete, 2000); // 2s exit animation
    }, 4500);

    return () => {
      clearTimeout(finishTimer);
      clearInterval(progressInterval);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [onComplete]);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#020104",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        perspective: "1000px"
      }}
    >
      {/* Soft overlay bloom for the scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, rgba(138,43,226,0.1) 0%, rgba(0,0,0,0) 60%)",
          zIndex: 2,
          pointerEvents: "none"
        }}
      />

      {/* 3D Particle Sphere Canvas */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <ParticleSphere isExiting={isExiting} />
        </Canvas>
      </div>

      {/* Dynamic Text Information */}
      <motion.div
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -50 : 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: "absolute",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
          textAlign: "center"
        }}
      >
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "clamp(3.5rem, 8vw, 6rem)",
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#ffffff",
          textShadow: "0 0 30px rgba(138,43,226,0.3), 0 0 60px rgba(0,255,255,0.2)",
          marginBottom: "1.5rem",
          lineHeight: 1.1
        }}>
          HUBO<br />EVENTS
        </h1>

        {/* Progress Bar Container */}
        <div style={{
          width: '200px',
          height: '6px', /* thicker, cuter bar */
          background: 'rgba(255,255,255,0.15)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px'
        }}>
          {/* Active Progress Fill */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #8a2be2, #00ffff)',
            boxShadow: '0 0 10px rgba(0,255,255,0.5)',
            transition: 'width 0.1s linear',
            borderRadius: '10px'
          }} />
        </div>

        <span style={{
          fontFamily: "var(--font-fredoka)",
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '2px',
          color: 'rgba(255,255,255,0.7)',
          marginTop: '0.8rem',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {Math.floor(progress)}%
        </span>
      </motion.div>
    </motion.div>
  );
};

export default function Home() {
  const [isLoaderActive, setIsLoaderActive] = useState(true);
  const router = useRouter();
  const [activeEventIdx, setActiveEventIdx] = useState(0);

  const eventsList = [
    { title: "Neon Nights Festival", date: "Oct 15, 2026", loc: "Mumbai Arena", img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop" },
    { title: "The Rhythm Project", date: "Nov 02, 2026", loc: "Delhi State", img: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1200&auto=format&fit=crop" },
    { title: "Midnight Sun Gala", date: "Dec 31, 2026", loc: "Goa Beach Club", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop" }
  ];

  const nextEvent = () => setActiveEventIdx((prev) => (prev + 1) % eventsList.length);
  const prevEvent = () => setActiveEventIdx((prev) => (prev - 1 + eventsList.length) % eventsList.length);

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

          <div className={styles.navLinks} style={{ alignItems: 'center' }}>
            <a href="#tickets" className={styles.navLink}>Contact Us</a>
            <button
              onClick={() => router.push('/checkout')}
              style={{
                background: 'var(--accent-pink)',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginLeft: '10px'
              }}
            >
              Buy Tickets
            </button>
          </div>
        </nav>

        {/* 1. HERO SECTION */}
        <ScrollExpandHero
          videoSrcs={['/dancing.mp4', '/singing.mp4', '/dialogue.mp4']}
          title="DHURANDHAR INSTA KE"
          subtitle="PRESENTED BY HUBO EVENTS"
          scrollToExpand="Scroll to expand"
        />

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
                        ABOUT US - ABOUT US
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

        {/* 4. ORGANIZED BY MONICA GULATI (Separate Section) */}
        <section style={{
          position: 'relative',
          padding: '100px 5%',
          background: 'var(--background)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3rem',
          width: '100%',
          zIndex: 10,
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <h3 style={{
            fontFamily: 'var(--font-outfit)', 
            fontSize: 'clamp(1.8rem, 5vw, 3rem)', 
            fontWeight: 800, 
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#ffffff',
            textAlign: 'center',
            textShadow: '0 0 15px rgba(255,42,133,0.3)',
          }}>
            Organized By Monica Gulati
          </h3>
          
          {/* Glowing Placeholder Image */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full" style={{ padding: '3px' }}>
            <div className="rgb-border-glow rounded-full" style={{ opacity: 0.3, filter: 'blur(8px)' }} />
            <div className="rgb-border-wrapper rounded-full" style={{ opacity: 0.5 }} />
            
            <div 
              className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center z-10"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(5,5,10,0.9))',
                backdropFilter: 'blur(10px)',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
              }}
            >
              <span style={{ 
                fontFamily: 'var(--font-outfit)', 
                letterSpacing: '3px', 
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textAlign: 'center',
                padding: '20px'
              }}>
                IMAGE PLACEHOLDER
              </span>
            </div>
          </div>

          <h4 style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '1rem',
            fontWeight: 500,
            letterSpacing: '4px',
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: '-1rem'
          }}>
            CEO OF HUBO EVENT
          </h4>
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
                      <button className={styles.carouselOverlayBtn} onClick={(e) => { e.stopPropagation(); router.push('/checkout'); }}>
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
            <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop" alt="Past Event 1" />
            <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=800&auto=format&fit=crop" alt="Past Event 2" />
            <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop" alt="Past Event 3" />
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

        {/* 9. CONTACT SECTION */}
        <section className={`${styles.section} ${styles.tickets}`} id="tickets">
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionSubtitle}>Get In Touch</h4>
            <h2 className={styles.sectionTitle}>Contact HubO Events</h2>
          </div>

          <motion.div className={styles.paymentSection} {...fadeIn}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', textAlign: 'center' }}>
              <div>
                <MapPin size={32} style={{ color: 'var(--accent-pink)', marginBottom: '15px' }} />
                <h4 style={{ color: '#fff', marginBottom: '10px' }}>Our Location</h4>
                <p style={{ color: '#aaa' }}>New Delhi, India</p>
              </div>
              <div>
                <Mail size={32} style={{ color: 'var(--accent-blue)', marginBottom: '15px' }} />
                <h4 style={{ color: '#fff', marginBottom: '10px' }}>Email Us</h4>
                <p style={{ color: '#aaa' }}>hubo@gmail.com</p>
              </div>
              <div>
                <Smartphone size={32} style={{ color: '#4ade80', marginBottom: '15px' }} />
                <h4 style={{ color: '#fff', marginBottom: '10px' }}>Call Us</h4>
                <p style={{ color: '#aaa' }}>+91 88514 21341</p>
              </div>
            </div>
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
            HuboEvent &copy; {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </footer>
      </main>
    </>
  );
}