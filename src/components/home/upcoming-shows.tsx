"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import styles from "@/app/page.module.css";

export default function UpcomingShows() {
  const router = useRouter();
  const [activeEventIdx, setActiveEventIdx] = useState(0);

  const eventsList = [
    { title: "Neon Nights Festival", date: "Oct 15, 2026", loc: "Mumbai Arena", img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop" },
    { title: "The Rhythm Project", date: "Nov 02, 2026", loc: "Delhi State", img: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1200&auto=format&fit=crop" },
    { title: "Midnight Sun Gala", date: "Dec 31, 2026", loc: "Goa Beach Club", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop" }
  ];

  const nextEvent = () => setActiveEventIdx((prev) => (prev + 1) % eventsList.length);
  const prevEvent = () => setActiveEventIdx((prev) => (prev - 1 + eventsList.length) % eventsList.length);

  return (
    <>
      {/* 5. UPCOMING SHOWS CAROUSEL */}
      <section className={styles.carouselSection} id="upcoming-shows">
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

      {/* 6. ABOUT THE EVENT */}
      <section className={styles.gallerySection} id="gallery-section">
        <div className={styles.galleryHeader}>
          <h2 className={styles.galleryTitle}>WHAT IS DHURANDHAR INSTA SE?</h2>
          <p className={styles.galleryDesc}>
            India&apos;s biggest national talent showdown is here. Performers from every corner of the country come together to compete in <strong>Dance, Music, Comedy &amp; Mimicry</strong> — live on one electrifying stage. Whether you&apos;re a trained artist or a raw talent waiting to be discovered, this is your moment to shine.
          </p>
        </div>

        {/* Talent Category Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          padding: '0 5%',
          marginBottom: '60px'
        }}>
          {[
            { emoji: '🕺', label: 'Dance', desc: 'From classical to hip-hop, every style welcome.' },
            { emoji: '🎤', label: 'Music', desc: 'Singers, rappers, instrumentalists — all genres.' },
            { emoji: '😂', label: 'Comedy', desc: 'Make the crowd laugh and win them over.' },
            { emoji: '🎭', label: 'Mimicry', desc: 'Impersonate and impress a national audience.' },
          ].map(({ emoji, label, desc }) => (
            <div key={label} style={{
              background: 'linear-gradient(135deg, rgba(20,10,35,0.9), rgba(10,5,20,0.95))',
              border: '1px solid rgba(138,43,226,0.25)',
              borderRadius: '20px',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(138,43,226,0.08)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 40px rgba(138,43,226,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 30px rgba(138,43,226,0.08)';
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>{emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800, fontSize: '1.3rem', color: '#fff', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>{label}</h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Cash Prize Banner */}
        <div style={{
          margin: '0 5% 60px',
          padding: '40px 32px',
          background: 'linear-gradient(135deg, rgba(255,42,133,0.12), rgba(138,43,226,0.15), rgba(0,255,255,0.08))',
          border: '1px solid rgba(255,42,133,0.3)',
          borderRadius: '24px',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(255,42,133,0.1)',
        }}>
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '4px', textTransform: 'uppercase', color: 'var(--accent-pink)', marginBottom: '12px' }}>Winners Take Home</p>
          <h3 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: '#fff', letterSpacing: '2px', textShadow: '0 0 40px rgba(255,42,133,0.4)' }}>
            CASH PRIZES 💰
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '14px', fontSize: '1rem', maxWidth: '500px', margin: '14px auto 0' }}>
            Top performers in each category compete for exciting cash prizes and national recognition. Your talent. Your stage. Your time.
          </p>
        </div>

        <div className={styles.galleryGridNew}>
          <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop" alt="Event Crowd" />
          <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=800&auto=format&fit=crop" alt="Live Performance" />
          <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop" alt="Stage Energy" />
        </div>
      </section>
    </>
  );
}
