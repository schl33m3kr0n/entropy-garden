// Groovy meter module
let groovyLevel = 0;
const MAX_GROOVY = 100;
let meterFill;

export function initGroovyMeter() {
    // Inject HTML if not present
    if (!document.getElementById('groovy-meter-container')) {
        const container = document.createElement('div');
        container.id = 'groovy-meter-container';
        container.innerHTML = `
            <div class="groovy-label">GROOVY METER</div>
            <div class="groovy-bar">
                <div class="groovy-fill" id="groovy-fill"></div>
            </div>
        `;
        document.body.appendChild(container);
    }
    
    meterFill = document.getElementById('groovy-fill');
    
    // Interaction listeners
    document.addEventListener('click', () => addGroovy(15));
    document.addEventListener('mousemove', (e) => {
        // Only add small amount to avoid capping instantly
        if (Math.random() < 0.1) addGroovy(1);
    });
    document.addEventListener('scroll', () => addGroovy(2), { passive: true });
    
    // Decay loop
    setInterval(() => {
        if (groovyLevel > 0) {
            groovyLevel = Math.max(0, groovyLevel - 2);
            updateMeter();
        }
    }, 200);
}

function addGroovy(amount) {
    groovyLevel = Math.min(MAX_GROOVY, groovyLevel + amount);
    updateMeter();
}

function updateMeter() {
    if (meterFill) {
        meterFill.style.width = `${groovyLevel}%`;
        
        // Change color based on grooviness
        if (groovyLevel > 80) {
            meterFill.style.background = '#ff00ff'; // Super groovy (magenta)
            meterFill.style.boxShadow = '0 0 15px #ff00ff';
        } else if (groovyLevel > 50) {
            meterFill.style.background = '#00ffff'; // Getting groovy (cyan)
            meterFill.style.boxShadow = '0 0 10px #00ffff';
        } else {
            meterFill.style.background = '#0f0'; // Base level
            meterFill.style.boxShadow = '0 0 5px #0f0';
        }
    }
}
