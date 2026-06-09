import React from 'react';

const SparkMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.4"
    strokeLinecap="round"
    className={`text-accent ${className}`}
    aria-hidden="true"
  >
    <path d="M22 18 L10 6" />
    <path d="M18 22 L4 19" />
    <path d="M26 15 L24 1" />
  </svg>
);

const DotGrid: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={className}
    style={{
      width: '72px',
      height: '92px',
      color: 'rgb(var(--text-3))',
      opacity: 0.5,
      backgroundImage: 'radial-gradient(currentColor 1.4px, transparent 1.4px)',
      backgroundSize: '13px 13px'
    }}
    aria-hidden="true"
  />
);

interface HeroProps {
  title?: string;
  subtitle?: string;
}

export const Hero: React.FC<HeroProps> = ({ title = 'Hello', subtitle = '探索高效工具，收藏优质网站' }) => (
  <div className="relative pb-2 pt-7 text-center md:pt-14">
    <div className="relative inline-block">
      <SparkMark className="absolute -left-6 -top-3 block scale-75 md:-left-7 md:scale-100" />
      <DotGrid className="absolute -right-12 top-1 block scale-[0.58] md:-right-16 md:scale-75 lg:-right-20 lg:top-2 lg:scale-100" />
      <h1 className="font-display text-6xl font-bold tracking-tightest text-1 md:text-7xl lg:text-[88px]">
        {title}
        <span className="text-accent">.</span>
      </h1>
    </div>
    <p className="mt-5 text-[15px] text-2 md:text-base">{subtitle}</p>
  </div>
);
