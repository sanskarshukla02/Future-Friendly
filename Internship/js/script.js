class CryptoChart {
    constructor(symbol, interval) {
        this.baseUrl = 'wss://stream.binance.com:9443/ws/';
        this.symbol = symbol;
        this.interval = interval;
        this.storedData = this.loadData();
        this.chart = null;
        this.loadingIndicator = document.getElementById('loading');
        this.initChart();
        this.connectWebSocket();
    }

    loadData() {
        const data = localStorage.getItem('cryptoData');
        return data ? JSON.parse(data) : {};
    }

    saveData() {
        localStorage.setItem('cryptoData', JSON.stringify(this.storedData));
    }

    initChart() {
        const initialData = this.storedData[this.symbol] || [];

        const ctx = document.getElementById('candlestickChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: this.symbol,
                    data: initialData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                }]
            },
            options: this.getChartOptions(),
        });
    }

    getChartOptions() {
        return {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                    },
                    title: {
                        display: true,
                        text: 'Time',
                    },
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Open: ${context.raw.o}\nHigh: ${context.raw.h}\nLow: ${context.raw.l}\nClose: ${context.raw.c}`;
                        },
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    updateChart(data) {
        if (!this.storedData[this.symbol]) {
            this.storedData[this.symbol] = [];
        }

        if (this.storedData[this.symbol].length > 50) {
            this.storedData[this.symbol].shift(); // Maintain only the last 50 data points
        }
        this.storedData[this.symbol].push(data);

        // Save updated data to local storage
        this.saveData();

        // Update chart data without flickering
        this.chart.data.datasets[0].data = this.storedData[this.symbol];
        this.chart.update('quiet'); // Use 'quiet' to avoid flicker
    }

    connectWebSocket() {
        const url = `${this.baseUrl}${this.symbol}@kline_${this.interval}`;
        const ws = new WebSocket(url);

        ws.onopen = () => {
            this.loadingIndicator.style.display = 'none'; // Hide loading indicator
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const kline = message.k;
            if (kline.x) { // Only process closed candles
                const candleData = {
                    t: new Date(kline.t),
                    o: parseFloat(kline.o),
                    h: parseFloat(kline.h),
                    l: parseFloat(kline.l),
                    c: parseFloat(kline.c),
                    v: parseFloat(kline.v),
                };
                this.updateChart(candleData);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.loadingIndicator.style.display = 'none'; // Hide loading indicator
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.loadingIndicator.style.display = 'block'; // Show loading indicator if reconnecting
        };
    }

    switchSymbol(newSymbol, newInterval) {
        if (this.symbol !== newSymbol || this.interval !== newInterval) {
            this.symbol = newSymbol;
            this.interval = newInterval;

            // Clear previous data from the chart
            this.chart.data.datasets[0].data = [];
            this.chart.update('quiet');

            // Update the chart with stored data for the selected coin
            this.chart.data.datasets[0].data = this.storedData[this.symbol] || [];
            this.chart.update('quiet');

            this.connectWebSocket();
        }
    }
}

// Initialize the chart and handle dropdown changes
let cryptoChart = new CryptoChart('ethusdt', '1m');

// Event listeners for dropdowns
document.getElementById('coin-selector').addEventListener('change', (event) => {
    cryptoChart.switchSymbol(event.target.value, cryptoChart.interval);
});

document.getElementById('interval-selector').addEventListener('change', (event) => {
    cryptoChart.switchSymbol(cryptoChart.symbol, event.target.value);
});
