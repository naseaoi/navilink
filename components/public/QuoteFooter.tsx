import React from 'react';

interface QuoteFooterProps {
  text?: string;
}

export const QuoteFooter: React.FC<QuoteFooterProps> = ({ text = '保持好奇，持续探索，让每一天都更有价值。' }) => (
  <footer className="relative mt-16 pb-10 text-center md:mt-24">
    <div className="relative mx-auto inline-block max-w-2xl px-10">
      <span className="absolute -left-1 -top-7 select-none font-serif text-5xl leading-none text-accent/25" aria-hidden="true">
        &ldquo;
      </span>
      <p className="text-[15px] leading-relaxed text-2 md:text-base">{text}</p>
      <span className="absolute -right-1 -bottom-9 select-none font-serif text-5xl leading-none text-accent/25" aria-hidden="true">
        &rdquo;
      </span>
    </div>
    <div className="mx-auto mt-7 h-0.5 w-10 rounded-full bg-accent/40" />
  </footer>
);
