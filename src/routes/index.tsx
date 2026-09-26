import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Instagram, Mail, Menu, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AMARA — Model & Creative" },
      { name: "description", content: "Portfólio oficial de Amara — modelo, editorial e campanhas de moda." },
      { property: "og:title", content: "AMARA — Model & Creative" },
      { property: "og:description", content: "Model portfolio, editorials and fashion campaigns." },
    ],
  }),
  component: ModelPortfolio,
});

const gallery = [
  {
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    title: "Noir / 01",
    type: "Editorial",
  },
  {
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
    title: "Sculpted Light",
    type: "Campaign",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
    title: "City Forms",
    type: "Fashion",
  },
  {
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    title: "Soft Power",
    type: "Portrait",
  },
  {
    image: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85",
    title: "After Dark",
    type: "Editorial",
  },
  {
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=85",
    title: "Natural State",
    type: "Campaign",
  },
];

function ModelPortfolio() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <main className="model-site">
      <header className="model-nav">
        <a href="#top" className="model-logo" onClick={closeMenu}>AMARA<span>.</span></a>
        <nav className={open ? "model-links is-open" : "model-links"}>
          <a href="#about" onClick={closeMenu}>Sobre</a>
          <a href="#portfolio" onClick={closeMenu}>Portfólio</a>
          <a href="#details" onClick={closeMenu}>Perfil</a>
          <a href="#contact" onClick={closeMenu}>Booking</a>
        </nav>
        <a href="#contact" className="model-book desktop-book">BOOK ME <ArrowUpRight size={15} /></a>
        <button className="mobile-menu" aria-label="Abrir menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </header>

      <section id="top" className="model-hero">
        <div className="hero-copy">
          <p className="eyebrow">MODEL · CREATIVE · AFRICA</p>
          <h1>Presence<br /><em>in motion.</em></h1>
          <p className="hero-description">
            Modelo profissional com uma linguagem visual contemporânea,
            natural e expressiva.
          </p>
          <a href="#portfolio" className="circle-link" aria-label="Ver portfólio">
            <ArrowDown size={20} />
          </a>
        </div>
        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce0?auto=format&fit=crop&w=1500&q=90"
            alt="Modelo em editorial de moda"
          />
          <span className="hero-index">01 / 06</span>
        </div>
      </section>

      <section id="about" className="model-intro section-pad">
        <div className="section-label">01 — SOBRE</div>
        <div className="intro-grid">
          <h2>Elegância que<br /><em>fala sem palavras.</em></h2>
          <div>
            <p className="lead">
              Meu trabalho combina presença, movimento e autenticidade para
              criar imagens que permanecem.
            </p>
            <p>
              Disponível para editoriais, campanhas, beauty, lifestyle,
              desfiles e projetos criativos. Base em Maputo, disponível para
              trabalhos internacionais.
            </p>
            <a href="#contact" className="text-link">Trabalhar comigo <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </section>

      <section id="portfolio" className="portfolio-section section-pad">
        <div className="portfolio-head">
          <div>
            <div className="section-label">02 — PORTFÓLIO</div>
            <h2>Selected <em>work.</em></h2>
          </div>
          <p>Editorial · Campaign · Beauty · Lifestyle</p>
        </div>
        <div className="fashion-grid">
          {gallery.map((item, index) => (
            <article className={index % 3 === 0 ? "fashion-card tall" : "fashion-card"} key={item.title}>
              <img src={item.image} alt={item.title} loading={index > 1 ? "lazy" : "eager"} />
              <div className="card-caption">
                <span>{item.type}</span>
                <strong>{item.title}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="details" className="profile-section">
        <div className="profile-photo">
          <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1100&q=85" alt="Retrato profissional" loading="lazy" />
        </div>
        <div className="profile-content">
          <div className="section-label">03 — PROFILE</div>
          <h2>The <em>details.</em></h2>
          <div className="measurements">
            <div><span>Height</span><b>178 cm</b></div>
            <div><span>Bust</span><b>84 cm</b></div>
            <div><span>Waist</span><b>61 cm</b></div>
            <div><span>Hips</span><b>89 cm</b></div>
            <div><span>Shoe</span><b>39 EU</b></div>
            <div><span>Base</span><b>Maputo, MZ</b></div>
          </div>
          <p className="profile-note">* Informações demonstrativas — personalize este perfil com os dados reais da modelo.</p>
        </div>
      </section>

      <section id="contact" className="booking-section section-pad">
        <div className="section-label">04 — BOOKING</div>
        <div className="booking-grid">
          <div>
            <h2>Let's create<br /><em>something.</em></h2>
            <p>Para bookings, campanhas, editoriais ou colaborações criativas.</p>
          </div>
          <div className="contact-list">
            <a href="mailto:booking@amara.model"><Mail size={19} /> booking@amara.model <ArrowUpRight size={15} /></a>
            <a href="#" aria-label="Instagram"><Instagram size={19} /> @amara.model <ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>

      <footer className="model-footer">
        <span>AMARA.</span>
        <span>MODEL & CREATIVE © 2026</span>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
