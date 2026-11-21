import type { ReactNode } from 'react';
import { ArrowRight, Check, CircleAlert, Sparkles } from 'lucide-react';
import { Link } from '../router';

export function SectionHead({
  eyebrow,
  title,
  copy,
  center,
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`section-head${center ? ' center' : ''}`}>
      <span className="eyebrow">
        <Sparkles size={13} /> {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  chips,
  nav,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  chips?: { label: string; value: string }[];
  nav?: { href: string; label: string }[];
}) {
  return (
    <section className="hero page-hero">
      <div className="hero-sky" />
      <div className="wrap page-hero-inner">
        <nav className="page-crumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{eyebrow}</span>
        </nav>
        <h1>{title}</h1>
        <p className="hero-lede">{lede}</p>
        {chips && (
          <div className="page-chips">
            {chips.map((chip) => (
              <div key={chip.label}>
                <b>{chip.value}</b>
                <span>{chip.label}</span>
              </div>
            ))}
          </div>
        )}
        {nav && (
          <nav className="page-nav" aria-label="On this page">
            {nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="checklist">
      {items.map((item) => (
        <li key={typeof item === 'string' ? item : undefined}>
          <Check size={13} /> <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="page-note">
      <CircleAlert size={13} /> {children}
    </p>
  );
}

const pageLinks = [
  { to: '/products', label: 'Products' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/security', label: 'Security' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
];

export function PageCta({ current, title }: { current: string; title: ReactNode }) {
  const others = pageLinks.filter((link) => link.to !== current);
  return (
    <section className="page-section page-cta-section">
      <div className="wrap">
        <div className="page-cta">
          <h2>{title}</h2>
          <nav className="page-cta-links" aria-label="More pages">
            {others.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label} <ArrowRight size={14} />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
