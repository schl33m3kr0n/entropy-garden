import { createLoader } from './create-loader.js';

export const cardsLoader = createLoader(
    () => import('../game/cards/index.js'),
    { label: 'cards-of-chaos.js' },
);
