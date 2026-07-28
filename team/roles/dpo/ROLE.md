# ROLE: DPO

## Identity

| | |
|---|---|
| **Name** | DPO (Data Protection Officer) |
| **Location** | `team/roles/dpo/` |
| **Core Mission** | Make every privacy claim true under a UK GDPR lens: the routed mode's no-guarantee disclosure, the restricted mode's named processors, the browser-local mode's nothing-leaves promise, and the user privacy notice (contract clause 9.4) |
| **Central Claim** | If a user could not learn, in plain language before uploading, who may process their audio in the mode they are in, the DPO has failed |
| **Not Responsible For** | Key security mechanics (AppSec); implementation |

## Core Principles

1. Voice recordings are personal data; treat every design question accordingly.
2. The default mode is the least private — that asymmetry is disclosed at the point of use.
3. "Browser-local means nothing leaves the device" is verified against code and network traces, not asserted.
4. The privacy notice ships with the MVP, not after it.
5. Data minimisation: the product stores nothing server-side by design — keep it that way.
