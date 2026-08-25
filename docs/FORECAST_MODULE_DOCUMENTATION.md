# Funding Sathi CRM - Revenue Forecast Module
## Complete Implementation Documentation

---

## 📋 Project Overview

The **Revenue Forecast Module** is a comprehensive Revenue Intelligence Dashboard integrated into the Funding Sathi CRM. It provides real-time visibility into expected revenue, deals in the pipeline, and accurate forecasting based on dynamic calculations from deal data, revenue rules, and pipeline probabilities.

**This is NOT a sales forecasting module** - it calculates actual expected revenue based on:
- Loan amounts
- Business vertical configurations
- Product specifications
- Lender agreements
- Commercial charges (PF%, platform charges, processing charges, etc.)
- Revenue sharing percentages
- Pipeline stage probabilities

---

## 🏗️ Architecture Overview

### Technology Stack
- **Backend**: FastAPI (Python) + PostgreSQL
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Charts**: Chart.js 3.9.1
- **ORM**: SQLAlchemy

### Module Location
```
Backend: backend/app/
  - models/forecast.py (Database models)
  - services/forecast_service.py (Calculation engine)
  - services/forecast_query_service.py (Query & aggregation)
  - routers/forecast.py (API endpoints)

Frontend: frontend/
  - forecast.html (Main dashboard)
  - js/crm-forecast.js (Dashboard logic)
  - css/crm-forecast.css (Styling)
```

---

## 📊 Database Schema

### Core Tables Created

#### 1. **pipeline_stage_configs**
Stores forecast probability for each pipeline stage
- Columns: stage_name, stage_order, forecast_probability (5% to 100%), is_active

#### 2. **business_vertical_configs**
Master data for business verticals
- Columns: vertical_name, vertical_code, revenue_formula_version, is_active
- Values: Supply Chain Finance (SCF), Private Credit (PC), International Trade Finance (ITF)

#### 3. **product_masters**
Product catalog
- Columns: product_name, product_code, business_vertical_id, is_active
- Values: Vendor Finance, Dealer Finance, Invoice Discounting, Working Capital, Bridge Loans, Export Finance, Import Finance

#### 4. **lender_masters**
Lender master data
- Columns: lender_name, lender_code, description, is_active

#### 5. **revenue_rule_masters**
Configurable revenue rules per vertical/product/lender combination
- Columns:
  - business_vertical_id, product_id, lender_id
  - pf_percentage (% of loan amount)
  - platform_charges, processing_charges, tranche_charges, documentation_charges
  - advisory_fees, mandate_fees, renewal_charges, other_commercial_charges
  - revenue_share_percentage (% of PF revenue)
  - effective_from, effective_to, is_active, is_default

#### 6. **forecast_snapshots** (Main Forecast Table)
Stores revenue calculation snapshot for each deal
- Columns:
  - lead_id, deal_name, company_name
  - business_vertical_id, product_id, lender_id
  - loan_amount
  - Revenue components: pf_revenue, platform_charges, processing_charges, etc.
  - expected_revenue, weighted_revenue
  - current_stage, current_stage_probability
  - mandate_date, first_tranche_date, expected_disbursement_date
  - status (Active, Closed, Cancelled)
  - snapshot_version (for tracking historical changes)

#### 7. **forecast_audit_trails**
Complete audit trail of all commercial changes
- Columns:
  - lead_id, change_type, field_name
  - previous_value, new_value
  - revenue_impact, weighted_revenue_impact
  - changed_by, approval_status
  - reason, formula_version

#### 8. **forecast_results**
Aggregated KPI results (calculated periodically)
- Columns:
  - total_expected_revenue, total_weighted_revenue
  - revenue_realized, revenue_collected, revenue_pending
  - revenue_at_risk, forecast_accuracy_percentage
  - active_revenue_pipeline, total_active_deals
  - deals_by_stage, revenue_by_stage (JSON)

#### 9. **revenue_realizations**
Track actual revenue vs forecast
- Columns: lead_id, realization_date, realized_revenue_amount, collected_amount
- Tracked components, variance calculation

#### 10. **tranche_schedules**
Future tranches for revenue forecasting
- Columns: lead_id, tranche_number, tranche_amount, expected_date
- Associated charges per tranche

#### 11. **renewal_schedules**
Renewal schedule for forecasting renewal revenue
- Columns: lead_id, renewal_number, renewal_expected_date, renewal_amount, renewal_sanctioned

---

## 🔧 Backend Implementation

### 1. Forecast Calculation Engine (`forecast_service.py`)

#### Key Classes:
**ForecastCalculationEngine**

Methods:
- `get_pipeline_stage_probability(stage_name: str) -> float`
  - Returns probability (0.0 to 1.0) for a pipeline stage

- `get_revenue_rule(vertical_id, product_id, lender_id) -> RevenueRuleMaster`
  - Fetches applicable revenue rule for combination
  - Returns latest active rule within effective dates

- `calculate_expected_revenue(loan_amount, rule) -> Dict`
  - Core calculation engine
  - Returns: pf_revenue, all charges, revenue_sharing, total_expected_revenue
  
  **Formula:**
  ```
  PF Revenue = Loan Amount × (PF % / 100)
  Revenue Sharing = PF Revenue × (Revenue Share % / 100)
  
  Total Expected Revenue = 
    PF Revenue +
    Platform Charges +
    Processing Charges +
    Tranche Charges +
    Documentation Charges +
    Advisory Fees +
    Mandate Fees +
    Renewal Charges +
    Other Charges -
    Revenue Sharing
  ```

- `calculate_weighted_revenue(expected_revenue, stage_probability) -> Decimal`
  - Calculates: Expected Revenue × Stage Probability
  - Used for "Weighted Forecast Revenue" KPI

- `create_forecast_snapshot(lead_id, ...) -> ForecastSnapshot`
  - Creates or updates forecast snapshot for a deal
  - Automatically calculates all revenue components
  - Stores snapshot version for historical tracking

- `record_audit_trail(...) -> ForecastAuditTrail`
  - Records all commercial changes
  - Tracks revenue impact for transparency

- `initialize_pipeline_stages()`
  - Populates default pipeline stages with probabilities
  
- `initialize_business_verticals()`
  - Populates default business verticals
  
- `initialize_products()`
  - Populates default products

### 2. Forecast Query Service (`forecast_query_service.py`)

#### Key Class:
**ForecastQueryService**

Methods:
- `get_kpi_metrics(...filters...) -> Dict`
  - Returns all KPI metrics for dashboard:
    - total_expected_revenue
    - weighted_forecast_revenue
    - revenue_realized, revenue_collected, revenue_pending
    - revenue_at_risk
    - forecast_accuracy_percentage
    - active_revenue_pipeline
    - total_active_deals
    - revenue_by_stage, deals_by_stage

- `get_monthly_revenue_trend(months: int, ...) -> List[Dict]`
  - Returns 12-month trend data
  - Includes: expected_revenue, weighted_revenue, realized_revenue, collected_revenue per month

- `get_revenue_by_vertical(...) -> List[Dict]`
  - Pie chart data
  - Sorted by revenue amount

- `get_revenue_by_product(...) -> List[Dict]`
  - Horizontal bar chart data
  - Shows revenue per product

- `get_revenue_by_lender(...) -> List[Dict]`
  - Top lenders sorted by revenue
  - Includes deal count per lender

- `get_revenue_by_relationship_manager(...) -> List[Dict]`
  - Leaderboard with:
    - manager_name, total_revenue, weighted_revenue
    - deal_count, conversion_percentage

- `get_revenue_by_fee_type(...) -> Dict`
  - Breakdown by fee type for stacked bar chart
  - Keys: pf_revenue, platform_charges, processing_charges, etc.

- `get_forecast_funnel(...) -> List[Dict]`
  - Pipeline funnel showing:
    - stage, deal_count, expected_revenue, weighted_revenue
    - average_ticket_size, conversion_percentage

- `get_upcoming_revenue(days_ahead: int, ...) -> Dict`
  - Upcoming disbursements, mandates, tranches, renewals
  - Filtered by expected dates within days_ahead

---

### 3. API Endpoints (`routers/forecast.py`)

#### Initialization
- **POST** `/api/forecast/initialize`
  - Initializes default master data

#### Snapshots
- **POST** `/api/forecast/snapshot/create`
  - Creates/updates forecast snapshot for a lead

#### KPIs & Metrics
- **GET** `/api/forecast/kpis`
  - All KPI metrics (with filters)

- **GET** `/api/forecast/revenue-trend`
  - Monthly trend (12 months default)

- **GET** `/api/forecast/by-vertical`
  - Revenue by business vertical

- **GET** `/api/forecast/by-product`
  - Revenue by product

- **GET** `/api/forecast/by-lender`
  - Revenue by lender (sorted highest first)

- **GET** `/api/forecast/by-relationship-manager`
  - RM leaderboard

- **GET** `/api/forecast/by-fee-type`
  - Revenue breakdown by fee type

#### Visualizations
- **GET** `/api/forecast/funnel`
  - Forecast funnel data by pipeline stage

- **GET** `/api/forecast/upcoming-revenue`
  - Upcoming revenue by date type

#### Deals
- **GET** `/api/forecast/deals`
  - Drill-down deal list with filters

- **GET** `/api/forecast/deal/{lead_id}`
  - Detailed forecast for specific deal

#### Commercial Management
- **POST** `/api/forecast/revenue-override`
  - Apply revenue override for a field

- **GET** `/api/forecast/audit-trail/{lead_id}`
  - Audit trail for a deal

---

## 🎨 Frontend Implementation

### 1. Main Dashboard (`forecast.html`)

Structure:
- **Header**: Title, refresh button
- **Filter Bar**: Vertical, Product, Lender, Stage, RM dropdowns
- **KPI Cards**: 8 main KPIs displayed as animated cards
- **Charts**: Multiple visualizations (line, pie, bar, etc.)
- **Funnel**: Pipeline conversion funnel
- **Tables**: Lender rankings, RM leaderboard
- **Upcoming Revenue**: Future revenue schedule

### 2. JavaScript Module (`crm-forecast.js`)

#### Main Class: `ForecastDashboard`

Properties:
- `apiBase`: API base URL
- `filters`: Current filter state
- `charts`: Chart.js instance cache
- `initialized`: Initialization flag

Methods:

**Initialization:**
- `init()` - Initialize dashboard
- `initializeForecastData()` - Initialize backend master data
- `setupEventListeners()` - Setup filter and button handlers

**Data Loading:**
- `loadDashboard()` - Load all data in parallel
- `getKPIMetrics()` - Fetch KPI data
- `getRevenueTrend()` - Fetch trend data
- `getRevenueByVertical()` - Fetch vertical data
- `getRevenueByProduct()` - Fetch product data
- `getRevenueByLender()` - Fetch lender data
- `getRevenueByRM()` - Fetch RM data
- `getRevenueByFeeType()` - Fetch fee type data
- `getForecastFunnel()` - Fetch funnel data
- `getUpcomingRevenue()` - Fetch upcoming revenue data

**Rendering:**
- `renderKPICards()` - Render KPI cards with animated counters
- `renderMonthlyTrendChart()` - Line chart for monthly trend
- `renderVerticalChart()` - Pie chart for verticals
- `renderProductChart()` - Horizontal bar for products
- `renderLenderChart()` - Table for top lenders
- `renderRMLeaderboard()` - Leaderboard table
- `renderFeeTypeChart()` - Stacked bar chart
- `renderFunnelChart()` - Funnel visualization
- `renderUpcomingRevenue()` - Upcoming revenue table

**Filtering:**
- `applyFilters()` - Apply selected filters
- `resetFilters()` - Clear all filters

**Utilities:**
- `formatValue()` - Format numbers
- `formatCurrency()` - Format currency values
- `formatFeeTypeName()` - Format fee type names
- `getChartColor()` - Get consistent chart colors
- `getToken()` - Get auth token from localStorage
- `showLoading()` - Show/hide loading spinner
- `showError()` - Display error messages

### 3. Styling (`crm-forecast.css`)

Key CSS Classes:
- `.forecast-container` - Main container
- `.kpi-grid` - KPI cards grid
- `.kpi-card` - Individual KPI card
- `.forecast-filter-bar` - Filter controls
- `.forecast-chart-grid` - Charts grid
- `.forecast-chart-card` - Individual chart card
- `.forecast-table` - Data tables
- `.forecast-funnel` - Funnel visualization
- `.heatmap-cell` - Heat map cells
- `.forecast-loading` - Loading spinner
- `.forecast-modal` - Modal dialogs

Design Features:
- Burgundy primary color (#8B4C63)
- White cards with soft shadows
- Rounded corners (12px)
- Responsive layout
- Dark mode support
- Smooth animations
- Mobile-friendly

---

## 🔄 Integration Points

### 1. Deal Creation/Update Trigger
When a deal (Lead) is created or updated:
1. Frontend calls `/api/forecast/snapshot/create`
2. Backend creates ForecastSnapshot with calculated revenues
3. Audit trail is recorded automatically

### 2. Pipeline Stage Change
When a deal's pipeline stage changes:
1. Forecast snapshot is updated with new stage probability
2. Weighted revenue is recalculated
3. Dashboard auto-refreshes

### 3. Revenue Override
When a commercial field is overridden:
1. POST `/api/forecast/revenue-override` is called
2. Audit trail records change
3. Expected revenue is recalculated
4. Dashboard updates automatically

### 4. Auto-Refresh
Dashboard auto-refreshes every 5 minutes to reflect latest data

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
cd backend
python -m alembic upgrade head
```

This creates all 11 forecast tables with proper indexes and constraints.

### 2. Backend Initialization
The first time the dashboard is loaded, call:
```
POST /api/forecast/initialize
```

This populates:
- 10 pipeline stages with probabilities
- 3 business verticals
- 7 products

### 3. Add Navigation
Already added in crm1.html:
- Forecast CSS import
- Revenue Forecast menu button

### 4. Frontend Setup
Copy forecast files:
- `frontend/forecast.html`
- `frontend/js/crm-forecast.js`
- `frontend/css/crm-forecast.css`

---

## 📈 KPI Metrics Explained

### 1. **Total Expected Revenue**
Sum of all expected revenues from active deals
- Calculated as: Sum(expected_revenue) for all active snapshots

### 2. **Weighted Forecast Revenue**
Sum of all weighted revenues (considering stage probability)
- Calculated as: Sum(weighted_revenue) where weighted_revenue = expected_revenue × stage_probability
- **This is the most conservative estimate** of revenue that will actually be realized

### 3. **Revenue Realized**
Actual revenue that has been realized from deals that have been disbursed
- Tracked via RevenueRealization table

### 4. **Revenue Collected**
Portion of realized revenue that has actually been collected
- Tracked via RevenueRealization.collected_amount

### 5. **Revenue Pending**
Revenue that is realized but not yet collected
- Calculated as: Revenue Realized - Revenue Collected

### 6. **Revenue At Risk**
Weighted revenue from deals in early stages (probability < 50%)
- Deals in "Lead Created" through "Proposal Submitted" stages

### 7. **Forecast Accuracy**
Percentage accuracy of past forecasts vs actual realized revenue
- Calculated as: (Total Realized / Total Forecasted) × 100
- Capped at 100%

### 8. **Active Revenue Pipeline**
Same as "Weighted Forecast Revenue"
- Total potential revenue in the active pipeline

---

## 🔐 Security & Role-Based Access

The module enforces role-based permissions:

| Role | Permission |
|------|-----------|
| Sales Executive | View only (own deals) |
| Relationship Manager | View own deals + weighted revenue |
| Sales Manager | View team forecast |
| Business Head | View all forecasts |
| Finance Team | View revenue realization |
| Admin | Full access |
| CEO | Complete access |

Authentication:
- Uses existing CRM authentication token
- All API calls require valid JWT token
- Token stored in localStorage under 'crm_session'

---

## 📝 Revenue Calculation Formulas

### Expected Revenue Formula
By Business Vertical (all use the same formula):

```
Expected Revenue = 
  (Loan Amount × PF%) +
  Platform Charges +
  Processing Charges +
  Tranche Charges +
  Documentation Charges +
  Advisory Fees +
  Mandate Fees +
  Renewal Charges +
  Other Charges -
  (PF Revenue × Revenue Share%)
```

### Weighted Revenue Formula
```
Weighted Revenue = Expected Revenue × Stage Probability
```

### Examples:
**Deal 1: Supply Chain Finance - Vendor Finance**
- Loan Amount: ₹10,00,000
- PF%: 1.5%, Platform Charges: ₹5,000, Processing: ₹3,000
- Current Stage: Proposal Submitted (50% probability)

Calculation:
```
PF Revenue = 10,00,000 × 1.5% = ₹15,000
Total Charges = 5,000 + 3,000 = ₹8,000
Expected Revenue = 15,000 + 8,000 = ₹23,000
Weighted Revenue = 23,000 × 50% = ₹11,500
```

---

## 🔄 Auto-Refresh Architecture

### Mechanism
1. Dashboard initializes auto-refresh timer on load (5 minutes)
2. Timer calls `forecastDashboard.loadDashboard()`
3. All data is fetched in parallel using Promise.all()
4. Charts are destroyed and recreated
5. No manual refresh button click needed

### Benefits
- Always shows latest data
- No stale information
- Real-time collaboration
- No performance impact (only refreshes when dashboard is open)

---

## 🎯 AI Ready Architecture

The module is designed for future AI enhancements without major refactoring:

### Phase II - Potential AI Features
1. **AI Revenue Prediction**: Predict probability of deal closure
2. **Deal Closure Probability**: ML model for conversion likelihood
3. **Revenue Leakage Detection**: Identify at-risk deals
4. **Lender Payout Prediction**: Predict when funds will be received
5. **Tranche Renewal Prediction**: Forecast renewal likelihood
6. **Revenue Trend Prediction**: Time series forecasting
7. **Cash Flow Forecasting**: Predict cash inflows

### Extensible API Design
- All queries use parametric filters
- Results are structured and normalized
- Easy to add ML model endpoints
- Can run predictions asynchronously
- Results cached for performance

---

## 📊 Data Quality Considerations

### Validation Rules
- Loan amount must be positive
- Stage probability must be 0.0 to 1.0
- Dates must be chronologically valid
- Revenue components must be non-negative
- Snapshot versions auto-increment

### Error Handling
- Transaction rollback on calculation errors
- Graceful degradation if master data missing
- Empty result handling (no divide-by-zero errors)
- Null safety throughout

---

## 🐛 Troubleshooting

### Common Issues

**1. "No forecast snapshot found"**
- Ensure deal has been created in leads
- Call `/api/forecast/snapshot/create` to create snapshot

**2. Dashboard shows $0 revenue**
- Check if revenue rule is configured for vertical/product/lender
- Verify loan amount is populated
- Check if rule is within effective_from/effective_to dates

**3. Weighted revenue is different from expected**
- This is normal - it's multiplied by stage probability
- Check current_stage_probability value

**4. Charts not rendering**
- Ensure Chart.js is loaded
- Check browser console for errors
- Verify API responses are valid JSON

---

## 📚 Related Documentation

- Backend API Documentation: `/api/docs` (Swagger UI)
- CRM Architecture: See README.md in root
- Database Schema: See Alembic migrations
- Frontend Guide: See crm1.html for navigation

---

## ✅ Implementation Checklist

- [x] Database models created
- [x] Alembic migration created
- [x] Calculation engine implemented
- [x] Query service implemented
- [x] API endpoints created
- [x] Frontend dashboard created
- [x] JavaScript module created
- [x] CSS styling created
- [x] Navigation integrated
- [x] Authentication integrated
- [x] Error handling implemented
- [x] Documentation created

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation at `/api/docs`
3. Check browser console for errors
4. Review server logs for backend errors

---

## 📄 Version Info

- **Module Version**: 1.0.0
- **Created**: July 2026
- **Database Schema Version**: 20260712_forecast_module
- **API Version**: v1

---

## 🎓 Key Learning Outcomes

This implementation demonstrates:
1. Complex database schema design with relationships
2. Advanced SQLAlchemy ORM patterns
3. Efficient API design with filtering and aggregation
4. Real-time dashboard with Chart.js
5. Responsive UI/UX design
6. Role-based access control
7. Audit trail tracking
8. Financial calculations and accuracy
9. Auto-refresh mechanisms
10. Error handling and validation

---

**End of Documentation**
