// FoundationDB Cluster Topology Estimator
// Vanilla JS, no build step. Reads form inputs and renders sizing recommendations.
// Tweak the constants below to recalibrate the model.

(function () {
  'use strict';

  // Per-process throughput baselines (operations per second per fdbserver process).
  var DEFAULTS = {
    perProcReadsSsd: 55000,
    perProcWritesSsd: 20000,
    headroom: 1.5,
    maxDataPerSsGB: 500,
    logsMin: 3,
    logsSoftCap: 15,
    cpPerWriteQps: 50000,
    cpMin: 3,
    grvPerReadQps: 200000,
    grvMin: 1,
    resolverPerWriteQps: 80000,
    resolverMin: 1,
    ramPerProcessGB: 4,
    ramHeadroom: 0.25,
    failureDomains: 3,
    statelessPerMachine: 8
  };

  var REPLICATION = {
    single:           { factor: 1, coords: 1, label: 'single' },
    double:           { factor: 2, coords: 3, label: 'double' },
    triple:           { factor: 3, coords: 5, label: 'triple' },
    three_data_hall:  { factor: 3, coords: 9, label: 'three_data_hall' },
    three_datacenter: { factor: 6, coords: 9, label: 'three_datacenter' }
  };

  // Workload-shape slider positions. Drives the SS:T-log default and the
  // read/write split of the sustainable-workload estimate.
  var SHAPE_PRESETS = [
    { id: 'max-read-throughput', label: 'max-read-throughput', logsRatio: 20, readCredit: 1.0, writeCredit: 0.1 },
    { id: 'balanced',            label: 'balanced 90/10',      logsRatio: 12, readCredit: 0.9, writeCredit: 0.5 },
    { id: 'max-write-throughput',label: 'max-write-throughput',logsRatio: 8,  readCredit: 0.5, writeCredit: 1.0 }
  ];

  function clamp(v, min) {
    var n = parseFloat(v);
    if (!isFinite(n) || n < 0) return min;
    return Math.max(min, n);
  }

  function clampInt(v, min) {
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < min) return min;
    return n;
  }

  function ceil(n) { return Math.ceil(n); }
  function floor(n) { return Math.floor(n); }

  function shapeFor(inp) {
    var idx = clampInt(inp.shape, 0);
    if (idx > SHAPE_PRESETS.length - 1) idx = SHAPE_PRESETS.length - 1;
    return SHAPE_PRESETS[idx];
  }

  function compute(inp) {
    var K = {
      perProcReadsSsd: inp.perProcReadsSsd,
      perProcWritesSsd: inp.perProcWritesSsd,
      headroom: inp.headroom,
      maxDataPerSsGB: inp.maxDataPerSsGB,
      cpPerWriteQps: inp.cpPerWriteQps,
      grvPerReadQps: inp.grvPerReadQps,
      resolverPerWriteQps: inp.resolverPerWriteQps,
      ramPerProcessGB: inp.ramPerProcessGB,
      ramHeadroom: DEFAULTS.ramHeadroom,
      failureDomains: inp.failureDomains
    };

    var rep = REPLICATION[inp.redundancy] || REPLICATION.triple;
    var rf = rep.factor;
    var shape = shapeFor(inp);
    var machines = Math.max(1, clampInt(inp.machines, 1));
    var coresPerMachine = Math.max(1, clampInt(inp.coresPerMachine, 1));
    var dataGB = inp.dataTB * 1024;

    var ss = machines * coresPerMachine;
    var ssCapacityGB = ss * K.maxDataPerSsGB / rf;
    var ssCapacityWarn = (dataGB * rf) > (ss * K.maxDataPerSsGB);
    var dataPerSsGB = ss > 0 ? (dataGB * rf / ss) : 0;
    var dataPerSsWarn = dataPerSsGB > K.maxDataPerSsGB;

    var logsRatio = clamp(inp.logsRatio, 1);
    var logs = Math.max(DEFAULTS.logsMin, ceil(ss / logsRatio));
    var logsWarn = logs > DEFAULTS.logsSoftCap;

    var sustainableReads  = floor(ss * K.perProcReadsSsd  * shape.readCredit  / K.headroom);
    var sustainableWrites = floor(ss * K.perProcWritesSsd * shape.writeCredit / rf / K.headroom);

    var cp  = Math.max(DEFAULTS.cpMin,       ceil(sustainableWrites / K.cpPerWriteQps));
    var grv = Math.max(DEFAULTS.grvMin,      ceil(sustainableReads  / K.grvPerReadQps));
    var res = Math.max(DEFAULTS.resolverMin, ceil(sustainableWrites / K.resolverPerWriteQps));

    var coords = rep.coords;
    var failureDomainsWarn = (inp.redundancy === 'three_data_hall' || inp.redundancy === 'three_datacenter')
      && (K.failureDomains < coords);

    var stateless = cp + grv + res + 4;
    var transactionMachines = logs;
    var statelessMachines = Math.max(1, ceil(stateless / DEFAULTS.statelessPerMachine));
    var totalMachines = machines + transactionMachines + statelessMachines;

    var ramGB = (ss + logs + cp + grv + res + 4) * K.ramPerProcessGB * (1 + K.ramHeadroom);
    var ramTransactionGB = ceil(K.ramPerProcessGB * (1 + K.ramHeadroom));
    var ramStorageGB = ceil(coresPerMachine * K.ramPerProcessGB * (1 + K.ramHeadroom));

    return {
      inp: inp, K: K, rf: rf, rep: rep, shape: shape, dataGB: dataGB,
      machines: machines, coresPerMachine: coresPerMachine,
      ss: ss, ssCapacityGB: ssCapacityGB, ssCapacityWarn: ssCapacityWarn,
      dataPerSsGB: dataPerSsGB, dataPerSsWarn: dataPerSsWarn,
      logs: logs, logsRatio: logsRatio, logsWarn: logsWarn,
      sustainableReads: sustainableReads, sustainableWrites: sustainableWrites,
      cp: cp, grv: grv, res: res,
      coords: coords, failureDomainsWarn: failureDomainsWarn,
      stateless: stateless, transactionMachines: transactionMachines,
      statelessMachines: statelessMachines, totalMachines: totalMachines,
      ramGB: ramGB, ramTransactionGB: ramTransactionGB, ramStorageGB: ramStorageGB
    };
  }

  function fmtN(n) {
    if (!isFinite(n)) return '0';
    if (n >= 100) return Math.round(n).toString();
    if (n >= 10) return (Math.round(n * 10) / 10).toString();
    return (Math.round(n * 100) / 100).toString();
  }

  // Calibration constants exposed in the "Advanced" form section.
  // Each entry: form field name → minimum allowed value (clamp floor).
  var ADVANCED_KEYS = {
    perProcReadsSsd: 1,
    perProcWritesSsd: 1,
    headroom: 0.1,
    maxDataPerSsGB: 1,
    cpPerWriteQps: 1,
    grvPerReadQps: 1,
    resolverPerWriteQps: 1,
    ramPerProcessGB: 1,
    failureDomains: 1
  };

  function readInputs(form) {
    var inp = {
      machines: clampInt(form.elements['machines'].value, 1),
      coresPerMachine: clampInt(form.elements['coresPerMachine'].value, 1),
      dataTB: clamp(form.elements['dataTB'].value, 0),
      redundancy: form.elements['redundancy'].value,
      logsRatio: clamp(form.elements['logsRatio'].value, 1),
      shape: clampInt(form.elements['shape'].value, 0)
    };
    Object.keys(ADVANCED_KEYS).forEach(function (k) {
      var el = form.elements[k];
      var min = ADVANCED_KEYS[k];
      var v = el ? el.value : DEFAULTS[k];
      inp[k] = clamp(v, min);
    });
    return inp;
  }

  // Expose for testing in console.
  window.fdbTopologyEstimator = window.fdbTopologyEstimator || {};
  window.fdbTopologyEstimator.compute = compute;
  window.fdbTopologyEstimator.DEFAULTS = DEFAULTS;
  window.fdbTopologyEstimator.REPLICATION = REPLICATION;
  window.fdbTopologyEstimator.SHAPE_PRESETS = SHAPE_PRESETS;
  window.fdbTopologyEstimator.ADVANCED_KEYS = ADVANCED_KEYS;


  function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function output(id, label, value, anchor, bottleneck, formula, warning) {
    var lines = formula.map(escapeText).join('\n');
    var bot = bottleneck ? '<div class="te-result__bottleneck">Bottleneck: ' + escapeText(bottleneck) + '</div>' : '';
    var warn = warning ? '<div class="te-warning">⚠ ' + escapeText(warning) + '</div>' : '';
    return [
      '<div class="te-result" data-output="' + id + '">',
      '  <div class="te-result__label">' + escapeText(label) + '</div>',
      '  <div class="te-result__value">' + escapeText(value) + '</div>',
      bot,
      warn,
      '  <details>',
      '    <summary>Show calculation</summary>',
      '    <pre>' + lines + '</pre>',
      '    <a href="#' + anchor + '">Reference: ' + escapeText(label) + ' sizing →</a>',
      '  </details>',
      '</div>'
    ].join('');
  }

  function fmtBigInt(n) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  }

  function sustainableCard(r) {
    var inp = r.inp;
    var formula = [
      'shape = ' + r.shape.label + '  →  read_credit = ' + r.shape.readCredit + ', write_credit = ' + r.shape.writeCredit,
      'storage_processes = machines × cores = ' + r.machines + ' × ' + r.coresPerMachine + ' = ' + r.ss,
      '',
      'sustainable_reads  = floor(SS × per_proc_reads  × read_credit  / headroom)',
      '                   = floor(' + r.ss + ' × ' + r.K.perProcReadsSsd + ' × ' + r.shape.readCredit + ' / ' + r.K.headroom + ')',
      '                   = ' + fmtBigInt(r.sustainableReads) + ' reads/s',
      '',
      'sustainable_writes = floor(SS × per_proc_writes × write_credit / RF / headroom)',
      '                   = floor(' + r.ss + ' × ' + r.K.perProcWritesSsd + ' × ' + r.shape.writeCredit + ' / ' + r.rf + ' / ' + r.K.headroom + ')',
      '                   = ' + fmtBigInt(r.sustainableWrites) + ' writes/s'
    ];
    var formulaHtml = formula.map(escapeText).join('\n');
    return [
      '<div class="te-result te-result--sustainable" data-output="sustainable">',
      '  <div class="te-result__label">Sustainable workload (estimate)</div>',
      '  <div class="te-result__sustainable">',
      '    <div><span class="te-sus-num">' + fmtBigInt(r.sustainableReads) + '</span><span class="te-sus-unit">reads / s</span></div>',
      '    <div><span class="te-sus-num">' + fmtBigInt(r.sustainableWrites) + '</span><span class="te-sus-unit">writes / s</span></div>',
      '  </div>',
      '  <div class="te-result__bottleneck">Estimated ceiling at this layout and slider position. Real numbers depend on KV size, disk class, and contention — calibrate the per-process baselines in Advanced.</div>',
      '  <details>',
      '    <summary>Show calculation</summary>',
      '    <pre>' + formulaHtml + '</pre>',
      '    <a href="#sizing-sustainable">Reference: sustainable workload →</a>',
      '  </details>',
      '</div>'
    ].join('');
  }

  function buildOutputs(r) {
    var inp = r.inp;
    var blocks = [];

    blocks.push(sustainableCard(r));

    blocks.push(output(
      'replication',
      'Replication factor',
      r.rf + 'x  (' + r.rep.label + ')',
      'sizing-coordinators',
      null,
      [
        'redundancy = ' + inp.redundancy,
        'replication_factor = ' + r.rf,
        'recommended_coordinators = ' + r.coords
      ],
      null
    ));

    var ssWarnings = [];
    if (r.ssCapacityWarn) {
      ssWarnings.push('Not enough storage processes for this dataset at this replication factor — add machines or cores. Capacity at this layout: '
        + fmtN(r.ssCapacityGB) + ' GB; required: ' + fmtN(r.dataGB * r.rf) + ' GB (replicated).');
    }
    if (r.dataPerSsWarn) {
      ssWarnings.push('Data per SS is ' + fmtN(r.dataPerSsGB) + ' GB (> ' + r.K.maxDataPerSsGB + ' GB target). Recovery and data distribution slow down past this.');
    }

    blocks.push(output(
      'storage',
      'Storage processes',
      String(r.ss),
      'sizing-storage',
      'machines × cores = ' + r.machines + ' × ' + r.coresPerMachine,
      [
        'storage_processes = machines × cores_per_machine',
        '                  = ' + r.machines + ' × ' + r.coresPerMachine + ' = ' + r.ss,
        '',
        'cluster_capacity  = SS × max_data_per_SS / RF',
        '                  = ' + r.ss + ' × ' + r.K.maxDataPerSsGB + ' / ' + r.rf + ' = ' + fmtN(r.ssCapacityGB) + ' GB (logical)',
        'data_per_SS       = data_GB × RF / SS',
        '                  = ' + fmtN(r.dataGB) + ' × ' + r.rf + ' / ' + r.ss + ' = ' + fmtN(r.dataPerSsGB) + ' GB'
      ],
      ssWarnings.length ? ssWarnings.join(' \u2014 ') : null
    ));

    blocks.push(output(
      'tlogs',
      'T-log processes',
      String(r.logs),
      'sizing-tlogs',
      'SS:T-log ratio = ' + r.logsRatio + ':1  (slider default: ' + r.shape.logsRatio + ')',
      [
        'logs = max(' + DEFAULTS.logsMin + ', ceil(storage_processes / ratio))',
        '     = max(' + DEFAULTS.logsMin + ', ceil(' + r.ss + ' / ' + r.logsRatio + ')) = ' + r.logs
      ],
      r.logsWarn ? ('Above the ' + DEFAULTS.logsSoftCap + '-log soft cap (Snowflake observed diminishing returns past 15). Consider sharded logs or relaxing SS:T-log ratio.') : null
    ));

    blocks.push(output(
      'cp',
      'Commit proxies',
      String(r.cp),
      'sizing-commit-proxies',
      'sustainable writes',
      [
        'commit_proxies = max(' + DEFAULTS.cpMin + ', ceil(sustainable_writes / ' + r.K.cpPerWriteQps + '))',
        '               = max(' + DEFAULTS.cpMin + ', ceil(' + r.sustainableWrites + ' / ' + r.K.cpPerWriteQps + ')) = ' + r.cp
      ],
      null
    ));

    blocks.push(output(
      'grv',
      'GRV proxies',
      String(r.grv),
      'sizing-grv-proxies',
      'sustainable reads',
      [
        'grv_proxies = max(' + DEFAULTS.grvMin + ', ceil(sustainable_reads / ' + r.K.grvPerReadQps + '))',
        '            = max(' + DEFAULTS.grvMin + ', ceil(' + r.sustainableReads + ' / ' + r.K.grvPerReadQps + ')) = ' + r.grv
      ],
      null
    ));

    blocks.push(output(
      'resolvers',
      'Resolvers',
      String(r.res),
      'sizing-resolvers',
      'sustainable writes',
      [
        'resolvers = max(' + DEFAULTS.resolverMin + ', ceil(sustainable_writes / ' + r.K.resolverPerWriteQps + '))',
        '          = max(' + DEFAULTS.resolverMin + ', ceil(' + r.sustainableWrites + ' / ' + r.K.resolverPerWriteQps + ')) = ' + r.res,
        'note: more resolvers can increase false conflicts; rarely > 4'
      ],
      r.res > 4 ? 'More than 4 resolvers is rarely necessary. Profile commit_latency before adding more.' : null
    ));

    blocks.push(output(
      'coordinators',
      'Coordinators',
      String(r.coords),
      'sizing-coordinators',
      'redundancy = ' + inp.redundancy + ', failure_domains = ' + r.K.failureDomains,
      [
        'coordinators[' + inp.redundancy + '] = ' + r.coords + ' (odd, distinct failure domains)',
        'failure_domains = ' + r.K.failureDomains
      ],
      r.failureDomainsWarn ? ('Only ' + r.K.failureDomains + ' failure domain(s) configured for ' + inp.redundancy + ', but ' + r.coords + ' coordinators are recommended in distinct failure domains. Add more racks/AZs/data halls or coordinators will share a domain.') : null
    ));

    blocks.push(output(
      'machines',
      'Machines (estimate)',
      String(r.totalMachines),
      'sizing-machines',
      'storage + transaction + stateless',
      [
        'storage_machines     = ' + r.machines + ' (input)',
        'transaction_machines = logs                              = ' + r.transactionMachines,
        'stateless_machines   = ceil((cp+grv+res+4) / ' + DEFAULTS.statelessPerMachine + ')           = ' + r.statelessMachines,
        'total_machines = ' + r.machines + ' + ' + r.transactionMachines + ' + ' + r.statelessMachines + ' = ' + r.totalMachines,
        '',
        'cluster_RAM ≈ (SS + logs + cp + grv + res + 4) × ' + r.K.ramPerProcessGB + ' GB × ' + (1 + r.K.ramHeadroom),
        '            ≈ (' + r.ss + ' + ' + r.logs + ' + ' + r.cp + ' + ' + r.grv + ' + ' + r.res + ' + 4) × ' + r.K.ramPerProcessGB + ' × ' + (1 + r.K.ramHeadroom) + ' = ' + fmtN(r.ramGB) + ' GB',
        '',
        'RAM/storage machine     ≈ ' + r.ramStorageGB + ' GB  (' + r.K.ramPerProcessGB + ' GB × ' + r.coresPerMachine + ' procs × ' + (1 + r.K.ramHeadroom) + ')',
        'RAM/transaction machine ≈ ' + r.ramTransactionGB + ' GB  (' + r.K.ramPerProcessGB + ' GB × 1 proc × ' + (1 + r.K.ramHeadroom) + ')'
      ],
      null
    ));

    return blocks.join('');
  }

  function buildFdbcliSnippet(r) {
    var inp = r.inp;
    var lines = [
      '# Apply this configuration via fdbcli (review before running on a live cluster).',
      '# ssd-redwood-v1 is the modern default storage backend; swap if your build requires it.',
      'fdbcli> configure new ' + inp.redundancy + ' ssd-redwood-v1',
      'fdbcli> configure commit_proxies=' + r.cp + ' grv_proxies=' + r.grv + ' resolvers=' + r.res + ' logs=' + r.logs,
      '',
      '# Process classes (per fdbserver process / foundationdb.conf):',
      '#   ' + r.logs + ' × class=transaction          (one per host on dedicated nodes)',
      '#   ' + r.ss  + ' × class=storage               (' + r.machines + ' hosts × ' + r.coresPerMachine + ' processes)',
      '#   ' + r.stateless + ' × class=stateless             (commit/grv/resolver + cluster controller + master)',
      '#   ' + r.coords + ' × coordinators              (odd, spread across failure domains)'
    ];
    return lines.join('\n');
  }

  function update(form, results, cliCode, shapeLabelEl) {
    var inp = readInputs(form);
    var r = compute(inp);
    if (shapeLabelEl) shapeLabelEl.textContent = r.shape.label;
    results.innerHTML = buildOutputs(r);
    cliCode.textContent = buildFdbcliSnippet(r);
  }

  function init() {
    var root = document.getElementById('te-root');
    if (!root) return;
    var form = root.querySelector('#te-form');
    var results = root.querySelector('#te-results');
    var cliCode = root.querySelector('#te-cli-code');
    if (!form || !results || !cliCode) return;
    if (form.dataset.teInit === '1') return;
    form.dataset.teInit = '1';

    var shapeEl = form.elements['shape'];
    var logsRatioEl = form.elements['logsRatio'];
    var shapeLabelEl = root.querySelector('#te-shape-label');

    function trigger() { update(form, results, cliCode, shapeLabelEl); }
    form.addEventListener('input', trigger);
    form.addEventListener('change', trigger);

    // Slider position drives the SS:T-log ratio default. Moving the slider
    // overwrites whatever the user typed, by design — explained in the
    // ratio input's tooltip.
    if (shapeEl && logsRatioEl) {
      shapeEl.addEventListener('input', function () {
        var idx = clampInt(shapeEl.value, 0);
        if (idx > SHAPE_PRESETS.length - 1) idx = SHAPE_PRESETS.length - 1;
        logsRatioEl.value = SHAPE_PRESETS[idx].logsRatio;
      });
    }

    var resetBtn = root.querySelector('#te-reset-defaults');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Object.keys(ADVANCED_KEYS).forEach(function (k) {
          var el = form.elements[k];
          if (el) el.value = DEFAULTS[k];
        });
        trigger();
      });
    }

    trigger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on MkDocs Material instant navigation.
  if (typeof document$ !== 'undefined' && document$ && typeof document$.subscribe === 'function') {
    document$.subscribe(function () {
      // The new page's form is a fresh DOM node; clear any stale flag.
      var form = document.querySelector('#te-root #te-form');
      if (form) form.dataset.teInit = '';
      init();
    });
  }
})();

