// FoundationDB Cluster Topology Estimator
// Vanilla JS, no build step. Reads form inputs and renders sizing recommendations.
// Tweak the constants below to recalibrate the model.

(function () {
  'use strict';

  // Per-process throughput baselines (operations per second per fdbserver process).
  var DEFAULTS = {
    perProcReadsSsd: 55000,
    perProcWritesSsd: 20000,
    perProcMixedSsd: 35000,
    perProcReadsMem: 90000,
    perProcWritesMem: 35000,
    headroom: 1.5,
    maxDataPerSsGB: 500,
    logsRatioDefault: 12,
    logsMin: 3,
    logsSoftCap: 15,
    cpPerWriteQps: 50000,
    cpMin: 3,
    grvPerReadQps: 200000,
    grvMin: 1,
    resolverPerWriteQps: 80000,
    resolverMin: 1,
    coresPerMachineStorage: 8,
    ramPerProcessGB: 4,
    ramHeadroom: 0.25
  };

  var REPLICATION = {
    single:           { factor: 1, coords: 1, label: 'single' },
    double:           { factor: 2, coords: 3, label: 'double' },
    triple:           { factor: 3, coords: 5, label: 'triple' },
    three_data_hall:  { factor: 3, coords: 9, label: 'three_data_hall' },
    three_datacenter: { factor: 6, coords: 9, label: 'three_datacenter' }
  };

  function clamp(v, min) {
    var n = parseFloat(v);
    if (!isFinite(n) || n < 0) return min;
    return Math.max(min, n);
  }

  function ceil(n) { return Math.ceil(n); }

  function engineThroughput(engine) {
    if (engine === 'memory') {
      return { r: DEFAULTS.perProcReadsMem, w: DEFAULTS.perProcWritesMem, label: 'memory' };
    }
    return { r: DEFAULTS.perProcReadsSsd, w: DEFAULTS.perProcWritesSsd, label: 'ssd/redwood' };
  }

  function compute(inp) {
    var rep = REPLICATION[inp.redundancy] || REPLICATION.triple;
    var rf = rep.factor;
    var tput = engineThroughput(inp.engine);
    var dataGB = inp.dataTB * 1024;

    var readRatio = inp.readQps / tput.r;
    var writeRatio = inp.writeQps / tput.w;
    var dominant = Math.max(readRatio, writeRatio);
    var ssThroughputUnits = Math.max(1, ceil(dominant * DEFAULTS.headroom));
    var ssThroughput = Math.max(rf * 2, ssThroughputUnits * rf);
    var ssData = ceil(dataGB * rf / DEFAULTS.maxDataPerSsGB);
    var ssFloor = rf * 2;
    var ss = Math.max(ssThroughput, ssData, ssFloor);

    var ssBottleneck;
    if (ssData >= ssThroughput && ssData > ssFloor) {
      ssBottleneck = 'data capacity (' + DEFAULTS.maxDataPerSsGB + ' GB/SS soft target)';
    } else if (ssThroughput > ssFloor) {
      ssBottleneck = (writeRatio >= readRatio ? 'write throughput' : 'read throughput');
    } else {
      ssBottleneck = 'replication floor (RF × 2)';
    }

    var logsRatio = clamp(inp.logsRatio, 1);
    var logs = Math.max(DEFAULTS.logsMin, ceil(ss / logsRatio));
    var logsWarn = logs > DEFAULTS.logsSoftCap;

    var cp = Math.max(DEFAULTS.cpMin, ceil(inp.writeQps / DEFAULTS.cpPerWriteQps));
    var grv = Math.max(DEFAULTS.grvMin, ceil(inp.readQps / DEFAULTS.grvPerReadQps));
    if (inp.workloadHint === 'read-heavy') grv = Math.max(grv, 3);
    var res = Math.max(DEFAULTS.resolverMin, ceil(inp.writeQps / DEFAULTS.resolverPerWriteQps));

    var transactionMachines = logs;
    var storageMachines = Math.max(1, ceil(ss / DEFAULTS.coresPerMachineStorage));
    var stateless = cp + grv + res + 4;
    var statelessMachines = Math.max(1, ceil(stateless / DEFAULTS.coresPerMachineStorage));
    var machines = transactionMachines + storageMachines + statelessMachines;

    var procsPerStorageMachine = Math.min(DEFAULTS.coresPerMachineStorage, ceil(ss / storageMachines));
    var ramStorageGB = ceil(procsPerStorageMachine * DEFAULTS.ramPerProcessGB * (1 + DEFAULTS.ramHeadroom));
    var ramTransactionGB = ceil(DEFAULTS.ramPerProcessGB * (1 + DEFAULTS.ramHeadroom));

    var dataPerSsGB = ss > 0 ? (dataGB * rf / ss) : 0;
    var dataPerSsWarn = dataPerSsGB > DEFAULTS.maxDataPerSsGB;

    return {
      inp: inp, rf: rf, rep: rep, tput: tput, dataGB: dataGB,
      ss: ss, ssThroughput: ssThroughput, ssData: ssData, ssFloor: ssFloor,
      ssThroughputUnits: ssThroughputUnits, ssBottleneck: ssBottleneck,
      readRatio: readRatio, writeRatio: writeRatio,
      logs: logs, logsRatio: logsRatio, logsWarn: logsWarn,
      cp: cp, grv: grv, res: res, coords: rep.coords,
      transactionMachines: transactionMachines,
      storageMachines: storageMachines,
      statelessMachines: statelessMachines,
      machines: machines, stateless: stateless,
      procsPerStorageMachine: procsPerStorageMachine,
      ramStorageGB: ramStorageGB, ramTransactionGB: ramTransactionGB,
      dataPerSsGB: dataPerSsGB, dataPerSsWarn: dataPerSsWarn
    };
  }

  function fmtN(n) {
    if (!isFinite(n)) return '0';
    if (n >= 100) return Math.round(n).toString();
    if (n >= 10) return (Math.round(n * 10) / 10).toString();
    return (Math.round(n * 100) / 100).toString();
  }

  function readInputs(form) {
    return {
      readQps: clamp(form.elements['readQps'].value, 0),
      writeQps: clamp(form.elements['writeQps'].value, 0),
      dataTB: clamp(form.elements['dataTB'].value, 0),
      redundancy: form.elements['redundancy'].value,
      engine: form.elements['engine'].value,
      logsRatio: clamp(form.elements['logsRatio'].value, 1),
      workloadHint: (form.elements['workloadHint'] && form.elements['workloadHint'].value) || 'mixed'
    };
  }

  // Expose for testing in console.
  window.fdbTopologyEstimator = window.fdbTopologyEstimator || {};
  window.fdbTopologyEstimator.compute = compute;
  window.fdbTopologyEstimator.DEFAULTS = DEFAULTS;
  window.fdbTopologyEstimator.REPLICATION = REPLICATION;


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

  function buildOutputs(r) {
    var inp = r.inp;
    var blocks = [];

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

    blocks.push(output(
      'storage',
      'Storage processes',
      String(r.ss),
      'sizing-storage',
      r.ssBottleneck,
      [
        'engine = ' + r.tput.label + '  →  per_proc_reads = ' + r.tput.r + ', per_proc_writes = ' + r.tput.w,
        'read_ratio  = read_qps  / per_proc_reads  = ' + inp.readQps  + ' / ' + r.tput.r + ' = ' + fmtN(r.readRatio),
        'write_ratio = write_qps / per_proc_writes = ' + inp.writeQps + ' / ' + r.tput.w + ' = ' + fmtN(r.writeRatio),
        'ss_throughput = ceil(max(read_ratio, write_ratio) × ' + DEFAULTS.headroom + ') × RF',
        '              = ' + r.ssThroughputUnits + ' × ' + r.rf + ' = ' + r.ssThroughput,
        'ss_data       = ceil(data_GB × RF / ' + DEFAULTS.maxDataPerSsGB + ')',
        '              = ceil(' + fmtN(r.dataGB) + ' × ' + r.rf + ' / ' + DEFAULTS.maxDataPerSsGB + ') = ' + r.ssData,
        'storage_processes = max(ss_throughput, ss_data, RF × 2)',
        '                  = max(' + r.ssThroughput + ', ' + r.ssData + ', ' + r.ssFloor + ') = ' + r.ss,
        'data_per_SS ≈ ' + fmtN(r.dataPerSsGB) + ' GB'
      ],
      r.dataPerSsWarn ? ('Data per SS is ' + fmtN(r.dataPerSsGB) + ' GB (> ' + DEFAULTS.maxDataPerSsGB + ' GB target). Recovery and data distribution slow down past this.') : null
    ));

    blocks.push(output(
      'tlogs',
      'T-log processes',
      String(r.logs),
      'sizing-tlogs',
      'SS:T-log ratio = ' + r.logsRatio + ':1',
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
      'write throughput',
      [
        'commit_proxies = max(' + DEFAULTS.cpMin + ', ceil(write_qps / ' + DEFAULTS.cpPerWriteQps + '))',
        '               = max(' + DEFAULTS.cpMin + ', ceil(' + inp.writeQps + ' / ' + DEFAULTS.cpPerWriteQps + ')) = ' + r.cp
      ],
      null
    ));

    blocks.push(output(
      'grv',
      'GRV proxies',
      String(r.grv),
      'sizing-grv-proxies',
      inp.workloadHint === 'read-heavy' ? 'read-heavy workload' : 'read throughput',
      [
        'grv_proxies = max(' + DEFAULTS.grvMin + ', ceil(read_qps / ' + DEFAULTS.grvPerReadQps + '))',
        '            = max(' + DEFAULTS.grvMin + ', ceil(' + inp.readQps + ' / ' + DEFAULTS.grvPerReadQps + ')) = ' + Math.max(DEFAULTS.grvMin, ceil(inp.readQps / DEFAULTS.grvPerReadQps)),
        inp.workloadHint === 'read-heavy' ? 'read-heavy hint → bumped to floor of 3 = ' + r.grv : 'final = ' + r.grv
      ],
      null
    ));

    blocks.push(output(
      'resolvers',
      'Resolvers',
      String(r.res),
      'sizing-resolvers',
      'write throughput',
      [
        'resolvers = max(' + DEFAULTS.resolverMin + ', ceil(write_qps / ' + DEFAULTS.resolverPerWriteQps + '))',
        '          = max(' + DEFAULTS.resolverMin + ', ceil(' + inp.writeQps + ' / ' + DEFAULTS.resolverPerWriteQps + ')) = ' + r.res,
        'note: more resolvers can increase false conflicts; rarely > 4'
      ],
      r.res > 4 ? 'More than 4 resolvers is rarely necessary. Profile commit_latency before adding more.' : null
    ));

    blocks.push(output(
      'coordinators',
      'Coordinators',
      String(r.coords),
      'sizing-coordinators',
      'redundancy = ' + inp.redundancy,
      [
        'coordinators[' + inp.redundancy + '] = ' + r.coords + ' (odd, distinct failure domains)'
      ],
      null
    ));

    blocks.push(output(
      'machines',
      'Machines (estimate)',
      String(r.machines),
      'sizing-machines',
      'transaction-class + storage-class + stateless-class',
      [
        'transaction_machines = logs                       = ' + r.transactionMachines,
        'storage_machines     = ceil(storage / ' + DEFAULTS.coresPerMachineStorage + ')             = ' + r.storageMachines,
        'stateless_machines   = ceil((cp+grv+res+4) / ' + DEFAULTS.coresPerMachineStorage + ')      = ' + r.statelessMachines,
        'machines = ' + r.transactionMachines + ' + ' + r.storageMachines + ' + ' + r.statelessMachines + ' = ' + r.machines,
        '',
        'RAM/transaction machine ≈ ' + r.ramTransactionGB + ' GB  (' + DEFAULTS.ramPerProcessGB + ' GB × 1 proc × ' + (1 + DEFAULTS.ramHeadroom) + ')',
        'RAM/storage machine     ≈ ' + r.ramStorageGB + ' GB  (' + DEFAULTS.ramPerProcessGB + ' GB × ' + r.procsPerStorageMachine + ' procs × ' + (1 + DEFAULTS.ramHeadroom) + ')'
      ],
      null
    ));

    return blocks.join('');
  }

  function buildFdbcliSnippet(r) {
    var inp = r.inp;
    var engine = inp.engine;
    var lines = [
      '# Apply this configuration via fdbcli (review before running on a live cluster).',
      'fdbcli> configure new ' + inp.redundancy + ' ' + engine,
      'fdbcli> configure commit_proxies=' + r.cp + ' grv_proxies=' + r.grv + ' resolvers=' + r.res + ' logs=' + r.logs,
      '',
      '# Process classes (per fdbserver process / foundationdb.conf):',
      '#   ' + r.logs + ' × class=transaction          (one per host on dedicated nodes)',
      '#   ' + r.ss  + ' × class=storage               (co-locate up to ' + DEFAULTS.coresPerMachineStorage + ' per host)',
      '#   ' + r.stateless + ' × class=stateless             (commit/grv/resolver + cluster controller + master)',
      '#   ' + r.coords + ' × coordinators              (odd, spread across failure domains)'
    ];
    return lines.join('\n');
  }

  function update(form, results, cliCode) {
    var inp = readInputs(form);
    var r = compute(inp);
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

    function trigger() { update(form, results, cliCode); }
    form.addEventListener('input', trigger);
    form.addEventListener('change', trigger);
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

