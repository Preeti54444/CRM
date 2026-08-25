/*
 * Funding Sathi — Shared Revenue Engine
 * ------------------------------------
 * Single source of truth for computing Funding Sathi revenue on every deal.
 * Consumed by the Deal Processing Console (crm1.html) and the Revenue
 * Forecast dashboard (forecast.html). Never duplicate this math elsewhere.
 *
 * All values below are Funding Sathi Revenue only — NOT loan amount, NOT
 * lender revenue, NOT customer revenue.
 */
(function (root) {
  "use strict";

  var PIPELINE_STAGE_WEIGHTS = {
    "New Lead": 0.05,
    "Qualified Lead": 0.10,
    "Product Exploration": 0.20,
    "Mandate Signed": 0.35,
    "Lender Selected": 0.45,
    "Logged In To Lender": 0.55,
    "Documentation": 0.65,
    "Credit Evaluation": 0.75,
    "PD Completed": 0.85,
    "Sanctioned": 0.90,
    "Compliance": 0.95,
    "Disbursed": 1.00,
    "Active Customer": 1.00,
  };
  var PIPELINE_STAGES = Object.keys(PIPELINE_STAGE_WEIGHTS);

  var DEFAULT_EXCHANGE_RATE = 96.29; // 1 USD = INR — override per deal or globally

  function num(v) {
    if (v === null || v === undefined || v === "") return 0;
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * computeDealRevenue(deal)
   * -----------------------
   * The ONLY revenue engine used across the CRM.
   * Input fields (all optional, safe defaults):
   *   sanctionAmount, disbursementAmount, pipelineStage, assignedLender,
   *   platformFeePct, advisoryFeePct, successFeePct, legalFeePct,
   *   lenderPfPct, fsSharePct, trancheAmount, trancheRoutingType,
   *   vertical, exchangeRate
   * Returns a rich object with per-line-item revenue + weighted totals.
   */
  function computeDealRevenue(deal) {
    deal = deal || {};

    var sanctionAmount = num(deal.sanctionAmount);
    var stage = deal.pipelineStage || "Mandate Signed";
    var stageWeight = PIPELINE_STAGE_WEIGHTS[stage] != null ? PIPELINE_STAGE_WEIGHTS[stage] : 1;

    var platformFeePct = num(deal.platformFeePct);
    var advisoryFeePct = num(deal.advisoryFeePct);
    var successFeePct = num(deal.successFeePct);
    var legalFeePct = num(deal.legalFeePct);

    var fsSharePct = num(deal.fsSharePct);
    var lenderPfPct = num(deal.lenderPfPct);

    var trancheAmount = num(deal.trancheAmount);
    var trancheRoutingType = deal.trancheRoutingType || "NONE";

    var exchangeRate = num(deal.exchangeRate) || DEFAULT_EXCHANGE_RATE;
    var vertical = deal.vertical || "Supply Chain Finance";

    // Core FS-side revenue lines (all as % of sanction limit)
    var fsPfRevenue = sanctionAmount * (fsSharePct / 100);
    var platformRevenue = sanctionAmount * (platformFeePct / 100);
    var advisoryRevenue = sanctionAmount * (advisoryFeePct / 100);
    var successRevenue = sanctionAmount * (successFeePct / 100);
    var legalRevenue = sanctionAmount * (legalFeePct / 100);

    // Tranche routing
    var trancheRevenue = 0;
    if (vertical !== "Private Credit") {
      if (trancheRoutingType === "MANDATE") {
        trancheRevenue = trancheAmount; // Option A: 100% to FS
      } else if (trancheRoutingType === "LENDER") {
        trancheRevenue = trancheAmount * (fsSharePct / 100); // Option B: shared
      }
      // Option C ("NONE") = 0
    }

    var grossRevenue =
      fsPfRevenue +
      platformRevenue +
      advisoryRevenue +
      successRevenue +
      legalRevenue +
      trancheRevenue;

    var weightedRevenue = grossRevenue * stageWeight;
    var usdRevenue = weightedRevenue / exchangeRate;

    // Also expose lender-pool figure for auditing (not FS revenue)
    var lenderTotalPool = sanctionAmount * (lenderPfPct / 100);

    return {
      // Inputs snapshot
      sanctionAmount: sanctionAmount,
      pipelineStage: stage,
      stageWeight: stageWeight,
      exchangeRate: exchangeRate,
      vertical: vertical,
      assignedLender: deal.assignedLender || "",

      // Line items (INR)
      fsPfRevenue: fsPfRevenue,
      platformRevenue: platformRevenue,
      advisoryRevenue: advisoryRevenue,
      successRevenue: successRevenue,
      legalRevenue: legalRevenue,
      trancheRevenue: trancheRevenue,
      lenderTotalPool: lenderTotalPool,

      // Totals
      grossRevenue: grossRevenue,
      weightedRevenue: weightedRevenue,
      usdRevenue: usdRevenue,
    };
  }

  /**
   * Build the flat storage payload that lives on the Deal record and the
   * Forecast page reads back. Never recalculate on Forecast — read these.
   */
  function buildDealRevenueSnapshot(deal) {
    var r = computeDealRevenue(deal);
    return {
      pipelineStage: r.pipelineStage,
      assignedLender: r.assignedLender,
      sanctionAmount: r.sanctionAmount,
      grossRevenue: round2(r.grossRevenue),
      weightedRevenue: round2(r.weightedRevenue),
      usdRevenue: round2(r.usdRevenue),
      exchangeRate: r.exchangeRate,
      stageWeight: r.stageWeight,
    };
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatINR(n) {
    return "₹ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatUSD(n) {
    return "$ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  root.FSRevenue = {
    PIPELINE_STAGE_WEIGHTS: PIPELINE_STAGE_WEIGHTS,
    PIPELINE_STAGES: PIPELINE_STAGES,
    DEFAULT_EXCHANGE_RATE: DEFAULT_EXCHANGE_RATE,
    computeDealRevenue: computeDealRevenue,
    buildDealRevenueSnapshot: buildDealRevenueSnapshot,
    formatINR: formatINR,
    formatUSD: formatUSD,
    /**
     * fetchLiveRate() — public Google-like FX (no key). Falls back to default.
     * Caches for 15 min in localStorage so we don't hammer the endpoint.
     */
    fetchLiveRate: function () {
      var CK = "fs_fx_usd_inr";
      var TTL = 15 * 60 * 1000;
      try {
        var cached = JSON.parse(localStorage.getItem(CK) || "null");
        if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.rate);
      } catch (e) {}
      return fetch("https://open.er-api.com/v6/latest/USD")
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var rate = j && j.rates && j.rates.INR;
          if (!rate) throw new Error("no rate");
          try { localStorage.setItem(CK, JSON.stringify({ rate: rate, at: Date.now() })); } catch (e) {}
          return rate;
        })
        .catch(function () { return DEFAULT_EXCHANGE_RATE; });
    },
  };
})(window);
