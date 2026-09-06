export function initDashboard() {
    // Population Counter Animation
    const popCounter = document.getElementById('pop-counter-disco');
    if (popCounter) {
        let pop = 8100245678;
        setInterval(() => {
            pop += Math.floor(Math.random() * 3);
            popCounter.innerText = pop.toLocaleString();
        }, 1000);
    }

    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#00ff00';
    Chart.defaults.font.family = "'Courier New', Courier, monospace";

    const popCtx = document.getElementById('popChartDisco');
    if (popCtx) {
        new Chart(popCtx, {
            type: 'line',
            data: {
                labels: ['1950', '1970', '1990', '2010', '2020', '2024'],
                datasets: [{
                    label: 'Billions',
                    data: [2.5, 3.7, 5.3, 6.9, 7.8, 8.1],
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    const wealthCtx = document.getElementById('wealthChartDisco');
    if (wealthCtx) {
        new Chart(wealthCtx, {
            type: 'doughnut',
            data: {
                labels: ['Top 1%', 'Next 9%', 'Bottom 90%'],
                datasets: [{
                    data: [43, 40, 17],
                    backgroundColor: ['#ff0055', '#ffff00', '#00ff00'],
                    borderWidth: 1,
                    borderColor: '#141414'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }


    const gdpCtx = document.getElementById('gdpChartDisco');
    if (gdpCtx) {
        new Chart(gdpCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU', 'JPN', 'IND'],
                datasets: [{
                    label: 'GDP',
                    data: [27.3, 17.7, 4.4, 4.2, 3.7],
                    backgroundColor: 'rgba(0, 255, 0, 0.6)',
                    borderColor: '#00ff00',
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: { 
                    y: { beginAtZero: true, display: false },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}
