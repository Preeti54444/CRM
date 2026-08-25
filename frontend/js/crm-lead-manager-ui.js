/**
 * Lead Manager UI Module - CRM System
 * Provides UI components and interactions for lead management
 * Version: 1.0.0
 */

class LeadManagerUI {
  constructor(leadManager) {
    this.leadManager = leadManager;
    this.currentFilters = {};
    this.currentPage = 1;
    this.pageSize = 20;
  }

  /**
   * Initialize UI components in HTML
   */
  initializeUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    container.innerHTML = `
      <div class="lead-manager-container">
        <!-- Header -->
        <div class="lead-manager-header">
          <h2>Lead Management</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="btnNewLead">+ New Lead</button>
            <button class="btn btn-secondary" id="btnBulkUpload">📤 Bulk Upload</button>
            <button class="btn btn-secondary" id="btnExport">📥 Export</button>
          </div>
        </div>

        <!-- Filter Panel -->
        <div class="filter-panel" id="filterPanel">
          <div class="filter-section">
            <h4>Filters</h4>
            <div class="filter-group">
              <label>Status</label>
              <select id="filterStatus" multiple class="form-control">
                <option value="">All Statuses</option>
                ${this.getStatusOptions()}
              </select>
            </div>

            <div class="filter-group">
              <label>Lead Source</label>
              <select id="filterSource" class="form-control">
                <option value="">All Sources</option>
                ${this.getSourceOptions()}
              </select>
            </div>

            <div class="filter-group">
              <label>Loan Type</label>
              <select id="filterLoanType" class="form-control">
                <option value="">All Types</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Loan Against Property">Loan Against Property</option>
              </select>
            </div>

            <div class="filter-group">
              <label>Lead Score Range</label>
              <div class="range-inputs">
                <input type="number" id="filterScoreMin" placeholder="Min" min="0" max="100" class="form-control">
                <span>-</span>
                <input type="number" id="filterScoreMax" placeholder="Max" min="0" max="100" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>CIBIL Score Range</label>
              <div class="range-inputs">
                <input type="number" id="filterCibilMin" placeholder="Min" class="form-control">
                <span>-</span>
                <input type="number" id="filterCibilMax" placeholder="Max" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>Loan Amount Range</label>
              <div class="range-inputs">
                <input type="number" id="filterLoanAmountMin" placeholder="Min (₹)" class="form-control">
                <span>-</span>
                <input type="number" id="filterLoanAmountMax" placeholder="Max (₹)" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>City</label>
              <input type="text" id="filterCity" placeholder="Enter city" class="form-control">
            </div>

            <div class="filter-group">
              <label>Date Range</label>
              <input type="date" id="filterDateFrom" class="form-control">
              <input type="date" id="filterDateTo" class="form-control">
            </div>

            <div class="filter-actions">
              <button class="btn btn-success" id="btnApplyFilters">Apply Filters</button>
              <button class="btn btn-light" id="btnClearFilters">Clear</button>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-bar">
          <input type="text" id="nlSearch" placeholder="Natural Language Search: e.g., 'Show all Thane BL leads above 20L'" class="form-control">
          <button class="btn btn-info" id="btnSearch">Search</button>
        </div>

        <!-- Statistics Panel -->
        <div class="statistics-panel" id="statisticsPanel">
          <div class="stat-card">
            <div class="stat-label">Total Leads</div>
            <div class="stat-value" id="statTotalLeads">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Score</div>
            <div class="stat-value" id="statAvgScore">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg CIBIL</div>
            <div class="stat-value" id="statAvgCibil">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Fresh Leads</div>
            <div class="stat-value" id="statFreshLeads">0</div>
          </div>
        </div>

        <!-- Leads Table -->
        <div class="leads-table-container">
          <table class="leads-table" id="leadsTable">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Score</th>
                <th>Status</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="leadsTableBody">
              <!-- Populated by JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" id="paginationContainer">
          <button class="btn btn-sm" id="btnPrevPage">← Previous</button>
          <span id="pageInfo" class="page-info">Page 1</span>
          <button class="btn btn-sm" id="btnNextPage">Next →</button>
        </div>

        <!-- Pipeline Summary Modal -->
        <div class="modal" id="pipelineModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Pipeline Summary</h3>
            <div id="pipelineContent" class="pipeline-content">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- New Lead Modal -->
        <div class="modal" id="newLeadModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <h3>Create New Lead</h3>
            <form id="newLeadForm" class="lead-form">
              <!-- STEP 1: VERTICAL + SUB-PRODUCT -->
              <div class="form-section vertical-select-card">
                <h4>Step 1 — Vertical & Sub-Product</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Business Vertical *</label>
                    <select id="verticalSelect" name="vertical" required class="form-control" onchange="window.leadManagerUI.onVerticalChange()">
                      <option value="">Select vertical</option>
                      <option value="itf">A. International Trade Finance</option>
                      <option value="scf">B. Supply Chain Finance</option>
                      <option value="pc">C. Private Credit</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Sub-Product *</label>
                    <select id="subProductSelect" name="subProduct" required class="form-control" disabled onchange="window.leadManagerUI.renderDynamicForm(); window.leadManagerUI.handleSearch();">
                      <option value="">Select vertical first</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- STEP 2: COMMON LEAD INFO + CALL MANAGEMENT LOOKUP -->
              <div class="form-section">
                <div class="lookup-header-bar">
                  <h4 style="margin:0; padding:0; border:none;">Step 2 — Lead Information (auto-fetched from Call Management)</h4>
                  <span class="mode-badge active" id="modeBadge">Active Mode</span>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Sales Executive *</label>
                    <input id="ldExec" name="salesExecutive" required class="form-control" placeholder="e.g. Roshan Chavan" readonly>
                  </div>
                  <div class="form-group">
                    <label>Date of Entry *</label>
                    <input id="ldDate" name="dateOfEntry" type="date" required class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Lead Source</label>
                    <select id="ldSource" name="leadSource" class="form-control">
                      <option value="">Select</option>
                      <option>Inbound Call</option>
                      <option>Outbound Call</option>
                      <option>Website</option>
                      <option>Referral</option>
                      <option>Direct Call</option>
                      <option>WhatsApp</option>
                      <option>DSA WhatsApp Group</option>
                      <option>DSA cold calling</option>
                      <option>Customer cold calling</option>
                      <option>Customer referral</option>
                      <option>Lender referral</option>
                      <option>Social media</option>
                      <option>Walk in DSA</option>
                      <option>Cold Calling</option>
                      <option>Email Campaign</option>
                      <option>Walk-in</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Customer Company Name * <small>(type to check Call Management)</small></label>
                    <input id="ldCompany" name="companyName" required class="form-control" placeholder="e.g. Tata Steel Ltd" oninput="window.leadManagerUI.handleSearch()">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Contact Person Name *</label>
                    <input id="ldContact" name="fullName" required class="form-control" placeholder="e.g. Rajesh Kumar">
                  </div>
                  <div class="form-group">
                    <label>Designation</label>
                    <input id="ldDesignation" name="designation" class="form-control" placeholder="e.g. CFO, Treasury Head">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Contact Number *</label>
                    <input id="ldPhone" name="mobile" required class="form-control" placeholder="e.g. 9876543210" oninput="window.leadManagerUI.handleSearch()">
                  </div>
                  <div class="form-group">
                    <label>Email ID</label>
                    <input id="ldEmail" name="email" class="form-control" placeholder="email@company.com" oninput="window.leadManagerUI.handleSearch()">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Location (City, State)</label>
                    <input id="ldLocation" name="location" class="form-control" placeholder="e.g. Mumbai, Maharashtra">
                  </div>
                  <div class="form-group">
                    <label>Annual Turnover</label>
                    <input id="turnoverInput" name="turnover" class="form-control" placeholder="e.g. 50 (in ₹ Crore)">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Business Vintage</label>
                    <input id="vintageInput" name="vintage" class="form-control" placeholder="e.g. 5 (in years)">
                  </div>
                  <div class="form-group">
                    <label>Approx. Funding Amount Required * <small>(₹ Crore)</small></label>
                    <input id="amountInput" name="loanAmount" type="number" step="0.01" required class="form-control" placeholder="e.g. 2.5">
                  </div>
                </div>
                <div id="lookupResultContainer"></div>
              </div>

              <!-- STEP 2B: INDUSTRY & CREDIT PROFILE -->
              <div class="form-section" style="border-color:#A9C0F5;">
                <h4>Step 2B — Industry & Credit Profile <small style="color:#2F5DE8; text-transform:none; font-weight:500;">(needed to screen against lender preferred/negative industry & risk lists)</small></h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Industry / Sector *</label>
                    <select id="industryInput" name="industry" class="form-control">
                      <option value="">Select industry</option>
                      <option>Manufacturing</option>
                      <option>Trading</option>
                      <option>Services</option>
                      <option>Pharma & Chemicals</option>
                      <option>Agri & Food Processing</option>
                      <option>IT / ITES</option>
                      <option>D2C / E-commerce</option>
                      <option>Healthcare</option>
                      <option>Logistics</option>
                      <option>Retail</option>
                      <option>Energy</option>
                      <option>Real Estate / Infra / Construction</option>
                      <option>Gems & Jewellery</option>
                      <option>Capital Market</option>
                      <option>Mining / Quarrying</option>
                      <option>Other (specify in remarks)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Company Credit Rating / CMR Score</label>
                    <input id="ldCreditRating" name="creditRating" class="form-control" placeholder="e.g. BBB+ or CMR-3">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Promoter's Individual CIBIL Score</label>
                    <input id="cibilInput" name="cibilScore" class="form-control" placeholder="e.g. 720 (separate from company score)">
                  </div>
                  <div class="form-group">
                    <label>Any NPA / 30+ or 60+ DPD History?</label>
                    <select id="npaHistory" name="npaHistory" class="form-control">
                      <option value="">Select</option>
                      <option>No — Clean track record</option>
                      <option>Yes — SMA1/SMA2</option>
                      <option>Yes — NPA / Written-off</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Existing Banking Relationships / Lenders</label>
                    <input id="ldLenderRelatedDetail" name="lenderRelatedDetail" class="form-control" placeholder="e.g. HDFC CC limit ₹5Cr, ICICI TL ₹3Cr">
                  </div>
                  <div class="form-group">
                    <label>Guarantee Available</label>
                    <select id="guaranteeType" name="guaranteeType" class="form-control">
                      <option value="">Select</option>
                      <option>Personal Guarantee (Promoter)</option>
                      <option>Corporate Guarantee</option>
                      <option>Both PG + CG</option>
                      <option>FLDG (Anchor-backed)</option>
                      <option>None available</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Current Ratio <small>(if available)</small></label>
                    <input id="currentRatio" name="currentRatio" class="form-control" placeholder="e.g. 1.3">
                  </div>
                  <div class="form-group">
                    <label>Interest Coverage Ratio <small>(if available)</small></label>
                    <input id="interestCoverageRatio" name="interestCoverageRatio" class="form-control" placeholder="e.g. 1.8">
                  </div>
                  <div class="form-group">
                    <label>DSCR <small>(if available)</small></label>
                    <input id="dscr" name="dscr" class="form-control" placeholder="e.g. 1.25">
                  </div>
                </div>
              </div>

              <!-- STEP 3: DYNAMIC SUB-PRODUCT FORM -->
              <div id="dynamicFormContainer"></div>

              <!-- STEP 4: LEAD QUALIFICATION -->
              <div class="form-section">
                <h4>Step 4 — Lead Qualification</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Expected Follow-up Date</label>
                    <input id="ldFirstCall" type="date" name="followupDate" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Lead Stage</label>
                    <select id="ldPurpose" name="leadStage" class="form-control" onchange="window.leadManagerUI.updateLeadStatusOptions()">
                      <option value="">Select Stage</option>
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Documents Received</option>
                      <option>Application Submitted</option>
                      <option>Sanctioned</option>
                      <option>Disbursed</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Current Lead Status</label>
                    <select id="ldStatus" name="leadStatus" class="form-control">
                      <option value="">Select Status</option>
                      <option>Hot</option>
                      <option>Warm</option>
                      <option>Cold</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Last Activity Date</label>
                    <input id="ldLastActivity" type="date" name="lastActivityDate" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Remarks</label>
                  <textarea id="ldRemarks" name="remarks" class="form-control" placeholder="Enter lead remarks..."></textarea>
                </div>
              </div>

              <!-- STEP 5: FOLLOW-UP SCHEDULING -->
              <div class="form-section">
                <h4>Step 5 — Follow-up Scheduling</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Follow-up Date</label>
                    <input id="followupDate" type="date" name="followupDate" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Follow-up Time</label>
                    <input id="followupTime" type="time" name="followupTime" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Follow-up Type</label>
                    <select id="followupType" name="followupType" class="form-control">
                      <option value="">Select Type</option>
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                      <option>WhatsApp</option>
                      <option>Visit</option>
                    </select>
                  </div>
                  <div class="form-group full">
                    <label>Follow-up Note</label>
                    <textarea id="followupNote" name="followupNote" class="form-control" placeholder="Enter follow-up note..."></textarea>
                  </div>
                </div>
              </div>

              <!-- Hidden fields for backward compatibility -->
              <input type="hidden" name="mobileAlternate" id="mobileAlternateInput">
              <input type="hidden" name="panNumber" id="panNumberInput">
              <input type="hidden" name="aadhaarNumber" id="aadhaarNumberInput">
              <input type="hidden" name="dateOfBirth" id="dateOfBirthInput">
              <input type="hidden" name="gender" id="genderInput">
              <input type="hidden" name="pinCode" id="pinCodeInput">
              <input type="hidden" name="state" id="stateInput">
              <input type="hidden" name="fullAddress" id="fullAddressInput">
              <input type="hidden" name="occupationType" id="occupationTypeInput">
              <input type="hidden" name="monthlyIncome" id="monthlyIncomeInput">
              <input type="hidden" name="yearsInCurrentJob" id="yearsInCurrentJobInput">
              <input type="hidden" name="loanPurpose" id="loanPurposeInput">
              <input type="hidden" name="tenurePreference" id="tenurePreferenceInput">
              <input type="hidden" name="assignedEmployee" id="assignedEmployeeInput">
              <input type="hidden" name="assignedTeam" id="assignedTeamInput">

              <div class="form-section">
                <h4>Demographics</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dateOfBirth" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Gender</label>
                    <select name="gender" class="form-control">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City</label>
                    <input type="text" name="city" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Pin Code</label>
                    <input type="text" name="pinCode" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>State</label>
                    <select name="state" class="form-control">
                      <option value="">Select State</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Full Address</label>
                    <textarea name="fullAddress" class="form-control"></textarea>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h4>Employment Details</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Occupation Type</label>
                    <select name="occupationType" class="form-control">
                      <option value="">Select</option>
                      <option value="Salaried">Salaried</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Company Name</label>
                    <input type="text" name="companyName" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Designation</label>
                    <input type="text" name="designation" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Monthly Income (₹)</label>
                    <input type="number" name="monthlyIncome" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Years in Current Job</label>
                  <input type="number" name="yearsInCurrentJob" class="form-control" step="0.1">
                </div>
              </div>

              <div class="form-section">
                <h4>Loan Requirement *</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Loan Type *</label>
                    <select name="loanType" required class="form-control">
                      <option value="">Select Loan Type</option>
                      <option value="Business Loan">Business Loan</option>
                      <option value="Home Loan">Home Loan</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Loan Against Property">Loan Against Property</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Loan Amount (₹) *</label>
                    <input type="number" name="loanAmount" required class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Loan Purpose</label>
                    <input type="text" name="loanPurpose" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Tenure Preference (Months)</label>
                    <input type="number" name="tenurePreference" class="form-control">
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h4>Source & Assignment *</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Lead Source *</label>
                    <select name="leadSource" required class="form-control">
                      ${this.getSourceOptionsForForm()}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Assigned To</label>
                    <input type="text" name="assignedEmployee" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Assigned Team/Branch</label>
                  <input type="text" name="assignedTeam" class="form-control">
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-success">Create Lead</button>
                <button type="button" class="btn btn-secondary" id="btnCancelNewLead">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Lead Details Modal -->
        <div class="modal" id="leadDetailsModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <div class="lead-details" id="leadDetailsContent">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Status Change Modal -->
        <div class="modal" id="statusChangeModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Update Lead Status</h3>
            <form id="statusChangeForm">
              <div class="form-group">
                <label>Current Status</label>
                <input type="text" id="currentStatusDisplay" class="form-control" readonly>
                <input type="hidden" id="currentLeadId">
              </div>
              <div class="form-group">
                <label>New Status *</label>
                <select id="newStatus" class="form-control" required>
                  <option value="">Select Status</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reason / Notes</label>
                <textarea id="statusReason" class="form-control" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-success">Update Status</button>
                <button type="button" class="btn btn-secondary" id="btnCancelStatus">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Duplicate Check Modal -->
        <div class="modal" id="duplicateModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <h3>Duplicate Lead Detected</h3>
            <div id="duplicateContent" class="duplicate-content">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Lead Creation Success Modal -->
        <div class="modal" id="leadSuccessModal">
          <div class="modal-content modal-large" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border: 2px solid #4caf50;">
            <div class="success-header" style="text-align: center; padding: 20px; border-bottom: 2px solid #4caf50;">
              <div style="font-size: 48px; color: #4caf50; margin-bottom: 10px;">✓</div>
              <h2 style="color: #4caf50; margin: 0;">Lead Created Successfully!</h2>
              <p style="color: #666; margin-top: 5px;">Your new lead has been added to the system</p>
            </div>

            <div class="success-content" id="successContent" style="padding: 25px;">
              <!-- Lead summary will be inserted here -->
            </div>

            <div class="success-actions" style="padding: 20px; border-top: 2px solid #ddd; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.leadManagerUI.viewNewLeadDetails()" style="background-color: #2196F3;">
                👁️ View Full Details
              </button>
              <button class="btn btn-success" onclick="window.leadManagerUI.scrollToNewLead()" style="background-color: #4caf50;">
                📍 Go to Lead List
              </button>
              <button class="btn btn-info" onclick="window.leadManagerUI.createAnotherLead()" style="background-color: #ff9800;">
                ➕ Create Another Lead
              </button>
              <button class="btn btn-secondary" onclick="window.leadManagerUI.closeSuccessModal()">
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Check if user is admin and hide lead creation buttons
    this.hideButtonsForAdmin();

    this.attachEventListeners();
  }

  /**
   * Hide New Lead and Bulk Upload buttons for admin users
   */
  hideButtonsForAdmin() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
      const role = String(session.role || '').trim().toLowerCase();
      
      if (role === 'admin') {
        // Hide New Lead button
        const btnNewLead = document.getElementById('btnNewLead');
        if (btnNewLead) {
          btnNewLead.style.display = 'none';
        }
        
        // Hide Bulk Upload button
        const btnBulkUpload = document.getElementById('btnBulkUpload');
        if (btnBulkUpload) {
          btnBulkUpload.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Main buttons
    document.getElementById('btnNewLead')?.addEventListener('click', () => this.openNewLeadModal());
    document.getElementById('btnBulkUpload')?.addEventListener('click', () => this.openBulkUploadModal());
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportLeads());

    // Filter actions
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('btnClearFilters')?.addEventListener('click', () => this.clearFilters());
    document.getElementById('btnSearch')?.addEventListener('click', () => this.performNLSearch());

    // Pagination
    document.getElementById('btnPrevPage')?.addEventListener('click', () => this.previousPage());
    document.getElementById('btnNextPage')?.addEventListener('click', () => this.nextPage());

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    });

    // Form submissions
    document.getElementById('newLeadForm')?.addEventListener('submit', (e) => this.handleNewLeadSubmit(e));
    document.getElementById('statusChangeForm')?.addEventListener('submit', (e) => this.handleStatusChange(e));

    // Modal cancel buttons
    document.getElementById('btnCancelNewLead')?.addEventListener('click', () => {
      document.getElementById('newLeadModal').style.display = 'none';
    });
    document.getElementById('btnCancelStatus')?.addEventListener('click', () => {
      document.getElementById('statusChangeModal').style.display = 'none';
    });

    // Natural language search Enter key
    document.getElementById('nlSearch')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performNLSearch();
    });
  }

  /**
   * Load and display leads from backend API
   * Uses getNewLeads endpoint to show only leads without call activity
   */
  async loadLeads() {
    try {
      console.log('[LeadManagerUI] loadLeads called');
      // Use backend API client to fetch new leads (no call activity)
      const params = {
        skip: (this.currentPage - 1) * this.pageSize,
        limit: this.pageSize
      };
      
      // Add filters if present
      if (this.currentFilters.lead_status) {
        params.lead_status = this.currentFilters.lead_status;
      }
      if (this.currentFilters.assigned_to) {
        params.assigned_to = this.currentFilters.assigned_to;
      }
      if (this.currentFilters.search) {
        params.search = this.currentFilters.search;
      }

      console.log('[LeadManagerUI] Fetching leads with params:', params);
      const response = await window.API.getNewLeads(params);
      console.log('[LeadManagerUI] API response:', response);
      
      // Handle both array and object with items/total formats
      const leads = Array.isArray(response) ? response : (response?.items || []);
      const total = Array.isArray(response) ? response.length : (response?.total || 0);
      
      console.log('[LeadManagerUI] Processed leads:', leads.length, 'Total:', total);
      
      if (!leads || !Array.isArray(leads)) {
        console.error('[LeadManagerUI] Invalid leads response:', response);
        this.renderLeadsTable([]);
        this.updatePaginationInfo(0);
        return;
      }

      // Transform backend leads to frontend format
      const transformedLeads = leads.map(lead => ({
        leadId: lead.id || lead.lead_id || `LEAD-${lead.id}`,
        fullName: lead.lead_name || lead.name || 'Unknown',
        mobile: lead.mobile || '',
        loanType: lead.product_type || '',
        loanAmount: lead.funding_amount || 0,
        leadScore: 0, // Backend doesn't have lead score yet
        status: lead.lead_status || 'New',
        leadSource: lead.lead_source || '',
        assignedEmployee: lead.assigned_user_name || lead.assigned_to || '',
        dateCreated: lead.created_at || new Date().toISOString(),
        email: lead.email || '',
        city: lead.city || ''
      }));

      this.renderLeadsTable(transformedLeads);
      this.updatePaginationInfo(total);
      this.updateStatistics();

    } catch (error) {
      console.error('Error loading leads from backend:', error);
      // Fallback to local storage if backend fails
      try {
        const result = await this.leadManager.searchLeads(this.currentFilters, {
          limit: this.pageSize,
          offset: (this.currentPage - 1) * this.pageSize,
          orderBy: 'dateCreated',
          orderDirection: 'desc'
        });
        
        if (result.success) {
          this.renderLeadsTable(result.leads);
          this.updatePaginationInfo(result.total);
          this.updateStatistics();
        }
      } catch (fallbackError) {
        console.error('Fallback to local storage also failed:', fallbackError);
        this.renderLeadsTable([]);
        this.updatePaginationInfo(0);
      }
    }
  }

  /**
   * Render leads table
   */
  renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center">No leads found</td></tr>';
      return;
    }

    tbody.innerHTML = leads.map(lead => `
      <tr class="lead-row" data-lead-id="${lead.leadId}">
        <td><strong>${lead.leadId}</strong></td>
        <td>${lead.fullName}</td>
        <td>${lead.mobile}</td>
        <td>${lead.loanType || '-'}</td>
        <td>₹${this.formatNumber(lead.loanAmount || 0)}</td>
        <td>
          <span class="score-badge ${this.getScoreBadgeClass(lead.leadScore)}">
            ${lead.leadScore}
          </span>
        </td>
        <td>
          <span class="status-badge" data-status="${lead.status}">
            ${lead.status}
          </span>
        </td>
        <td><small>${lead.leadSource}</small></td>
        <td>${lead.assignedEmployee || '-'}</td>
        <td><small>${new Date(lead.dateCreated).toLocaleDateString('en-IN')}</small></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="View Details" onclick="window.leadManagerUI.viewLeadDetails('${lead.leadId}')">👁️</button>
            <button class="btn-icon" title="Change Status" onclick="window.leadManagerUI.openStatusChangeModal('${lead.leadId}', '${lead.status}')">🔄</button>
            <button class="btn-icon" title="Delete" onclick="window.leadManagerUI.deleteLead('${lead.leadId}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Get score badge class
   */
  getScoreBadgeClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Update pagination info
   */
  updatePaginationInfo(total) {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
      const totalPages = Math.ceil(total / this.pageSize);
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${total} total)`;
    }
  }

  /**
   * Apply filters
   */
  async applyFilters() {
    this.currentFilters = {
      status: document.getElementById('filterStatus')?.value,
      leadSource: document.getElementById('filterSource')?.value,
      loanType: document.getElementById('filterLoanType')?.value,
      scoreMin: parseInt(document.getElementById('filterScoreMin')?.value) || undefined,
      scoreMax: parseInt(document.getElementById('filterScoreMax')?.value) || undefined,
      cibilMin: parseInt(document.getElementById('filterCibilMin')?.value) || undefined,
      cibilMax: parseInt(document.getElementById('filterCibilMax')?.value) || undefined,
      loanAmountMin: parseInt(document.getElementById('filterLoanAmountMin')?.value) || undefined,
      loanAmountMax: parseInt(document.getElementById('filterLoanAmountMax')?.value) || undefined,
      city: document.getElementById('filterCity')?.value,
      dateFrom: document.getElementById('filterDateFrom')?.value,
      dateTo: document.getElementById('filterDateTo')?.value
    };

    // Remove undefined values
    Object.keys(this.currentFilters).forEach(key => {
      if (this.currentFilters[key] === undefined || this.currentFilters[key] === '') {
        delete this.currentFilters[key];
      }
    });

    this.currentPage = 1;
    await this.loadLeads();
  }

  /**
   * Clear filters
   */
  async clearFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSource').value = '';
    document.getElementById('filterLoanType').value = '';
    document.getElementById('filterScoreMin').value = '';
    document.getElementById('filterScoreMax').value = '';
    document.getElementById('filterCibilMin').value = '';
    document.getElementById('filterCibilMax').value = '';
    document.getElementById('filterLoanAmountMin').value = '';
    document.getElementById('filterLoanAmountMax').value = '';
    document.getElementById('filterCity').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';

    this.currentFilters = {};
    this.currentPage = 1;
    await this.loadLeads();
  }

  /**
   * Perform natural language search
   */
  async performNLSearch() {
    const query = document.getElementById('nlSearch')?.value;
    if (!query) return;

    try {
      const result = await this.leadManager.naturalLanguageSearch(query);
      if (result.success) {
        this.renderLeadsTable(result.leads);
        this.updatePaginationInfo(result.leads.length);
      } else {
        alert('Search error: ' + result.error);
      }
    } catch (error) {
      console.error('Error performing NL search:', error);
    }
  }

  /**
   * Open new lead modal
   */
  openNewLeadModal() {
    // Prevent admin users from creating leads
    const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
    const role = String(session.role || '').trim().toLowerCase();
    
    if (role === 'admin') {
      alert('Admins can only view leads, not create new leads.');
      return;
    }

    const modal = document.getElementById('newLeadModal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('newLeadForm').reset();
      
      // Auto-fill sales executive from session user and make it readonly
      const salesExecField = document.getElementById('ldExec');
      if (salesExecField) {
        salesExecField.value = session.name || session.username || 'Current User';
        salesExecField.readOnly = true;
      }
      
      // Set default date to today
      document.getElementById('ldDate').value = new Date().toISOString().split('T')[0];
      
      // Reset mode badge
      const modeBadge = document.getElementById('modeBadge');
      if (modeBadge) {
        modeBadge.textContent = 'Active Mode';
        modeBadge.className = 'mode-badge active';
      }
      // Reset lookup container
      const lookupContainer = document.getElementById('lookupResultContainer');
      if (lookupContainer) {
        lookupContainer.innerHTML = '';
      }
    }
  }

  /**
   * Vertical/Sub-Product Data Configuration
   */
  verticalSubProductData = {
    itf: {
      name: 'International Trade Finance',
      subProducts: [
        { id: 'itf_lc', name: 'A1. Letter of Credit (LC)' },
        { id: 'itf_bg', name: 'A2. Bank Guarantee (BG)' },
        { id: 'itf_sb', name: 'A3. Supplier Bill Discounting' },
        { id: 'itf_fb', name: 'A4. Factoring / Bill Discounting' },
        { id: 'itf_ecgc', name: 'A5. ECGC-backed Limits' }
      ]
    },
    scf: {
      name: 'Supply Chain Finance',
      subProducts: [
        { id: 'scf_po', name: 'B1. PO Finance' },
        { id: 'scf_inv', name: 'B2. Invoice Discounting' },
        { id: 'scf_wd', name: 'B3. Working Capital Limits' },
        { id: 'scf_dealer', name: 'B4. Dealer/Channel Finance' }
      ]
    },
    pc: {
      name: 'Private Credit',
      subProducts: [
        { id: 'pc_me', name: 'C1. M&A / Equity' },
        { id: 'pc_debt', name: 'C2. Private Debt / Term Loan' },
        { id: 'pc_vc', name: 'C3. Venture Capital' },
        { id: 'pc_re', name: 'C4. Real Estate Finance' }
      ]
    }
  };

  /**
   * Handle vertical selection change
   */
  onVerticalChange() {
    const verticalSelect = document.getElementById('verticalSelect');
    const subProductSelect = document.getElementById('subProductSelect');
    const selectedVertical = verticalSelect.value;

    subProductSelect.innerHTML = '<option value="">Select sub-product</option>';
    subProductSelect.disabled = !selectedVertical;

    if (selectedVertical && this.verticalSubProductData[selectedVertical]) {
      const subProducts = this.verticalSubProductData[selectedVertical].subProducts;
      subProducts.forEach(sp => {
        const option = document.createElement('option');
        option.value = sp.id;
        option.textContent = sp.name;
        subProductSelect.appendChild(option);
      });
    }
  }

  /**
   * Render dynamic form based on sub-product
   */
  renderDynamicForm() {
    const vertical = document.getElementById('verticalSelect').value;
    const subProduct = document.getElementById('subProductSelect').value;
    const container = document.getElementById('dynamicFormContainer');

    if (!vertical || !subProduct) {
      container.innerHTML = '';
      return;
    }

    let formHTML = '<div class="form-section" style="border-color:#FFA500;"><h4>Step 3 — Sub-Product Specific Fields</h4>';

    // Add sub-product specific fields based on selection
    if (vertical === 'itf') {
      formHTML += this.getITFFormFields(subProduct);
    } else if (vertical === 'scf') {
      formHTML += this.getSCFFormFields(subProduct);
    } else if (vertical === 'pc') {
      formHTML += this.getPCFormFields(subProduct);
    }

    formHTML += '</div>';
    container.innerHTML = formHTML;
  }

  /**
   * Get ITF form fields
   */
  getITFFormFields(subProduct) {
    let fields = '<div class="form-row">';
    fields += '<div class="form-group"><label>LC/BG Amount (₹ Crore)</label><input type="number" step="0.01" name="lcBgAmount" class="form-control" placeholder="e.g. 5.0"></div>';
    fields += '<div class="form-group"><label>LC/BG Type</label><select name="lcBgType" class="form-control"><option value="">Select</option><option>Performance BG</option><option>Financial BG</option><option>LC at Sight</option><option>Usance LC</option></select></div>';
    fields += '</div>';
    fields += '<div class="form-row">';
    fields += '<div class="form-group"><label>Buyer Country</label><input name="buyerCountry" class="form-control" placeholder="e.g. USA, UAE"></div>';
    fields += '<div class="form-group"><label>Buyer Company Name</label><input name="buyerCompany" class="form-control" placeholder="e.g. ABC Corp"></div>';
    fields += '</div>';
    fields += '<div class="form-row">';
    fields += '<div class="form-group"><label>ECGC Coverage Required?</label><select name="ecgcCoverage" class="form-control"><option value="">Select</option><option>Yes</option><option>No</option></select></div>';
    fields += '<div class="form-group"><label>Export/Import</label><select name="exportImport" class="form-control"><option value="">Select</option><option>Export</option><option>Import</option></select></div>';
    fields += '</div>';
    return fields;
  }

  /**
   * Get SCF form fields
   */
  getSCFFormFields(subProduct) {
    let fields = '<div class="form-row">';
    fields += '<div class="form-group"><label>Anchor Company Name</label><input name="anchorCompany" class="form-control" placeholder="e.g. Tata Motors"></div>';
    fields += '<div class="form-group"><label>Anchor Rating</label><input name="anchorRating" class="form-control" placeholder="e.g. AAA"></div>';
    fields += '</div>';
    fields += '<div class="form-row">';
    fields += '<div class="form-group"><label>Credit Period (Days)</label><input type="number" name="creditPeriod" class="form-control" placeholder="e.g. 45"></div>';
    fields += '<div class="form-group"><label>Invoice Frequency</label><select name="invoiceFrequency" class="form-control"><option value="">Select</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>';
    fields += '</div>';
    return fields;
  }

  /**
   * Get PC form fields
   */
  getPCFormFields(subProduct) {
    let fields = '<div class="form-row">';
    fields += '<div class="form-group"><label>Investment Stage</label><select name="investmentStage" class="form-control"><option value="">Select</option><option>Seed</option><option>Series A</option><option>Series B</option><option>Growth</option><option>Pre-IPO</option></select></div>';
    fields += '<div class="form-group"><label>Equity Stake (%)</label><input type="number" step="0.1" name="equityStake" class="form-control" placeholder="e.g. 25"></div>';
    fields += '</div>';
    fields += '<div class="form-row">';
    fields += '<div class="form-group"><label>Expected IRR (%)</label><input type="number" step="0.1" name="expectedIRR" class="form-control" placeholder="e.g. 18"></div>';
    fields += '<div class="form-group"><label>Exit Horizon (Years)</label><input type="number" name="exitHorizon" class="form-control" placeholder="e.g. 5"></div>';
    fields += '</div>';
    return fields;
  }

  /**
   * Call Management Lookup Database (using real backend data)
   */
  existingLeadsDatabase = [
    {
      id: 'LEAD-13',
      company: 'tata',
      contactPerson: 'preeti',
      designation: '',
      mobile: '12345679987',
      email: 'sgsg',
      location: 'Mumbai, Maharashtra',
      turnover: '50',
      vintage: '5',
      industry: 'Manufacturing',
      source: 'Inbound Call',
      vertical: 'scf',
      subProduct: 'scf_po',
      status: 'Active',
      inactiveDays: 0,
      lastActivity: new Date().toISOString()
    },
    {
      id: 'LEAD-14',
      company: 'tata',
      contactPerson: 'preeti',
      designation: '',
      mobile: '12345679987',
      email: 'sgsg',
      location: 'Mumbai, Maharashtra',
      turnover: '50',
      vintage: '5',
      industry: 'Manufacturing',
      source: 'Inbound Call',
      vertical: 'scf',
      subProduct: 'scf_inv',
      status: 'Active',
      inactiveDays: 0,
      lastActivity: new Date().toISOString()
    },
    {
      id: 'LEAD-15',
      company: 'kh',
      contactPerson: 'bh',
      designation: '',
      mobile: '3456789',
      email: 'gjb',
      location: 'Delhi, Delhi',
      turnover: '25',
      vintage: '3',
      industry: 'Trading',
      source: 'Website',
      vertical: 'itf',
      subProduct: 'itf_lc',
      status: 'Inactive',
      inactiveDays: 15,
      lastActivity: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'LEAD-16',
      company: 'kh',
      contactPerson: 'bh',
      designation: '',
      mobile: '3456789',
      email: 'gjb',
      location: 'Delhi, Delhi',
      turnover: '25',
      vintage: '3',
      industry: 'Trading',
      source: 'Website',
      vertical: 'itf',
      subProduct: 'itf_lc',
      status: 'Inactive',
      inactiveDays: 40,
      lastActivity: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  currentMatchedLead = null;

  /**
   * Handle search for call management lookup and duplicate detection
   */
  handleSearch() {
    const companyVal = (document.getElementById('ldCompany').value || '').toLowerCase().trim();
    const mobileVal = (document.getElementById('ldPhone').value || '').trim();
    const emailVal = (document.getElementById('ldEmail').value || '').toLowerCase().trim();
    const vertical = document.getElementById('verticalSelect').value;
    const subProduct = document.getElementById('subProductSelect').value;
    const container = document.getElementById('lookupResultContainer');
    const modeBadge = document.getElementById('modeBadge');

    if (!companyVal && !mobileVal && !emailVal) {
      container.innerHTML = '';
      modeBadge.textContent = 'Active Mode';
      modeBadge.className = 'mode-badge active';
      this.currentMatchedLead = null;
      return;
    }

    // STEP A — loose "Call Management" lookup (any one field matches)
    const callMatch = this.existingLeadsDatabase.find(l =>
      (companyVal && l.company.toLowerCase() === companyVal) ||
      (mobileVal && l.mobile === mobileVal) ||
      (emailVal && l.email.toLowerCase() === emailVal)
    );

    if (!callMatch) {
      container.innerHTML = `<div class="callrecord-alert">🆕 <strong>New Lead:</strong>&nbsp;Call Management mein iss company/number/email ka koi record nahi mila. Safe to proceed as a fresh lead.</div>`;
      modeBadge.textContent = 'New Lead';
      modeBadge.className = 'mode-badge newlead';
      this.currentMatchedLead = null;
      return;
    }

    this.currentMatchedLead = callMatch;

    // STEP B — STRICT duplicate combo: Company + Mobile + Email + Vertical + Sub-Product must ALL match
    // IMPORTANT: Use ORIGINAL user input values, not auto-filled values
    const isFullComboMatch =
      callMatch.company.toLowerCase() === companyVal &&
      callMatch.mobile === mobileVal &&
      callMatch.email.toLowerCase() === emailVal &&
      !!vertical && !!subProduct &&
      callMatch.vertical === vertical &&
      callMatch.subProduct === subProduct;

    // Auto-fill the common contact details from the call record AFTER duplicate check
    document.getElementById('ldCompany').value = callMatch.company;
    document.getElementById('ldContact').value = callMatch.contactPerson;
    document.getElementById('ldDesignation').value = callMatch.designation;
    document.getElementById('ldPhone').value = callMatch.mobile;
    document.getElementById('ldEmail').value = callMatch.email;
    document.getElementById('ldLocation').value = callMatch.location;
    document.getElementById('turnoverInput').value = callMatch.turnover;
    document.getElementById('vintageInput').value = callMatch.vintage;
    document.getElementById('industryInput').value = callMatch.industry;
    const srcSelect = document.getElementById('ldSource');
    const srcOpt = Array.from(srcSelect.options).find(o => o.value === callMatch.source || o.textContent === callMatch.source);
    if (srcOpt) srcSelect.value = srcOpt.value;

    if (callMatch.status === 'Inactive') {
      const lockInfo = this.getTakeoverLockInfo(callMatch);
      modeBadge.textContent = lockInfo.locked ? 'Takeover Locked' : 'Take Over Required';
      modeBadge.className = 'mode-badge takeover';
      container.innerHTML = `
        <div class="inactive-alert">
          <div class="inactive-alert-top">
            <div class="inactive-alert-msg">⚠️ Inactive Lead Found — No activity for ${callMatch.inactiveDays} days</div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button class="btn-outline-sm" onclick="window.leadManagerUI.viewLeadDetails('${callMatch.id}')">View Lead</button>
              ${lockInfo.locked ? '<span class="lock-badge">🔒 Locked</span>' : '<button class="btn-primary-sm" onclick="window.leadManagerUI.requestTakeover(\'' + callMatch.id + '\')">Request Takeover</button>'}
            </div>
          </div>
          <div class="inactive-alert-details">
            <strong>Matched Lead:</strong> ${callMatch.company} | ${callMatch.contactPerson} | ${callMatch.mobile}<br>
            <strong>Vertical:</strong> ${callMatch.vertical} | <strong>Sub-Product:</strong> ${callMatch.subProduct}<br>
            <strong>Last Activity:</strong> ${new Date(callMatch.lastActivity).toLocaleDateString()}
          </div>
        </div>
      `;
    } else if (isFullComboMatch) {
      modeBadge.textContent = 'Duplicate Lead';
      modeBadge.className = 'mode-badge duplicate';
      container.innerHTML = `
        <div class="duplicate-alert">
          <div class="duplicate-alert-top">
            <div class="duplicate-alert-msg">🚫 <strong>Duplicate Lead:</strong>&nbsp;Company + Mobile + Email + Vertical + Sub-Product all match an existing active lead.</div>
            <button class="btn-outline-sm" onclick="window.leadManagerUI.viewLeadDetails('${callMatch.id}')">View Lead</button>
          </div>
          <div class="duplicate-alert-details">
            <strong>Existing Lead:</strong> ${callMatch.company} | ${callMatch.contactPerson} | ${callMatch.mobile}<br>
            <strong>Vertical:</strong> ${callMatch.vertical} | <strong>Sub-Product:</strong> ${callMatch.subProduct}
          </div>
        </div>
      `;
    } else {
      modeBadge.textContent = 'Call Record Found';
      modeBadge.className = 'mode-badge callrecord';
      container.innerHTML = `
        <div class="callrecord-alert">
          <div class="callrecord-alert-top">
            <div class="callrecord-alert-msg">📞 <strong>Call Management Record Found:</strong>&nbsp;Auto-filled from existing call record. Safe to create new lead (different vertical/sub-product).</div>
            <button class="btn-outline-sm" onclick="window.leadManagerUI.viewLeadDetails('${callMatch.id}')">View Call Record</button>
          </div>
          <div class="callrecord-alert-details">
            <strong>Call Record:</strong> ${callMatch.company} | ${callMatch.contactPerson} | ${callMatch.mobile}<br>
            <strong>Existing Vertical:</strong> ${callMatch.vertical} | <strong>Existing Sub-Product:</strong> ${callMatch.subProduct}
          </div>
        </div>
      `;
    }
  }

  /**
   * Get takeover lock info for inactive lead
   */
  getTakeoverLockInfo(lead) {
    const inactiveDays = lead.inactiveDays || 0;
    // Locked if inactive for less than 2 days or more than 30 days
    const locked = inactiveDays < 2 || inactiveDays > 30;
    return { locked, inactiveDays };
  }

  /**
   * Request takeover for inactive lead
   */
  requestTakeover(leadId) {
    alert(`Takeover request initiated for lead ${leadId}. Manager approval required.`);
    // In real implementation, this would send a request to backend
  }

  /**
   * View lead details
   */
  viewLeadDetails(leadId) {
    alert(`Viewing details for lead ${leadId}. In real implementation, this would open a modal with full lead details.`);
    // In real implementation, this would open a modal with lead details
  }

  /**
   * Handle new lead form submission
   */
  async handleNewLeadSubmit(e) {
    e.preventDefault();

    // Prevent admin users from creating leads
    const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
    const role = String(session.role || '').trim().toLowerCase();
    
    if (role === 'admin') {
      alert('Admins cannot create new leads.');
      return;
    }

    const formData = new FormData(document.getElementById('newLeadForm'));
    const leadData = Object.fromEntries(formData);

    // Convert numeric fields
    leadData.monthlyIncome = parseInt(leadData.monthlyIncome) || 0;
    leadData.loanAmount = parseInt(leadData.loanAmount) || 0;
    leadData.yearsInCurrentJob = parseFloat(leadData.yearsInCurrentJob) || 0;

    try {
      const result = await this.leadManager.createLead(leadData, 'current-user');

      if (result.isDuplicate) {
        this.showDuplicateModal(result.duplicates, leadData);
      } else if (result.success) {
        // Close form modal and show success modal
        document.getElementById('newLeadModal').style.display = 'none';
        
        // Store the new lead data for display
        this.lastCreatedLead = result.lead;
        this.lastCreatedLeadId = result.lead.leadId;
        
        // Show success modal with lead details
        this.showLeadSuccessModal(result.lead);
        
        // Ensure new lead appears on top: reset to page 1 and reload leads
        this.currentPage = 1;
        await this.loadLeads();

        // Scroll the leads table into view and highlight new row if present
        setTimeout(() => {
          const row = document.querySelector(`[data-lead-id="${this.lastCreatedLeadId}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'start' });
            row.classList.add('highlight-new-lead');
            setTimeout(() => row.classList.remove('highlight-new-lead'), 3000);
          }
        }, 400);
      } else {
        alert('Error creating lead: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Error creating lead');
    }
  }

  /**
   * Show duplicate modal
   */
  showDuplicateModal(duplicates, proposedLead) {
    const modal = document.getElementById('duplicateModal');
    const content = document.getElementById('duplicateContent');

    let html = `
      <p>The following leads match the new lead data:</p>
      <div class="duplicate-list">
    `;

    duplicates.forEach((dup, idx) => {
      html += `
        <div class="duplicate-item">
          <h5>Match Type: ${dup.type}</h5>
          <p>Matching Leads: ${dup.leads.length}</p>
          ${dup.leads.map((lead, i) => `
            <div class="duplicate-lead">
              <strong>${lead.fullName}</strong> - ${lead.mobile} (Score: ${lead.leadScore})
            </div>
          `).join('')}
        </div>
      `;
    });

    html += `
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="window.leadManagerUI.proceedWithNewLead()">Create as New Lead</button>
        <button class="btn btn-secondary" onclick="window.leadManagerUI.cancelNewLead()">Cancel</button>
      </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'block';
  }

  /**
   * Proceed with new lead creation despite duplicates
   */
  async proceedWithNewLead() {
    // TODO: Implement merge/duplicate handling
    document.getElementById('duplicateModal').style.display = 'none';
  }

  /**
   * Cancel new lead creation
   */
  cancelNewLead() {
    document.getElementById('duplicateModal').style.display = 'none';
    document.getElementById('newLeadModal').style.display = 'block';
  }

  /**
   * View lead details
   */
  async viewLeadDetails(leadId) {
    try {
      const result = await this.leadManager.getLead(leadId);
      if (!result.success) {
        alert('Error loading lead: ' + result.error);
        return;
      }

      const lead = result.lead;
      const modal = document.getElementById('leadDetailsModal');
      const content = document.getElementById('leadDetailsContent');

      content.innerHTML = `
        <div class="lead-details-header">
          <h3>${lead.fullName}</h3>
          <span class="status-badge" data-status="${lead.status}">${lead.status}</span>
          <span class="score-badge ${this.getScoreBadgeClass(lead.leadScore)}">${lead.leadScore}</span>
        </div>

        <div class="details-grid">
          <div class="details-section">
            <h4>Contact Information</h4>
            <p><strong>Mobile:</strong> ${lead.mobile}</p>
            <p><strong>Email:</strong> ${lead.email || '-'}</p>
            <p><strong>PAN:</strong> ${lead.panNumber || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Demographics</h4>
            <p><strong>Age:</strong> ${lead.age || '-'}</p>
            <p><strong>City:</strong> ${lead.city || '-'}</p>
            <p><strong>State:</strong> ${lead.state || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Employment</h4>
            <p><strong>Type:</strong> ${lead.occupationType || '-'}</p>
            <p><strong>Company:</strong> ${lead.companyName || '-'}</p>
            <p><strong>Monthly Income:</strong> ₹${this.formatNumber(lead.monthlyIncome || 0)}</p>
          </div>

          <div class="details-section">
            <h4>Loan Details</h4>
            <p><strong>Type:</strong> ${lead.loanType}</p>
            <p><strong>Amount:</strong> ₹${this.formatNumber(lead.loanAmount)}</p>
            <p><strong>Purpose:</strong> ${lead.loanPurpose || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Bureau Information</h4>
            <p><strong>CIBIL Score:</strong> ${lead.cibilScore || 'Not Pulled'}</p>
            <p><strong>CIBIL Date:</strong> ${lead.cibilDate ? new Date(lead.cibilDate).toLocaleDateString('en-IN') : '-'}</p>
          </div>

          <div class="details-section">
            <h4>Assignment</h4>
            <p><strong>Lead Source:</strong> ${lead.leadSource}</p>
            <p><strong>Assigned To:</strong> ${lead.assignedEmployee || 'Unassigned'}</p>
            <p><strong>Team:</strong> ${lead.assignedTeam || '-'}</p>
          </div>
        </div>

        <div class="activity-section">
          <h4>Recent Activities</h4>
          <div class="activity-list">
            ${(lead.activityHistory || []).slice(0, 10).map(activity => `
              <div class="activity-item">
                <span class="activity-type">${activity.type}</span>
                <span class="activity-description">${activity.description}</span>
                <span class="activity-time">${new Date(activity.timestamp).toLocaleString('en-IN')}</span>
              </div>
            `).join('') || '<p>No activities yet</p>'}
          </div>
        </div>

        <div class="details-actions">
          <button class="btn btn-primary" onclick="window.leadManagerUI.openStatusChangeModal('${lead.leadId}', '${lead.status}')">Change Status</button>
          <button class="btn btn-secondary" onclick="window.leadManagerUI.editLead('${lead.leadId}')">Edit Lead</button>
          <button class="btn btn-danger" onclick="window.leadManagerUI.deleteLead('${lead.leadId}')">Delete Lead</button>
        </div>
      `;

      modal.style.display = 'block';

    } catch (error) {
      console.error('Error viewing lead details:', error);
    }
  }

  /**
   * Open status change modal
   */
  openStatusChangeModal(leadId, currentStatus) {
    const modal = document.getElementById('statusChangeModal');
    document.getElementById('currentLeadId').value = leadId;
    document.getElementById('currentStatusDisplay').value = currentStatus;

    // Get allowed next statuses
    const statusObj = this.leadManager.statusPipeline.find(s => s.status === currentStatus);
    const nextStatuses = statusObj ? statusObj.nextStates : [];

    const newStatusSelect = document.getElementById('newStatus');
    newStatusSelect.innerHTML = '<option value="">Select Status</option>' + nextStatuses.map(status => `
      <option value="${status}">${status}</option>
    `).join('');

    modal.style.display = 'block';
  }

  /**
   * Handle status change
   */
  async handleStatusChange(e) {
    e.preventDefault();

    const leadId = document.getElementById('currentLeadId').value;
    const newStatus = document.getElementById('newStatus').value;
    const reason = document.getElementById('statusReason').value;

    if (!newStatus) {
      alert('Please select a new status');
      return;
    }

    try {
      const result = await this.leadManager.updateLeadStatus(leadId, newStatus, reason, 'current-user');

      if (result.success) {
        alert('Status updated successfully!');
        document.getElementById('statusChangeModal').style.display = 'none';
        await this.loadLeads();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      // Delete from backend database FIRST - localStorage cleanup happens after
      const apiClient = window.CRM_API_CLIENT || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null);
      
      if (apiClient) {
        await apiClient.deleteLead(leadId);
      } else {
        // Fallback: try to use postToCRMBackendEndpoint if available
        if (typeof postToCRMBackendEndpoint === 'function') {
          await postToCRMBackendEndpoint(`leads/${encodeURIComponent(String(leadId))}`, null, 'DELETE');
        }
      }
      
      // Only remove from localStorage AFTER successful backend delete (for caching)
      const stored = DataStore.getAll();
      if (stored.leads && Array.isArray(stored.leads)) {
        stored.leads = stored.leads.filter(lead => lead.id !== leadId);
        DataStore.set('leads', stored.leads);
      }
      
      showToast('Lead deleted successfully', 'success');
      
      // Refresh the leads list
      this.loadLeads();
      this.updateStatistics();
      
    } catch (error) {
      console.error('Error deleting lead:', error);
      showToast('Failed to delete lead. Please try again.', 'error');
    }
  }

  /**
   * Show lead creation success modal with summary
   */
  showLeadSuccessModal(lead) {
    const modal = document.getElementById('leadSuccessModal');
    const content = document.getElementById('successContent');

    // Create summary card HTML
    const summaryHTML = `
      <div class="lead-success-summary" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div class="summary-section" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Lead Created Successfully</h3>
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #2196F3; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Lead ID</div>
              <div style="font-size: 18px; color: #2196F3; font-weight: bold;">${lead.leadId || 'N/A'}</div>
            </div>
            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #4CAF50; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Company</div>
              <div style="font-size: 16px; color: #333; font-weight: 600;">${lead.companyName || 'N/A'}</div>
            </div>
            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #FF9800; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Contact Person</div>
              <div style="font-size: 16px; color: #333; font-weight: 600;">${lead.fullName || 'N/A'}</div>
            </div>
            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #9C27B0; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Mobile</div>
              <div style="font-size: 16px; color: #333; font-weight: 600;">${lead.mobile || 'N/A'}</div>
            </div>
          </div>
        </div>
        <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button class="btn btn-secondary" onclick="window.leadManagerUI.closeSuccessModal()">Close</button>
          <button class="btn btn-success" onclick="window.leadManagerUI.createAnotherLead()">Create Another Lead</button>
        </div>
      </div>
    `;

    content.innerHTML = summaryHTML;
    modal.style.display = 'block';
  }

  /**
   * Update statistics
   */
  async updateStatistics() {
    try {
      const result = await this.leadManager.getStatistics(this.currentFilters);

      if (result.success) {
        const stats = result.statistics;
        document.getElementById('statTotalLeads').textContent = stats.totalLeads;
        document.getElementById('statAvgScore').textContent = stats.averageScore;
        document.getElementById('statAvgCibil').textContent = stats.averageCibil;
        document.getElementById('statFreshLeads').textContent = stats.byStatus['Fresh Lead'] || 0;
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  /**
   * Pagination methods
   */
  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadLeads();
    }
  }

  async nextPage() {
    this.currentPage++;
    await this.loadLeads();
  }

  /**
   * Export leads
   */
  exportLeads() {
    alert('Export functionality to be implemented');
  }

  /**
   * Open bulk upload modal
   */
  openBulkUploadModal() {
    alert('Bulk upload functionality to be implemented');
  }

  /**
   * Helper methods for generating options
   */
  getStatusOptions() {
    return this.leadManager.statusPipeline
      .map(s => `<option value="${s.status}">${s.status}</option>`)
      .join('');
  }

  getSourceOptions() {
    return Object.values(this.leadManager.leadSources)
      .map(s => `<option value="${s.name}">${s.name}</option>`)
      .join('');
  }

  getSourceOptionsForForm() {
    return '<option value="">Select Source</option>' + Object.values(this.leadManager.leadSources)
      .map(s => `<option value="${s.name}">${s.name}</option>`)
      .join('');
  }

  /**
   * Edit lead
   */
  editLead(leadId) {
    alert('Edit functionality to be implemented');
  }

  /**
   * Update statistics
   */
  async updateStatistics() {
    try {
      const result = await this.leadManager.getStatistics(this.currentFilters);

      if (result.success) {
        const stats = result.statistics;
        document.getElementById('statTotalLeads').textContent = stats.totalLeads;
        document.getElementById('statAvgScore').textContent = stats.averageScore;
        document.getElementById('statAvgCibil').textContent = stats.averageCibil;
        document.getElementById('statFreshLeads').textContent = stats.byStatus['Fresh Lead'] || 0;
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  /**
   * Pagination methods
   */
  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadLeads();
    }
  }

  async nextPage() {
    this.currentPage++;
    await this.loadLeads();
  }

  /**
   * Export leads
   */
  exportLeads() {
    alert('Export functionality to be implemented');
  }

  /**
   * Open bulk upload modal
   */
  openBulkUploadModal() {
    alert('Bulk upload functionality to be implemented');
  }

  /**
   * Update lead status options based on selected lead stage
   */
  updateLeadStatusOptions() {
    const stageSelect = document.getElementById('ldPurpose');
    const statusSelect = document.getElementById('ldStatus');
    
    if (!stageSelect || !statusSelect) return;
    
    const selectedStage = stageSelect.value;
    
    // Define status options for each stage
    const stageStatusMapping = {
      'New': ['Hot', 'Warm', 'Cold'],
      'Contacted': ['Hot', 'Warm', 'Cold'],
      'Documents Received': ['Hot', 'Warm', 'Cold'],
      'Application Submitted': ['Hot', 'Warm', 'Cold'],
      'Sanctioned': ['Hot', 'Warm', 'Cold'],
      'Disbursed': ['Hot', 'Warm', 'Cold']
    };
    
    // Get status options for selected stage
    const statusOptions = stageStatusMapping[selectedStage] || ['Hot', 'Warm', 'Cold'];
    
    // Update status select options
    statusSelect.innerHTML = '<option value="">Select Status</option>' + 
      statusOptions.map(status => `<option value="${status}">${status}</option>`).join('');
  }

  /**
   * Create another lead (re-open form)
   */
  createAnotherLead() {
    // Close success modal
    document.getElementById('leadSuccessModal').style.display = 'none';
    
    // Open new lead form
    this.openNewLeadModal();
  }

  /**
   * Close success modal
   */
  closeSuccessModal() {
    document.getElementById('leadSuccessModal').style.display = 'none';
  }

// Export for use in CRM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeadManagerUI;
}
