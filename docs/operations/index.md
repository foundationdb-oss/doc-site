---
title: Operations
description: Operating FoundationDB in production
---

# Operations

Guides for operating FoundationDB in production environments.

<div class="grid cards" markdown>

-   :material-cog:{ .lg .middle } **Configuration**

    ---

    Configure clusters for your workload.

    [:octicons-arrow-right-24: Configuration](configuration.md)

-   :material-chart-line:{ .lg .middle } **Monitoring**

    ---

    Monitor cluster health and performance.

    [:octicons-arrow-right-24: Monitoring](monitoring.md)

-   :material-backup-restore:{ .lg .middle } **Backup & Recovery**

    ---

    Protect your data with backups and point-in-time recovery.

    [:octicons-arrow-right-24: Backup & Recovery](backup.md)

-   :material-bug:{ .lg .middle } **Troubleshooting**

    ---

    Diagnose and resolve common issues.

    [:octicons-arrow-right-24: Troubleshooting](troubleshooting.md)

{% if fdb_version >= "7.3" %}
-   :material-check-all:{ .lg .middle } **Consistency Check Urgent** <span class="pill-new">NEW IN 7.3</span>

    ---

    Validate data consistency across storage server replicas.

    [:octicons-arrow-right-24: Consistency Check Urgent](consistency-check.md)
{% endif %}

{% if fdb_version >= "7.4" %}
-   :material-database-import:{ .lg .middle } **Bulk Load & Dump** <span class="pill-new">NEW</span>

    ---

    Load and dump large datasets efficiently using SST files.

    [:octicons-arrow-right-24: Bulk Load & Dump](bulk-load.md)

-   :material-lock:{ .lg .middle } **Range Lock** <span class="pill-experimental">EXPERIMENTAL</span>

    ---

    Block write traffic to specific key ranges.

    [:octicons-arrow-right-24: Range Lock](range-lock.md)

-   :material-shield-check:{ .lg .middle } **Audit Storage** <span class="pill-new">NEW</span>

    ---

    Validate data consistency across replicas.

    [:octicons-arrow-right-24: Audit Storage](audit-storage.md)

-   :material-radar:{ .lg .middle } **Consistency Scan** <span class="pill-new">NEW</span>

    ---

    Continuous background consistency verification.

    [:octicons-arrow-right-24: Consistency Scan](consistency-scan.md)

-   :material-restore:{ .lg .middle } **Restore Validation** <span class="pill-new">NEW</span>

    ---

    Verify backup restore integrity.

    [:octicons-arrow-right-24: Restore Validation](restore-validation.md)
{% endif %}

</div>

## Operations Overview

Running FoundationDB in production requires understanding:

- **Cluster topology** - How to size and configure nodes
- **Redundancy modes** - Balancing durability and performance
- **Monitoring** - What metrics to watch
- **Maintenance** - Upgrades, backups, recovery

## Quick Reference

| Task | Guide |
|------|-------|
| Initial cluster setup | [Configuration](configuration.md) |
| Add/remove nodes | [Configuration](configuration.md) |
| Set up alerts | [Monitoring](monitoring.md) |
| Schedule backups | [Backup & Recovery](backup.md) |
| Debug slow queries | [Troubleshooting](troubleshooting.md) |

## Production Checklist

Before going to production, ensure you have:

- [ ] At least 3 coordinator nodes
- [ ] Redundancy mode set appropriately
- [ ] Monitoring and alerting configured
- [ ] Backup schedule in place
- [ ] Runbook for common issues

!!! warning "Production Considerations"
    FoundationDB requires careful capacity planning. See [Configuration](configuration.md) for sizing guidelines.

