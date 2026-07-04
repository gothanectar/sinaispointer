/**
 * TradePulse Unified Navigation Component
 * Provides consistent navigation across all platform pages
 */

class UnifiedNavigation {
    constructor(currentPage = 'home', options = {}) {
        this.currentPage = currentPage;
        this.options = {
            showMobile: true,
            showSearch: false,
            showUserMenu: false,
            ...options
        };
    }

    render() {
        return `
        <nav class="unified-nav fixed top-0 w-full z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <!-- Brand -->
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center">
                            <span class="text-black font-bold text-xl">TP</span>
                        </div>
                        <span class="text-2xl font-bold">Trade<span class="text-yellow-400">Pulse</span></span>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex gap-8 items-center">
                        <a href="/" class="nav-link ${this.isActive('home')}" data-page="home">
                            📈 Trading
                        </a>
                        <a href="/sports-dashboard.html" class="nav-link ${this.isActive('sports')}" data-page="sports">
                            ⚽ Apostas Esportivas
                        </a>
                        <a href="/analytics" class="nav-link ${this.isActive('analytics')}" data-page="analytics">
                            📊 Analytics
                        </a>
                        <a href="/tradepulse-docs.html" class="nav-link ${this.isActive('docs')}" data-page="docs">
                            📖 Documentação
                        </a>
                        <div class="relative">
                            <button class="nav-dropdown-btn" onclick="toggleDropdown('tools-dropdown')">
                                🛠️ Ferramentas
                                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="tools-dropdown" class="nav-dropdown">
                                <a href="/index.html" class="nav-dropdown-item">
                                    📊 Gráficos Multi-Timeframe
                                </a>
                                <a href="/tradepulse-download.html" class="nav-dropdown-item">
                                    🤖 Download Robôs
                                </a>
                                <a href="#" onclick="openStreamlitApp('esportes')" class="nav-dropdown-item">
                                    ⚽ Dashboard Esportes (Avançado)
                                </a>
                                <a href="#" onclick="openStreamlitApp('loterias')" class="nav-dropdown-item">
                                    🎰 Dashboard Loterias
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- CTA Button -->
                    <div class="hidden md:block">
                        <a href="#pricing" class="btn-gold text-black font-semibold px-6 py-2 rounded-full transition">
                            Começar Agora
                        </a>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button class="md:hidden mobile-menu-btn" onclick="toggleMobileMenu()">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>

                <!-- Mobile Menu -->
                <div id="mobile-menu" class="md:hidden mobile-menu-hidden">
                    <div class="py-4 space-y-3">
                        <a href="/" class="mobile-nav-link ${this.isActive('home')}">📈 Trading</a>
                        <a href="/sports-dashboard.html" class="mobile-nav-link ${this.isActive('sports')}">⚽ Apostas Esportivas</a>
                        <a href="/analytics" class="mobile-nav-link ${this.isActive('analytics')}">📊 Analytics</a>
                        <a href="/tradepulse-docs.html" class="mobile-nav-link ${this.isActive('docs')}">📖 Documentação</a>
                        <div class="border-t border-white/10 pt-3 mt-3">
                            <a href="/index.html" class="mobile-nav-link">📊 Gráficos</a>
                            <a href="/tradepulse-download.html" class="mobile-nav-link">🤖 Download Robôs</a>
                            <a href="#pricing" class="mobile-nav-link btn-gold-mobile">Começar Agora</a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>`;
    }

    isActive(page) {
        return this.currentPage === page ? 'nav-link-active' : '';
    }

    init() {
        // Initialize navigation after DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Track navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = e.target.getAttribute('data-page');
                this.trackNavigation(page);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown-btn')) {
                this.closeAllDropdowns();
            }
        });

        // Handle mobile menu
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        window.toggleMobileMenu = () => {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('mobile-menu-hidden');
        };
    }

    trackNavigation(page) {
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'navigation_click', {
                'page_name': page,
                'timestamp': new Date().toISOString()
            });
        }
        console.log(`Navigation: Visited ${page}`);
    }

    closeAllDropdowns() {
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    }
}

// Global dropdown function
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.classList.toggle('hidden');
}

// Open Streamlit apps in new tabs
function openStreamlitApp(app) {
    const urls = {
        esportes: 'http://localhost:8501',
        loterias: 'http://localhost:8502',
        analytics: 'http://localhost:8503'
    };
    
    if (urls[app]) {
        window.open(urls[app], '_blank');
    }
}

// Auto-initialize navigation
document.addEventListener('DOMContentLoaded', function() {
    // Auto-detect current page
    const path = window.location.pathname;
    let currentPage = 'home';
    
    if (path.includes('sports') || path.includes('esportes')) {
        currentPage = 'sports';
    } else if (path.includes('analytics')) {
        currentPage = 'analytics';
    } else if (path.includes('docs') || path.includes('documentation')) {
        currentPage = 'docs';
    }
    
    const nav = new UnifiedNavigation(currentPage);
    nav.init();
});