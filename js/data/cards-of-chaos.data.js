/** Cards of Chaos — deck definition, suits, and rules reference. */

export const ROUND_COUNT = 4;
export const MAX_SWAPS = 3;
export const HAND_SIZE = 5;

export const SUITS = {
    wild: {
        id: 'wild',
        shape: 'circle',
        sides: null,
        color: '#e8e8e8',
        accent: '#111',
        label: 'Wild',
        dieLabel: 'resulting die',
    },
    tri: {
        id: 'tri',
        shape: 'triangle',
        sides: 4,
        color: '#ff3355',
        accent: '#ff3355',
        label: 'Tetrahedron',
        dieLabel: 'd4',
    },
    sq: {
        id: 'sq',
        shape: 'square',
        sides: 6,
        color: '#33dd66',
        accent: '#33dd66',
        label: 'Hexahedron',
        dieLabel: 'd6',
    },
    dia: {
        id: 'dia',
        shape: 'diamond',
        sides: 8,
        color: '#ffdd22',
        accent: '#ffdd22',
        label: 'Octahedron',
        dieLabel: 'd8',
    },
    pent: {
        id: 'pent',
        shape: 'pentagon',
        sides: 12,
        color: '#ff8822',
        accent: '#ff8822',
        label: 'Dodecahedron',
        dieLabel: 'd12',
    },
    hex: {
        id: 'hex',
        shape: 'hexagon',
        sides: 20,
        color: '#3399ff',
        accent: '#3399ff',
        label: 'Icosahedron',
        dieLabel: 'd20',
    },
};

export const HAND_LABELS = {
    ROYAL_FLUSH: 'Royal Flush',
    STRAIGHT_FLUSH: 'Straight Flush',
    FOUR_KIND: 'Four of a Kind',
    FULL_HOUSE: 'Full House',
    FLUSH: 'Flush',
    STRAIGHT: 'Straight',
    THREE_KIND: 'Three of a Kind',
    TWO_PAIR: 'Two Pair',
    ONE_PAIR: 'One Pair',
    HIGH_CARD: 'High Card',
};

export const RULES_SECTIONS = [
    {
        title: 'Overview',
        body: `Cards of Chaos is a two-player strategy card game. Build the strongest five-card poker hand over four rounds. Each round allows up to three swaps before a forced reveal. Highest total score after four rounds wins; ties break with a sudden-death d20 roll.`,
    },
    {
        title: 'The Deck (52 cards)',
        body: `• 2 Wild cards (⚫ / ⚪ circles) — substitute any rank or suit when completing a hand
• 4 Triangles (🔴 d4) — ranks 1–4
• 6 Squares (🟢 d6) — ranks 1–6; face 6 shows an isometric cube
• 8 Diamonds (🟡 d8) — ranks 1–8
• 12 Pentagons (🟠 d12) — ranks 1–12; face 9 shows a Sierpiński triangle (stage 1)
• 20 Hexagons (🔵 d20) — ranks 1–20`,
    },
    {
        title: 'Wild Card Risk',
        body: `If a wild circle completes your hand, you must roll the die it stands in for. Roll at or below the die median → zero points this round. Roll above the median → double your final roll value.`,
    },
    {
        title: 'Hand Scoring',
        body: `• Royal Flush (16–20 Hexagon): Roll d20 twice, keep highest
• Straight Flush: Roll the die matching the top card of the straight
• Four of a Kind: Roll that suit's die, add +2
• Full House: Roll both involved dice and add them
• Flush (5 same suit): Roll that die twice, take the lowest
• Straight (5 sequential, mixed suits): Roll d8
• Three of a Kind: Roll that suit's die
• Two Pair: Roll both pair dice, take the highest roll
• One Pair: Roll that suit's die, take half (rounded up)
• High Card: Roll d4`,
    },
];

/** All assignable non-wild cards (templates for wild substitution). */
export function allCardTemplates() {
    const templates = [];
    for (const suitId of ['tri', 'sq', 'dia', 'pent', 'hex']) {
        const sides = SUITS[suitId].sides;
        for (let rank = 1; rank <= sides; rank++) {
            templates.push({ suit: suitId, rank });
        }
    }
    return templates;
}

export function buildDeck() {
    const deck = [];
    deck.push({ suit: 'wild', rank: 0, variant: 'black', uid: 'wild-b' });
    deck.push({ suit: 'wild', rank: 0, variant: 'white', uid: 'wild-w' });
    for (const suitId of ['tri', 'sq', 'dia', 'pent', 'hex']) {
        const sides = SUITS[suitId].sides;
        for (let rank = 1; rank <= sides; rank++) {
            deck.push({ suit: suitId, rank, uid: `${suitId}-${rank}` });
        }
    }
    return deck;
}

export function cardKey(card) {
    if (card.suit === 'wild') return `wild-${card.variant || 'x'}`;
    return `${card.suit}-${card.rank}`;
}

export function dieSidesForSuit(suitId) {
    if (suitId === 'wild') return null;
    return SUITS[suitId]?.sides ?? null;
}

export function rollDie(sides) {
    return 1 + Math.floor(Math.random() * sides);
}

export function dieMedian(sides) {
    return (sides + 1) / 2;
}

export function isSpecialFace(card) {
    if (card.suit === 'sq' && card.rank === 6) return 'cube';
    if (card.suit === 'pent' && card.rank === 9) return 'sierpinski';
    return null;
}
