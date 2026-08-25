import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------- static configuration ------------- */
const PIPELINE_STAGE_WEIGHTS = {
  "Mandate Signed": 0.75,
  Sanctioned: 0.9,
  Disbursed: 1.0,
};

const INITIAL_STEPS = [
  "done", // 1
  "done", // 2
  "active", // 3
  "pending", // 4
  "pending", // 5
  "pending", // 6
  "pending", // 7
  "pending", // 8
];

const STEP_LABELS = [
  "1. Lead Info",
  "2. Mandate",
  "3. Lender Assign",
  "4. Pre-Sanction",
  "5. Limits",
  "6. PD",
  "7. Sanction",
  "8. Disbursed",
];

const DOCS_BY_LENDER = {
  aditya: [
    { name: "Promoter PAN & Aadhaar Copy", note: "KYC Verification", link: "https://drive.google.com/file/d/kyc-1/view", checked: true },
    { name: "Last 3 Years Audited Financials", note: "With Audit Notes & UDIN", link: "https://drive.google.com/file/d/audit-2/view", checked: true },
    { name: "12 Months Bank Statements", note: "All Current Accounts", link: "https://drive.google.com/file/d/bank-3/view", checked: true },
    { name: "GST 3B & GSTR-1 Returns (1 Year)", note: "Turnover Cross-check", link: "", checked: false },
    { name: "Existing Sanction Letters", note: "Existing Bank Exposure", link: "", checked: false },
  ],
  ratnaafin: [
    { name: "Promoter & Company KYC", note: "Self Attested", link: "", checked: false },
    { name: "2 Years Audited Balance Sheet", note: "CA Signed", link: "", checked: false },
    { name: "6 Months Bank Statement", note: "PDF Statement", link: "", checked: false },
  ],
  cashfloat: [
    { name: "COI & MOA/AOA", note: "Incorporation Documents", link: "", checked: false },
    { name: "1 Year GST Summary", note: "GSTR Returns", link: "", checked: false },
  ],
};

/* --------------- helpers --------------- */
const fmt = (v, sym) =>
  sym + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v) => (v === "" || v === null || v === undefined ? 0 : parseFloat(v)) || 0;

export default function DealProcessConsole() {
  /* ------------- Step state machine ------------- */
  const [stepState, setStepState] = useState(INITIAL_STEPS);

  /* ------------- Deal form state ------------- */
  const [leadVertical, setLeadVertical] = useState("Supply Chain Finance");
  const [leadCompany, setLeadCompany] = useState("Tata Steel Ltd");
  const [leadContactPerson, setLeadContactPerson] = useState("Rajesh Kumar");
  const [leadContactNumber, setLeadContactNumber] = useState("9876543210");
  const [leadLocation, setLeadLocation] = useState("Mumbai, MH");
  const [leadTurnover, setLeadTurnover] = useState("₹ 150 Cr");
  const [leadVintage, setLeadVintage] = useState("8 Years");
  const [leadReqAmount, setLeadReqAmount] = useState("₹ 10.00 Cr");

  // Step 2 — Mandate
  const [mandateStatus, setMandateStatus] = useState("Signed & Approved");
  const [serviceFee, setServiceFee] = useState("1.5%");
  const [mandateDrive, setMandateDrive] = useState("https://drive.google.com/file/d/mandate-signed-901/view");
  const [cPlatform, setCPlatform] = useState("0.25");
  const [cAdvisory, setCAdvisory] = useState("0.50");
  const [cSuccess, setCSuccess] = useState("0.00");
  const [cLegal, setCLegal] = useState("0.10");

  // Step 3 — Lender
  const [lender, setLender] = useState("aditya");
  const [nameClearance, setNameClearance] = useState("Approved / Cleared");
  const [loginId, setLoginId] = useState("ABC-SCF-2026-901");
  const [loginSlip, setLoginSlip] = useState("");
  const [cLenderPF, setCLenderPF] = useState("2.00");
  const [cFSShare, setCFSShare] = useState("1.00");
  const [cTranche, setCTranche] = useState("0");
  const [cTrancheType, setCTrancheType] = useState("NONE");

  // Trade onboarding toggle
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [tradePlatform, setTradePlatform] = useState("M1xchange (TReDS)");
  const [onboardRef, setOnboardRef] = useState("");
  const [onboardStage, setOnboardStage] = useState("Documents Collected");
  const [onboardDocs, setOnboardDocs] = useState([
    { name: "Board Resolution for Platform Agreement", note: "Platform specific format required", link: "https://drive.google.com/file/d/br-doc-12/view", checked: true },
    { name: "Master Agreement & E-sign Copy", note: "Signed by Authorized Signatory", link: "", checked: false },
    { name: "Bank Mandate / NACH Mandate Confirmation", note: "Settlement Bank Account", link: "", checked: false },
  ]);

  // Step 4 — Pre-Sanction docs (per-lender)
  const [preSanctionDocs, setPreSanctionDocs] = useState(DOCS_BY_LENDER["aditya"]);
  useEffect(() => {
    setPreSanctionDocs(DOCS_BY_LENDER[lender] || []);
  }, [lender]);

  // Step 5 — Limits
  const [recLimit, setRecLimit] = useState("10.00");
  const [approvedLimit, setApprovedLimit] = useState("5.00");
  const [roiTenure, setRoiTenure] = useState("9.5% p.a. / 90 Days");

  // Step 6 — PD
  const [pdStatus, setPdStatus] = useState("PD Completed — Positive");
  const [pdOfficer, setPdOfficer] = useState("");
  const [pdDate, setPdDate] = useState("2026-07-26");
  const [pdReport, setPdReport] = useState("");

  // Step 7 — Sanction
  const [sanctionStatus, setSanctionStatus] = useState("Sanctioned");
  const [sanctionedAmount, setSanctionedAmount] = useState("500000");
  const [sanctionDate, setSanctionDate] = useState("2026-07-27");
  const [sanctionLetter, setSanctionLetter] = useState("");
  const [appliedResult, setAppliedResult] = useState(null);

  // Step 8 — Disbursed
  const [disbursementStatus, setDisbursementStatus] = useState("Disbursed");
  const [disbursedAmount, setDisbursedAmount] = useState("2.50");
  const [disbursedDate, setDisbursedDate] = useState("2026-07-27");
  const [disburseProof, setDisburseProof] = useState("");

  /* ------------- Calculator drawer state ------------- */
  const [calcOpen, setCalcOpen] = useState(false);
  const [cInpVertical, setCInpVertical] = useState("Supply Chain Finance");
  const [cInpCurrency, setCInpCurrency] = useState("INR");
  const [cInpRate, setCInpRate] = useState("96.29");
  const [cInpRateSource, setCInpRateSource] = useState("default");
  const [cInpRateLoading, setCInpRateLoading] = useState(false);
  const [cInpRateError, setCInpRateError] = useState("");
  const [cInpLimit, setCInpLimit] = useState("500000");
  const [cInpLenderPF, setCInpLenderPF] = useState("2.00");
  const [cInpFSShare, setCInpFSShare] = useState("1.00");
  const [cInpPlatformPct, setCInpPlatformPct] = useState("0.25");
  const [cInpAdvisoryPct, setCInpAdvisoryPct] = useState("0.50");
  const [cInpSuccessPct, setCInpSuccessPct] = useState("0.00");
  const [cInpLegalPct, setCInpLegalPct] = useState("0.10");
  const [cInpTrancheType, setCInpTrancheType] = useState("NONE");
  const [cInpTrancheVal, setCInpTrancheVal] = useState("0");
  const [cInpStage, setCInpStage] = useState("Mandate Signed");

  const parseLeadList = (raw) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
    } catch (error) {
      console.warn("Failed to parse lead list from storage", error);
    }
    return [];
  };

  const getLeadFromLocalStorage = () => {
    if (typeof window === "undefined") return null;
    const keys = ["crm_leads_journey", "crm_leads"];
    for (const key of keys) {
      const leads = parseLeadList(window.localStorage.getItem(key));
      if (leads.length) return leads[0];
    }
    return null;
  };

  const getLeadFromWindowApi = async () => {
    if (typeof window === "undefined" || !window.API || typeof window.API.getLeads !== "function") return null;
    try {
      const response = await window.API.getLeads({ skip: 0, limit: 1 });
      const items = Array.isArray(response) ? response : response?.items || [];
      return items[0] || null;
    } catch (error) {
      console.warn("Failed to load lead from window.API", error);
      return null;
    }
  };

  const formatCurrencyField = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
      return `₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(value).startsWith("₹") ? String(value) : `₹ ${String(value)}`;
  };

  const applyLeadSummary = (lead) => {
    if (!lead || typeof lead !== "object") return;
    const company = lead.company_name || lead.lead_name || "Unknown Company";
    const contactPerson = lead.lead_name || lead.designation || "Unknown Contact";
    const contactNumber = lead.mobile || lead.alternate_mobile || lead.email || "-";
    const location = lead.city ? `${lead.city}${lead.location ? `, ${lead.location}` : ""}` : lead.location || "-";
    const turnover = lead.annual_turnover || lead.funding_amount || "-";
    const vintage = lead.business_vintage || "-";
    const reqAmount = lead.funding_amount || lead.funding_amount === 0 ? lead.funding_amount : "-";
    const vertical = lead.vertical || lead.product_type || "Supply Chain Finance";

    setLeadCompany(company);
    setLeadContactPerson(contactPerson);
    setLeadContactNumber(contactNumber);
    setLeadLocation(location);
    setLeadTurnover(formatCurrencyField(turnover));
    setLeadVintage(typeof vintage === "number" ? `${vintage}` : String(vintage));
    setLeadReqAmount(formatCurrencyField(reqAmount));
    setLeadVertical(vertical);
  };

  const loadLeadSummary = async () => {
    let lead = await getLeadFromWindowApi();
    if (!lead) lead = getLeadFromLocalStorage();
    if (lead) applyLeadSummary(lead);
  };

  useEffect(() => {
    loadLeadSummary();
  }, []);

  /* -------- Pull deal → calc (used on open + re-sync + live edits) -------- */
  const syncFromDeal = () => {
    const valid = ["International Trade Finance", "Supply Chain Finance", "Private Credit"];
    setCInpVertical(valid.includes(leadVertical) ? leadVertical : "Supply Chain Finance");
    setCInpLimit(sanctionedAmount || "0");
    setCInpLenderPF(cLenderPF || "0");
    setCInpFSShare(cFSShare || "0");
    setCInpPlatformPct(cPlatform || "0");
    setCInpAdvisoryPct(cAdvisory || "0");
    setCInpSuccessPct(cSuccess || "0");
    setCInpLegalPct(cLegal || "0");
    setCInpTrancheVal(cTranche || "0");
    setCInpTrancheType(cTrancheType || "NONE");
    let stage = "Mandate Signed";
    if (disbursementStatus === "Disbursed") stage = "Disbursed";
    else if (sanctionStatus === "Sanctioned") stage = "Sanctioned";
    setCInpStage(stage);
  };

  // Live-sync while drawer is open — when Step 2/3/7/8 fields change, mirror into calculator
  useEffect(() => {
    if (calcOpen) syncFromDeal();
  }, [
    calcOpen,
    sanctionedAmount,
    cLenderPF,
    cFSShare,
    cPlatform,
    cAdvisory,
    cSuccess,
    cLegal,
    cTranche,
    cTrancheType,
    sanctionStatus,
    disbursementStatus,
    leadVertical,
  ]);

  // Automatically update deal form fields when calculator inputs change
  useEffect(() => {
    if (cInpLimit !== sanctionedAmount) setSanctionedAmount(cInpLimit);
    if (cInpLenderPF !== cLenderPF) setCLenderPF(cInpLenderPF);
    if (cInpFSShare !== cFSShare) setCFSShare(cInpFSShare);
    if (cInpPlatformPct !== cPlatform) setCPlatform(cInpPlatformPct);
    if (cInpAdvisoryPct !== cAdvisory) setCAdvisory(cInpAdvisoryPct);
    if (cInpSuccessPct !== cSuccess) setCSuccess(cInpSuccessPct);
    if (cInpLegalPct !== cLegal) setCLegal(cInpLegalPct);
    if (cInpTrancheVal !== cTranche) setCTranche(cInpTrancheVal);
    if (cInpTrancheType !== cTrancheType) setCTrancheType(cInpTrancheType);
  }, [
    cInpLimit,
    cInpLenderPF,
    cInpFSShare,
    cInpPlatformPct,
    cInpAdvisoryPct,
    cInpSuccessPct,
    cInpLegalPct,
    cInpTrancheVal,
    cInpTrancheType,
  ]);

  const fetchLiveUsdInrRate = async () => {
    setCInpRateLoading(true);
    setCInpRateError("");

    try {
      const response = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=INR");
      if (!response.ok) {
        throw new Error(`Rate fetch failed (${response.status})`);
      }
      const payload = await response.json();
      const rate = payload?.rates?.INR;
      if (!rate || typeof rate !== "number") {
        throw new Error("Invalid rate data");
      }

      setCInpRate(rate.toFixed(4));
      setCInpRateSource("live");
    } catch (error) {
      setCInpRateError("Unable to load live USD/INR rate");
      setCInpRateSource("fallback");
      console.warn("Failed to fetch live USD/INR rate:", error);
    } finally {
      setCInpRateLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveUsdInrRate();
  }, []);

  useEffect(() => {
    if (calcOpen) {
      fetchLiveUsdInrRate();
    }
  }, [calcOpen]);

  /* -------- Perfect FS Engine (verbatim math) -------- */
  const calc = useMemo(() => {
    const baseLimitINR = num(cInpLimit);
    const lenderPfPct = num(cInpLenderPF);
    const fsSharePct = num(cInpFSShare);
    const platformPct = num(cInpPlatformPct);
    const advisoryPct = num(cInpAdvisoryPct);
    const successPct = num(cInpSuccessPct);
    const legalPct = num(cInpLegalPct);
    const trancheType = cInpTrancheType;
    const trancheBaseINR = num(cInpTrancheVal);
    const rate = num(cInpRate) || 96.29;
    const probability = PIPELINE_STAGE_WEIGHTS[cInpStage] || 1.0;

    const totalLenderPfPoolINR = baseLimitINR * (lenderPfPct / 100);
    const fsPfShareAmountINR = baseLimitINR * (fsSharePct / 100);
    const platformFeeINR = baseLimitINR * (platformPct / 100);
    const advisoryFeeINR = baseLimitINR * (advisoryPct / 100);
    const ancillaryFeesTotalINR =
      baseLimitINR * (successPct / 100) + baseLimitINR * (legalPct / 100);

    let fsTrancheRevenueINR = 0;
    if (cInpVertical !== "Private Credit") {
      if (trancheType === "MANDATE") fsTrancheRevenueINR = trancheBaseINR;
      else if (trancheType === "LENDER") fsTrancheRevenueINR = trancheBaseINR * (fsSharePct / 100);
    }

    const totalUnweightedINR =
      fsPfShareAmountINR + platformFeeINR + advisoryFeeINR + ancillaryFeesTotalINR + fsTrancheRevenueINR;
    const finalWeightedINR = totalUnweightedINR * probability;

    const conv = cInpCurrency === "USD" ? 1 / rate : 1;
    const sym = cInpCurrency === "USD" ? "$ " : "₹ ";

    const finalRealizedINR = finalWeightedINR;
    const finalRealizedUSD = finalRealizedINR / rate;

    const audit =
      cInpCurrency === "USD"
        ? `INR Amount ₹ ${fsPfShareAmountINR.toLocaleString("en-IN")} ÷ ${rate} Exchange Rate = $ ${(fsPfShareAmountINR * conv).toFixed(2)} USD Breakdown Share`
        : `₹ ${baseLimitINR.toLocaleString("en-IN")} Sanction Limit × ${fsSharePct}% FS Share = ₹ ${fsPfShareAmountINR.toLocaleString("en-IN")} Net FS Revenue`;

    return {
      sym,
      conv,
      probability,
      stage: cInpStage,
      baseLimitINR,
      totalLenderPfPoolINR,
      fsPfShareAmountINR,
      platformFeeINR,
      advisoryFeeINR,
      ancillaryFeesTotalINR,
      fsTrancheRevenueINR,
      totalUnweightedINR,
      finalRealizedINR,
      finalRealizedUSD,
      audit,
    };
  }, [
    cInpLimit,
    cInpLenderPF,
    cInpFSShare,
    cInpPlatformPct,
    cInpAdvisoryPct,
    cInpSuccessPct,
    cInpLegalPct,
    cInpTrancheType,
    cInpTrancheVal,
    cInpRate,
    cInpStage,
    cInpVertical,
    cInpCurrency,
  ]);

  /* -------- Actions -------- */
  const openCalc = () => {
    syncFromDeal();
    setCalcOpen(true);
  };
  const closeCalc = () => setCalcOpen(false);

  const applyToDeal = () => {
    setAppliedResult({
      stage: calc.stage,
      probability: calc.probability,
      inr: calc.finalRealizedINR,
      usd: calc.finalRealizedUSD,
    });
    closeCalc();
  };

  const saveStep = (n) => {
    setStepState((prev) => {
      const next = [...prev];
      next[n - 1] = "done";
      if (n < 8 && next[n] === "pending") next[n] = "active";
      return next;
    });
    setTimeout(() => {
      const nxt = document.querySelector(`[data-step="${n + 1}"]`);
      if (nxt) nxt.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };
  const editStep = (n) => {
    setStepState((prev) => {
      const next = [...prev];
      next[n - 1] = "active";
      return next;
    });
  };

  const toggleTradeOnboarding = () => setIsOnboardOpen((v) => !v);

  const stepCardProps = { stepState, saveStep, editStep };

  return (
    <>
      <StyleBlock />
      <div className="wrap">
        {/* HEADER */}
        <div className="fs-header">
          <div>
            <h1>Deal Processing Console</h1>
            <p>Essgeei Financial Pvt Ltd | Funding Sathi Operations</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ref-pill">Ref: FS-DEAL-2026-9041</span>
            <button className="btn-calc-global" onClick={openCalc} data-testid="open-calc-header">
              🧮 Calculate Revenue
            </button>
          </div>
        </div>

        {/* STEPPER */}
        <div className="stepper" data-testid="stepper">
          {STEP_LABELS.map((label, i) => {
            const s = stepState[i];
            return (
              <div key={i} className={`step-item ${s === "done" ? "done" : ""} ${s === "active" ? "active" : ""}`}>
                <div className="step-circle">{s === "done" ? "✓" : i + 1}</div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* STEP 1 — Read only */}
        <div className="fs-card">
          <div className="section-label">
            <span>Step 1 — Lead Summary Info (Auto-fetched from Lead)</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11.5, textTransform: "none" }}>Read Only</span>
          </div>
          <div className="read-grid">
            <DataBox lbl="Customer Company" val={leadCompany} />
            <DataBox lbl="Contact Person" val={leadContactPerson} />
            <DataBox lbl="Contact Number" val={leadContactNumber} />
            <DataBox lbl="City / Location" val={leadLocation} />
            <DataBox lbl="Turnover" val={leadTurnover} />
            <DataBox lbl="Vintage" val={leadVintage} />
            <DataBox lbl="Req. Amount" val={leadReqAmount} />
            <DataBox lbl="Business Vertical" val={leadVertical} />
          </div>
        </div>

        {/* STEP 2 — Mandate */}
        <StepCard {...stepCardProps} n={2} title="Step 2 — Customer Mandate">
          <div className="form-grid cols-3">
            <Field label={<>Mandate Status <span className="req">*</span></>}>
              <select value={mandateStatus} onChange={(e) => setMandateStatus(e.target.value)} data-testid="mandate-status">
                <option>Signed & Approved</option>
                <option>Pending Client Signature</option>
              </select>
            </Field>
            <Field label={<>Service Fee (%) / Amount <span className="req">*</span></>}>
              <input value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} data-testid="service-fee" />
            </Field>
            <Field label="Mandate Copy Drive Link">
              <input value={mandateDrive} onChange={(e) => setMandateDrive(e.target.value)} data-testid="mandate-drive" />
            </Field>
          </div>
          <div className="subhead">Fee Structure Agreed With Customer (feeds Calculator)</div>
          <div className="form-grid cols-3">
            <Field label="Platform Fee (%)">
              <input type="number" step="0.01" value={cPlatform} onChange={(e) => setCPlatform(e.target.value)} data-testid="fee-platform" />
            </Field>
            <Field label="Advisory Fee (%)">
              <input type="number" step="0.01" value={cAdvisory} onChange={(e) => setCAdvisory(e.target.value)} data-testid="fee-advisory" />
            </Field>
            <Field label="Success Fee (%)">
              <input type="number" step="0.01" value={cSuccess} onChange={(e) => setCSuccess(e.target.value)} data-testid="fee-success" />
            </Field>
            <Field label="Legal & Val. Fee (%)">
              <input type="number" step="0.01" value={cLegal} onChange={(e) => setCLegal(e.target.value)} data-testid="fee-legal" />
            </Field>
          </div>
        </StepCard>

        {/* STEP 3 — Lender */}
        <StepCard {...stepCardProps} n={3} title="Step 3 — Lender Assignment (Name Clearance & Login)" borderColor="var(--accent)">
          <div className="form-grid cols-3">
            <Field label={<>Assigned Lender <span className="req">*</span></>}>
              <select value={lender} onChange={(e) => setLender(e.target.value)} data-testid="lender-select">
                <option value="aditya">Aditya Birla Capital</option>
                <option value="ratnaafin">Ratnaafin Capital</option>
                <option value="cashfloat">CashFloat</option>
              </select>
            </Field>
            <Field label={<>Name Clearance Status <span className="req">*</span></>}>
              <select value={nameClearance} onChange={(e) => setNameClearance(e.target.value)} data-testid="name-clearance">
                <option>Approved / Cleared</option>
                <option>Pending Clearance</option>
                <option>Rejected by Lender</option>
              </select>
            </Field>
            <Field label="Lender Application / Login ID">
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} data-testid="login-id" />
            </Field>
            <Field label="Login Slip / Confirmation Email (Drive Link)" full>
              <input placeholder="Paste Drive Link of Login Proof..." value={loginSlip} onChange={(e) => setLoginSlip(e.target.value)} data-testid="login-slip" />
            </Field>
          </div>
          <div className="subhead">Lender PF & Tranche Terms (feeds Calculator)</div>
          <div className="form-grid cols-3">
            <Field label="Total Lender PF (%)">
              <input type="number" step="0.01" value={cLenderPF} onChange={(e) => setCLenderPF(e.target.value)} data-testid="lender-pf" />
            </Field>
            <Field label={<>FS PF Share (%) <span className="hint">of sanctioned amount</span></>}>
              <input type="number" step="0.01" value={cFSShare} onChange={(e) => setCFSShare(e.target.value)} data-testid="fs-share" />
            </Field>
            <Field label="Tranche Charge Amount (₹)">
              <input type="number" step="1" value={cTranche} onChange={(e) => setCTranche(e.target.value)} data-testid="tranche-val" />
            </Field>
            <Field label="Tranche Routing Type" full>
              <select value={cTrancheType} onChange={(e) => setCTrancheType(e.target.value)} data-testid="tranche-type">
                <option value="NONE">Option C: Disabled / Zero Tranche</option>
                <option value="MANDATE">Option A: Direct Mandate Billing (100% to FS)</option>
                <option value="LENDER">Option B: Lender Shared Tranche</option>
              </select>
            </Field>
          </div>
        </StepCard>

        {/* TRADE ONBOARDING TOGGLE */}
        <div className="onboard-toggle-box">
          <div>
            <h4>🌐 Trade Platform Onboarding Status</h4>
            <p>Kya customer TReDS / Trade Platform (M1xchange, RXIL, Invoicemart) par onboard hone ke liye ready hai?</p>
          </div>
          <div>
            <button
              className={`btn ${isOnboardOpen ? "btn-success" : "btn-primary"}`}
              onClick={toggleTradeOnboarding}
              data-testid="toggle-onboard"
            >
              {isOnboardOpen ? "✓ Customer Ready (Onboarding Form Open)" : "⚡ Click Here: Customer Ready for Onboarding"}
            </button>
          </div>
        </div>

        {isOnboardOpen && (
          <div className="fs-card" style={{ border: "1.5px solid var(--accent)" }} data-testid="onboard-section">
            <div className="section-label" style={{ color: "var(--accent-dark)" }}>
              <span>🌐 Trade Platform Onboarding & Document Kit</span>
              <span style={{ fontSize: 11, background: "var(--success-bg)", color: "var(--success)", padding: "3px 8px", borderRadius: 10 }}>
                Status: Onboarding Active
              </span>
            </div>
            <div className="form-grid cols-3" style={{ marginBottom: 16 }}>
              <Field label={<>Select Trade Platform <span className="req">*</span></>}>
                <select value={tradePlatform} onChange={(e) => setTradePlatform(e.target.value)}>
                  <option>M1xchange (TReDS)</option>
                  <option>RXIL (TReDS)</option>
                  <option>Invoicemart (TReDS)</option>
                  <option>Custom Digital Platform</option>
                </select>
              </Field>
              <Field label="Onboarding Reference / Code">
                <input placeholder="e.g. M1-CUST-88401" value={onboardRef} onChange={(e) => setOnboardRef(e.target.value)} />
              </Field>
              <Field label="Onboarding Stage">
                <select value={onboardStage} onChange={(e) => setOnboardStage(e.target.value)}>
                  <option>Documents Collected</option>
                  <option>Submitted to Platform</option>
                  <option>Agreement Executed</option>
                  <option>Live / Active on Platform</option>
                </select>
              </Field>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Trade Onboarding Specific Documents Checklist:</div>
            <DocTable rows={onboardDocs} setRows={setOnboardDocs} testidPrefix="onboard-doc" />
          </div>
        )}

        {/* STEP 4 — Pre-Sanction Docs */}
        <StepCard {...stepCardProps} n={4} title="Step 4 — Pre-Sanction Documents (After Check)">
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
            Documents check karke tick mark karein aur unka Drive link paste karein:
          </p>
          <DocTable rows={preSanctionDocs} setRows={setPreSanctionDocs} testidPrefix="presanction-doc" />
        </StepCard>

        {/* STEP 5 — Limits */}
        <StepCard {...stepCardProps} n={5} title={<>Step 5 — Limits <span style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "none" }}>(Indicative only — NOT used by Calculator)</span></>}>
          <div className="form-grid cols-3">
            <Field label="Recommended Limit (in ₹ Cr)">
              <input type="number" step="0.01" value={recLimit} onChange={(e) => setRecLimit(e.target.value)} />
            </Field>
            <Field label="Lender Approved Limit (in ₹ Cr)">
              <input type="number" step="0.01" value={approvedLimit} onChange={(e) => setApprovedLimit(e.target.value)} />
            </Field>
            <Field label="Proposed ROI (%) & Tenure">
              <input value={roiTenure} onChange={(e) => setRoiTenure(e.target.value)} />
            </Field>
          </div>
        </StepCard>

        {/* STEP 6 — PD */}
        <StepCard {...stepCardProps} n={6} title="Step 6 — PD (Personal Discussion)">
          <div className="form-grid cols-3">
            <Field label={<>PD Status <span className="req">*</span></>}>
              <select value={pdStatus} onChange={(e) => setPdStatus(e.target.value)}>
                <option>PD Completed — Positive</option>
                <option>PD Scheduled</option>
                <option>PD Waived Off</option>
                <option>PD On-Hold / Negative</option>
              </select>
            </Field>
            <Field label="PD Officer / Manager Name">
              <input placeholder="e.g. Credit Manager - ABC" value={pdOfficer} onChange={(e) => setPdOfficer(e.target.value)} />
            </Field>
            <Field label="PD Date">
              <input type="date" value={pdDate} onChange={(e) => setPdDate(e.target.value)} />
            </Field>
            <Field label="PD Report / Visit Notes (Drive Link)" full>
              <input placeholder="Paste Drive link of PD Report / Site Photos..." value={pdReport} onChange={(e) => setPdReport(e.target.value)} />
            </Field>
          </div>
        </StepCard>

        {/* STEP 7 — Sanction */}
        <StepCard {...stepCardProps} n={7} title="Step 7 — Sanction" borderColor="var(--accent)">
          <div className="form-grid cols-3">
            <Field label={<>Sanction Status <span className="req">*</span></>}>
              <select value={sanctionStatus} onChange={(e) => setSanctionStatus(e.target.value)} data-testid="sanction-status">
                <option>Sanctioned</option>
                <option>In Credit / Underwriting</option>
                <option>Rejected</option>
              </select>
            </Field>
            <Field label={<>Final Sanctioned Amount (in ₹) <span className="req">*</span></>}>
              <input type="number" step="0.01" value={sanctionedAmount} onChange={(e) => setSanctionedAmount(e.target.value)} data-testid="sanctioned-amount" />
            </Field>
            <Field label="Sanction Date">
              <input type="date" value={sanctionDate} onChange={(e) => setSanctionDate(e.target.value)} />
            </Field>
            <Field label="Sanction Letter Copy (Drive Link)" full>
              <input placeholder="Paste Drive link of Sanction Letter..." value={sanctionLetter} onChange={(e) => setSanctionLetter(e.target.value)} />
            </Field>
          </div>

          <div className="calc-trigger-box">
            <div>
              <h4>🧮 Commission & Revenue Calculation</h4>
              <p>Step 2, 3 aur is Sanctioned Amount ka data calculator mein automatically chala jayega</p>
            </div>
            <button className="btn btn-primary" onClick={openCalc} data-testid="open-calc-step7">Open Calculator →</button>
          </div>

          {appliedResult && (
            <div
              style={{
                background: "var(--success-bg)",
                borderRadius: 8,
                padding: "12px 16px",
                marginTop: 14,
                fontSize: 13,
                color: "var(--success)",
                fontWeight: 600,
              }}
              data-testid="applied-result"
            >
              ✓ Applied: Total Realized Revenue ({appliedResult.stage}, {(appliedResult.probability * 100).toFixed(0)}% weighted) ={" "}
              {fmt(appliedResult.inr, "₹ ")} ({fmt(appliedResult.usd, "$ ")})
            </div>
          )}
        </StepCard>

        {/* STEP 8 — Disbursed */}
        <StepCard {...stepCardProps} n={8} title="Step 8 — Disbursed" borderColor="var(--success)">
          <div className="form-grid cols-3">
            <Field label={<>Disbursement Status <span className="req">*</span></>}>
              <select value={disbursementStatus} onChange={(e) => setDisbursementStatus(e.target.value)} data-testid="disbursement-status">
                <option>Disbursed</option>
                <option>Partially Disbursed</option>
                <option>Pending Pre-Disbursement Compliance</option>
              </select>
            </Field>
            <Field label="Disbursed Amount (in ₹ Cr)">
              <input type="number" step="0.01" value={disbursedAmount} onChange={(e) => setDisbursedAmount(e.target.value)} />
            </Field>
            <Field label="Disbursement Date">
              <input type="date" value={disbursedDate} onChange={(e) => setDisbursedDate(e.target.value)} />
            </Field>
            <Field label="Disbursement Advice / Proof (Drive Link)" full>
              <input placeholder="Paste Drive link of Payment Advice..." value={disburseProof} onChange={(e) => setDisburseProof(e.target.value)} />
            </Field>
          </div>
        </StepCard>

        <div className="btn-row">
          <button className="btn">Cancel</button>
          <button className="btn btn-primary" onClick={() => alert("Deal Details Saved Successfully!")} data-testid="save-complete-deal">
            💾 Save Complete Deal Process
          </button>
        </div>
      </div>

      {/* CALCULATOR DRAWER */}
      {calcOpen && <div className="overlay show" onClick={closeCalc} />}
      <div className={`calc-drawer ${calcOpen ? "show" : ""}`} data-testid="calc-drawer">
        <div className="cd-header">
          <div>
            <h2>Funding Sathi — Live Conversion Ledger Matrix</h2>
            <p>Dynamic Breakdown Conversion Engine | Auto-synced from Deal Steps 2, 3 & 7</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="cd-status">Status: <span>Auto-Sync Active</span></div>
            <button
              onClick={closeCalc}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}
              data-testid="calc-close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="cd-sync-note">
          ✓ Values pulled LIVE from Step 2 (fees), Step 3 (lender PF/tranche) & Step 7 (sanctioned amount). Edit fields there and this ledger updates automatically. You can still override any value here — overrides stay local to this calculator until you re-sync.
        </div>

        <div className="cd-body">
          <div className="cd-grid">
            {/* LEFT: INPUTS */}
            <div className="cd-panel">
              <div className="cd-panel-head">Variable Deal Parameters Configuration</div>
              <div className="cd-panel-body">
                <div className="cd-field">
                  <label>Target Business Vertical Category *</label>
                  <select className="mono" value={cInpVertical} onChange={(e) => setCInpVertical(e.target.value)}>
                    <option value="International Trade Finance">International Trade Finance</option>
                    <option value="Supply Chain Finance">Supply Chain Finance (SCF)</option>
                    <option value="Private Credit">Private Credit Pipeline</option>
                  </select>
                </div>
                <div className="cd-grid2">
                  <div className="cd-field">
                    <label>Display Currency View *</label>
                    <select className="mono" value={cInpCurrency} onChange={(e) => setCInpCurrency(e.target.value)} data-testid="calc-currency">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  <div className="cd-field">
                    <label>Exchange Rate (1 USD = INR) *</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="number" step="0.0001" className="mono amber" value={cInpRate} onChange={(e) => setCInpRate(e.target.value)} />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={fetchLiveUsdInrRate}
                        disabled={cInpRateLoading}
                        style={{ whiteSpace: "nowrap", minWidth: 120 }}
                      >
                        {cInpRateLoading ? "Refreshing..." : "Refresh rate"}
                      </button>
                    </div>
                    <div className="cd-field-note" style={{ marginTop: 6, fontSize: 12, color: cInpRateError ? "#dc2626" : "#475569" }}>
                      {cInpRateLoading
                        ? "Fetching live USD/INR rate..."
                        : cInpRateError
                        ? `${cInpRateError}. Using last known value.`
                        : cInpRateSource === "live"
                        ? "Live rate loaded from external FX service."
                        : "Using default fallback exchange rate."}
                    </div>
                  </div>
                </div>
                <div className="cd-field">
                  <label>Base Sanction Limit (In INR) * <span style={{ fontWeight: 400, color: "#059669" }}>← Step 7</span></label>
                  <input type="number" className="mono" value={cInpLimit} onChange={(e) => setCInpLimit(e.target.value)} data-testid="calc-limit" />
                </div>
                <div className="cd-grid2">
                  <div className="cd-field">
                    <label>Total Lender PF % <span style={{ fontWeight: 400, color: "#059669" }}>← Step 3</span></label>
                    <input type="number" step="0.01" className="mono" value={cInpLenderPF} onChange={(e) => setCInpLenderPF(e.target.value)} />
                  </div>
                  <div className="cd-field">
                    <label>FS PF Share % <span style={{ fontWeight: 400, color: "#059669" }}>← Step 3</span></label>
                    <input type="number" step="0.01" className="mono" value={cInpFSShare} onChange={(e) => setCInpFSShare(e.target.value)} />
                  </div>
                </div>

                <div className="cd-ancillary-box">
                  <span className="cd-tag">Ancillary Fees (% of Sanction Limit) ← Step 2</span>
                  <div className="cd-grid2">
                    <div className="cd-field"><label>Platform Fee %</label><input type="number" step="0.01" className="mono" value={cInpPlatformPct} onChange={(e) => setCInpPlatformPct(e.target.value)} /></div>
                    <div className="cd-field"><label>Advisory Fee %</label><input type="number" step="0.01" className="mono" value={cInpAdvisoryPct} onChange={(e) => setCInpAdvisoryPct(e.target.value)} /></div>
                    <div className="cd-field"><label>Success Fee %</label><input type="number" step="0.01" className="mono" value={cInpSuccessPct} onChange={(e) => setCInpSuccessPct(e.target.value)} /></div>
                    <div className="cd-field"><label>Legal & Val. Fee %</label><input type="number" step="0.01" className="mono" value={cInpLegalPct} onChange={(e) => setCInpLegalPct(e.target.value)} /></div>
                  </div>
                </div>

                <div className="cd-tranche-box">
                  <span className="cd-tag">Tranche Charge Engine ← Step 3</span>
                  <div className="cd-field">
                    <label>Tranche Routing Type</label>
                    <select value={cInpTrancheType} onChange={(e) => setCInpTrancheType(e.target.value)}>
                      <option value="NONE">Option C: Disabled / Zero Tranche</option>
                      <option value="MANDATE">Option A: Direct Mandate Billing (100% to FS)</option>
                      <option value="LENDER">Option B: Lender Shared Tranche</option>
                    </select>
                  </div>
                  <div className="cd-field" style={{ marginBottom: 0 }}>
                    <label>Tranche Charge Amount (In INR)</label>
                    <input type="number" className="mono" value={cInpTrancheVal} onChange={(e) => setCInpTrancheVal(e.target.value)} />
                  </div>
                </div>

                <div className="cd-field" style={{ marginBottom: 0 }}>
                  <label>CRM Pipeline Stage * <span style={{ fontWeight: 400, color: "#059669" }}>← auto from Step 7/8</span></label>
                  <select className="mono" value={cInpStage} onChange={(e) => setCInpStage(e.target.value)} data-testid="calc-stage">
                    <option value="Disbursed">Disbursed (100%)</option>
                    <option value="Sanctioned">Sanctioned (90%)</option>
                    <option value="Mandate Signed">Mandate Signed (75%)</option>
                  </select>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => syncFromDeal()}
                    style={{ width: "100%", background: "#0F172A", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    data-testid="resync-btn"
                  >
                    ↻ Re-sync From Deal Form
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: OUTPUTS */}
            <div className="cd-right-col">
              <div className="cd-panel">
                <div className="cd-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Funding Sathi Dynamic Revenue Breakdown Ledger</span>
                  <span className="cd-ledger-tag">Breakdown View: {cInpCurrency}</span>
                </div>
                <div className="cd-ledger-body">
                  <div className="cd-top-row">
                    <div>
                      <span className="lbl">Sanction Limit (Selected Currency)</span>
                      <span className="val" data-testid="out-sanction">{fmt(calc.baseLimitINR * calc.conv, calc.sym)}</span>
                    </div>
                    <div>
                      <span className="lbl">Total Lender PF Pool</span>
                      <span className="val" style={{ color: "#64748B" }}>{fmt(calc.totalLenderPfPoolINR * calc.conv, calc.sym)}</span>
                    </div>
                  </div>
                  <div className="cd-comp-grid">
                    <div className="cd-comp-cell fs"><span className="t">FS PF Share</span><span className="v">{fmt(calc.fsPfShareAmountINR * calc.conv, calc.sym)}</span></div>
                    <div className="cd-comp-cell"><span className="t">Platform Fee</span><span className="v">{fmt(calc.platformFeeINR * calc.conv, calc.sym)}</span></div>
                    <div className="cd-comp-cell"><span className="t">Advisory Fee</span><span className="v">{fmt(calc.advisoryFeeINR * calc.conv, calc.sym)}</span></div>
                    <div className="cd-comp-cell"><span className="t">Ancillary Total</span><span className="v">{fmt(calc.ancillaryFeesTotalINR * calc.conv, calc.sym)}</span></div>
                    <div className="cd-comp-cell"><span className="t">Tranche Yield</span><span className="v" style={{ color: "#334155" }}>{fmt(calc.fsTrancheRevenueINR * calc.conv, calc.sym)}</span></div>
                  </div>
                  <div className="cd-total-row">
                    <span className="t">Total FS Gross Revenue Breakdown</span>
                    <span className="v" data-testid="out-breakdown-total">{fmt(calc.totalUnweightedINR * calc.conv, calc.sym)}</span>
                  </div>
                </div>
              </div>

              <div className="cd-summary">
                <div className="cd-summary-head">
                  <h3>Total Realized Revenue Target Split</h3>
                  <p>Automatic Cross-Currency Equivalent Sync — Weighted by Pipeline Stage</p>
                </div>
                <div className="cd-target-grid">
                  <div className="cd-target-box inr">
                    <span className="t">INR Target Yield</span>
                    <div className="v" data-testid="final-inr">{fmt(calc.finalRealizedINR, "₹ ")}</div>
                  </div>
                  <div className="cd-target-box usd">
                    <span className="t">USD Target Yield</span>
                    <div className="v" data-testid="final-usd">{fmt(calc.finalRealizedUSD, "$ ")}</div>
                  </div>
                </div>
                <div className="cd-audit-box">
                  <span className="lbl">Live Conversion Audit Trace:</span>
                  <div className="val">{calc.audit}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="cd-apply-row">
          <button className="cd-btn" onClick={closeCalc}>Close</button>
          <button className="cd-btn apply" onClick={applyToDeal} data-testid="apply-to-deal">✓ Apply Result to Deal (Step 7)</button>
        </div>
      </div>
    </>
  );
}

/* --------- Small sub-components --------- */
const StepCard = ({ n, title, borderColor, children, stepState, saveStep, editStep }) => {
  const state = stepState[n - 1];
  const badge =
    state === "done"
      ? { text: "✓ Completed", cls: "done" }
      : state === "active"
      ? { text: "🔵 In Progress", cls: "active" }
      : { text: "🔒 Pending", cls: "pending" };
  const disabled = state !== "active";
  return (
    <div
      className={`fs-card ${state === "pending" ? "locked" : ""}`}
      data-step={n}
      data-testid={`step-card-${n}`}
      style={borderColor ? { borderColor } : undefined}
    >
      <div className="section-label" style={state === "done" && n === 8 ? { color: "var(--success)" } : undefined}>
        <span>{title}</span>
        <span className={`step-status-badge ${badge.cls}`} data-testid={`step-badge-${n}`}>{badge.text}</span>
      </div>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>{children}</fieldset>
      {state === "pending" && (
        <div className="lock-note" style={{ display: "block" }}>
          🔒 This step is locked. Complete the previous step to unlock it.
        </div>
      )}
      {state !== "pending" && (
        <div className="step-footer">
          {state === "done" ? (
            <button className="btn" onClick={() => editStep(n)} data-testid={`edit-btn-${n}`}>✎ Edit</button>
          ) : (
            <button className="btn btn-primary" onClick={() => saveStep(n)} data-testid={`save-btn-${n}`}>💾 Save & Submit</button>
          )}
        </div>
      )}
    </div>
  );
};

const DataBox = ({ lbl, val }) => (
  <div className="data-box">
    <div className="lbl">{lbl}</div>
    <div className="val">{val}</div>
  </div>
);

const Field = ({ label, children, full }) => (
  <div className={`field ${full ? "full" : ""}`}>
    <label>{label}</label>
    {children}
  </div>
);

const DocTable = ({ rows, setRows, testidPrefix }) => (
  <table className="doc-table">
    <thead>
      <tr>
        <th style={{ width: 50 }}>Check</th>
        <th>Document Name</th>
        <th>Notes</th>
        <th>Google Drive Link</th>
        <th style={{ width: 100 }}>Status</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          <td>
            <input
              type="checkbox"
              checked={r.checked}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...r, checked: e.target.checked };
                setRows(next);
              }}
              data-testid={`${testidPrefix}-check-${i}`}
            />
          </td>
          <td><b>{r.name}</b></td>
          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.note}</td>
          <td>
            <input
              type="url"
              placeholder="Paste Drive Link..."
              value={r.link}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...r, link: e.target.value };
                setRows(next);
              }}
              style={{ fontSize: 12, padding: "6px 9px" }}
            />
          </td>
          <td>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: r.checked ? "var(--success)" : "var(--danger)" }}>
              {r.checked ? "✓ Received" : "⏳ Pending"}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* --------- Style block (scoped, replicates the original CSS exactly) --------- */
const StyleBlock = () => (
  <style>{`
:root{
  --bg:#F6F7F9; --surface:#FFFFFF; --surface-2:#F1F3F6;
  --border:#E5E8EC; --border-strong:#D6DAE1;
  --text-primary:#151922; --text-secondary:#5B6472; --text-muted:#8A93A3;
  --accent:#2F5DE8; --accent-light:#EAF0FE; --accent-dark:#1E3FA8;
  --success:#127A57; --success-bg:#E3F5EC;
  --warning:#9A6300; --warning-bg:#FDF1DC;
  --danger:#B3261E; --danger-bg:#FBEAE9;
  --radius:8px; --radius-lg:12px;
}
body{font-family:'Inter',system-ui,sans-serif; background:var(--bg); color:var(--text-primary); font-size:14px; line-height:1.5;}
.wrap{max-width:1050px; margin:0 auto; padding:24px 20px 80px;}

.fs-header{background:linear-gradient(135deg,#7A1F1F,#5C1414); border-radius:var(--radius-lg); padding:20px 24px; color:#fff; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;}
.fs-header h1{font-size:20px; font-weight:600; margin:0;}
.fs-header p{font-size:13px; opacity:0.85; margin:0;}
.ref-pill{background:rgba(255,255,255,0.15); padding:6px 12px; border-radius:20px; font-size:12px;}
.btn-calc-global{background:#fff; color:#7A1F1F; border:none; border-radius:var(--radius); padding:10px 18px; font-size:13.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:7px;}
.btn-calc-global:hover{background:#f0f0f0;}

.stepper{display:flex; justify-content:space-between; background:var(--surface); padding:16px 20px; border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:20px; overflow-x:auto;}
.step-item{display:flex; flex-direction:column; align-items:center; gap:6px; min-width:85px; text-align:center; font-size:11px; font-weight:600; color:var(--text-muted);}
.step-item.active{color:var(--accent-dark);}
.step-item.done{color:var(--success);}
.step-circle{width:26px; height:26px; border-radius:50%; background:var(--surface-2); border:2px solid var(--border-strong); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;}
.step-item.active .step-circle{background:var(--accent); color:#fff; border-color:var(--accent);}
.step-item.done .step-circle{background:var(--success); color:#fff; border-color:var(--success);}

.fs-card{background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:22px 24px; margin-bottom:20px; transition:opacity 0.25s ease;}
.fs-card.locked{opacity:0.55;}
.section-label{font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--accent-dark); margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;}
.fs-card.locked .section-label{color:var(--text-muted);}
.subhead{font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--accent-dark); margin:18px 0 12px; padding-top:14px; border-top:1px dashed var(--border);}

.read-grid{display:grid; grid-template-columns:repeat(4, 1fr); gap:12px 16px;}
.data-box{background:var(--surface-2); padding:10px 12px; border-radius:var(--radius);}
.data-box .lbl{font-size:11px; color:var(--text-muted); font-weight:500; text-transform:uppercase;}
.data-box .val{font-size:13.5px; font-weight:600; color:var(--text-primary); margin-top:2px;}

.form-grid{display:grid; grid-template-columns:1fr 1fr; gap:16px 20px;}
.form-grid.cols-3{grid-template-columns:1fr 1fr 1fr;}
.field{display:flex; flex-direction:column; gap:6px;}
.field.full{grid-column:1/-1;}
.field label{font-size:12.5px; font-weight:600; color:var(--text-primary);}
.field label .req{color:var(--danger);}
.field label .hint{font-weight:400; color:var(--text-muted); font-size:11px;}
.field input, .field select, .field textarea{
  border:1px solid var(--border-strong); border-radius:var(--radius); padding:9px 11px;
  font-size:13.5px; font-family:inherit; color:var(--text-primary); background:var(--surface); width:100%;
}
.field input:focus, .field select:focus, .field textarea:focus{outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-light);}
.field input:disabled, .field select:disabled, .field textarea:disabled{background:var(--surface-2); color:var(--text-muted); cursor:not-allowed; border-style:dashed;}

.onboard-toggle-box{background:var(--accent-light); border:1.5px dashed #2F5DE8; border-radius:var(--radius); padding:16px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;}
.onboard-toggle-box h4{font-size:14px; font-weight:700; color:var(--accent-dark); margin:0;}
.onboard-toggle-box p{font-size:12px; color:var(--text-secondary); margin-top:2px;}

.doc-table{width:100%; border-collapse:collapse; margin-top:8px;}
.doc-table th{text-align:left; font-size:12px; font-weight:600; color:var(--text-secondary); padding:10px 12px; background:var(--surface-2); border-bottom:1px solid var(--border);}
.doc-table td{padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle;}
.doc-table td input[type=url]{width:100%; border:1px solid var(--border-strong); border-radius:var(--radius); padding:9px 11px; font-family:inherit; color:var(--text-primary); background:var(--surface);}

.btn-row{display:flex; justify-content:flex-end; gap:12px; margin-top:20px;}
.btn{border:1px solid var(--border-strong); background:var(--surface); border-radius:var(--radius); padding:10px 20px; font-size:13.5px; font-weight:600; cursor:pointer; color:var(--text-primary);}
.btn:hover{background:var(--surface-2);}
.btn-primary{background:var(--accent); border-color:var(--accent); color:#fff;}
.btn-primary:hover{background:var(--accent-dark);}
.btn-success{background:var(--success); border-color:var(--success); color:#fff;}

.step-status-badge{font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:none; letter-spacing:0;}
.step-status-badge.pending{background:var(--surface-2); color:var(--text-muted);}
.step-status-badge.active{background:var(--accent-light); color:var(--accent-dark);}
.step-status-badge.done{background:var(--success-bg); color:var(--success);}

.lock-note{font-size:12px; color:var(--text-muted); background:var(--surface-2); padding:8px 12px; border-radius:var(--radius); margin-top:12px;}
.step-footer{display:flex; justify-content:flex-end; gap:10px; margin-top:18px; padding-top:14px; border-top:1px solid var(--border);}

.calc-trigger-box{background:var(--accent-light); border:1.5px dashed #A9C0F5; border-radius:var(--radius-lg); padding:16px 20px; margin-top:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;}
.calc-trigger-box h4{font-size:13.5px; font-weight:700; color:var(--accent-dark); margin:0;}
.calc-trigger-box p{font-size:12px; color:var(--text-secondary); margin-top:2px;}

/* Calculator drawer */
.overlay{display:none; position:fixed; inset:0; background:rgba(10,12,18,0.6); z-index:200;}
.overlay.show{display:block;}
.calc-drawer{
  position:fixed; top:0; right:-780px; width:760px; max-width:96vw; height:100vh; background:#F8FAFC;
  box-shadow:-10px 0 40px rgba(0,0,0,0.25); z-index:201; transition:right 0.3s ease; overflow-y:auto;
  font-family:'Inter',sans-serif; font-size:12px; color:#334155;
}
.calc-drawer.show{right:0;}
.cd-header{background:#020617; padding:16px 20px; color:#fff; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:5;}
.cd-header h2{font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.02em; margin:0;}
.cd-header p{font-size:10px; color:#94A3B8; font-family:monospace; margin-top:2px;}
.cd-status{background:#0F172A; border:1px solid #1E293B; padding:6px 12px; border-radius:8px; color:#94A3B8; font-weight:700; font-size:11px;}
.cd-status span{color:#34D399; font-family:monospace;}
.cd-sync-note{background:#FDF1DC; border-bottom:1px solid #F5D48A; padding:10px 20px; font-size:11.5px; color:#9A6300; font-weight:500;}
.cd-body{padding:20px;}
.cd-grid{display:grid; grid-template-columns:1fr 1.4fr; gap:20px;}
@media (max-width:820px){ .cd-grid{grid-template-columns:1fr;} }

.cd-panel{background:#fff; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid #E2E8F0; overflow:hidden;}
.cd-panel-head{padding:10px 14px; background:#0F172A; color:#fff; font-weight:700; text-transform:uppercase; letter-spacing:0.02em; font-size:11px; border-bottom:1px solid #1E293B;}
.cd-panel-body{padding:14px;}
.cd-field{margin-bottom:10px;}
.cd-field label{display:block; font-weight:700; color:#475569; margin-bottom:4px; font-size:11px;}
.cd-field input, .cd-field select{
  width:100%; border:1px solid #CBD5E1; border-radius:6px; padding:7px 9px; font-family:inherit; font-size:12px; background:#fff; color:#0F172A; outline:none;
}
.cd-field input:focus, .cd-field select:focus{border-color:#2F5DE8;}
.cd-field input.mono, .cd-field select.mono{font-family:'JetBrains Mono',monospace; font-weight:700;}
.cd-field input.amber{background:#FFFBEB; border-color:#FCD34D; text-align:center;}
.cd-grid2{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.cd-ancillary-box{background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px; margin-bottom:10px;}
.cd-ancillary-box .cd-tag{font-weight:700; color:#312E81; text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:6px;}
.cd-tranche-box{background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:10px;}
.cd-tranche-box .cd-tag{font-weight:700; color:#78350F; text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:6px;}

.cd-right-col{display:flex; flex-direction:column; gap:16px;}
.cd-ledger-tag{font-size:10px; background:#450A0A; color:#F87171; border:1px solid #7F1D1D; font-weight:700; padding:2px 8px; border-radius:20px; font-family:monospace;}
.cd-ledger-body{padding:16px;}
.cd-top-row{display:grid; grid-template-columns:1fr 1fr; gap:14px; border-bottom:1px solid #E2E8F0; padding-bottom:12px; margin-bottom:14px;}
.cd-top-row .lbl{font-size:9px; color:#94A3B8; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; display:block; margin-bottom:3px;}
.cd-top-row .val{font-size:15px; font-weight:900; color:#1E293B; font-family:'JetBrains Mono',monospace;}
.cd-comp-grid{display:grid; grid-template-columns:repeat(5,1fr); gap:6px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px; font-size:10px; text-align:center; margin-bottom:14px;}
.cd-comp-cell.fs{background:#ECFDF5; border:1px solid #A7F3D0; border-radius:6px; padding:5px;}
.cd-comp-cell .t{font-weight:700; color:#94A3B8; display:block;}
.cd-comp-cell.fs .t{color:#065F46;}
.cd-comp-cell .v{font-weight:800; color:#4338CA; display:block; margin-top:3px; font-family:'JetBrains Mono',monospace;}
.cd-comp-cell.fs .v{color:#059669;}
.cd-total-row{background:#0F172A; color:#fff; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;}
.cd-total-row .t{font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#CBD5E1;}
.cd-total-row .v{font-size:14px; font-weight:900; color:#34D399; font-family:'JetBrains Mono',monospace;}

.cd-summary{background:linear-gradient(135deg,#0F172A,#1E293B); color:#fff; border-radius:12px; padding:20px;}
.cd-summary-head{border-bottom:1px solid #1E293B; padding-bottom:10px; margin-bottom:14px;}
.cd-summary-head h3{font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.02em; color:#E2E8F0; margin:0;}
.cd-summary-head p{font-size:9px; color:#64748B; margin-top:2px;}
.cd-target-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;}
.cd-target-box{padding:14px; border-radius:10px;}
.cd-target-box.inr{background:rgba(6,78,59,0.3); border:1px solid rgba(6,95,70,0.4);}
.cd-target-box.usd{background:rgba(15,23,42,0.8); border:1px solid #1E293B;}
.cd-target-box .t{font-size:9px; font-weight:700; color:#6EE7B7; text-transform:uppercase; letter-spacing:0.03em; display:block; margin-bottom:4px;}
.cd-target-box.usd .t{color:#94A3B8;}
.cd-target-box .v{font-size:19px; font-weight:900; font-family:'JetBrains Mono',monospace; color:#34D399;}
.cd-target-box.usd .v{color:#FBBF24;}
.cd-audit-box{background:#0F172A; padding:10px; border-radius:8px; border:1px solid #1E293B; font-size:10px;}
.cd-audit-box .lbl{color:#64748B; font-weight:700; text-transform:uppercase; font-size:8px; letter-spacing:0.03em; display:block; margin-bottom:4px;}
.cd-audit-box .val{color:#34D399; font-weight:700; font-family:monospace; word-break:break-all;}

.cd-apply-row{display:flex; gap:10px; padding:16px 20px; background:#fff; border-top:1px solid #E2E8F0; position:sticky; bottom:0;}
.cd-btn{flex:1; border-radius:8px; padding:11px; font-weight:700; font-size:13px; cursor:pointer; border:1px solid #CBD5E1; background:#fff; color:#334155;}
.cd-btn.apply{background:#127A57; border-color:#127A57; color:#fff;}
.cd-btn.apply:hover{background:#0E6347;}

@media (max-width:720px){ .read-grid{grid-template-columns:1fr 1fr;} .form-grid, .form-grid.cols-3{grid-template-columns:1fr;} }
`}</style>
);
