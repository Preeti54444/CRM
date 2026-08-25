from app.routers.dashboard import calculate_weighted_pipeline, normalize_pipeline_stage, _collect_converted_deal_lead_ids
from app.services.forecast_query_service import _collect_converted_deal_lead_ids as forecast_collect_converted_deal_lead_ids, _calculate_funding_sathi_revenue_share


def test_normalize_pipeline_stage_handles_common_statuses():
    assert normalize_pipeline_stage("Sanctioned") == "sanctioned"
    assert normalize_pipeline_stage("Proposal Shared") == "proposal"
    assert normalize_pipeline_stage("Closed Lost") == "lost"


def test_calculate_weighted_pipeline_uses_stage_probabilities():
    deals = [
        {"value": 1000000, "stage": "prospecting"},
        {"value": 2000000, "stage": "sanctioned"},
        {"value": 500000, "stage": "disbursed"},
    ]

    result = calculate_weighted_pipeline(deals)

    assert result == 1000000 * 0.1 + 2000000 * 0.9 + 500000 * 1.0


def test_collect_converted_deal_lead_ids_only_counts_lender_login_stage_records():
    records = [
        {"lead_id": 1, "bank_login_date": "2024-01-10", "sanction_date": None, "disbursal_date": None},
        {"lead_id": 2, "bank_login_date": None, "sanction_date": "2024-01-12", "disbursal_date": None},
        {"lead_id": 2, "bank_login_date": None, "sanction_date": None, "disbursal_date": "2024-01-20"},
        {"lead_id": 3, "bank_login_date": None, "sanction_date": None, "disbursal_date": None},
    ]

    result = _collect_converted_deal_lead_ids(records)

    assert result == {1, 2}


def test_forecast_kpi_helpers_use_lender_conversion_revenue_logic():
    records = [
        {"lead_id": 1, "bank_login_date": "2024-01-10", "sanction_date": None, "disbursal_date": None},
        {"lead_id": 2, "bank_login_date": None, "sanction_date": "2024-01-12", "disbursal_date": None},
        {"lead_id": 3, "bank_login_date": None, "sanction_date": None, "disbursal_date": "2024-01-20"},
    ]

    lead_ids = forecast_collect_converted_deal_lead_ids(records)
    assert lead_ids == {1, 2, 3}

    revenue_share = _calculate_funding_sathi_revenue_share([
        {"value": 1000000, "stage": "sanctioned"},
        {"value": 2000000, "stage": "disbursed"},
    ])

    assert revenue_share == 9000.0
