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
• 6 Squares (🟢 d6) — ranks 1–6
• 8 Diamonds (🟡 d8) — ranks 1–8
• 12 Pentagons (🟠 d12) — ranks 1–12
• 20 Hexagons (🔵 d20) — ranks 1–20
• Dice rolls of 6 and 9 show special face art when revealed`,
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

export function isDieSixFace(roll) {
    return roll.value === 6;
}

export function isDieNineFace(roll) {
    return roll.value === 9;
}

/** Regular hexagon vertices (pointy-top), center (cx,cy), circumradius r. */
function regularHexagonVertices(cx, cy, r) {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
}

function svgPoints(vertices) {
    return vertices.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}

/** Recolorable hex wedge art — used for face 6 on dice and sq-6 cards. */
export function hexWedgeFaceSvg(accentVar = '--die-accent') {
    const c = `var(${accentVar}, #33dd66)`;
    const cx = 100;
    const cy = 100;
    const r = 90;
    const v = regularHexagonVertices(cx, cy, r);
    const [top, ur, lr, bottom, ll, ul] = v;
    const center = [cx, cy];

    return `<svg class="coc-hex-wedge-art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="${c}" points="${svgPoints([ul, top, center])}"/>
        <polygon fill="${c}" points="${svgPoints([ur, lr, center])}"/>
        <polygon fill="${c}" points="${svgPoints([bottom, ll, center])}"/>
        <polygon fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round" points="${svgPoints(v)}"/>
    </svg>`;
}

/** Recolorable Sierpiński stage-1 triangle — used for face 9 on d12/d20 and pent/hex-9 cards. */
export function sierpinskiFaceSvg(accentVar = '--die-accent') {
    const c = `var(${accentVar}, #ff8822)`;
    const top = [100, 20];
    const bl = [28, 172];
    const br = [172, 172];
    const midLeft = [(top[0] + bl[0]) / 2, (top[1] + bl[1]) / 2];
    const midRight = [(top[0] + br[0]) / 2, (top[1] + br[1]) / 2];
    const midBottom = [(bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2];

    return `<svg class="coc-sierpinski-art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round" points="${svgPoints([top, bl, br])}"/>
        <polygon fill="${c}" points="${svgPoints([top, midLeft, midRight])}"/>
        <polygon fill="${c}" points="${svgPoints([bl, midLeft, midBottom])}"/>
        <polygon fill="${c}" points="${svgPoints([br, midBottom, midRight])}"/>
    </svg>`;
}

/** Solid hexagon for hex suit (d20) cards. */
export function icosahedronShapeSvg(color = '#3399ff') {
    const cx = 12;
    const cy = 12;
    const r = 10;
    const v = regularHexagonVertices(cx, cy, r);

    return `<svg viewBox="0 0 24 24" class="coc-shape coc-shape-icosahedron" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="${color}" points="${svgPoints(v)}"/>
    </svg>`;
}

/** Isometric cube-corner badge for the d20 die corner — solid fill tints via CSS accent var. */
export function icosaCornerSvg(accentVar = '--die-accent') {
    const c = `var(${accentVar}, #3399ff)`;
    const cx = 12;
    const cy = 12;
    const r = 10;
    const v = regularHexagonVertices(cx, cy, r);

    return `<svg viewBox="0 0 24 24" class="coc-shape coc-shape-icosa-corner" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="${c}" points="${svgPoints(v)}"/>
    </svg>`;
}
