try {
    const config = {
        type: 'bar',
        data: {
            labels: ['Wealth: Top 1%', 'Wealth: Next 9%', 'Wealth: Bottom 90%', 'GDP: USA ($T)', 'GDP: CHN ($T)', 'GDP: DEU ($T)'],
            datasets: [{
                label: 'Global Metrics',
                data: [43, 40, 17, 27.3, 17.7, 4.4],
                backgroundColor: [
                    'rgba(0, 255, 0, 0.8)',
                    'rgba(0, 255, 0, 0.6)',
                    'rgba(0, 255, 0, 0.3)',
                    'rgba(255, 255, 255, 0.8)',
                    'rgba(255, 255, 255, 0.6)',
                    'rgba(255, 255, 255, 0.3)'
                ],
                borderColor: '#0f0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            color: '#fff',
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 255, 0, 0.1)' },
                    ticks: { color: '#0f0', font: { family: 'monospace' } }
                },
                x: {
                    grid: { color: 'rgba(0, 255, 0, 0.1)' },
                    ticks: { color: '#0f0', font: { family: 'monospace', size: 10 } }
                }
            }
        }
    };
    console.log("Config valid");
} catch (e) {
    console.error(e);
}
