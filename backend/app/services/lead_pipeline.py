"""Lead pipeline state machine (simple, framework-agnostic).

This module implements a small state machine for the 20-step lead->deal lifecycle.
Use `LeadPipeline` in services or routers to validate and advance lead states.
"""
from typing import Dict, List


STATES: List[str] = [
    "Lead Creation",
    "Lead Qualification",
    "Initial Discussion / Requirement Gathering",
    "Product Exploration",
    "Product Fit Confirmation",
    "Document Collection",
    "Document Verification",
    "Lender Identification & Matching",
    "Login to Lender",
    "Query Resolution / Additional Documents",
    "Credit Assessment",
    "Sanction Approval",
    "Sanction Acceptance",
    "Agreement & Legal Documentation",
    "Disbursement Processing",
    "Loan Disbursed",
    "Revenue Calculation",
    "Forecast Updated",
    "Post-Disbursement Monitoring",
    "Deal Closed Won",
]


# Build linear transitions (each state -> next state)
ALLOWED_TRANSITIONS: Dict[str, List[str]] = {}
for i, s in enumerate(STATES[:-1]):
    ALLOWED_TRANSITIONS[s] = [STATES[i + 1]]
# final state has no outgoing transitions
ALLOWED_TRANSITIONS[STATES[-1]] = []


class InvalidTransition(Exception):
    pass


class LeadPipeline:
    """Simple state container and validator for a lead's pipeline state.

    Usage:
      lp = LeadPipeline(state="Lead Creation")
      lp.advance()  # moves to Lead Qualification
      lp.set_state("Deal Closed Won")  # raises InvalidTransition if not allowed
    """

    def __init__(self, state: str = None):
        self.state = state or STATES[0]

    def can_transition_to(self, to_state: str) -> bool:
        return to_state in ALLOWED_TRANSITIONS.get(self.state, [])

    def next_states(self) -> List[str]:
        return ALLOWED_TRANSITIONS.get(self.state, [])

    def advance(self) -> str:
        """Advance to the single next state. Raises InvalidTransition if none or ambiguous."""
        nexts = self.next_states()
        if len(nexts) != 1:
            raise InvalidTransition(f"Cannot auto-advance from state {self.state!r}")
        self.state = nexts[0]
        return self.state

    def set_state(self, to_state: str) -> str:
        if to_state == self.state:
            return self.state
        if not self.can_transition_to(to_state):
            raise InvalidTransition(f"Invalid transition: {self.state!r} -> {to_state!r}")
        self.state = to_state
        return self.state

    def as_dict(self) -> Dict[str, str]:
        return {"state": self.state}


if __name__ == "__main__":
    # quick smoke demonstration
    lp = LeadPipeline()
    print("start:", lp.state)
    while True:
        try:
            s = lp.advance()
            print("advanced to:", s)
        except InvalidTransition:
            print("no further transitions from:", lp.state)
            break
