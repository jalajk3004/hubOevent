"use client";

import styles from "@/app/page.module.css";

export default function AboutSection() {
  return (
    <>
      {/* 3. ABOUT HUBO EVENTS & STATS */}
      <section className={styles.aboutSection} id="about-section">
        <div className={styles.aboutBg}>
          <div className={styles.aboutOverlay} />
          <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=2000&auto=format&fit=crop" alt="About Nightlife" />
        </div>

        <div className={styles.aboutGrid}>
          {/* LEFT — Brand name */}
          <div className={styles.aboutLeft}>
            <h2 className={styles.aboutTitle}>
              HUBO <br />EVENTS
            </h2>
            <p className={styles.aboutSubtitle}>
              DESIGNED FOR IMPACT. BUILT FOR THE BIG STAGE.
            </p>
          </div>

          {/* CENTER — Spinning circle */}
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

          {/* RIGHT — Stat cards (no rotation) */}
          <div className={styles.aboutRight}>
            <div className={styles.statCard}>
              <p className={styles.statCardLabel}>NATIONAL LEVEL SHOW</p>
              <h3 className={styles.statCardValue}>IN PRODUCTION</h3>
            </div>
            <div className={`${styles.statCard} ${styles.statCardPink}`}>
              <p className={styles.statCardLabel}>PRIZE POOL</p>
              <h3 className={styles.statCardValue}>₹1,00,000</h3>
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
          Organized By Monika Gulati
        </h3>


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
    </>
  );
}
