(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const stages = [
    {
      title: 'Prepare metric object assets',
      body: 'Recover complete object geometry and lock its metric scale before egocentric capture begins.',
      tags: ['Object mesh', 'Metric scale'],
      label: 'Metric object asset', meta: 'complete geometry · fixed scale'
    },
    {
      title: 'Capture human experience',
      body: 'Record natural hand–object interaction from a continuously moving egocentric camera.',
      tags: ['Ego RGB', 'Depth', 'Camera motion'],
      label: 'Ego capture suite', meta: 'natural motion · continuous view'
    },
    {
      title: 'Track identity through time',
      body: 'Propagate a first-frame mask while rejecting distractors and recovering the target after occlusion.',
      tags: ['First-mask anchor', 'Temporal identity'],
      label: 'Identity-safe tracking', meta: 'first mask · recovery · propagation'
    },
    {
      title: 'Verify object motion',
      body: 'Fuse pose proposals with depth, silhouette, coverage, and motion evidence before committing each 6DoF state.',
      tags: ['Evidence checks', '6DoF trajectory'],
      label: 'Verified trajectory', meta: 'depth · silhouette · motion'
    },
    {
      title: 'Align structured annotations',
      body: 'Package depth, hands, camera, object motion, meshes, masks, and language in one metric frame.',
      tags: ['Metric alignment', 'Multimodal output'],
      label: 'Structured output', meta: 'metric · aligned · temporal'
    }
  ];

  const story = document.querySelector('.engine-story');
  const stageButtons = [...document.querySelectorAll('[data-engine-stage]')];
  const stageMedia = [...document.querySelectorAll('[data-stage-media]')];
  const stageIndex = document.querySelector('.stage-index');
  const stageTitle = document.querySelector('.engine-stage-text h3');
  const stageBody = document.querySelector('.engine-stage-text p');
  const stageTags = document.querySelector('.stage-tags');
  let activeStage = 0;
  let activeOutput = 0;
  let stageTimer = 0;
  let storyVisible = false;

  function playVisibleMedia() {
    stageMedia.forEach((panel, index) => {
      panel.querySelectorAll('video').forEach(video => {
        const visibleOutput = index !== 4 || video.closest('figure')?.classList.contains('output-active');
        if (index === activeStage && visibleOutput && storyVisible && !document.hidden && !reduceMotion.matches) video.play().catch(() => {});
        else video.pause();
      });
    });
  }

  function selectStage(index, manual = false) {
    activeStage = (index + stages.length) % stages.length;
    story.dataset.stage = String(activeStage);
    const stage = stages[activeStage];
    stageButtons.forEach((button, i) => {
      const active = i === activeStage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    stageMedia.forEach((panel, i) => panel.classList.toggle('active', i === activeStage));
    stageIndex.textContent = `STAGE ${String(activeStage + 1).padStart(2, '0')} / 05`;
    stageTitle.textContent = stage.title;
    stageBody.textContent = stage.body;
    story.querySelector('.media-label span').textContent = stage.label;
    story.querySelector('.media-label b').textContent = stage.meta;
    stageTags.replaceChildren(...stage.tags.map(label => {
      const span = document.createElement('span');
      span.textContent = label;
      return span;
    }));
    const progress = story.querySelector('.engine-progress i');
    progress.style.animation = 'none';
    requestAnimationFrame(() => { progress.style.animation = ''; });
    if (manual) {
      story.classList.add('user-paused');
      clearInterval(stageTimer);
    }
    playVisibleMedia();
  }

  stageButtons.forEach((button, index) => button.addEventListener('click', () => selectStage(index, true)));
  const outputFigures = [...document.querySelectorAll('.output-grid>figure')];
  const outputButtons = [...document.querySelectorAll('[data-output]')];
  function selectOutput(index) {
    activeOutput = (index + outputFigures.length) % outputFigures.length;
    outputFigures.forEach((figure, i) => figure.classList.toggle('output-active', i === activeOutput));
    outputButtons.forEach((button, i) => {
      button.classList.toggle('active', i === activeOutput);
      button.setAttribute('aria-selected', String(i === activeOutput));
    });
    playVisibleMedia();
  }
  outputButtons.forEach((button, index) => button.addEventListener('click', () => selectOutput(index)));
  selectOutput(0);
  if (story) {
    new IntersectionObserver(([entry]) => {
      storyVisible = entry.isIntersecting;
      playVisibleMedia();
    }, { threshold: .25 }).observe(story);
    if (!reduceMotion.matches) stageTimer = setInterval(() => selectStage(activeStage + 1), 5600);
    if (!reduceMotion.matches) setInterval(() => { if (activeStage === 4 && storyVisible && !document.hidden) selectOutput(activeOutput + 1); }, 1700);
  }

  const disclosure = document.querySelector('.pipeline-disclosure button');
  const pipeline = document.querySelector('.pipeline-figure');
  const pipelineImage = document.querySelector('.pipeline-image');
  let pipelineStage = 0;
  let pipelineTimer = 0;
  if (pipelineImage) {
    const sourceImage = pipelineImage.querySelector('img');
    let stageNodes = [];
    fetch(sourceImage.src).then(response => response.text()).then(text => {
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      svg.classList.add('pipeline-svg');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      const targets = [[14,31],[14,311],[637,31],[1206,31],[1732,31]];
      const rects = [...svg.querySelectorAll('rect')];
      stageNodes = targets.map(([x,y]) => {
        const rect = rects.find(node => Math.abs(Number(node.getAttribute('x'))-x)<2 && Math.abs(Number(node.getAttribute('y'))-y)<2);
        rect?.parentElement.classList.add('pipeline-stage');
        return rect?.parentElement;
      }).filter(Boolean);
      [...svg.querySelectorAll('polygon')].filter(node => (node.getAttribute('fill') || '').toUpperCase() === '#9AB989').forEach((arrow,index) => {
        arrow.classList.add('pipeline-flow-arrow');
        arrow.style.animationDelay = `${index * .24}s`;
      });
      sourceImage.replaceWith(svg);
      showPipelineStage(0);
    }).catch(() => {});
    const showPipelineStage = index => {
      if (!stageNodes.length) return;
      pipelineStage = index % stageNodes.length;
      stageNodes.forEach((node, i) => node.classList.toggle('pipeline-active', i === pipelineStage));
    };
    const startPipeline = () => {
      if (reduceMotion.matches || pipelineTimer) return;
      showPipelineStage(pipelineStage);
      pipelineTimer = setInterval(() => showPipelineStage(pipelineStage + 1), 2400);
    };
    const stopPipeline = () => { clearInterval(pipelineTimer); pipelineTimer = 0; };
    pipelineImage.addEventListener('mouseenter', stopPipeline);
    pipelineImage.addEventListener('mouseleave', () => { if (pipeline.classList.contains('is-open')) startPipeline(); });
    pipeline._startMotion = startPipeline;
    pipeline._stopMotion = stopPipeline;
  }
  disclosure?.addEventListener('click', () => {
    const open = !pipeline.classList.contains('is-open');
    pipeline.classList.toggle('is-open', open);
    disclosure.setAttribute('aria-expanded', String(open));
    disclosure.firstChild.textContent = open ? 'Hide the complete annotation pipeline ' : 'View the complete annotation pipeline ';
    if (open) pipeline._startMotion?.(); else pipeline._stopMotion?.();
  });

  const revealTargets = document.querySelectorAll('.paradigm-section, .section-heading, .engine-flow, .dataset-facts, .distribution-grid, .model-equation, .training-pool, .metrics-section, .citation-section');
  revealTargets.forEach(target => target.classList.add('reveal-ready'));
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in-view');
    revealObserver.unobserve(entry.target);
  }), { threshold: .12 });
  revealTargets.forEach(target => revealObserver.observe(target));

  const factValues = [...document.querySelectorAll('.fact strong')];
  const factObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const fact = entry.target;
    fact.classList.toggle('in-view', entry.isIntersecting);
    const value = fact.querySelector('strong');
    if (!value.dataset.numberOriginal) value.dataset.numberOriginal = value.textContent;
    const original = value.dataset.numberOriginal;
    const match = original.match(/\d+(?:\.\d+)?/);
    const target = Number(match?.[0] || 0);
    const decimals = (match?.[0].split('.')[1] || '').length;
    const suffix = original.slice((match?.index || 0) + (match?.[0].length || 0));
    const token = String(Number(value.dataset.animationToken || 0) + 1); value.dataset.animationToken = token;
    if (!entry.isIntersecting) { fact.style.setProperty('--fact-progress', '0'); return; }
    if (reduceMotion.matches) { value.textContent = original; fact.style.setProperty('--fact-progress', '1'); return; }
    const started = performance.now();
    const tick = now => {
      if (value.dataset.animationToken !== token) return;
      const progress = Math.max(0, Math.min(1, (now - started) / 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      value.textContent = `${(target * eased).toFixed(decimals)}${suffix}`;
      fact.style.setProperty('--fact-progress', String(eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .5 });
  factValues.forEach(value => factObserver.observe(value.closest('.fact')));

  function animateNumberInText(element, delay = 0, duration = 1050) {
    if (!element) return;
    if (!element.dataset.numberOriginal) element.dataset.numberOriginal = element.textContent;
    const original = element.dataset.numberOriginal;
    const match = original.match(/-?\d+(?:\.\d+)?/);
    if (!match) return;
    const target = Number(match[0]);
    const decimals = (match[0].split('.')[1] || '').length;
    const prefix = original.slice(0, match.index);
    const suffix = original.slice(match.index + match[0].length);
    const token = String(Number(element.dataset.animationToken || 0) + 1);
    element.dataset.animationToken = token;
    if (reduceMotion.matches) { element.textContent = original; return; }
    setTimeout(() => {
      if (element.dataset.animationToken !== token) return;
      element.textContent = `${prefix}${(0).toFixed(decimals)}${suffix}`;
      const started = performance.now();
      const tick = now => {
        if (element.dataset.animationToken !== token) return;
        const progress = Math.max(0, Math.min(1, (now - started) / duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  }

  const distribution = document.querySelector('.distribution-grid');
  if (distribution) {
    let distributionToken = 0;
    const numericSpec = element => {
      if (!element.dataset.numberOriginal) element.dataset.numberOriginal = element.textContent;
      const original = element.dataset.numberOriginal;
      const match = original.match(/-?\d+(?:\.\d+)?/);
      return { element, target: Number(match[0]), decimals: (match[0].split('.')[1] || '').length, prefix: original.slice(0, match.index), suffix: original.slice(match.index + match[0].length) };
    };
    const renderNumber = (spec, eased) => { spec.element.textContent = `${spec.prefix}${(spec.target * eased).toFixed(spec.decimals)}${spec.suffix}`; };
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        distributionToken++;
        distribution.querySelectorAll('.region-bars>div').forEach(row => row.style.setProperty('--bar-progress', '0'));
        return;
      }
      const token = ++distributionToken;
      const ring = distribution.querySelector('.coverage-ring');
      const coverageSpecs = [numericSpec(distribution.querySelector('.coverage-ring strong')), ...[...distribution.querySelectorAll('.legend b')].map(numericSpec)];
      distribution.querySelectorAll('.region-bars>div').forEach((row, index) => {
        const delay = index * 55;
        const spec = numericSpec(row.querySelector('b'));
        row.style.setProperty('--bar-progress', '0');
        setTimeout(() => {
          if (token !== distributionToken) return;
          const started = performance.now();
          const tick = now => {
            if (token !== distributionToken) return;
            const progress = Math.max(0, Math.min(1, (now - started) / 1100));
            const eased = 1 - Math.pow(1 - progress, 3);
            row.style.setProperty('--bar-progress', String(eased));
            renderNumber(spec, eased);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      });
      const objectNumbers = [distribution.querySelector('.object-cloud')?.closest('article')?.querySelector('h3'), ...distribution.querySelectorAll('.object-cloud b')].filter(Boolean);
      objectNumbers.forEach((element, index) => animateNumberInText(element, index * 45, 1050));
      if (reduceMotion.matches) {
        coverageSpecs.forEach(spec => renderNumber(spec, 1));
        distribution.querySelectorAll('.region-bars>div').forEach(row => row.style.setProperty('--bar-progress', '1'));
      } else {
        const started = performance.now();
        const tick = now => {
          if (token !== distributionToken) return;
          const progress = Math.max(0, Math.min(1, (now - started) / 1150));
          const eased = 1 - Math.pow(1 - progress, 3);
          const a = 49 * eased;
          const b = 82.8 * eased;
          ring.style.background = `conic-gradient(#cbffa0 0 ${a}%, #6eaa91 ${a}% ${b}%, #416b67 ${b}% ${100 * eased}%, #171b18 ${100 * eased}% 100%)`;
          coverageSpecs.forEach(spec => renderNumber(spec, eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: .28 }).observe(distribution);
  }

  // The paradigm follows Holi-World's restrained flow language: marching wires,
  // travelling comets, and a short glow when information reaches a node.
  const paradigm = document.querySelector('.paradigm-graph');
  if (paradigm && !reduceMotion.matches) {
    const svg = paradigm.querySelector('.graph-lines');
    const paths = [...svg.querySelectorAll('g path')];
    const graphAnimations = [];
    const graphPeriod = 4200;
    const graphSpeed = 145;
    paths.forEach((path, index) => {
      const length = path.getTotalLength();
      const beam = Math.min(58, Math.max(24, length * .34));
      const start = index < 2 ? 0 : 1750;
      const travel = length / graphSpeed * 1000;
      const begin = start / graphPeriod;
      const arrive = Math.min(.94, (start + travel) / graphPeriod);
      const comet = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      comet.setAttribute('d', path.getAttribute('d')); comet.setAttribute('class', 'graph-comet-path'); comet.style.strokeDasharray = `${beam}px ${length + beam}px`; comet.style.strokeDashoffset = `${beam}px`; svg.append(comet);
      graphAnimations.push(comet.animate([
        { strokeDashoffset: `${beam}px`, opacity: 0, offset: 0 },
        { strokeDashoffset: `${beam}px`, opacity: 0, offset: begin },
        { strokeDashoffset: `${beam}px`, opacity: 1, offset: Math.min(.98, begin + .01) },
        { strokeDashoffset: `${-length}px`, opacity: 1, offset: arrive },
        { strokeDashoffset: `${-length}px`, opacity: 0, offset: Math.min(.99, arrive + .02) },
        { strokeDashoffset: `${-length}px`, opacity: 0, offset: 1 }
      ], { duration: graphPeriod, iterations: Infinity, easing: 'linear' }));
    });
    const nodes = [...paradigm.querySelectorAll('.graph-node')];
    let nodeIndex = 0;
    let nodeTimer = 0;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        graphAnimations.forEach(animation => animation.play());
        if (!nodeTimer) nodeTimer = setInterval(() => {
          nodes.forEach(node => node.classList.remove('flow-arrival'));
          nodes[nodeIndex++ % nodes.length].classList.add('flow-arrival');
        }, 650);
      } else {
        graphAnimations.forEach(animation => animation.pause());
        clearInterval(nodeTimer);
        nodeTimer = 0;
      }
    }, { threshold: .1 }).observe(paradigm);
  }

  const engineFlow = document.querySelector('.engine-flow');
  if (engineFlow) {
    const svg = engineFlow.querySelector('.engine-flow-wires');
    const nodes = [...engineFlow.querySelectorAll('.engine-flow-node')];
    const byName = Object.fromEntries(nodes.map(node => [node.dataset.flowNode, node]));
    const edges = [['object', 'track', 'direct'], ['capture', 'track', 'direct'], ['track', 'verify', 'direct'], ['verify', 'output', 'direct']];
    const phases = [[byName.object, byName.capture], [byName.track], [byName.verify], [byName.output]];
    let flowTimer = 0;
    let flowIndex = 0;
    let wireAnimations = [];
    const buildEngineWires = () => {
      wireAnimations.forEach(animation => animation.cancel());
      wireAnimations = [];
      svg.replaceChildren();
      if (innerWidth <= 1000 || reduceMotion.matches) return;
      const bounds = engineFlow.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      const ns = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(ns, 'defs');
      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', 'engine-arrowhead'); marker.setAttribute('markerWidth', '7'); marker.setAttribute('markerHeight', '7'); marker.setAttribute('refX', '6'); marker.setAttribute('refY', '3.5'); marker.setAttribute('orient', 'auto');
      const head = document.createElementNS(ns, 'path'); head.setAttribute('d', 'M0 0L7 3.5L0 7'); head.setAttribute('fill', '#a5d78a'); marker.append(head); defs.append(marker); svg.append(defs);
      edges.forEach(([from, to, route], index) => {
        const a = byName[from].getBoundingClientRect();
        const b = byName[to].getBoundingClientRect();
        const x1 = a.right - bounds.left, y1 = a.top - bounds.top + a.height / 2;
        const x2 = b.left - bounds.left;
        const y2 = to === 'track' ? b.top - bounds.top + b.height * (from === 'object' ? .34 : .66) : b.top - bounds.top + b.height / 2;
        const corridor = x2 - Math.min(30, Math.max(16, (x2 - x1) * .35));
        const d = `M${x1},${y1} H${corridor} V${y2} H${x2}`;
        const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); path.setAttribute('class', 'engine-wire'); path.setAttribute('marker-end', 'url(#engine-arrowhead)'); svg.append(path);
        const length = path.getTotalLength();
        const beam = Math.min(82, Math.max(28, length * .38));
        const period = 5400;
        const speed = 165;
        const starts = [0, 0, 1750, 3350];
        const travel = length / speed * 1000;
        const begin = starts[index] / period;
        const arrive = Math.min(.94, (starts[index] + travel) / period);
        const comet = document.createElementNS(ns, 'path'); comet.setAttribute('d', d); comet.setAttribute('class', 'engine-wire-comet'); comet.style.strokeDasharray = `${beam}px ${length + beam}px`; comet.style.strokeDashoffset = `${beam}px`; svg.append(comet);
        wireAnimations.push(comet.animate([
          { strokeDashoffset: `${beam}px`, opacity: 0, offset: 0 },
          { strokeDashoffset: `${beam}px`, opacity: 0, offset: begin },
          { strokeDashoffset: `${beam}px`, opacity: 1, offset: Math.min(.98, begin + .01) },
          { strokeDashoffset: `${-length}px`, opacity: 1, offset: arrive },
          { strokeDashoffset: `${-length}px`, opacity: 0, offset: Math.min(.99, arrive + .02) },
          { strokeDashoffset: `${-length}px`, opacity: 0, offset: 1 }
        ], { duration: period, iterations: Infinity, easing: 'linear' }));
      });
      wireAnimations.forEach(animation => animation.pause());
    };
    const startEngineFlow = () => {
      if (reduceMotion.matches || flowTimer) return;
      engineFlow.classList.add('motion-live');
      const advance = () => {
        nodes.forEach(node => node.classList.remove('flow-arrival'));
        phases[flowIndex++ % phases.length].forEach(node => node.classList.add('flow-arrival'));
      };
      advance(); flowTimer = setInterval(advance, 820); wireAnimations.forEach(animation => animation.play());
    };
    const stopEngineFlow = () => { clearInterval(flowTimer); flowTimer = 0; engineFlow.classList.remove('motion-live'); nodes.forEach(node => node.classList.remove('flow-arrival')); wireAnimations.forEach(animation => animation.pause()); };
    buildEngineWires();
    new ResizeObserver(buildEngineWires).observe(engineFlow);
    new IntersectionObserver(([entry]) => entry.isIntersecting ? startEngineFlow() : stopEngineFlow(), { threshold: .15 }).observe(engineFlow);
  }

  const modelEquation = document.querySelector('.model-equation');
  if (modelEquation) {
    const networkImage = modelEquation.querySelector('.network-icon');
    fetch(networkImage.src).then(response => response.text()).then(text => {
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      svg.classList.add('network-svg');
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.querySelectorAll('line').forEach(line => line.classList.add(Number(line.getAttribute('x1')) < 100 ? 'network-first' : 'network-second'));
      svg.querySelectorAll('circle').forEach(circle => {
        const x = Number(circle.getAttribute('cx'));
        circle.classList.add(x < 100 ? 'network-input' : x > 200 ? 'network-output' : 'network-hidden');
      });
      networkImage.replaceWith(svg);
    }).catch(() => {});
    new IntersectionObserver(([entry]) => {
      modelEquation.classList.toggle('motion-live', entry.isIntersecting && !reduceMotion.matches);
    }, { threshold: .25 }).observe(modelEquation);
  }

  const trainingPool = document.querySelector('.training-pool');
  if (trainingPool) {
    let trainingTimer = 0;
    let trainingAnimationToken = 0;
    let trainingIndex = 0;
    const donut = trainingPool.querySelector('.training-donut');
    const total = trainingPool.querySelector('.training-donut strong');
    const sourceGroups = [...trainingPool.querySelectorAll('.training-source-group')].map(group => [...group.querySelectorAll('li')]);
    const sourceItems = sourceGroups.flat();
    const startSourceLoop = () => {
      if (reduceMotion.matches || trainingTimer) return;
      const advance = () => {
        sourceItems.forEach(item => item.classList.remove('data-arrival'));
        sourceGroups.forEach(items => items[trainingIndex % items.length].classList.add('data-arrival'));
        trainingIndex++;
      };
      advance();
      trainingTimer = setInterval(advance, 850);
    };
    const stopSourceLoop = () => {
      clearInterval(trainingTimer);
      trainingTimer = 0;
      sourceItems.forEach(item => item.classList.remove('data-arrival'));
    };
    new IntersectionObserver(([entry]) => {
      trainingPool.classList.toggle('motion-live', entry.isIntersecting && !reduceMotion.matches);
      if (!entry.isIntersecting) { stopSourceLoop(); trainingAnimationToken++; return; }
      startSourceLoop();
      [...trainingPool.querySelectorAll('.training-source-group h4>span'), ...trainingPool.querySelectorAll('.training-own span')].forEach((element, index) => animateNumberInText(element, index * 55, 1050));
      const legendSpecs = [...trainingPool.querySelectorAll('.training-legend strong')].map(element => {
        if (!element.dataset.numberOriginal) element.dataset.numberOriginal = element.textContent;
        const match = element.dataset.numberOriginal.match(/\d+(?:\.\d+)?/);
        return { element, target: Number(match[0]), decimals: (match[0].split('.')[1] || '').length, suffix: element.dataset.numberOriginal.slice(match.index + match[0].length) };
      });
      if (reduceMotion.matches) {
        donut.style.setProperty('--animated-share', '53.1549%');
        legendSpecs.forEach(spec => { spec.element.textContent = `${spec.target.toFixed(spec.decimals)}${spec.suffix}`; });
      }
      else {
        const token = ++trainingAnimationToken;
        const started = performance.now();
        const duration = 1350;
        const tick = now => {
          if (token !== trainingAnimationToken) return;
          const progress = Math.max(0, Math.min(1, (now - started) / duration));
          const eased = 1 - Math.pow(1 - progress, 3);
          donut.style.setProperty('--animated-share', `${53.1549 * eased}%`);
          const textNode = [...total.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
          if (textNode) textNode.nodeValue = String(Math.round(280 * eased));
          legendSpecs.forEach(spec => { spec.element.textContent = `${(spec.target * eased).toFixed(spec.decimals)}${spec.suffix}`; });
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: .32 }).observe(trainingPool);
  }

  const metricsSection = document.querySelector('.metrics-section');
  const metricCharts = document.querySelector('.metric-charts');
  let metricsVisible = false;
  let metricLoop = 0;
  let metricStartTimer = 0;
  let metricCardIndex = 0;
  function animateMetricRow(row, delay, duration) {
    const bar = row.querySelector('i span');
    const number = row.querySelector('b');
    if (!bar.dataset.targetWidth) bar.dataset.targetWidth = bar.style.width;
    if (!number.dataset.targetValue) number.dataset.targetValue = number.textContent;
    const targetWidth = bar.dataset.targetWidth;
    const targetValue = Number(number.dataset.targetValue);
    const digits = (number.dataset.targetValue.split('.')[1] || '').length;
    const token = String(Number(number.dataset.metricToken || 0) + 1);
    number.dataset.metricToken = token;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    number.textContent = (0).toFixed(digits);
    setTimeout(() => {
      if (number.dataset.metricToken !== token) return;
      const started = performance.now();
      const count = now => {
        if (number.dataset.metricToken !== token) return;
        const progress = Math.max(0, Math.min(1, (now - started) / duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        number.textContent = (targetValue * eased).toFixed(digits);
        bar.style.width = `${parseFloat(targetWidth) * eased}%`;
        if (progress < 1) requestAnimationFrame(count);
      };
      requestAnimationFrame(count);
    }, delay);
  }
  function animateMetrics() {
    if (!metricsVisible || reduceMotion.matches) return;
    const cards = [...metricCharts.querySelectorAll('.metric-card')];
    cards.forEach((card, cardIndex) => {
      card.classList.add('metric-enter');
      card.classList.remove('metric-visible');
      card.style.transitionDelay = '0ms';
      card.querySelectorAll('.metric-row').forEach((row, rowIndex) => {
        card.classList.add('metric-visible');
        animateMetricRow(row, 0, 820);
      });
    });
  }
  function startMetricLoop() {
    if (reduceMotion.matches || metricLoop) return;
    const pulse = () => {
      const cards = [...metricCharts.querySelectorAll('.metric-card')];
      if (!cards.length) return;
      cards.forEach(card => card.classList.remove('metric-focus'));
      const card = cards[metricCardIndex++ % cards.length];
      card.classList.add('metric-focus');
      card.querySelectorAll('.metric-row').forEach((row, rowIndex) => {
        animateMetricRow(row, 0, 760);
      });
    };
    pulse();
    metricLoop = setInterval(pulse, 1450);
  }
  function stopMetricLoop() {
    clearInterval(metricLoop);
    metricLoop = 0;
    clearTimeout(metricStartTimer);
    metricStartTimer = 0;
    metricCharts.querySelectorAll('.metric-card').forEach(card => card.classList.remove('metric-focus'));
  }
  if (metricsSection && metricCharts) {
    const scheduleMetricLoop = () => { clearTimeout(metricStartTimer); metricStartTimer = setTimeout(startMetricLoop, 1100); };
    new IntersectionObserver(([entry]) => {
      metricsVisible = entry.isIntersecting;
      metricsSection.classList.toggle('motion-live', metricsVisible && !reduceMotion.matches);
      if (metricsVisible) { animateMetrics(); scheduleMetricLoop(); }
      else stopMetricLoop();
    }, { threshold: .18 }).observe(metricsSection);
    new MutationObserver(() => requestAnimationFrame(() => { animateMetrics(); if (metricsVisible) { stopMetricLoop(); scheduleMetricLoop(); } })).observe(metricCharts, { childList: true });
  }

  const citationCopy = document.querySelector('.citation-copy');
  citationCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.querySelector('#bibtex').innerText);
      citationCopy.textContent = 'Copied';
    } catch {
      citationCopy.textContent = 'Select & copy';
    }
    setTimeout(() => { citationCopy.textContent = 'Copy'; }, 1600);
  });

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      document.body.style.setProperty('--scroll-progress', `${max > 0 ? scrollY / max * 100 : 0}%`);
      ticking = false;
    });
  }, { passive: true });
  dispatchEvent(new Event('scroll'));
  document.addEventListener('visibilitychange', playVisibleMedia);
})();
