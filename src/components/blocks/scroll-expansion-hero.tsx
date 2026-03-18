'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ScrollExpandHeroProps {
  videoSrcs: [string, string, string];
  title?: string;
  subtitle?: string;
  scrollToExpand?: string;
}

const BackgroundElements = memo(() => (
  <>
    {/* Scanline texture */}
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
        mixBlendMode: 'overlay',
      }}
    />
  </>
));
BackgroundElements.displayName = 'BackgroundElements';

const ScrollExpandHero = ({
  videoSrcs,
  title = 'DHURANDAR INSTA KE',
  subtitle = 'PRESENTED BY HUBO EVENTS',
  scrollToExpand = 'Scroll to expand',
}: ScrollExpandHeroProps) => {
  // Use Framer Motion values instead of React state for buttery smooth 60fps
  const scrollProgress = useMotionValue(0);
  const isExpanded = useRef(false);
  const touchStartY = useRef(0);
  const [isMobileState, setIsMobileState] = useState(false);

  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isExpanded.current && e.deltaY < 0 && window.scrollY <= 5) {
        isExpanded.current = false;
        e.preventDefault();
      } else if (!isExpanded.current) {
        e.preventDefault();
        const newProgress = Math.min(Math.max(scrollProgress.get() + (e.deltaY * 0.0009), 0), 1);
        scrollProgress.set(newProgress);
        if (newProgress >= 1) isExpanded.current = true;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY.current - touchY;

      if (isExpanded.current && deltaY < -20 && window.scrollY <= 5) {
        isExpanded.current = false;
        e.preventDefault();
      } else if (!isExpanded.current) {
        e.preventDefault();
        const factor = deltaY < 0 ? 0.008 : 0.005;
        const newProgress = Math.min(Math.max(scrollProgress.get() + (deltaY * factor), 0), 1);
        scrollProgress.set(newProgress);
        if (newProgress >= 1) isExpanded.current = true;
        touchStartY.current = touchY;
      }
    };

    const handleTouchEnd = () => { touchStartY.current = 0; };
    const handleScroll = () => { if (!isExpanded.current) window.scrollTo(0, 0); };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollProgress]);

  useEffect(() => {
    const check = () => setIsMobileState(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Compute animated values via useTransform (Zero React re-renders)
  const mediaWidth = useTransform(scrollProgress, [0, 1], [300, isMobileState ? 950 : 1550]);
  const mediaHeight = useTransform(scrollProgress, [0, 1], [400, isMobileState ? 600 : 800]);
  const textTranslateLeft = useTransform(scrollProgress, [0, 1], [0, isMobileState ? -180 : -150]);
  const textTranslateRight = useTransform(scrollProgress, [0, 1], [0, isMobileState ? 180 : 150]);
  const contentOpacity = useTransform(scrollProgress, [0, 1], [1, -0.6]);
  const bgOpacity = useTransform(scrollProgress, [0, 1], [0.9, 0.4]);
  const overlayOpacity = useTransform(scrollProgress, [0, 1], [0.55, 0.1]);

  const firstWord = title.split(' ')[0];
  const restOfTitle = title.split(' ').slice(1).join(' ');

  return (
    <div ref={sectionRef} className="relative overflow-hidden" style={{ height: '100dvh' }}>
      <BackgroundElements />

      <section className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        {/* Expanding 3-column video card */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: mediaWidth, height: mediaHeight, maxWidth: '95vw', maxHeight: '85vh' }}
        >
          {/* Animated gradient border for video card */}
          <motion.div
            className="rgb-border-glow rounded-2xl"
            style={{ opacity: bgOpacity }}
          />
          <motion.div
            className="rgb-border-wrapper rounded-2xl"
            style={{ opacity: bgOpacity }}
          />

          {/* Video card inner */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden z-10 flex pointer-events-none"
            style={{ background: 'rgba(5,0,15,0.6)', backdropFilter: 'blur(10px)' }}>
            {videoSrcs.map((src, i) => (
              <div
                key={i}
                className="relative flex-1 h-full overflow-hidden"
                style={{ borderRight: i < 2 ? '1px solid rgba(138,43,226,0.2)' : 'none' }}
              >
                <video src={src} autoPlay muted loop playsInline preload="auto" className="w-full h-full object-cover" controls={false} />
              </div>
            ))}

            {/* Master darkening overlay */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(5,0,20,0.7) 0%, rgba(10,0,30,0.4) 50%, rgba(5,0,20,0.7) 100%)',
                opacity: overlayOpacity
              }}
            />
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div
          className="relative z-20 flex flex-col items-center justify-center text-center gap-3 w-full pointer-events-none select-none px-4"
          style={{ opacity: contentOpacity }}
        >
          <motion.h1
            className="font-black uppercase"
            style={{
              x: textTranslateLeft,
              fontSize: 'clamp(2.4rem, 7vw, 6.5rem)',
              lineHeight: 1, letterSpacing: '14px', wordSpacing: '16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0aaff 35%, #00ffff 65%, #ffffff 100%)',
              backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginLeft: '14px', // offset letter spacing
            }}
          >
            {firstWord}
          </motion.h1>

          <motion.h1
            className="font-black uppercase"
            style={{
              x: textTranslateRight,
              fontSize: 'clamp(2.4rem, 7vw, 6.5rem)',
              lineHeight: 1, letterSpacing: '14px', wordSpacing: '16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #ff2a85 35%, #e0aaff 65%, #ffffff 100%)',
              backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginLeft: '14px', // offset letter spacing
            }}
          >
            {restOfTitle}
          </motion.h1>

          <p style={{
            fontSize: '0.7rem', letterSpacing: '5px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 500, marginTop: '6px'
          }}>
            {subtitle}
          </p>

          <div style={{ pointerEvents: 'auto', marginTop: '24px' }}>
            <button
              onClick={() => router.push('/checkout')}
              style={{
                padding: '14px 40px', borderRadius: '50px', background: 'linear-gradient(135deg, #8a2be2, #ff2a85)',
                border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '3px', cursor: 'pointer',
                boxShadow: '0 0 30px rgba(138,43,226,0.5), 0 0 60px rgba(255,42,133,0.3)', transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              BUY TICKETS
            </button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none select-none"
          style={{ opacity: useTransform(scrollProgress, [0, 0.25], [1, 0]) }}
        >
          <span style={{ fontSize: '0.6rem', letterSpacing: '4px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
            {scrollToExpand}
          </span>
          <div style={{ width: '20px', height: '36px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4px' }}>
            <motion.div
              style={{ width: '4px', height: '8px', borderRadius: '2px', background: 'linear-gradient(to bottom, #8a2be2, #00ffff)' }}
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default ScrollExpandHero;
