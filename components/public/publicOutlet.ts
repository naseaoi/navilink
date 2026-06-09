import { useOutletContext } from 'react-router-dom';
import { LinkCard, PublicData } from '../../types';

export interface PublicOutletContext {
  data: PublicData;
  hasFetchedData: boolean;
  onCardClick: (card: LinkCard) => void;
  onSearchOpen: () => void;
}

export const usePublicOutlet = () => useOutletContext<PublicOutletContext>();
