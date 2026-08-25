/**
 * Forecast Module - Revenue Intelligence Dashboard
 * Handles all forecast calculations, data visualization, and user interactions
 */

class ForecastDashboard {
    constructor() {
        this.apiBase = window.API_BASE || 'http://localhost:8085';
        this.charts = {};
        this.filters = {
            vertical_id: null,
            product_id: null,
            lender_id: null,
            stage: null,
            rm_id: null,
            date_from: null,
            date_to: null
        };
        this.initialized = false;
    }

    /**
     * Initialize the forecast dashboard
     */
    async init() {
        try {
            console.log('[Forecast] Initializing dashboard');
            
            // Initialize forecast data in backend
            await this.initializeForecastData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadDashboard();
            
            this.initialized = true;
            console.log('[Forecast] Dashboard initialized successfully');
        } catch (error) {
            console.error('[Forecast] Initialization error:', error);
            this.showError('Failed to initialize forecast dashboard');
        }
    }

    /**
     * Initialize forecast master data in backend
     */
    async initializeForecastData() {
        try {
            const response = await fetch(`${this.apiBase}/api/forecast/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to initialize forecast data');
            }
            
            const data = await response.json();
            console.log('[Forecast] Data initialized:', data);
        } catch (error) {
            console.warn('[Forecast] Initialization warning:', error.message);
        }
    }

    /**
     * Setup event listeners for filters and interactions
     */
    setupEventListeners() {
        // Filter button
        const filterBtn = document.getElementById('forecastFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.applyFilters());
        }
        
        // Filter reset
        const resetBtn = document.getElementById('forecastResetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
        
        // Date range pickers (if available)
        const dateFromInput = document.getElementById('forecastDateFrom');
        const dateToInput = document.getElementById('forecastDateTo');
        if (dateFromInput) dateFromInput.addEventListener('change', () => this.loadDashboard());
        if (dateToInput) dateToInput.addEventListener('change', () => this.loadDashboard());
    }

    /**
     * Load all dashboard data
     */
    async loadDashboard() {
        try {
            this.showLoading(true);
            
            // Load all data in parallel
            const [kpis, trend, vertical, product, lender, rm, executive, fees, funnel, upcoming] = await Promise.all([
                this.getKPIMetrics(),
                this.getRevenueTrend(),
                this.getRevenueByVertical(),
                this.getRevenueByProduct(),
                this.getRevenueByLender(),
                this.getRevenueByRM(),
                this.getRevenueBySalesExecutive(),
                this.getRevenueByFeeType(),
                this.getForecastFunnel(),
                this.getUpcomingRevenue()
            ]);
            
            // Render all visualizations
            this.renderKPICards(kpis);
            this.renderMonthlyTrendChart(trend);
            this.renderVerticalChart(vertical);
            this.renderProductChart(product);
            this.renderLenderChart(lender);
            this.renderRMLeaderboard(rm, executive);
            this.renderFeeTypeChart(fees);
            this.renderFunnelChart(funnel);
            this.renderUpcomingRevenue(upcoming);
            
            this.showLoading(false);
        } catch (error) {
            console.error('[Forecast] Dashboard load error:', error);
            this.showError('Failed to load forecast data');
        }
    }

    /**
     * Get KPI metrics
     */
    async getKPIMetrics() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        const response = await fetch(`${this.apiBase}/api/forecast/kpis?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch KPI metrics');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get monthly revenue trend
     */
    async getRevenueTrend() {
        const params = new URLSearchParams({
            months: 12,
            ...Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        });
        
        const response = await fetch(`${this.apiBase}/api/forecast/revenue-trend?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue trend');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by vertical
     */
    async getRevenueByVertical() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/by-vertical?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue by vertical');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by product
     */
    async getRevenueByProduct() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/by-product?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue by product');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by lender
     */
    async getRevenueByLender() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/by-lender?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue by lender');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by relationship manager
     */
    async getRevenueByRM() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/by-relationship-manager?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue by RM');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by sales executive, independently of relationship manager
     */
    async getRevenueBySalesExecutive() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );

        const response = await fetch(`${this.apiBase}/api/forecast/by-sales-executive?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to fetch revenue by sales executive');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get revenue by fee type
     */
    async getRevenueByFeeType() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/by-fee-type?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch revenue by fee type');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get forecast funnel
     */
    async getForecastFunnel() {
        const params = new URLSearchParams(
            Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        );
        
        const response = await fetch(`${this.apiBase}/api/forecast/funnel?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch forecast funnel');
        const data = await response.json();
        return data.data;
    }

    /**
     * Get upcoming revenue
     */
    async getUpcomingRevenue() {
        const params = new URLSearchParams({
            days_ahead: 90,
            ...Object.fromEntries(Object.entries(this.filters).filter(([, v]) => v))
        });
        
        const response = await fetch(`${this.apiBase}/api/forecast/upcoming-revenue?${params}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch upcoming revenue');
        const data = await response.json();
        return data.data;
    }

    /**
     * Render KPI cards
     */
    renderKPICards(kpis) {
        const container = document.getElementById('forecastKPICards');
        if (!container) return;
        
        const cards = [
            {
                title: 'Total Expected Revenue',
                value: kpis.total_expected_revenue,
                type: 'currency',
                class: 'primary'
            },
            {
                title: 'Weighted Forecast Revenue',
                value: kpis.weighted_forecast_revenue,
                type: 'currency',
                class: 'primary'
            },
            {
                title: 'Expected Disbursement',
                value: kpis.expected_disbursement,
                type: 'currency',
                class: 'success'
            },
            {
                title: 'Revenue Realized',
                value: kpis.revenue_realized,
                type: 'currency',
                class: 'success'
            },
            {
                title: 'Revenue Collected',
                value: kpis.revenue_collected,
                type: 'currency',
                class: 'success'
            },
            {
                title: 'Revenue Pending',
                value: kpis.revenue_pending,
                type: 'currency',
                class: 'warning'
            },
            {
                title: 'Revenue At Risk',
                value: kpis.revenue_at_risk,
                type: 'currency',
                class: 'danger'
            },
            {
                title: 'Conversion Rate',
                value: kpis.conversion_rate,
                type: 'percentage',
                class: 'primary'
            },
            {
                title: 'Forecast Accuracy',
                value: kpis.forecast_accuracy_percentage,
                type: 'percentage',
                class: 'primary'
            },
            {
                title: 'Active Revenue Pipeline',
                value: kpis.active_revenue_pipeline,
                type: 'currency',
                class: 'primary'
            }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="kpi-card ${card.class}">
                <div class="kpi-label">${card.title}</div>
                <div class="kpi-value ${card.type}">${this.formatValue(card.value ?? 0, card.type)}</div>
                <div class="kpi-change positive">Active Deals: ${kpis.total_active_deals ?? 0}</div>
            </div>
        `).join('');
    }

    /**
     * Render monthly revenue trend chart
     */
    renderMonthlyTrendChart(data) {
        const canvasId = 'forecastTrendChart';
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.trend) {
            this.charts.trend.destroy();
        }
        
        const labels = data.map(d => d.month);
        const expectedData = data.map(d => d.expected_revenue);
        const weightedData = data.map(d => d.weighted_revenue);
        const realizedData = data.map(d => d.realized_revenue);
        const collectedData = data.map(d => d.collected_revenue);
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Expected Revenue',
                        data: expectedData,
                        borderColor: '#8B4C63',
                        backgroundColor: 'rgba(139, 76, 99, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Weighted Revenue',
                        data: weightedData,
                        borderColor: '#a85a73',
                        backgroundColor: 'rgba(168, 90, 115, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Realized Revenue',
                        data: realizedData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Collected Revenue',
                        data: collectedData,
                        borderColor: '#20c997',
                        backgroundColor: 'rgba(32, 201, 151, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render revenue by vertical pie chart
     */
    renderVerticalChart(data) {
        const canvasId = 'forecastVerticalChart';
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.vertical) {
            this.charts.vertical.destroy();
        }
        
        const colors = ['#8B4C63', '#a85a73', '#c7697e'];
        
        this.charts.vertical = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.vertical_name),
                datasets: [{
                    data: data.map(d => d.revenue),
                    backgroundColor: colors,
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Render revenue by product horizontal bar chart
     */
    renderProductChart(data) {
        const canvasId = 'forecastProductChart';
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.product) {
            this.charts.product.destroy();
        }
        
        this.charts.product = new Chart(ctx, {
            type: 'barH',
            data: {
                labels: data.map(d => d.product_name),
                datasets: [{
                    label: 'Revenue',
                    data: data.map(d => d.revenue),
                    backgroundColor: '#8B4C63',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render revenue by lender chart
     */
    renderLenderChart(data) {
        const container = document.getElementById('forecastLenderChart');
        if (!container) return;
        
        const topLenders = data.slice(0, 10);
        
        container.innerHTML = `
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Lender</th>
                        <th class="text-right">Revenue</th>
                        <th class="text-right">Deals</th>
                    </tr>
                </thead>
                <tbody>
                    ${topLenders.map(lender => `
                        <tr onclick="forecastDashboard.showLenderDetails('${lender.lender_name}')">
                            <td>${lender.lender_name}</td>
                            <td class="text-right numeric currency">${this.formatCurrency(lender.revenue)}</td>
                            <td class="text-right">${lender.deal_count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render RM leaderboard
     */
    renderRMLeaderboard(data, executiveData = []) {
        const container = document.getElementById('forecastRMLeaderboard');
        if (!container) return;
        
        container.innerHTML = `
            <h4>Relationship Managers</h4>
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Relationship Manager</th>
                        <th class="text-right">Total Revenue</th>
                        <th class="text-right">Weighted</th>
                        <th class="text-right">Deals</th>
                        <th class="text-right">Conversion %</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((rm, idx) => `
                        <tr>
                            <td><strong>#${idx + 1}</strong> ${rm.manager_name}</td>
                            <td class="text-right numeric currency">${this.formatCurrency(rm.total_revenue)}</td>
                            <td class="text-right numeric currency">${this.formatCurrency(rm.weighted_revenue)}</td>
                            <td class="text-right">${rm.deal_count}</td>
                            <td class="text-right text-success">${rm.conversion_percentage.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <h4>Sales Executives</h4>
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Sales Executive</th>
                        <th class="text-right">Total Revenue</th>
                        <th class="text-right">Weighted</th>
                        <th class="text-right">Deals</th>
                        <th class="text-right">Conversion %</th>
                    </tr>
                </thead>
                <tbody>
                    ${executiveData.map((executive, idx) => `
                        <tr>
                            <td><strong>#${idx + 1}</strong> ${executive.sales_executive}</td>
                            <td class="text-right numeric currency">${this.formatCurrency(executive.total_revenue)}</td>
                            <td class="text-right numeric currency">${this.formatCurrency(executive.weighted_revenue)}</td>
                            <td class="text-right">${executive.deal_count}</td>
                            <td class="text-right text-success">${executive.conversion_percentage.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render revenue by fee type stacked bar chart
     */
    renderFeeTypeChart(data) {
        const canvasId = 'forecastFeeTypeChart';
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.feeType) {
            this.charts.feeType.destroy();
        }
        
        const feeTypes = Object.keys(data);
        const feeValues = Object.values(data);
        
        this.charts.feeType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Revenue Breakdown'],
                datasets: feeTypes.map((fee, idx) => ({
                    label: this.formatFeeTypeName(fee),
                    data: [feeValues[idx]],
                    backgroundColor: this.getChartColor(idx)
                }))
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }

    /**
     * Render forecast funnel
     */
    renderFunnelChart(data) {
        const container = document.getElementById('forecastFunnelChart');
        if (!container) return;
        
        const maxRevenue = Math.max(...data.map(d => d.expected_revenue), 1);
        
        container.innerHTML = `
            <div class="forecast-funnel">
                ${data.map(stage => {
                    const width = (stage.expected_revenue / maxRevenue) * 100;
                    return `
                        <div class="funnel-stage" onclick="forecastDashboard.showFunnelDetails('${stage.stage}')">
                            <div class="funnel-label">${stage.stage}</div>
                            <div class="funnel-bar" style="width: ${width}%;">
                                ${this.formatCurrency(stage.expected_revenue)}
                            </div>
                            <div class="funnel-metrics">
                                <span><span class="value">${stage.deal_count}</span>Deals</span>
                                <span><span class="value">${stage.conversion_percentage.toFixed(1)}%</span>Conv</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render upcoming revenue
     */
    renderUpcomingRevenue(data) {
        const container = document.getElementById('forecastUpcomingRevenue');
        if (!container) return;
        
        let html = '<div class="forecast-table-card">';
        
        if (data.upcoming_disbursements && data.upcoming_disbursements.length > 0) {
            html += `
                <h4>Upcoming Disbursements</h4>
                <table class="forecast-table">
                    <thead>
                        <tr>
                            <th>Deal</th>
                            <th>Sales Executive</th>
                            <th>Expected Date</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.upcoming_disbursements.map(d => `
                            <tr>
                                <td>${d.deal_name}</td>
                                <td>${d.sales_executive || 'Unassigned'}</td>
                                <td>${new Date(d.expected_date).toLocaleDateString()}</td>
                                <td class="text-right numeric currency">${this.formatCurrency(d.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Apply filters
     */
    applyFilters() {
        // Update filters from UI
        this.filters.vertical_id = document.getElementById('forecastVerticalFilter')?.value || null;
        this.filters.product_id = document.getElementById('forecastProductFilter')?.value || null;
        this.filters.lender_id = document.getElementById('forecastLenderFilter')?.value || null;
        this.filters.stage = document.getElementById('forecastStageFilter')?.value || null;
        this.filters.rm_id = document.getElementById('forecastRMFilter')?.value || null;
        
        this.loadDashboard();
    }

    /**
     * Reset filters
     */
    resetFilters() {
        this.filters = {
            vertical_id: null,
            product_id: null,
            lender_id: null,
            stage: null,
            rm_id: null,
            date_from: null,
            date_to: null
        };
        
        // Reset UI
        document.getElementById('forecastVerticalFilter').value = '';
        document.getElementById('forecastProductFilter').value = '';
        document.getElementById('forecastLenderFilter').value = '';
        document.getElementById('forecastStageFilter').value = '';
        document.getElementById('forecastRMFilter').value = '';
        
        this.loadDashboard();
    }

    /**
     * Utility: Format value
     */
    formatValue(value, type) {
        if (type === 'currency') {
            return this.formatCurrency(value);
        } else if (type === 'percentage') {
            return (value || 0).toFixed(1);
        }
        return value;
    }

    /**
     * Utility: Format currency
     */
    formatCurrency(value) {
        if (!value) return '₹0';
        
        const num = parseFloat(value);
        if (num >= 10000000) {
            return '₹' + (num / 10000000).toFixed(2) + 'Cr';
        } else if (num >= 100000) {
            return '₹' + (num / 100000).toFixed(2) + 'L';
        } else if (num >= 1000) {
            return '₹' + (num / 1000).toFixed(2) + 'K';
        }
        return '₹' + num.toFixed(0);
    }

    /**
     * Utility: Format fee type name
     */
    formatFeeTypeName(feeType) {
        const names = {
            'pf_revenue': 'PF Revenue',
            'platform_charges': 'Platform Charges',
            'processing_charges': 'Processing Charges',
            'tranche_charges': 'Tranche Charges',
            'documentation_charges': 'Documentation Charges',
            'mandate_fees': 'Mandate Fees',
            'advisory_fees': 'Advisory Fees',
            'renewal_charges': 'Renewal Charges',
            'other_charges': 'Other Charges'
        };
        return names[feeType] || feeType;
    }

    /**
     * Utility: Get chart color
     */
    getChartColor(index) {
        const colors = [
            '#8B4C63', '#a85a73', '#c7697e', '#28a745', '#20c997',
            '#ffc107', '#fd7e14', '#dc3545', '#6c757d', '#0dcaf0'
        ];
        return colors[index % colors.length];
    }

    /**
     * Utility: Get auth token
     */
    getToken() {
        const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
        return session.access_token || session.token || '';
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loader = document.getElementById('forecastLoader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const error = document.getElementById('forecastError');
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
            setTimeout(() => {
                error.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Show funnel details
     */
    showFunnelDetails(stage) {
        console.log('[Forecast] Showing funnel details for stage:', stage);
        // Open drill-down modal or navigate to deals list
    }

    /**
     * Show lender details
     */
    showLenderDetails(lenderName) {
        console.log('[Forecast] Showing lender details:', lenderName);
        // Open drill-down modal or navigate to deals list
    }
}

// Initialize on page load
let forecastDashboard;
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('forecastKPICards')) {
        forecastDashboard = new ForecastDashboard();
        await forecastDashboard.init();
    } else {
        console.warn('[Forecast] KPI container not found; forecast dashboard will not initialize.');
    }
});

// Auto-refresh every 5 minutes
setInterval(() => {
    if (forecastDashboard && forecastDashboard.initialized) {
        console.log('[Forecast] Auto-refreshing data...');
        forecastDashboard.loadDashboard();
    }
}, 300000); // 5 minutes
