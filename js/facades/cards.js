import { cardsLoader } from '../loaders/cards.js';

export function loadCards() {
    return cardsLoader.load();
}

export async function initCardsOfChaos() {
    const mod = await loadCards();
    mod.initCardsOfChaos();
}
