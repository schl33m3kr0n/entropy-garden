import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

new_fn = """
let statsChartInstance = null;
let statsPieInstance = null;
let currentPieType = 'pie';

function updatePieChart() {
    if (!statsPieInstance) return;
    statsPieInstance.config.type = currentPieType;
    statsPieInstance.update();
}

function renderStatsChart() {
    try {
        if (typeof Chart === 'undefined') { 
            document.getElementById('mr-disco-chart').outerHTML = '<p style="color:red; font-size:20px;">Chart library failed to load.</p>'; 
            return; 
        }
        
        const pieCtx = document.getElementById('mr-disco-pie');
        const barCtx = document.getElementById('mr-disco-chart');
        if (!pieCtx || !barCtx) return;
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (statsPieInstance) statsPieInstance.destroy();
        
        Chart.defaults.color = '#0f0';
        Chart.defaults.font.family = 'monospace';
        
        statsPieInstance = new Chart(pieCtx, {
            type: currentPieType,
            data: {
                labels: ['Top 1%', 'Next 9%', 'Bottom 90%'],
                datasets: [{
                    data: [43, 40, 17],
                    backgroundColor: [
                        'rgba(0, 255, 0, 0.9)',
                        'rgba(0, 255, 0, 0.5)',
                        'rgba(0, 255, 0, 0.15)'
                    ],
                    borderColor: '#0f0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { boxWidth: 12, color: '#0f0', font: { size: 10 } }
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
        
        statsChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU'],
                datasets: [{
                    label: 'GDP ($T)',
                    data: [27.3, 17.7, 4.4],
                    backgroundColor: [
                        'rgba(255, 255, 255, 0.8)',
                        'rgba(255, 255, 255, 0.5)',
                        'rgba(255, 255, 255, 0.2)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'GDP ($T)',
                        color: '#fff'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#fff' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#fff' }
                    }
                }
            }
        });
        
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPieType = btn.dataset.type;
                updatePieChart();
            });
        });
    } catch (err) {
        console.error(err);
    }
}
"""

content = re.sub(r'let statsChartInstance = null;.*', new_fn.strip(), content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
