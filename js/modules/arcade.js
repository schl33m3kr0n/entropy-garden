import { sfx, playSound } from '../core/shared.js';
import { pushTerminalLog, loadTerminal } from '../lazy.js';

let arcadeScore = 0;
let currentSequenceIndex = 0;

// The patterns! You can add as many of these as you want.
const arcadeSequences = [
    // Vertical line oscillating left ↔ center ↔ right
    {
        seq: ['100100100', '010010010', '100100100'],
        answer: '010010010',
        options: ['010010010', '001001001', '111000000', '000000111']
    },
    // Plus ↔ diamond corners
    {
        seq: ['010111010', '101000101', '010111010'],
        answer: '101000101',
        options: ['111111111', '101000101', '000111000', '101010101']
    },
    // Row sweep: top → middle → bottom → top
    {
        seq: ['111000000', '000111000', '000000111'],
        answer: '111000000',
        options: ['111000000', '000111000', '101010101', '111111111']
    },
    // Grow from center dot → cross → full, then hollow center
    {
        seq: ['000010000', '010111010', '111111111'],
        answer: '111101111',
        options: ['111101111', '111111111', '010111010', '101110101']
    },
    // Checkerboard phase flip
    {
        seq: ['101010101', '010101010', '101010101'],
        answer: '010101010',
        options: ['010101010', '101010101', '110110110', '001001001']
    },
    // Diagonal X building toward center bar
    {
        seq: ['100000001', '010001000', '001010100'],
        answer: '000101000',
        options: ['000101000', '111111111', '010000010', '101010101']
    },
    // Lone corner marching clockwise
    {
        seq: ['100000000', '001000000', '000000001'],
        answer: '000001000',
        options: ['000001000', '100000000', '010010010', '111111111']
    },
    // Full grid pulse: all on ↔ center off
    {
        seq: ['111111111', '111101111', '111111111'],
        answer: '111101111',
        options: ['111101111', '111111111', '101111101', '110110110']
    },
    // Diagonal streak sliding down-right
    {
        seq: ['100000000', '010000000', '001000000'],
        answer: '000100000',
        options: ['000100000', '000010000', '001000000', '100000000']
    },
    // Hourglass collapse into center cross
    {
        seq: ['100000001', '010000010', '001111100'],
        answer: '000101000',
        options: ['000101000', '011111110', '100010001', '111111111']
    }
];

function dispenseArcadeReward() {
    globalThis.unlockTrophy?.('arcade_clear');
    const modal = document.getElementById('modal-arcade');
    if (modal) modal.style.display = 'none';
    loadTerminal()
        .then((t) => t.spawnPizza())
        .catch((err) => console.error('[Entropy Garden] arcade reward failed', err));
}

function loadArcadeLevel() {
    const display = document.getElementById('sequence-display');
    const controls = document.getElementById('arcade-controls');
    const msg = document.getElementById('arcade-message');
    
    // If they beat all the levels, don't try to load a level that doesn't exist
    if (currentSequenceIndex >= arcadeSequences.length) return;

    const level = arcadeSequences[currentSequenceIndex];

    msg.innerText = "Complete the sequence";
    msg.style.color = "var(--cyan)";

    // 1. Draw the known sequence of colors
    display.innerHTML = '';
    level.seq.forEach(matrixStr => {
        const matrixEl = createMatrixElement(matrixStr);
        display.appendChild(matrixEl);
    });
    
    // Add the mystery box
    const mystery = document.createElement('div');
    mystery.className = `color-square square-hidden`;
    mystery.innerText = '?';
    display.appendChild(mystery);

    controls.innerHTML = '';
    level.options.forEach(opt => {
        const optEl = createMatrixElement(opt);
        optEl.classList.add('interactive-square');
        optEl.onclick = () => checkArcadeAnswer(opt, level.answer);
        controls.appendChild(optEl);
    });
}

// NEW HELPER FUNCTION
function createMatrixElement(binStr) {
    const container = document.createElement('div');
    container.className = 'matrix-grid';
    // Split the "10101..." string into individual cells
    binStr.split('').forEach(bit => {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        if (bit === '1') cell.style.background = 'var(--cyan)'; // or white
        container.appendChild(cell);
    });
    return container;
}

function checkArcadeAnswer(guess, correct) {
    const msg = document.getElementById('arcade-message');
    const container = document.getElementById('arcade-game-container');

    if (guess === correct) {
        // --- CORRECT ANSWER ---
        arcadeScore += 100;
        document.getElementById('arcade-score').innerText = `SCORE: ${arcadeScore}`;
        playSound(sfx.collectible);
        
        msg.innerText = "> SEQUENCE ACCEPTED.";
        msg.style.color = "var(--neon-green)";

        currentSequenceIndex++;
        
        // Did they beat the whole game?
        if (currentSequenceIndex >= arcadeSequences.length) {
            msg.innerText = "> PROTOCOL COMPLETE. DISPENSING REWARD...";
            playSound(sfx.missionCleared);
            pushTerminalLog("> ARCADE PROTOCOL BEATEN. REWARD DISPENSED.");
            
            // Give them a tangible reward on the screen!
            setTimeout(() => {
                document.getElementById('arcade-controls').innerHTML = '';
                dispenseArcadeReward();
            }, 1000);
            
        } else {
            // Load the next level after a short delay
            setTimeout(loadArcadeLevel, 1000);
        }
    } else {
        // --- WRONG ANSWER ---
        arcadeScore = Math.max(0, arcadeScore - 50); // Lose points, but don't go below 0
        document.getElementById('arcade-score').innerText = `SCORE: ${arcadeScore}`;
        playSound(sfx.oopsy);
        
        msg.innerText = "> SEQUENCE REJECTED.";
        msg.style.color = "var(--alert-red)";
        
        // Flash the arcade cabinet red
        container.style.borderColor = "var(--alert-red)";
        setTimeout(() => container.style.borderColor = "var(--cyan)", 400);
    }
}


export { loadArcadeLevel };
