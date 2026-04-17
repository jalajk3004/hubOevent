"use client";

import styles from "./page.module.css";
import Navbar from "@/components/home/navbar";
import Footer from "@/components/home/footer";
import ScrollExpandHero from "@/components/blocks/scroll-expansion-hero";
import AboutSection from "@/components/home/about-section";
import UpcomingShows from "@/components/home/upcoming-shows";
import ContactSection from "@/components/home/contact-section";

export default function Home() {
  return (
    <main className={styles.main}>
      <Navbar />

      <ScrollExpandHero
        videoSrcs={['/dancing.mp4', '/singing.mp4', '/dialogue.mp4']}
        title="DHURANDHAR INSTA SE"
        subtitle="PRESENTED BY HUBO EVENTS"
        scrollToExpand="Scroll to expand"
      />

      {/* id="about-section" is set inside AboutSection */}
      <AboutSection />

      {/* id="upcoming-shows" and id="gallery-section" are set inside UpcomingShows */}
      <UpcomingShows />

      {/* id="contact-section" is set inside ContactSection */}
      <ContactSection />

      <div className={styles.pinkBanner}>
        <h2 className={styles.bannerTitle}>HUBO EVENTS</h2>
        <p className={styles.bannerSubtitle}>NIGHTLIFE / ENTERTAINMENT</p>
      </div>

      <Footer />
    </main>
  );
}