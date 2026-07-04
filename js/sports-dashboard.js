/**
 * TradePulse Sports Dashboard
 * Interactive sports betting analytics with real-time data
 */

class SportsDashboard {
    constructor() {
        this.currentSport = 'all';
        this.currentFilters = {
            ev: 'all',
            time: 'all',
            sort: 'ev_desc'
        };
        this.opportunities = [];
        this.charts = {};
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupCharts();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Sport tabs
        document.querySelectorAll('.sport-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sport = e.currentTarget.dataset.sport;
                this.selectSport(sport);
            });
        });

        // Filters
        document.getElementById('ev-filter').addEventListener('change', (e) => {
            this.currentFilters.ev = e.target.value;
            this.applyFilters();
        });

        document.getElementById('time-filter').addEventListener('change', (e) => {
            this.currentFilters.time = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.applyFilters();
        });

        // Refresh button
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.refreshData();
        });
    }

    loadInitialData() {
        this.showLoading();
        
        // Simulate API call - replace with actual backend integration
        setTimeout(() => {
            this.opportunities = this.generateMockData();
            this.hideLoading();
            this.renderOpportunities();
            this.updateStats();
            this.updateCharts();
        }, 1500);
    }

    generateMockData() {
        const sports = ['futebol', 'basquete', 'tenis', 'volei', 'mma', 'esports', 'hockey', 'beisebol', 'rugby'];
        const teams = {
            futebol: ['Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Santos', 'Grêmio', 'Internacional', 'Atlético-MG', 'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich', 'PSG', 'Juventus'],
            basquete: ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Nets', 'Bucks', 'Bulls', 'Knicks', 'Suns', 'Mavericks'],
            tenis: ['Djokovic', 'Nadal', 'Federer', 'Medvedev', 'Zverev', 'Alcaraz', 'Sinner', 'Tsitsipas'],
            volei: ['Brasil', 'Itália', 'EUA', 'Rússia', 'Argentina', 'Polônia', 'França', 'Sérvia'],
            mma: ['Jones', 'Adesanya', 'Usman', 'Ngannou', 'Oliveira', 'Volkanovski', 'Makhachev', 'Edwards'],
            esports: ['FaZe', 'NAVI', 'Astralis', 'G2', 'Vitality', 'Team Liquid', 'Cloud9', 'T1'],
            hockey: ['Maple Leafs', 'Bruins', 'Rangers', 'Canadiens', 'Penguins', 'Blackhawks', 'Lightning', 'Avalanche'],
            beisebol: ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Astros', 'Braves', 'Giants', 'Cardinals'],
            rugby: ['All Blacks', 'Springboks', 'Wallabies', 'England', 'France', 'Ireland', 'Scotland', 'Wales']
        };

        const competitions = {
            futebol: ['Brasileirão Série A', 'Copa do Brasil', 'Libertadores', 'Premier League', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'],
            basquete: ['NBA', 'NBB', 'EuroLeague', 'ACB', 'LNB Pro A'],
            tenis: ['ATP Masters', 'WTA', 'Grand Slam', 'ATP 500', 'WTA 1000'],
            volei: ['Superliga', 'Liga das Nações', 'CEV Champions League', 'FIVB World Championship'],
            mma: ['UFC', 'Bellator', 'ONE Championship', 'PFL'],
            esports: ['CS:GO Major', 'LoL Worlds', 'Valorant Champions', 'Dota 2 International', 'BLAST Premier'],
            hockey: ['NHL', 'KHL', 'SHL', 'Liiga'],
            beisebol: ['MLB', 'NPB', 'KBO', 'LMP'],
            rugby: ['Rugby Championship', 'Six Nations', 'Super Rugby', 'Premiership']
        };

        const opportunities = [];
        
        for (let i = 0; i < 150; i++) {
            const sport = sports[Math.floor(Math.random() * sports.length)];
            const teamList = teams[sport];
            const homeTeam = teamList[Math.floor(Math.random() * teamList.length)];
            let awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
            while (awayTeam === homeTeam) {
                awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
            }

            const homeProb = 0.2 + Math.random() * 0.6;
            const drawProb = sport === 'futebol' ? 0.1 + Math.random() * 0.3 : 0;
            const awayProb = 1 - homeProb - drawProb;

            const homeOdd = 1 / homeProb + (Math.random() - 0.5) * 0.3;
            const drawOdd = drawProb > 0 ? 1 / drawProb + (Math.random() - 0.5) * 0.5 : 0;
            const awayOdd = 1 / awayProb + (Math.random() - 0.5) * 0.3;

            // Calculate Expected Value
            const impliedHomeProb = 1 / homeOdd;
            const ev = ((homeProb - impliedHomeProb) / impliedHomeProb * 100);

            const eventTime = new Date();
            eventTime.setHours(eventTime.getHours() + Math.random() * 168); // Next week

            opportunities.push({
                id: `event_${i}`,
                sport: sport,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                competition: competitions[sport][Math.floor(Math.random() * competitions[sport].length)],
                eventTime: eventTime,
                probabilities: {
                    home: homeProb,
                    draw: drawProb,
                    away: awayProb
                },
                odds: {
                    home: Math.max(1.01, homeOdd),
                    draw: drawOdd > 0 ? Math.max(1.01, drawOdd) : null,
                    away: Math.max(1.01, awayOdd)
                },
                expectedValue: ev,
                confidence: 60 + Math.random() * 35,
                volume: Math.floor(Math.random() * 100000),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                isLive: Math.random() > 0.8,
                bookmakers: ['Bet365', 'Betfair', 'Pinnacle', 'Betway'].slice(0, 2 + Math.floor(Math.random() * 3))
            });
        }

        return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
    }

    selectSport(sport) {
        // Update active tab
        document.querySelectorAll('.sport-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-sport="${sport}"]`).classList.add('active');
        
        this.currentSport = sport;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = this.opportunities;

        // Sport filter
        if (this.currentSport !== 'all') {
            filtered = filtered.filter(opp => opp.sport === this.currentSport);
        }

        // EV filter
        if (this.currentFilters.ev === 'positive') {
            filtered = filtered.filter(opp => opp.expectedValue > 0);
        } else if (this.currentFilters.ev === 'negative') {
            filtered = filtered.filter(opp => opp.expectedValue < 0);
        }

        // Time filter
        const now = new Date();
        if (this.currentFilters.time === 'today') {
            filtered = filtered.filter(opp => {
                const eventDate = new Date(opp.eventTime);
                return eventDate.toDateString() === now.toDateString();
            });
        } else if (this.currentFilters.time === 'tomorrow') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            filtered = filtered.filter(opp => {
                const eventDate = new Date(opp.eventTime);
                return eventDate.toDateString() === tomorrow.toDateString();
            });
        } else if (this.currentFilters.time === 'week') {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + 7);
            filtered = filtered.filter(opp => {
                const eventDate = new Date(opp.eventTime);
                return eventDate >= now && eventDate <= weekEnd;
            });
        }

        // Sort
        if (this.currentFilters.sort === 'ev_desc') {
            filtered.sort((a, b) => b.expectedValue - a.expectedValue);
        } else if (this.currentFilters.sort === 'probability_desc') {
            filtered.sort((a, b) => Math.max(b.probabilities.home, b.probabilities.away) - Math.max(a.probabilities.home, a.probabilities.away));
        } else if (this.currentFilters.sort === 'time_asc') {
            filtered.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
        } else if (this.currentFilters.sort === 'odds_asc') {
            filtered.sort((a, b) => Math.min(a.odds.home, a.odds.away) - Math.min(b.odds.home, b.odds.away));
        }

        this.renderOpportunities(filtered);
    }

    renderOpportunities(opportunities = this.opportunities) {
        const container = document.getElementById('opportunities-container');
        
        if (opportunities.length === 0) {
            container.innerHTML = '';
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');

        const html = opportunities.map(opp => this.createOpportunityCard(opp)).join('');
        container.innerHTML = `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${html}</div>`;

        // Add click event listeners to cards
        container.querySelectorAll('.opportunity-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const oppId = e.currentTarget.dataset.oppId;
                this.showOpportunityDetails(oppId);
            });
        });
    }

    createOpportunityCard(opp) {
        const evClass = opp.expectedValue > 0 ? 'ev-positive' : 'ev-negative';
        const evText = opp.expectedValue > 0 ? `+${opp.expectedValue.toFixed(1)}%` : `${opp.expectedValue.toFixed(1)}%`;
        const evColor = opp.expectedValue > 0 ? 'text-success' : 'text-error';
        
        const sportIcon = {
            futebol: '⚽', basquete: '🏀', tenis: '🎾', 
            volei: '🏐', mma: '🥊', esports: '🎮',
            hockey: '🏒', beisebol: '⚾', rugby: '🏉'
        }[opp.sport] || '🏆';

        const timeUntilEvent = this.getTimeUntilEvent(opp.eventTime);
        const liveIndicator = opp.isLive ? '<span class="live-indicator status-positive">🔴 AO VIVO</span>' : '';

        return `
            <div class="opportunity-card tp-card ${evClass}" data-opp-id="${opp.id}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${sportIcon}</span>
                        <div>
                            <div class="font-semibold text-sm text-gray-400">${opp.competition}</div>
                            ${liveIndicator}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${evColor} text-lg">${evText}</div>
                        <div class="text-xs text-gray-400">EV</div>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="text-lg font-semibold mb-2">
                        ${opp.homeTeam} vs ${opp.awayTeam}
                    </div>
                    <div class="text-sm text-gray-400">
                        📅 ${timeUntilEvent}
                    </div>
                </div>

                <div class="odds-comparison mb-4">
                    <div class="grid ${opp.odds.draw ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm">
                        <div class="text-center">
                            <div class="text-xs text-gray-400">Casa</div>
                            <div class="font-semibold text-success">${opp.odds.home.toFixed(2)}</div>
                            <div class="text-xs text-gray-400">${(opp.probabilities.home * 100).toFixed(1)}%</div>
                        </div>
                        ${opp.odds.draw ? `
                            <div class="text-center">
                                <div class="text-xs text-gray-400">Empate</div>
                                <div class="font-semibold text-warning">${opp.odds.draw.toFixed(2)}</div>
                                <div class="text-xs text-gray-400">${(opp.probabilities.draw * 100).toFixed(1)}%</div>
                            </div>
                        ` : ''}
                        <div class="text-center">
                            <div class="text-xs text-gray-400">Fora</div>
                            <div class="font-semibold text-info">${opp.odds.away.toFixed(2)}</div>
                            <div class="text-xs text-gray-400">${(opp.probabilities.away * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center text-xs text-gray-400">
                    <div>
                        💪 Confiança: ${opp.confidence.toFixed(0)}%
                    </div>
                    <div>
                        📊 Volume: ${this.formatNumber(opp.volume)}
                    </div>
                </div>

                <div class="mt-3 flex flex-wrap gap-1">
                    ${opp.bookmakers.map(book => `
                        <span class="px-2 py-1 bg-white/10 rounded text-xs">${book}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getTimeUntilEvent(eventTime) {
        const now = new Date();
        const event = new Date(eventTime);
        const diff = event - now;
        
        if (diff < 0) {
            return 'Evento finalizado';
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `Em ${days} dia(s)`;
        } else if (hours > 0) {
            return `Em ${hours} hora(s)`;
        } else {
            return 'Muito em breve';
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toString();
    }

    updateStats() {
        const positiveEV = this.opportunities.filter(opp => opp.expectedValue > 0).length;
        const avgProbability = this.opportunities.reduce((sum, opp) => 
            sum + Math.max(opp.probabilities.home, opp.probabilities.away), 0) / this.opportunities.length;
        const avgROI = this.opportunities.filter(opp => opp.expectedValue > 0)
            .reduce((sum, opp) => sum + opp.expectedValue, 0) / positiveEV || 0;

        document.getElementById('total-events').textContent = this.opportunities.length;
        document.getElementById('positive-ev').textContent = positiveEV;
        document.getElementById('avg-probability').textContent = (avgProbability * 100).toFixed(1) + '%';
        document.getElementById('roi-projection').textContent = '+' + avgROI.toFixed(1) + '%';

        // Update sport counts
        const sportCounts = this.opportunities.reduce((counts, opp) => {
            counts[opp.sport] = (counts[opp.sport] || 0) + 1;
            return counts;
        }, {});

        Object.keys(sportCounts).forEach(sport => {
            const element = document.getElementById(`count-${sport}`);
            if (element) {
                element.textContent = sportCounts[sport];
            }
        });
    }

    setupCharts() {
        this.createEVChart();
        this.createSportsPerformanceChart();
        this.createROITimelineChart();
    }

    createEVChart() {
        const ctx = document.getElementById('ev-chart').getContext('2d');
        const evData = this.opportunities.reduce((acc, opp) => {
            if (opp.expectedValue > 5) acc.high++;
            else if (opp.expectedValue > 0) acc.medium++;
            else if (opp.expectedValue > -5) acc.low++;
            else acc.negative++;
            return acc;
        }, { high: 0, medium: 0, low: 0, negative: 0 });

        this.charts.ev = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['+5% ou mais', '0% a +5%', '-5% a 0%', 'Abaixo de -5%'],
                datasets: [{
                    data: [evData.high, evData.medium, evData.low, evData.negative],
                    backgroundColor: ['#00ff88', '#ffaa00', '#ff8c00', '#ff4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    createSportsPerformanceChart() {
        const ctx = document.getElementById('sports-performance-chart').getContext('2d');
        const sportData = this.opportunities.reduce((acc, opp) => {
            if (!acc[opp.sport]) acc[opp.sport] = { total: 0, positive: 0 };
            acc[opp.sport].total++;
            if (opp.expectedValue > 0) acc[opp.sport].positive++;
            return acc;
        }, {});

        const labels = Object.keys(sportData);
        const successRates = labels.map(sport => 
            (sportData[sport].positive / sportData[sport].total * 100).toFixed(1)
        );

        this.charts.sports = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(sport => sport.charAt(0).toUpperCase() + sport.slice(1)),
                datasets: [{
                    label: '% de Oportunidades +EV',
                    data: successRates,
                    backgroundColor: '#ffd700',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    createROITimelineChart() {
        const ctx = document.getElementById('roi-timeline-chart').getContext('2d');
        
        // Generate mock historical ROI data
        const days = 30;
        const roiData = [];
        let cumulativeROI = 0;
        
        for (let i = days; i >= 0; i--) {
            const dailyROI = (Math.random() - 0.3) * 5; // Bias towards positive
            cumulativeROI += dailyROI;
            roiData.push({
                x: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                y: cumulativeROI
            });
        }

        this.charts.roi = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'ROI Cumulativo (%)',
                    data: roiData,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        type: 'time',
                        time: { unit: 'day' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    updateCharts() {
        // Update chart data when filters change
        if (this.charts.ev) {
            this.createEVChart();
        }
        if (this.charts.sports) {
            this.createSportsPerformanceChart();
        }
    }

    showLoading() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('opportunities-container').innerHTML = '';
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('hidden');
    }

    refreshData() {
        this.showNotification('🔄 Atualizando dados...', 'info');
        this.loadInitialData();
    }

    startRealTimeUpdates() {
        // Simulate real-time updates every 30 seconds
        this.updateInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * this.opportunities.length);
            const opp = this.opportunities[randomIndex];
            
            // Small random update to EV
            opp.expectedValue += (Math.random() - 0.5) * 2;
            opp.confidence += (Math.random() - 0.5) * 10;
            opp.confidence = Math.max(0, Math.min(100, opp.confidence));
            
            this.updateStats();
            this.applyFilters();
            
            this.showNotification(
                `📊 ${opp.homeTeam} vs ${opp.awayTeam} atualizado`,
                'info'
            );
        }, 30000);
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500'
        };
        
        notification.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-fadeIn`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showOpportunityDetails(oppId) {
        const opp = this.opportunities.find(o => o.id === oppId);
        if (!opp) return;

        // Create detailed modal (simplified for now)
        alert(`Detalhes da Oportunidade:\n\n${opp.homeTeam} vs ${opp.awayTeam}\nCompetição: ${opp.competition}\nEV: ${opp.expectedValue.toFixed(2)}%\nConfiança: ${opp.confidence.toFixed(0)}%`);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SportsDashboard();
});