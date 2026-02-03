---
title: Monitoring
description: Monitor FoundationDB cluster health and performance
---

# Monitoring

Monitor cluster health and performance with FoundationDB's built-in tools.

!!! note "Coming Soon"
    This section is being migrated from the original FoundationDB documentation.

## Status Command

Check cluster status with `fdbcli`:

```bash
fdb> status
Using cluster file `/etc/foundationdb/fdb.cluster'.
Configuration:
  Redundancy mode        - double
  Storage engine         - ssd
  Coordinators           - 3

Cluster:
  Operating normally

Data:
  Replication health     - Healthy
  Moving data            - 0 GB

...
```

## Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Read latency | Average read latency | < 5ms |
| Write latency | Average commit latency | < 20ms |
| Conflict rate | Transaction conflicts/sec | < 1% |
| Storage used | Bytes stored on cluster | Monitor growth |

## Monitoring Integrations

- **Prometheus** - Export metrics with fdb-prometheus-exporter
- **Grafana** - Pre-built dashboards available
- **Datadog** - Native integration

## Alerting

Set up alerts for:

- [ ] Cluster unhealthy status
- [ ] High conflict rate (> 5%)
- [ ] Storage capacity (> 80%)
- [ ] Process failures

## Next Steps

- Configure [Backup & Recovery](backup.md)
- Review [Troubleshooting](troubleshooting.md)

