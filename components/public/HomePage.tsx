import React from 'react';
import { usePublicOutlet } from '../PublicView';
import { Hero } from './Hero';
import { HeroSearch } from './HeroSearch';
import { CategoryGroups } from './CategoryGroups';
import { QuoteFooter } from './QuoteFooter';

export const HomePage: React.FC = () => {
  const { data, onCardClick, onSearchOpen } = usePublicOutlet();

  return (
    <>
      <Hero />
      <HeroSearch onOpen={onSearchOpen} />
      <div className="mt-10 md:mt-14">
        <CategoryGroups categories={data.categories} cards={data.cards} onCardClick={onCardClick} />
      </div>
      <div className="flex-1" />
      <QuoteFooter />
    </>
  );
};
