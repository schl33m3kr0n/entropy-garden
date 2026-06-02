// 1. Initialize the audio files
const clickSound = new Audio('../assets/audio/sfx/click.mp3');
const swipeSound = new Audio('../assets/audio/sfx/swipe.mp3');
clickSound.preload = 'auto';
swipeSound.preload = 'auto';

// We use a flag to track if the user has interacted with the page yet
let audioUnlocked = false;

// 2. Safely play the sounds using clones to prevent clipping
function playClick() {
  if (!audioUnlocked) return;
  const clone = clickSound.cloneNode();
  clone.volume = 0.4; 
  clone.play().catch(e => console.log("Audio blocked by browser."));
}

function playSwipe() {
  if (!audioUnlocked) return;
  const clone = swipeSound.cloneNode();
  clone.volume = 0.5; // Adjust this if the swipe overpowers the clicks
  clone.play().catch(e => console.log("Audio blocked by browser."));
}

// 3. Schedule the audio for one complete 7-second loop (1400ms beats)
function scheduleAudioLoop() {
  // All chevrons vanish simultaneously at 20% 
  setTimeout(playSwipe, 1400); 

  // Chevrons cascade back in at exactly 1400ms intervals
  setTimeout(playClick, 2800); // Blue drops at 40%
  setTimeout(playClick, 4200); // Yellow drops at 60%
  setTimeout(playClick, 5600); // Red drops at 80%
}

// 4. Hook the JS timing to the CSS Animation loop
const masterChevron = document.querySelector('[data-name="CHEVRON-BLU"]');

if (masterChevron) {
  // Fire when the animation first starts
  masterChevron.addEventListener('animationstart', scheduleAudioLoop);
  
  // Fire every time the 7-second loop repeats
  masterChevron.addEventListener('animationiteration', scheduleAudioLoop);
}

// 5. Unlock the Browser's Audio Engine on First Click
document.addEventListener('click', () => {
  if (!audioUnlocked) {
    audioUnlocked = true;
    
    // Play both sounds silently to bypass browser autoplay restrictions
    clickSound.volume = 0;
    swipeSound.volume = 0;
    
    Promise.all([
      clickSound.play().catch(e => {}),
      swipeSound.play().catch(e => {})
    ]).then(() => {
      // Restore natural volumes once unlocked
      clickSound.volume = 0.4;
      swipeSound.volume = 0.5;
    });
  }
});