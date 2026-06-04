# 5-Year Achievement Report — Andrew Lass

*Period: May 2021 – May 2026 · Teams: MCS Network · IOPS-Network · CEAI Network*

---

## 1. Executive Summary

Over five years on the MCS Network and IOPS-Network teams, Andrew Lass served as the primary subject-matter expert for the SAP Concur AWS DMZ (Demilitarized Zone) perimeter — the security boundary that controls all inbound and outbound traffic across Concur's commercial and federal cloud environments. In that role he progressed from individual contributor to the architect, pipeline owner, and tooling lead for a fleet of FortiGate next-generation firewalls spanning seven AWS regions.

### Headline Metrics

| Metric | Count | Source |
|---|---|---|
| GitHub PRs authored | 795 | Evidence package §2 |
| GitHub PRs reviewed | 836 | Evidence package §2 |
| Concur Jira tickets owned (assignee) | 2,406 | Evidence package §2 |
| Concur Jira tickets opened (reporter) | 961 | Evidence package §2 |
| Confluence pages created | 80 | Evidence package §2 |
| Architecture / SARB design reviews led | 7 | Evidence package §2 |

### Top Achievements

- **DMZ 2.0 — perimeter re-architecture at scale.** Designed and led the multi-region rollout of a Gateway Load Balancer (GLB)–fronted FortiGate firewall architecture that replaced Concur's legacy DMZ perimeter across all commercial environments: Integration, US2, EU2, APJ1, Fabian US, and Fabian EMEA. Passed SARB design review in February 2023; final region cutover completed August 2025.

- **FortiManager centralization with FIPS-validated federal design.** Designed and obtained sign-off from five separate governance boards (SARB, SCORE, CACB, FIPS review, SDLC pen-test) for a centralized FortiManager architecture — including a dedicated design for the CTE-3 FedRAMP environment. Onboarded all seven Concur environments to the new FortiManager in under six months.

- **OpenTofu migration — modern IaC for the firewall fleet.** Onboarded the `opentofu-deployer` repository and authored 108 pull requests to migrate FortiGate cluster deployment from CloudFormation/Ansible to OpenTofu, an open-source Terraform fork enabling declarative, reproducible infrastructure. Completed the first production cutover (Integration, FortiOS 7.4.11) in May 2026; APJ1 rollout is in progress.

- **FortiGate lifecycle ownership.** Primary author of `firewall-pipeline` and `firewall-pipeline-rpl`, the Ansible-based configuration pipelines that manage the entire FortiGate fleet. Executed continuous OS upgrades from FortiOS 6.4 through 7.6 across all environments; owns certificate automation, password rotation, and IMDSv2 compliance.

- **Vulnerability management at scale.** Closed 1,404 vulnerability tickets spanning Tenable, AWS Inspector, CloudCustodian, Orca, FIM, MM, and SIEM findings across all environments — approximately 58% of all assigned Jira work.

- **Internal tooling and AI-assisted automation.** Authored the `mcs-network-skills` Claude Code plugin (11 skills: `vuln-report`, `tech-review`, `team-review`, `aws-fortigate-health`, `create-change-request`, `wiki`, `defuddle`, `clear-handoff`, `for-dummies`, `yarrr`, `explain-logic`), enabling agentic standardization of the team's most common operational workflows. Deployed a FortiManager FortiAI proof-of-concept in May 2026.

- **IPv6 dual-stack enablement.** Implemented IPv6 across both commercial environments (CCPS DMZ VPC, EU2/US2 production VPCs, Integration egress) and the federal CTE-3 environment, totaling 124 tracked Jira tickets.

Andrew progressed from PR contributor in June 2021 to architecture-board owner, multi-region program lead, and platform/tooling engineer by 2025–2026.

---

## 2. Achievement Detail

### 2.1 DMZ 2.0 — Architecture & Multi-Region Cutover

DMZ 2.0 was a full re-architecture of the AWS perimeter across all SAP Concur commercial environments. The legacy DMZ was replaced with a pattern built on AWS Gateway Load Balancer (GLB) — a managed service that transparently routes traffic through a fleet of FortiGate firewalls for inspection. This design decouples load distribution from firewall policy enforcement, supports horizontal autoscaling of the inspection fleet, and eliminates single points of failure in the traffic path. The project addressed both inbound (ingress) and outbound (egress) traffic flows, replacing the older ATM (Application Traffic Management) boundary with a unified, multi-region-consistent architecture.

Andrew led every phase from design through final production cutover. He submitted the foundational architecture review — `ARCH-1299` *Infrastructure — Gateway Load Balancer FortiGate Firewall Design* — which received SARB approval on 2023-02-16. He produced the primary design documentation: *DMZ 2.0 Architecture Project* (Confluence id `3513421551`, created 2023-05-23, revised through v21 on 2023-10-20), *ATM Boundary Network Flows (DMZ 2.0)* (id `3699176102`), and the *SAP Concur — Gateway Load Balancer Project v1.2* specification (id `3518062917`). He built the infrastructure in Integration (`OPI-5800789`) and US2/EU2 (`OPI-5812494`), executed the ingress and egress production cutovers (`OPI-5827446`, `OPI-5827452`), performed the IFM cutover in US2 (`OPI-5834582`), and led a full reimplementation (`OPI-5843746`) that resolved issues discovered post-cutover.

The final phase extended DMZ 2.0 to the Fabian regions. Andrew built the Fabian EMEA infrastructure (`OPI-6024406`) and completed egress cutover there (`OPI-6045628`), then repeated the work in Fabian US (`OPI-6058926`). GitHub PRs `IOPS-NETWORK/aws-buildouts#83` (*Updating DMZ 2.0 Stacks for Canary Deployment*, 2025-06-13) and `#86` (*Fabian DMZ 2.0 Code*, 2025-07-03) track the code changes that accompanied these deployments. The `namespaces/dmz` and `plz/dmz` repositories accumulated 25 and 74 of Andrew's PRs, respectively, over the life of the project.

All 74 DMZ 2.0–tagged Jira tickets are Closed. The architecture is now in production in every commercial Concur environment: Integration, US2, EU2, APJ1, Fabian US, and Fabian EMEA.

**Evidence:**
- Architecture review: [ARCH-1299](https://jira.concur.com/browse/ARCH-1299), [ARCH-1468](https://jira.concur.com/browse/ARCH-1468)
- Build / cutover: [OPI-5800789](https://jira.concur.com/browse/OPI-5800789), [OPI-5812494](https://jira.concur.com/browse/OPI-5812494), [OPI-5827446](https://jira.concur.com/browse/OPI-5827446), [OPI-5827452](https://jira.concur.com/browse/OPI-5827452), [OPI-5834582](https://jira.concur.com/browse/OPI-5834582), [OPI-5843746](https://jira.concur.com/browse/OPI-5843746)
- Fabian rollout: [OPI-6024406](https://jira.concur.com/browse/OPI-6024406), [OPI-6045628](https://jira.concur.com/browse/OPI-6045628), [OPI-6058926](https://jira.concur.com/browse/OPI-6058926)
- GitHub: [aws-buildouts#83](https://github.concur.com/IOPS-NETWORK/aws-buildouts/pull/83), [aws-buildouts#86](https://github.concur.com/IOPS-NETWORK/aws-buildouts/pull/86)
- Confluence: [DMZ 2.0 Architecture Project](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3513421551), [ATM Boundary Network Flows (DMZ 2.0)](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3699176102), [Gateway Load Balancer Project v1.2](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3518062917)

---

### 2.2 FortiManager Centralization & FIPS-Validated Design

Prior to this initiative, each Concur environment managed its FortiGate devices independently. Andrew designed and led the migration to a single, centralized FortiManager — a Fortinet management platform that provides unified policy, firmware, and configuration control across all firewall instances. The most technically demanding aspect was the parallel design of a FIPS (Federal Information Processing Standards) 140-validated variant for the CTE-3 environment, SAP Concur's FedRAMP-authorized federal cloud zone.

The design process required approval from five separate governance bodies. Andrew submitted architecture reviews `ARCH-2261` (*Infrastructure — FortiManager Design*, 2025-02-25), `ARCH-2397` (*FortiManager Design (CTE-3)*, 2025-05-20), `ARCH-2458` and `ARCH-2459` (*Infrastructure — FortiManager Design (CTE-3)*, both 2025-06-06, including the SCORE review). Federal compliance work generated Jira stories `FIPS-785` (*Infrastructure — FortiManager Design (CTE-3)*), `FIPS-790` (*Use FortiOS 7.2/7.4 with pending FIPS validation*), and `FIPS-791` (*FIPS Review*). An SDLC security pen-test was conducted under `PSPMO-769` (*2025_FortiManager_Design_SDLC_PenTest*). All five bodies — SARB, SCORE, CACB, FIPS review board, and SDLC pen-test — approved the design.

Onboarding proceeded region by region, all completing as Closed tickets: Non-Production (`OPI-5960155`), APJ1 (`OPI-5976491`), EU2 (`OPI-5998498`), US2 (`OPI-5998576`), Tools (`OPI-6003587`), Fabian EMEA (`OPI-6003846`), and Fabian US (`OPI-6003847`) — seven environments onboarded. The FortiManager itself was upgraded from 7.2.9 → 7.2.10 (`OPI-5996935`) and 7.2.10 → 7.4.7 (`OPI-6023471`). Andrew documented the onboarding process in the *FortiManager Onboarding Guide* (Confluence id `4997078534`, published 2025-01-27). In May 2026, Andrew deployed a FortiAI proof-of-concept into GS1 via FortiManager (`OPI-6240653`), extending the platform toward AI-assisted threat analysis.

**Evidence:**
- Architecture / SARB reviews: [ARCH-2261](https://jira.concur.com/browse/ARCH-2261), [ARCH-2397](https://jira.concur.com/browse/ARCH-2397), [ARCH-2458](https://jira.concur.com/browse/ARCH-2458), [ARCH-2459](https://jira.concur.com/browse/ARCH-2459)
- FIPS / compliance: [FIPS-785](https://jira.concur.com/browse/FIPS-785), [FIPS-790](https://jira.concur.com/browse/FIPS-790), [FIPS-791](https://jira.concur.com/browse/FIPS-791), [PSPMO-769](https://jira.concur.com/browse/PSPMO-769)
- Onboarding: [OPI-5960155](https://jira.concur.com/browse/OPI-5960155), [OPI-5976491](https://jira.concur.com/browse/OPI-5976491), [OPI-5998498](https://jira.concur.com/browse/OPI-5998498), [OPI-5998576](https://jira.concur.com/browse/OPI-5998576), [OPI-6003587](https://jira.concur.com/browse/OPI-6003587), [OPI-6003846](https://jira.concur.com/browse/OPI-6003846), [OPI-6003847](https://jira.concur.com/browse/OPI-6003847)
- FortiAI PoC: [OPI-6240653](https://jira.concur.com/browse/OPI-6240653)
- Confluence: [FortiManager Onboarding Guide](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=4997078534)

---

### 2.3 OpenTofu Migration

OpenTofu is an open-source fork of HashiCorp Terraform maintained by the Linux Foundation. Andrew identified it as the appropriate IaC (Infrastructure as Code) tool to replace the existing CloudFormation/Ansible approach for FortiGate cluster deployment — enabling declarative, version-controlled, reproducible firewall infrastructure that can be validated and applied through a standard CI/CD pipeline.

Andrew bootstrapped the effort entirely: he onboarded the new `opentofu-deployer` repository into the team's deployment infrastructure via `plz/dmz#93` (*New Repo Onboarding opentofu-deployer*, 2026-02-18) and restructured the broader IaC layout in `IOPS-NETWORK/aws-buildouts#95` (*OpenTofu Restructure*, 2026-02-11). He authored the CI/CD pipeline documentation and implementation (`opentofu-deployer#11` and `#12`) and added the required permission grants (`plz/plz-configure#635`, *Adding tofu perms*, 2026-04-03). In total he authored 108 pull requests in `IOPS-NETWORK/opentofu-deployer` over a three-month span.

Production deployment proceeded through validated stages. Andrew tested OpenTofu cluster deployments in Integration (`OPI-6224541`, Closed), executed canary testing of FortiOS 7.4.11 clusters on both egress (`OPI-6237003`) and ingress (`OPI-6237004`), and completed full cutover (`OPI-6237005`, `OPI-6237006`, both Closed) in May 2026 — marking the first production FortiGate cluster managed entirely through OpenTofu. As of 2026-05-27, the APJ1 environment is next: `OPI-6243023` (*Deploy OpenTofu egress-b/ingress-b FortiGate Clusters — APJ1*) and its sub-tasks are Open and actively in progress.

**Evidence:**
- Repo onboarding: [plz/dmz#93](https://github.concur.com/plz/dmz/pull/93), [aws-buildouts#95](https://github.concur.com/IOPS-NETWORK/aws-buildouts/pull/95)
- Pipeline: [opentofu-deployer#11](https://github.concur.com/IOPS-NETWORK/opentofu-deployer/pull/11), [opentofu-deployer#12](https://github.concur.com/IOPS-NETWORK/opentofu-deployer/pull/12), [plz/plz-configure#635](https://github.concur.com/plz/plz-configure/pull/635)
- Production cutover: [OPI-6224541](https://jira.concur.com/browse/OPI-6224541), [OPI-6237003](https://jira.concur.com/browse/OPI-6237003), [OPI-6237004](https://jira.concur.com/browse/OPI-6237004), [OPI-6237005](https://jira.concur.com/browse/OPI-6237005), [OPI-6237006](https://jira.concur.com/browse/OPI-6237006)
- In-flight APJ1: [OPI-6243023](https://jira.concur.com/browse/OPI-6243023) (Open)

---

### 2.4 FortiGate Lifecycle Engineering & Automation

FortiGate is Fortinet's next-generation firewall platform. Andrew is the primary owner of the tooling, pipelines, and operational processes that keep the Concur FortiGate fleet up to date, compliant, and automated. The scope is substantial: 755 Jira tickets mention FortiGate; Andrew authored 111 pull requests in `IOPS-NETWORK/firewall-pipeline` and 97 in `IOPS-NETWORK/firewall-pipeline-rpl`, and reviewed 369 and 260 PRs in those repositories, respectively.

`firewall-pipeline` is the Ansible-based automation pipeline that manages FortiGate configuration changes across all environments. Andrew established codeownership of the repository in June 2021 (`firewall-pipeline#475`). His continuous OS upgrade cadence documents the fleet's evolution: FortiOS 7.2.8 (`OPI-5849940`, 2024-03), upgrades through 7.2.9, 7.2.10 (`OPI-5996935`), 7.2.11, the 7.4 series (7.4.8 → 7.4.10 via `OPI-6189638`, 7.4.10 → 7.4.11 via `OPI-6194634`), and FortiOS 7.6 cutover in Integration (`OPI-6229010`, 2026-04) — spanning five major minor versions over two years of sustained operations. All listed upgrade tickets are Closed.

Certificate lifecycle management is handled through `IOPS-NETWORK/fortigate-certificate-monitor` (18 PRs from 2023-02 onward), with documentation in *Fortigate Local User Password Rotation* (Confluence id `4316919805`) and *Proxy inspection certificate* (id `4224811633`). In May 2026, Andrew was prototyping automated certificate rotation for Integration FortiGates (`OPI-6236058`). He also completed IMDSv2 (Instance Metadata Service v2) migration — a required security hardening — on CTE-3 FortiGate EC2 instances (`OPI-6015395`, 2025-06), a prerequisite for continued FedRAMP authorization.

**Evidence:**
- Config pipeline PRs: [firewall-pipeline](https://github.concur.com/IOPS-NETWORK/firewall-pipeline) (111 authored, 369 reviewed), [firewall-pipeline-rpl](https://github.concur.com/IOPS-NETWORK/firewall-pipeline-rpl) (97 authored, 260 reviewed)
- Certificate monitor: [fortigate-certificate-monitor](https://github.concur.com/IOPS-NETWORK/fortigate-certificate-monitor)
- OS upgrades: [OPI-5849940](https://jira.concur.com/browse/OPI-5849940), [OPI-5996935](https://jira.concur.com/browse/OPI-5996935), [OPI-6189638](https://jira.concur.com/browse/OPI-6189638), [OPI-6194634](https://jira.concur.com/browse/OPI-6194634), [OPI-6229010](https://jira.concur.com/browse/OPI-6229010)
- Compliance: [OPI-6015395](https://jira.concur.com/browse/OPI-6015395), [OPI-6236058](https://jira.concur.com/browse/OPI-6236058)
- Confluence: [Fortigate Local User Password Rotation](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=4316919805), [Proxy inspection certificate](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=4224811633)

---

### 2.5 AWS Network Firewall (ANF) Design & Operations

AWS Network Firewall (ANF) is a managed stateful firewall service that Andrew deployed and operates as a complementary control to the FortiGate perimeter — primarily for east-west (VPC-to-VPC) traffic inspection and for environments where FortiGate-based inspection is not the primary control. Andrew served as the designer of the ANF architecture for Concur and produced the primary design documentation.

In April 2023 Andrew created *AWS Network Firewall Design* (Confluence id `3443011521`) and facilitated a formal design session series (Confluence ids `3460743167` *ANF Design Sessions*, `3460743170` *20230425 — ANF Design Session*, `3460750881` *20230427 — ANF Design Session*). These sessions defined rule layering strategy, account structure, and the relationship between ANF rule groups and the FortiGate policy model. Operationally, Andrew authored 21 pull requests in `IOPS-NETWORK/aws-nfw-pipeline` (25 reviewed) and tracked 63 Jira tickets referencing AWS Network Firewall. Recent work includes `OPI-6196322` (*Apply Updated ANF Template to GS Integration ANF*, 2026-02), `OPI-6232646` (*Decommission "Original" EU2/EU1 ANF Infra — Global Home Transit*, 2026-04), and the IPv6-integrated reimplementation `OPI-5993091` (*CTE-3 Egress FortiGate IPv6 Reimplementation*, 2025-04).

**Evidence:**
- Confluence design docs: [AWS Network Firewall Design](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3443011521), [ANF Design Sessions](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3460743167), [20230425 Session](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3460743170), [20230427 Session](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3460750881)
- GitHub: [aws-nfw-pipeline](https://github.concur.com/IOPS-NETWORK/aws-nfw-pipeline) (21 authored PRs)
- Jira: [OPI-6196322](https://jira.concur.com/browse/OPI-6196322), [OPI-6232646](https://jira.concur.com/browse/OPI-6232646), [OPI-5993091](https://jira.concur.com/browse/OPI-5993091)

---

### 2.6 IPv6 Enablement Across Commercial & Federal Environments

SAP Concur's AWS environments were originally built IPv4-only. Andrew led the phased enablement of IPv6 (dual-stack) across both commercial and federal environments, a prerequisite for continued compliance with federal mandates and for future network efficiency. A total of 124 Jira tickets track this work.

In the commercial environments, Andrew enabled IPv6 in the CCPS DMZ VPC (`CLZ-20385`, 2024-08-14), extended it to Commercial Production VPCs (`CLZ-28345`, 2025-05-27), and implemented egress IPv6 in Integration (`OPI-6008885`, 2025-05). In May 2026 he updated FortiGate IPv6 address objects to align with Phase A/B NLB addresses for IFM (`OPI-6241474`). The federal implementation was more complex: `OPI-5933531` (*CTE-3 IPv6 FortiGate Implementation*, 2024-10) introduced dual-stack to the FedRAMP CTE-3 environment, followed by IPv6-enabled GBaaS (Global Block-list-as-a-Service) threat feeds in CTE-3 (`OPI-5939176`). When the initial implementation required revision, Andrew executed a full *CTE-3 Egress FortiGate IPv6 Reimplementation* (`OPI-5993091`, 2025-04), delivering a corrected, production-grade dual-stack configuration.

**Evidence:**
- Commercial: [CLZ-20385](https://jira.concur.com/browse/CLZ-20385), [CLZ-28345](https://jira.concur.com/browse/CLZ-28345), [OPI-6008885](https://jira.concur.com/browse/OPI-6008885), [OPI-6241474](https://jira.concur.com/browse/OPI-6241474)
- Federal (CTE-3): [OPI-5933531](https://jira.concur.com/browse/OPI-5933531), [OPI-5939176](https://jira.concur.com/browse/OPI-5939176), [OPI-5993091](https://jira.concur.com/browse/OPI-5993091)

---

### 2.7 Vulnerability Management at Scale

Andrew closed 1,404 vulnerability tickets across the five-year period — approximately 58% of all Jira tickets assigned to him. These span every Concur environment and every major scanning tool the organization uses. Vulnerability remediation is not incidental work: for a firewall and network engineer, every finding represents either a misconfigured security control or an out-of-date software component that, if left unaddressed, creates audit findings and potentially exploitable exposure. Maintaining this volume while simultaneously delivering the architectural projects documented elsewhere reflects sustained operational discipline alongside project delivery.

The breakdown by scanner / environment label (from the OPI Jira project, assignee tickets):

| Scanner / Environment | Count |
|---|---|
| Vuln_Integration | 363 |
| CloudCustodian (AWS Config) | 352 |
| Inspector (AWS) | 327 |
| Vuln_CTE-3 (FedRAMP) | 284 |
| Tenable | 218 |
| tenable_sc | 216 |
| Vuln_US2 | 150 |
| Vuln_EU2 | 141 |
| FIM_Finding | 138 |
| MM_Finding | 123 |
| Vuln_FabianUS | 112 |
| Vuln_FabianEMEA | 83 |
| tenable_io | 80 |
| SIEM_Finding | 58 |

To reduce manual overhead, Andrew authored the `vuln-report` family of Claude Code skills (see §2.8) to automate the audit of outstanding vulnerability tickets and BREW waiver status across the team.

---

### 2.8 Internal Tooling, Skills, and Platform Contributions

Andrew is the author of `mcs-network-skills`, a Claude Code plugin distributed to the IOPS-Network team that provides standardized agentic automation for the team's most common operational tasks. The plugin contains 11 skills:

- `vuln-report` / `vuln-report-lite` / `vuln-report-all` / `vuln-report-all-lite` — audit IOPS-Network vulnerability tickets and BREW waivers
- `tech-review` — multi-agent technical review of infrastructure changes
- `team-review` — dispatch parallel specialized subagents to review work
- `aws-fortigate-health` — comprehensive health check on FortiGate EC2 Auto Scaling groups
- `create-change-request` — draft and submit SAP Concur OPI change-request tickets
- `wiki` — search and read the SAP internal Confluence wiki
- `defuddle` — extract clean content from web pages
- `clear-handoff` — generate full-context handoff summaries before session transitions
- `for-dummies` — explain technical content in plain English
- `yarrr` / `explain-logic` — code and logic explanation utilities

These skills directly encode five years of operational knowledge into reusable automation, allowing other team members to perform tasks — FortiGate health checks, vulnerability audits, change-request drafting — that previously required Andrew's direct involvement.

Beyond the skills plugin, Andrew owns or is majority contributor to nine active IOPS-Network repositories: `fortigate-certificate-monitor` (18 PRs), `concur-ip-range-publisher` (5 PRs), `jenkins-iam-cred-rotator`, `gbaas-automation`, `gami-factory-dmz` (18 PRs), `aws-dmz-services`, `opentofu-deployer` (108 PRs), `aws-dmz-maintenance` (101 PRs), and `claude-skills`. As an issue author, he drove quality improvements proactively: `aws-dmz-config#23` (*Add a drift detection override option to the manifest*, 2024-05) and `aws-dmz-config#24` (*Add cfn-lint, a yaml and a json validator to the build phase*, 2024-05) demonstrate leadership in build-time code quality before changes reach production.

**Evidence:**
- GitHub: [claude-skills#3](https://github.concur.com/IOPS-NETWORK/claude-skills/pull/3), [aws-dmz-config#23](https://github.concur.com/IOPS-NETWORK/aws-dmz-config/issues/23), [aws-dmz-config#24](https://github.concur.com/IOPS-NETWORK/aws-dmz-config/issues/24)
- Repos: [fortigate-certificate-monitor](https://github.concur.com/IOPS-NETWORK/fortigate-certificate-monitor), [aws-dmz-maintenance](https://github.concur.com/IOPS-NETWORK/aws-dmz-maintenance), [opentofu-deployer](https://github.concur.com/IOPS-NETWORK/opentofu-deployer), [gami-factory-dmz](https://github.concur.com/IOPS-NETWORK/gami-factory-dmz)

---

### 2.9 Other Notable Programs

| Initiative | Andrew's Role / Scope | Headline Metric | Sample Evidence |
|---|---|---|---|
| **GBaaS** (Global Block-list-as-a-Service — automated threat-feed injection into FortiGate) | Implementer, change owner | 42 tickets | [OPI-5939176](https://jira.concur.com/browse/OPI-5939176); Confluence: [KB Network GBaaS](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3649229046) |
| **GAMI / gami-factory-dmz** (golden AMI factory for DMZ servers) | Primary repo contributor | 36 tickets / 18 PRs | [gami-factory-dmz](https://github.concur.com/IOPS-NETWORK/gami-factory-dmz) |
| **Customer Disconnect Service (CDS / CDSFTP)** (DMZ deployment for customer data-deletion service) | Deployer, multi-region change owner | 18 tickets | [OPI-5955798](https://jira.concur.com/browse/OPI-5955798), [OPI-5955799](https://jira.concur.com/browse/OPI-5955799), [OPI-6007933](https://jira.concur.com/browse/OPI-6007933) |
| **Transparent Proxy — Frontend Services VPC** (routing frontend VPC egress through the inspection fleet) | Implementer | 25 tickets | [OPI-5951748](https://jira.concur.com/browse/OPI-5951748), [OPI-5951749](https://jira.concur.com/browse/OPI-5951749), [OPI-5951751](https://jira.concur.com/browse/OPI-5951751) |
| **DLP (Data Loss Prevention) policy deployment** | Change owner, deployer | 38 tickets | [OPI-5918317](https://jira.concur.com/browse/OPI-5918317) |
| **Akamai origin/edge integration** (managing FortiGate policies for Akamai-fronted properties) | Ongoing operator | 307 tickets | Multiple OPI CRs across all environments |
| **Dynatrace proxy enablement** (creating FortiGate proxy policies for Dynatrace APM agents) | Deployer across all regions | 117 tickets; Confluence authored | [OPI-5975693](https://jira.concur.com/browse/OPI-5975693); [Dynatrace Monitoring](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=5430063836) |
| **Cribl log routing** (FortiGate egress policy for Cribl pipeline) | Change owner | 15 tickets | [OPI-5919399](https://jira.concur.com/browse/OPI-5919399) |
| **Compleat AWS migration** (migrating Compleat traffic from legacy to AWS Integration) | Deployer | 31 tickets | [OPI-5810390](https://jira.concur.com/browse/OPI-5810390) |
| **BREW waivers** (exception/waiver management for compliance findings) | Primary OPI submitter | 60 tickets | OPI project |
| **HSPD-12 compliance** (Homeland Security Presidential Directive 12 — federal smart-card authentication) | Implementer (no Jira keyword hits; 5 PRs) | 5 PRs | [firewall-pipeline-rpl#146](https://github.concur.com/IOPS-NETWORK/firewall-pipeline-rpl/pull/146), [#148](https://github.concur.com/IOPS-NETWORK/firewall-pipeline-rpl/pull/148) |
| **Drift detection** (CloudFormation stack drift remediation) | Remediator; tooling author | 36 tickets | [aws-dmz-config#23](https://github.concur.com/IOPS-NETWORK/aws-dmz-config/issues/23) |
| **Route 53 / DNS** (DNS failover from OpenDNS to Cloudflare; DNS onboarding) | Author / change owner | 11 PRs in `dns/DNSOnboardingNew` | Confluence: [Route53 Failover from OpenDNS to Cloudflare](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=5804333939) |

---

## 3. Technology Breadth

#### Networking & Security
- FortiGate (FortiOS 6.4 → 7.6), FortiManager (7.2 → 7.4), FortiAI, FortiAnalyzer
- AWS Network Firewall (ANF), AWS Gateway Load Balancer (GLB), AWS NLB / ALB / ELB
- AWS Transit Gateway (TGW + route domains), AWS Direct Connect
- IPSec VPN, IPv4/IPv6 dual-stack
- DNS (Route 53, OpenDNS, Cloudflare, DoH inbound resolver endpoints)
- DLP, GBaaS threat feeds
- Certificate management (ACM, manual rotation, Fabian US PKI Root)
- Akamai (origin/edge configuration), Cribl, SIEM
- Tenable.sc / Tenable.io, AWS Inspector, Cloud Custodian, Orca
- Transparent proxy, FIPS 140-2/140-3 compliance, HSPD-12

#### Cloud & Compute
- AWS (EC2, Auto Scaling Groups, IAM, VPC, VPC Endpoints, S3, KMS, IMDSv2)
- CloudFormation (CFN), AWS Config
- AWS 2.0 / 3.0 reference architecture, multi-account architecture
- Multi-region: US2, EU2, APJ1, Fabian US, Fabian EMEA, CTE-3 (FedRAMP), GS1

#### Infrastructure as Code & Automation
- **OpenTofu** (primary IaC tool, 2026), CloudFormation
- Ansible (`firewall-pipeline`, `device-config-pipeline`), Python (pipeline scripts and tooling)
- Jenkins, GitHub Actions / GitHub workflows, Bash/zsh
- cfn-lint, yamllint, JSON validation, CloudFormation drift detection

#### CI/CD, DevOps, Pipelines
- GitHub on `github.concur.com`, `firewall-pipeline`, `firewall-pipeline-rpl`, `firewall-globalhome-pipeline`, `aws-net-pipeline`, `aws-nfw-pipeline`, `device-config-pipeline`, `aws-dmz-maintenance`, `opentofu-deployer`
- `plz` (permissions/policy management), HashiCorp Vault (`vault.service.cnqr.tech`, `dmz/travel-tpws-vpn` namespace admin)

#### AI / Tooling
- Claude Code skills authoring — 11 custom skills in `mcs-network-skills` plugin: `vuln-report`, `tech-review`, `team-review`, `aws-fortigate-health`, `create-change-request`, `wiki`, and more
- FortiAI PoC deployment into GS1 (2026-05)

#### Compliance & Governance
- SARB / SCORE / CACB approval workflows
- FIPS 140-2/140-3 design reviews, FedRAMP (CTE-3) deployments
- STIG / CAS finding remediation, SDLC pen-test (PSPMO)
- BREW waiver process, technical review board (TRB) processes

---

## 4. Career Timeline (2021–2026)

| Date | Milestone | Source |
|---|---|---|
| 2021-06 | First merged PR — `IOPS-NETWORK/aws-buildouts#1` *Added new EC2 Autoscale actions to US2 only* | GitHub |
| 2021-06-17 | Established as codeowner on `firewall-pipeline` (`#475`) | GitHub |
| 2021-11 | LDAP / Nexpose scanning automation in Fabian environments | [SECINF-583](https://jira.concur.com/browse/SECINF-583), [SECINF-587](https://jira.concur.com/browse/SECINF-587), [SECINF-595](https://jira.concur.com/browse/SECINF-595) |
| 2022-04 | First architecture review submission — `ARCH-947` Quay NLB → VPCE Service | [ARCH-947](https://jira.concur.com/browse/ARCH-947) |
| 2023-02-16 | DMZ 2.0 / GLB FortiGate firewall design **approved** at SARB | [ARCH-1299](https://jira.concur.com/browse/ARCH-1299) |
| 2023-04 | AWS Network Firewall design and design sessions | Confluence: [3443011521](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3443011521), [3460743167](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3460743167) |
| 2023-05-23 | DMZ 2.0 Architecture Project Confluence page created | [Confluence id 3513421551](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=3513421551) |
| 2023-10 | DMZ 2.0 Ingress Cutover — Integration | [OPI-5789576](https://jira.concur.com/browse/OPI-5789576) |
| 2024-01–02 | DMZ 2.0 production rollout in US2 + EU2 | [OPI-5812494](https://jira.concur.com/browse/OPI-5812494), [OPI-5827446](https://jira.concur.com/browse/OPI-5827446), [OPI-5827452](https://jira.concur.com/browse/OPI-5827452) |
| 2024-03–2024-10 | Continuous FortiGate OS upgrades 7.2.x line | [OPI-5849940](https://jira.concur.com/browse/OPI-5849940) series |
| 2024-08 | IPv6 enablement begins — CCPS DMZ VPC | [CLZ-20385](https://jira.concur.com/browse/CLZ-20385) |
| 2024-10 | CTE-3 IPv6 FortiGate implementation; CTE-3 Internal VPN Tunnel | [OPI-5933531](https://jira.concur.com/browse/OPI-5933531), [OPI-5940648](https://jira.concur.com/browse/OPI-5940648) |
| 2024-11 | Frontend Services VPC Transparent Proxy — APJ1, EU2, US2 | [OPI-5951748](https://jira.concur.com/browse/OPI-5951748) series |
| 2024-12 | Customer Disconnect Service in DMZ (Integration & EU2); Non-Prod FortiManager onboarding | [OPI-5955798](https://jira.concur.com/browse/OPI-5955798), [OPI-5960155](https://jira.concur.com/browse/OPI-5960155) |
| 2025-01-27 | FortiManager Onboarding Guide published | [Confluence id 4997078534](https://wiki.one.int.sap/wiki/pages/viewpage.action?pageId=4997078534) |
| 2025-02–05 | FortiManager onboarded across all 7 environments | [OPI-5976491](https://jira.concur.com/browse/OPI-5976491) and related |
| 2025-04 | CTE-3 Egress FortiGate IPv6 Reimplementation | [OPI-5993091](https://jira.concur.com/browse/OPI-5993091) |
| 2025-05-20 | FortiManager (CTE-3) design review — SARB + FIPS | [ARCH-2397](https://jira.concur.com/browse/ARCH-2397), [FIPS-785](https://jira.concur.com/browse/FIPS-785) |
| 2025-06–08 | DMZ 2.0 fully extended to Fabian EMEA and Fabian US | [OPI-6024406](https://jira.concur.com/browse/OPI-6024406), [OPI-6045628](https://jira.concur.com/browse/OPI-6045628), [OPI-6058926](https://jira.concur.com/browse/OPI-6058926) |
| 2025-06-06 | SCORE Review of MCS Network FortiManager Design (CTE-3) — approved | [ARCH-2459](https://jira.concur.com/browse/ARCH-2459), [PSS-326](https://jira.concur.com/browse/PSS-326), [SCORE-65](https://jira.concur.com/browse/SCORE-65) |
| 2026-02-11 | OpenTofu Restructure begins | [aws-buildouts#95](https://github.concur.com/IOPS-NETWORK/aws-buildouts/pull/95) |
| 2026-02-18 | `opentofu-deployer` repository onboarded | [plz/dmz#93](https://github.concur.com/plz/dmz/pull/93) |
| 2026-03–04 | OpenTofu RPL CI/CD implementation; permissions, fmt, validation | [opentofu-deployer#4–#12](https://github.concur.com/IOPS-NETWORK/opentofu-deployer), [plz/plz-configure#635](https://github.concur.com/plz/plz-configure/pull/635) |
| 2026-04-15 | FortiOS 7.6 Cutover — Integration (Ingress + Egress) | [OPI-6229008](https://jira.concur.com/browse/OPI-6229008), [OPI-6229010](https://jira.concur.com/browse/OPI-6229010) |
| 2026-05-06 | Authors and updates internal Claude Code skills | [IOPS-NETWORK/claude-skills#3](https://github.concur.com/IOPS-NETWORK/claude-skills/pull/3) |
| 2026-05-08 | First production OpenTofu-managed FortiGate cluster cutover — Integration, FortiOS 7.4.11 | [OPI-6237005](https://jira.concur.com/browse/OPI-6237005), [OPI-6237006](https://jira.concur.com/browse/OPI-6237006) |
| 2026-05-18 | FortiManager FortiAI PoC deployed into GS1 | [OPI-6240653](https://jira.concur.com/browse/OPI-6240653) |
| 2026-05-27 | OpenTofu rollout begins in APJ1 | [OPI-6243023](https://jira.concur.com/browse/OPI-6243023) (Open) |

Andrew's five-year arc follows a clear progression: in 2021 he joined as a PR contributor, establishing himself as a firewall pipeline author and codeowner. By 2023 he was submitting architecture designs through SARB and leading the foundational DMZ 2.0 and ANF design work. Through 2024 he became the multi-region program owner, executing production cutovers across US2, EU2, and APJ1 while simultaneously taking on the IPv6 and FedRAMP workstreams. In 2025 he navigated the most governance-intensive work of his tenure — the FortiManager CTE-3 design, which required approval from five separate review boards — and completed the final DMZ 2.0 Fabian region extensions. In 2026 he emerged as a platform engineer, driving the OpenTofu migration, deploying a FortiAI proof-of-concept, and encoding five years of operational knowledge into reusable AI-assisted tooling.

---

## 5. Sources & Evidence

All quantitative claims in this report are sourced from `docs/superpowers/evidence/2026-05-28-evidence-package.md` (compiled 2026-05-28).

**Systems searched:** GitHub `IOPS-NETWORK` org on `github.concur.com` (795 PRs authored, 836 reviewed, 31 repos); Concur Jira (`jira.concur.com`) projects `OPI`, `ARCH`, `CLZ`, `FIPS`, `PSPMO`, `SCORE`, `PSS`, `SECINF`, `NETENG`, `CAS`, `ConcurEngUtils`; Confluence (`wiki.one.int.sap`) spaces `CONIOPS`, `ISBNClOps`.

**SAP Jira (`jira.tools.sap`) totals are not included** due to API rate limiting at the time of compilation; pending separate enumeration.
