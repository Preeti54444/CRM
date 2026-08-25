# 🚀 Revenue Forecast Module - Quick Start Guide

## Installation & Deployment (5 Minutes)

### Step 1: Run Database Migration
```bash
cd backend
python -m alembic upgrade head
```

**What this does:**
- Creates 11 new database tables for forecasting
- Sets up proper relationships and indexes
- No existing data is affected

**Expected output:**
```
INFO [alembic.migration] Context impl PostgreSQLImpl.
INFO [alembic.migration] Will assume transactional DDL is supported by the engine
INFO [alembic.migration] Running upgrade ... -> 20260712_forecast_module, add forecast module tables
```

---

### Step 2: Initialize Forecast Data
Make one API call to initialize master data:

```bash
curl -X POST http://localhost:8000/api/forecast/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**What this does:**
- Creates 10 pipeline stages with probabilities
- Creates 3 business verticals (SCF, PC, ITF)
- Creates 7 products (Vendor Finance, Dealer Finance, etc.)
- Creates default lenders

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "stages_created": 10,
    "verticals_created": 3,
    "products_created": 7,
    "lenders_created": 5
  }
}
```

---

### Step 3: Verify Backend Integration
Check that forecast module is loaded:

```bash
curl http://localhost:8000/api/docs
```

Look for `/api/forecast/*` endpoints in the Swagger UI

---

### Step 4: Access Dashboard
Open in browser:
```
http://localhost:3000/forecast.html
```

Or navigate via CRM menu:
1. Open CRM homepage
2. Click on **"Sales"** menu in sidebar
3. Click on **"Revenue Forecast"** submenu item

---

## 📊 First-Time Setup

### Create Test Deal
1. Go to **Sales > Lead Management**
2. Create a new lead with:
   - Company: Test Company
   - Contact: Test Contact
   - Loan Amount: ₹10,00,000
   - Product: Vendor Finance
   - Lender: Select any lender
3. Save lead

### Generate Forecast
The forecast is automatically created when the deal is saved. To verify:

```bash
curl http://localhost:8000/api/forecast/deals \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should see your test deal with calculated revenue.

### View Dashboard
Refresh forecast.html - you should see:
- KPI cards populated with values
- Charts rendering with data
- Your test deal in the funnel

---

## 📈 Understanding the KPIs

| Metric | What It Means | Formula |
|--------|--------------|---------|
| **Total Expected Revenue** | All possible revenue from active deals | Sum of (Loan Amount × Fee% + Charges) |
| **Weighted Forecast Revenue** | Realistic revenue considering stage probability | Sum of (Expected Revenue × Stage Probability %) |
| **Active Pipeline** | Same as Weighted Forecast Revenue | Most conservative revenue estimate |
| **Revenue Realized** | Revenue from deals that have been disbursed | Sum of actual disbursed deals |
| **Revenue Collected** | Amount actually received from customers | Subset of Realized Revenue |
| **Revenue at Risk** | Potential revenue from early-stage deals | Deals with < 50% probability |
| **Forecast Accuracy** | Historical accuracy of predictions | (Realized Revenue / Forecasted Revenue) × 100 |

---

## 🔄 Revenue Calculation Example

### Scenario
**Company**: ABC Exports Ltd  
**Vertical**: International Trade Finance  
**Product**: Export Finance  
**Lender**: ICICI Bank  
**Loan Amount**: ₹50,00,000  

### Configuration
Revenue Rule for ITF + Export Finance + ICICI:
- PF%: 1.2%
- Platform Charges: ₹25,000
- Processing Charges: ₹15,000
- Advisory Fees: ₹10,000
- Revenue Share: 20%

### Calculation
```
Step 1: Calculate PF Revenue
  = 50,00,000 × 1.2% = ₹60,000

Step 2: Calculate Revenue Sharing
  = 60,000 × 20% = ₹12,000

Step 3: Sum All Charges
  = 25,000 + 15,000 + 10,000 = ₹50,000

Step 4: Calculate Expected Revenue
  = 60,000 + 50,000 - 12,000 = ₹98,000

Step 5: Apply Stage Probability
  If stage = "Proposal Submitted" (50% probability)
  Weighted Revenue = 98,000 × 50% = ₹49,000
```

### Dashboard Display
- **Expected Revenue**: ₹98,000
- **Weighted Revenue**: ₹49,000
- **Stage Probability**: 50%

---

## 🎯 Common Use Cases

### Use Case 1: Sales Target Tracking
1. Open Revenue Forecast Dashboard
2. Check "Active Pipeline" KPI
3. Confirm revenue in pipeline meets quarterly targets

### Use Case 2: Funnel Analysis
1. Look at "Forecast Funnel" chart
2. Identify bottleneck stages
3. Prioritize deals in those stages

### Use Case 3: Vertical Performance
1. Check "Revenue by Vertical" pie chart
2. Compare SCF vs PC vs ITF performance
3. Make product mix decisions

### Use Case 4: RM Leaderboard
1. View "Top RMs" leaderboard
2. See revenue and deal count per RM
3. Identify top performers

### Use Case 5: Revenue Forecasting
1. Look at "Monthly Revenue Trend" chart
2. See expected vs weighted vs realized revenue
3. Plan cash flow accordingly

---

## 🔧 Troubleshooting

### Problem: Dashboard shows No Data

**Solution:**
1. Ensure deals exist: `GET /api/forecast/deals`
2. Check if revenue rules are created: `GET /api/forecast/kpis`
3. If empty, run initialization again: `POST /api/forecast/initialize`

### Problem: "Authorization Failed" Error

**Solution:**
1. Log in to CRM first
2. Ensure token is stored in localStorage
3. Check browser DevTools > Application > localStorage > crm_session

### Problem: Charts Not Rendering

**Solution:**
1. Open browser console (F12)
2. Look for errors
3. Ensure forecast.html loads correctly
4. Check that Chart.js is loaded

### Problem: Weighted Revenue = 0

**Solution:**
1. Check pipeline stage probability - might be 0%
2. Verify deal is in correct stage
3. Ensure expected revenue is calculated

---

## 📊 Dashboard Features

### Filters
Apply filters to focus on specific data:
- **Vertical**: SCF, PC, ITF
- **Product**: 7 available products
- **Lender**: Any configured lender
- **Stage**: 10 pipeline stages
- **RM**: Any relationship manager

### Charts
7 interactive visualizations:
1. **Monthly Trend** (Line chart) - Revenue over 12 months
2. **By Vertical** (Pie chart) - Revenue distribution
3. **By Product** (Bar chart) - Product-wise breakdown
4. **By Fee Type** (Stacked bar) - Charge breakdown
5. **Funnel** (Custom) - Stage-wise conversion
6. **By Lender** (Table) - Top lenders
7. **By RM** (Table) - Leaderboard

### Auto-Refresh
Dashboard automatically refreshes every 5 minutes with latest data.

### Mobile Responsive
Dashboard is fully responsive and works on:
- Desktop (1920px+)
- Tablet (1024px-1920px)
- Mobile (< 1024px)

---

## 🔐 Role-Based Access

| Role | Can View | Can Override |
|------|----------|--------------|
| Sales Executive | Own deals only | Own deals |
| RM | Team deals | Team deals |
| Sales Manager | Department | Department |
| Business Head | All | All |
| Finance | All | Override revenue |
| Admin | All | All |

---

## 📝 API Quick Reference

### KPI Metrics
```bash
GET /api/forecast/kpis
```

### Monthly Trend
```bash
GET /api/forecast/revenue-trend?months=12
```

### Revenue by Vertical
```bash
GET /api/forecast/by-vertical
```

### Deal List
```bash
GET /api/forecast/deals?limit=100&skip=0
```

### Specific Deal
```bash
GET /api/forecast/deal/lead_id_123
```

### Apply Override
```bash
POST /api/forecast/revenue-override
{
  "lead_id": "123",
  "field_name": "pf_revenue",
  "override_value": 50000,
  "reason": "Negotiated pricing"
}
```

### View Audit Trail
```bash
GET /api/forecast/audit-trail/lead_id_123
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Database tables created (check PostgreSQL)
- [ ] Forecast API responding (check Swagger)
- [ ] Dashboard loads (open forecast.html)
- [ ] KPI cards show numbers (not errors)
- [ ] Charts render (not blank)
- [ ] Filters work (select and apply)
- [ ] Auto-refresh works (wait 5 minutes)
- [ ] Mobile responsive (resize browser)

---

## 🆘 Support & Next Steps

### Need Help?
1. Check FORECAST_MODULE_DOCUMENTATION.md for detailed info
2. Review Swagger API docs at `/api/docs`
3. Check browser console for errors (F12)
4. Review PostgreSQL logs for database errors

### Next Steps
1. Create test deals and verify calculations
2. Configure revenue rules for your lenders
3. Add more pipeline stages if needed
4. Set up role-based access
5. Configure filters based on your business

---

## 📞 Contact Information

For issues:
- Check API logs: `backend/logs/`
- Check browser console: F12 > Console tab
- Check PostgreSQL logs for database errors

---

**Version**: 1.0.0  
**Last Updated**: July 2026  
**Status**: Production Ready ✅

---

Happy Forecasting! 🎉
