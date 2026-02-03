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

