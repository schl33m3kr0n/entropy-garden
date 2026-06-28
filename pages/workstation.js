(function () {
  'use strict';

  const STORAGE_KEY = 'entropy_garden_workstation_v1';
  const GRID = 20;
  const VIEWBOX = { w: 720, h: 480 };

  const artboard = document.getElementById('artboard');
  const content = document.getElementById('content');
  const preview = document.getElementById('preview');
  const selectionLayer = document.getElementById('selection');
  const gridBg = document.getElementById('grid-bg');
  const artboardBg = document.getElementById('artboard-bg');
  const svgOutput = document.getElementById('svg-output');
  const layerList = document.getElementById('layer-list');
  const selectionLabel = document.getElementById('selection-label');
  const textField = document.getElementById('text-field');

  const props = {
    fill: document.getElementById('prop-fill'),
    fillNone: document.getElementById('prop-fill-none'),
    stroke: document.getElementById('prop-stroke'),
    strokeNone: document.getElementById('prop-stroke-none'),
    strokeWidth: document.getElementById('prop-stroke-width'),
    x: document.getElementById('prop-x'),
    y: document.getElementById('prop-y'),
    w: document.getElementById('prop-w'),
    h: document.getElementById('prop-h'),
    text: document.getElementById('prop-text'),
    fontSize: document.getElementById('prop-font-size'),
  };

  let shapes = [];
  let selectedId = null;
  let tool = 'select';
  let snapGrid = true;
  let showGrid = true;
  let history = [];
  let drag = null;
  let nextId = 1;
  let suppressPropSync = false;

  const defaultStyle = {
    fill: '#ffffff',
    fillNone: false,
    stroke: '#000000',
    strokeNone: false,
    strokeWidth: 2,
    fontSize: 24,
  };

  function uid(prefix) {
    return `${prefix}-${nextId++}`;
  }

  function snap(value) {
    return snapGrid ? Math.round(value / GRID) * GRID : Math.round(value * 10) / 10;
  }

  function cloneShapes(list) {
    return JSON.parse(JSON.stringify(list));
  }

  function pushHistory() {
    history.push(cloneShapes(shapes));
    if (history.length > 40) history.shift();
  }

  function undo() {
    if (!history.length) return;
    shapes = history.pop();
    if (selectedId && !shapes.find((s) => s.id === selectedId)) selectedId = null;
    render();
  }

  function getShape(id) {
    return shapes.find((s) => s.id === id);
  }

  function select(id) {
    selectedId = id;
    syncInspector();
    renderSelection();
    renderLayers();
  }

  function deselect() {
    selectedId = null;
    syncInspector();
    renderSelection();
    renderLayers();
  }

  function deleteSelected() {
    if (!selectedId) return;
    pushHistory();
    shapes = shapes.filter((s) => s.id !== selectedId);
    selectedId = null;
    render();
  }

  function svgPoint(evt) {
    const pt = artboard.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = artboard.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: snap(local.x), y: snap(local.y) };
  }

  function shapeBounds(shape) {
    if (shape.type === 'rect') {
      return { x: shape.x, y: shape.y, w: shape.width, h: shape.height };
    }
    if (shape.type === 'ellipse') {
      return {
        x: shape.cx - shape.rx,
        y: shape.cy - shape.ry,
        w: shape.rx * 2,
        h: shape.ry * 2,
      };
    }
    if (shape.type === 'line') {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      return {
        x,
        y,
        w: Math.abs(shape.x2 - shape.x1) || 1,
        h: Math.abs(shape.y2 - shape.y1) || 1,
      };
    }
    if (shape.type === 'text') {
      const w = Math.max(24, shape.text.length * shape.fontSize * 0.55);
      return { x: shape.x, y: shape.y - shape.fontSize, w, h: shape.fontSize * 1.2 };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function paintShape(shape) {
    const fill = shape.fillNone ? 'none' : shape.fill;
    const stroke = shape.strokeNone ? 'none' : shape.stroke;
    const sw = shape.strokeWidth;

    if (shape.type === 'rect') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', shape.x);
      el.setAttribute('y', shape.y);
      el.setAttribute('width', Math.max(0, shape.width));
      el.setAttribute('height', Math.max(0, shape.height));
      el.setAttribute('fill', fill);
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-width', sw);
      return el;
    }

    if (shape.type === 'ellipse') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      el.setAttribute('cx', shape.cx);
      el.setAttribute('cy', shape.cy);
      el.setAttribute('rx', Math.max(0, shape.rx));
      el.setAttribute('ry', Math.max(0, shape.ry));
      el.setAttribute('fill', fill);
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-width', sw);
      return el;
    }

    if (shape.type === 'line') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', shape.x1);
      el.setAttribute('y1', shape.y1);
      el.setAttribute('x2', shape.x2);
      el.setAttribute('y2', shape.y2);
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-width', sw);
      el.setAttribute('fill', 'none');
      return el;
    }

    if (shape.type === 'text') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      el.setAttribute('x', shape.x);
      el.setAttribute('y', shape.y);
      el.setAttribute('fill', fill);
      el.setAttribute('stroke', 'none');
      el.setAttribute('font-size', shape.fontSize);
      el.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
      el.setAttribute('font-weight', 'bold');
      el.textContent = shape.text;
      return el;
    }

    return null;
  }

  function renderContent() {
    content.replaceChildren();
    shapes.forEach((shape) => {
      const el = paintShape(shape);
      if (!el) return;
      el.dataset.id = shape.id;
      el.classList.add('ws-shape');
      if (shape.id === selectedId) el.classList.add('is-selected');
      content.appendChild(el);
    });
  }

  function renderSelection() {
    selectionLayer.replaceChildren();
    if (!selectedId) return;
    const shape = getShape(selectedId);
    if (!shape) return;

    const b = shapeBounds(shape);
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', b.x - 4);
    box.setAttribute('y', b.y - 4);
    box.setAttribute('width', b.w + 8);
    box.setAttribute('height', b.h + 8);
    box.setAttribute('fill', 'none');
    box.setAttribute('stroke', '#0f0');
    box.setAttribute('stroke-width', '1.5');
    box.setAttribute('stroke-dasharray', '4 3');
    box.setAttribute('pointer-events', 'none');
    selectionLayer.appendChild(box);
  }

  function renderLayers() {
    layerList.replaceChildren();
    [...shapes].reverse().forEach((shape) => {
      const li = document.createElement('li');
      li.className = 'ws-layer' + (shape.id === selectedId ? ' is-selected' : '');
      li.innerHTML = `<span>${shape.name || shape.id}</span><span class="ws-layer-type">${shape.type}</span>`;
      li.addEventListener('click', () => select(shape.id));
      layerList.appendChild(li);
    });
  }

  function exportSvgMarkup() {
    const lines = shapes.map((shape) => {
      const fill = shape.fillNone ? 'none' : shape.fill;
      const stroke = shape.strokeNone ? 'none' : shape.stroke;
      const sw = shape.strokeWidth;
      if (shape.type === 'rect') {
        return `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`;
      }
      if (shape.type === 'ellipse') {
        return `  <ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`;
      }
      if (shape.type === 'line') {
        return `  <line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${stroke}" stroke-width="${sw}" />`;
      }
      if (shape.type === 'text') {
        return `  <text x="${shape.x}" y="${shape.y}" fill="${fill}" font-size="${shape.fontSize}" font-family="Helvetica, Arial, sans-serif" font-weight="bold">${escapeXml(shape.text)}</text>`;
      }
      return '';
    }).filter(Boolean);

    return [
      `<svg viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}" xmlns="http://www.w3.org/2000/svg">`,
      ...lines,
      '</svg>',
    ].join('\n');
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderExport() {
    svgOutput.value = exportSvgMarkup();
  }

  function render() {
    renderContent();
    renderSelection();
    renderLayers();
    renderExport();
    syncInspector();
    saveLocal();
  }

  function syncInspector() {
    suppressPropSync = true;
    const shape = selectedId ? getShape(selectedId) : null;
    if (!shape) {
      selectionLabel.textContent = 'Nothing selected';
      textField.hidden = true;
      props.x.value = '';
      props.y.value = '';
      props.w.value = '';
      props.h.value = '';
      props.text.value = '';
      suppressPropSync = false;
      return;
    }

    selectionLabel.textContent = `${shape.name || shape.id} (${shape.type})`;
    props.fill.value = toColorInput(shape.fill);
    props.fillNone.checked = !!shape.fillNone;
    props.stroke.value = toColorInput(shape.stroke);
    props.strokeNone.checked = !!shape.strokeNone;
    props.strokeWidth.value = shape.strokeWidth;
    props.fontSize.value = shape.fontSize || defaultStyle.fontSize;
    textField.hidden = shape.type !== 'text';

    const b = shapeBounds(shape);
    props.x.value = Math.round(b.x);
    props.y.value = Math.round(b.y);
    props.w.value = Math.round(b.w);
    props.h.value = Math.round(b.h);
    if (shape.type === 'text') props.text.value = shape.text;
    suppressPropSync = false;
  }

  function toColorInput(color) {
    if (!color || color === 'none') return '#000000';
    if (color.startsWith('#') && color.length === 7) return color;
    return '#000000';
  }

  function applyInspector(recordHistory) {
    if (suppressPropSync) return;
    const shape = selectedId ? getShape(selectedId) : null;
    if (!shape) return;

    if (recordHistory) pushHistory();
    shape.fill = props.fill.value;
    shape.fillNone = props.fillNone.checked;
    shape.stroke = props.stroke.value;
    shape.strokeNone = props.strokeNone.checked;
    shape.strokeWidth = Number(props.strokeWidth.value) || 0;
    shape.fontSize = Number(props.fontSize.value) || defaultStyle.fontSize;

    const nx = Number(props.x.value);
    const ny = Number(props.y.value);
    const nw = Number(props.w.value);
    const nh = Number(props.h.value);

    if (shape.type === 'rect' && !Number.isNaN(nx) && !Number.isNaN(ny)) {
      shape.x = nx;
      shape.y = ny;
      if (!Number.isNaN(nw)) shape.width = Math.max(0, nw);
      if (!Number.isNaN(nh)) shape.height = Math.max(0, nh);
    } else if (shape.type === 'ellipse' && !Number.isNaN(nx) && !Number.isNaN(ny)) {
      shape.cx = nx + (Number.isNaN(nw) ? shape.rx : nw / 2);
      shape.cy = ny + (Number.isNaN(nh) ? shape.ry : nh / 2);
      if (!Number.isNaN(nw)) shape.rx = Math.max(0, nw / 2);
      if (!Number.isNaN(nh)) shape.ry = Math.max(0, nh / 2);
    } else if (shape.type === 'line') {
      const b = shapeBounds(shape);
      if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
        const dx = nx - b.x;
        const dy = ny - b.y;
        shape.x1 += dx;
        shape.x2 += dx;
        shape.y1 += dy;
        shape.y2 += dy;
      }
    } else if (shape.type === 'text') {
      if (!Number.isNaN(nx)) shape.x = nx;
      if (!Number.isNaN(ny)) shape.y = ny + (shape.fontSize || defaultStyle.fontSize);
      shape.text = props.text.value || 'Text';
    }

    render();
  }

  function hitTest(point) {
    for (let i = shapes.length - 1; i >= 0; i -= 1) {
      const shape = shapes[i];
      const b = shapeBounds(shape);
      if (
        point.x >= b.x &&
        point.x <= b.x + b.w &&
        point.y >= b.y &&
        point.y <= b.y + b.h
      ) {
        return shape.id;
      }
    }
    return null;
  }

  function newShapeDraft(type, start, end, style) {
    const s = { ...defaultStyle, ...style, id: uid(type), type, name: type };

    if (type === 'rect') {
      s.x = Math.min(start.x, end.x);
      s.y = Math.min(start.y, end.y);
      s.width = Math.abs(end.x - start.x);
      s.height = Math.abs(end.y - start.y);
    } else if (type === 'ellipse') {
      s.cx = (start.x + end.x) / 2;
      s.cy = (start.y + end.y) / 2;
      s.rx = Math.abs(end.x - start.x) / 2;
      s.ry = Math.abs(end.y - start.y) / 2;
    } else if (type === 'line') {
      s.x1 = start.x;
      s.y1 = start.y;
      s.x2 = end.x;
      s.y2 = end.y;
      s.fillNone = true;
    } else if (type === 'text') {
      s.x = start.x;
      s.y = start.y;
      s.text = 'Text';
      s.fill = style?.fill || '#e53a33';
      s.fillNone = false;
      s.strokeNone = true;
    }

    return s;
  }

  function renderPreview(shape) {
    preview.replaceChildren();
    if (!shape) return;
    const el = paintShape(shape);
    if (el) {
      el.setAttribute('opacity', '0.65');
      preview.appendChild(el);
    }
  }

  function constrainEnd(start, end, keepSquare) {
    if (!keepSquare) return end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + Math.sign(dx || 1) * size,
      y: start.y + Math.sign(dy || 1) * size,
    };
  }

  function onPointerDown(evt) {
    if (evt.button !== 0) return;
    artboard.setPointerCapture(evt.pointerId);
    const point = svgPoint(evt);

    if (tool === 'select') {
      const hit = hitTest(point);
      if (hit) {
        select(hit);
        const shape = getShape(hit);
        drag = {
          mode: 'move',
          id: hit,
          start: point,
          origin: cloneShapes([shape])[0],
        };
      } else {
        deselect();
      }
      return;
    }

    if (tool === 'text') {
      pushHistory();
      const shape = newShapeDraft('text', point, point, {
        fontSize: Number(props.fontSize.value) || defaultStyle.fontSize,
        fill: props.fill.value,
      });
      shapes.push(shape);
      select(shape.id);
      render();
      return;
    }

    drag = {
      mode: 'draw',
      tool,
      start: point,
      keepSquare: evt.shiftKey,
    };
  }

  function onPointerMove(evt) {
    if (!drag) return;
    let point = svgPoint(evt);

    if (drag.mode === 'move') {
      const shape = getShape(drag.id);
      if (!shape) return;
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      const origin = drag.origin;

      if (shape.type === 'rect') {
        shape.x = origin.x + dx;
        shape.y = origin.y + dy;
      } else if (shape.type === 'ellipse') {
        shape.cx = origin.cx + dx;
        shape.cy = origin.cy + dy;
      } else if (shape.type === 'line') {
        shape.x1 = origin.x1 + dx;
        shape.y1 = origin.y1 + dy;
        shape.x2 = origin.x2 + dx;
        shape.y2 = origin.y2 + dy;
      } else if (shape.type === 'text') {
        shape.x = origin.x + dx;
        shape.y = origin.y + dy;
      }

      renderContent();
      renderSelection();
      renderExport();
      return;
    }

    if (drag.mode === 'draw') {
      point = constrainEnd(drag.start, point, evt.shiftKey || drag.keepSquare);
      const draft = newShapeDraft(drag.tool, drag.start, point, {
        fill: props.fillNone.checked ? defaultStyle.fill : props.fill.value,
        fillNone: props.fillNone.checked,
        stroke: props.stroke.value,
        strokeNone: props.strokeNone.checked,
        strokeWidth: Number(props.strokeWidth.value) || defaultStyle.strokeWidth,
      });
      renderPreview(draft);
    }
  }

  function onPointerUp(evt) {
    if (!drag) return;

    if (drag.mode === 'draw') {
      let point = svgPoint(evt);
      point = constrainEnd(drag.start, point, evt.shiftKey || drag.keepSquare);
      const shape = newShapeDraft(drag.tool, drag.start, point, {
        fill: props.fillNone.checked ? defaultStyle.fill : props.fill.value,
        fillNone: props.fillNone.checked,
        stroke: props.stroke.value,
        strokeNone: props.strokeNone.checked,
        strokeWidth: Number(props.strokeWidth.value) || defaultStyle.strokeWidth,
      });

      const tooSmall =
        (shape.type === 'rect' && (shape.width < 2 || shape.height < 2)) ||
        (shape.type === 'ellipse' && (shape.rx < 1 || shape.ry < 1)) ||
        (shape.type === 'line' &&
          Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) < 2);

      if (!tooSmall) {
        pushHistory();
        shapes.push(shape);
        select(shape.id);
      }
    } else if (drag.mode === 'move') {
      pushHistory();
    }

    preview.replaceChildren();
    drag = null;
    render();
  }

  function setTool(next) {
    tool = next;
    artboard.dataset.tool = next;
    document.querySelectorAll('.ws-tool').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tool === next);
    });
  }

  function loadConvergencePreset(recordHistory) {
    if (recordHistory !== false) pushHistory();
    shapes = [
      { id: uid('rect'), type: 'rect', name: 'left frame', x: 4, y: 4, width: 236, height: 472, fill: '#ffffff', fillNone: false, stroke: '#000000', strokeNone: false, strokeWidth: 10 },
      { id: uid('rect'), type: 'rect', name: 'right frame', x: 240, y: 4, width: 476, height: 472, fill: '#ffffff', fillNone: false, stroke: '#000000', strokeNone: false, strokeWidth: 10 },
      { id: uid('rect'), type: 'rect', name: 'red inset', x: 24, y: 24, width: 196, height: 432, fill: 'none', fillNone: true, stroke: '#e53a33', strokeNone: false, strokeWidth: 2.5 },
      { id: uid('line'), type: 'line', name: 'red midline', x1: 24, y1: 240, x2: 220, y2: 240, fillNone: true, stroke: '#e53a33', strokeNone: false, strokeWidth: 2 },
      { id: uid('line'), type: 'line', name: 'red spine', x1: 68, y1: 24, x2: 68, y2: 456, fillNone: true, stroke: '#e53a33', strokeNone: false, strokeWidth: 2 },
      { id: uid('text'), type: 'text', name: 'label 1 TL', x: 40, y: 52, text: '1', fill: '#e53a33', fillNone: false, strokeNone: true, strokeWidth: 0, fontSize: 28 },
      { id: uid('text'), type: 'text', name: 'label 0 L', x: 40, y: 252, text: '0', fill: '#e53a33', fillNone: false, strokeNone: true, strokeWidth: 0, fontSize: 28 },
      { id: uid('ellipse'), type: 'ellipse', name: 'target outer', cx: 518, cy: 240, rx: 155, ry: 155, fill: 'none', fillNone: true, stroke: '#e53a33', strokeNone: false, strokeWidth: 2.5 },
      { id: uid('ellipse'), type: 'ellipse', name: 'target mid', cx: 518, cy: 240, rx: 94, ry: 94, fill: 'none', fillNone: true, stroke: '#f0c800', strokeNone: false, strokeWidth: 2 },
      { id: uid('ellipse'), type: 'ellipse', name: 'target inner', cx: 518, cy: 240, rx: 52, ry: 52, fill: 'none', fillNone: true, stroke: '#0f669b', strokeNone: false, strokeWidth: 2 },
      { id: uid('ellipse'), type: 'ellipse', name: 'center dot', cx: 518, cy: 240, rx: 10, ry: 10, fill: '#f0c800', fillNone: false, stroke: '#000000', strokeNone: false, strokeWidth: 2 },
      { id: uid('line'), type: 'line', name: 'cross V', x1: 518, y1: 4, x2: 518, y2: 476, fillNone: true, stroke: '#000000', strokeNone: false, strokeWidth: 2.5 },
      { id: uid('line'), type: 'line', name: 'cross H', x1: 240, y1: 240, x2: 716, y2: 240, fillNone: true, stroke: '#000000', strokeNone: false, strokeWidth: 2.5 },
    ];
    selectedId = null;
    render();
  }

  function clearDocument() {
    if (shapes.length && !window.confirm('Clear the artboard?')) return;
    pushHistory();
    shapes = [];
    selectedId = null;
    render();
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes, nextId }));
    } catch (_) { /* ignore quota */ }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.shapes)) return false;
      shapes = data.shapes;
      nextId = data.nextId || shapes.length + 1;
      return true;
    } catch (_) {
      return false;
    }
  }

  function importSvgFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(reader.result), 'image/svg+xml');
      const imported = [];
      doc.querySelectorAll('rect, ellipse, line, text').forEach((node) => {
        const tag = node.tagName.toLowerCase();
        const base = {
          id: uid(tag),
          type: tag,
          name: tag,
          fill: node.getAttribute('fill') || defaultStyle.fill,
          fillNone: node.getAttribute('fill') === 'none',
          stroke: node.getAttribute('stroke') || defaultStyle.stroke,
          strokeNone: node.getAttribute('stroke') === 'none',
          strokeWidth: Number(node.getAttribute('stroke-width')) || defaultStyle.strokeWidth,
        };
        if (tag === 'rect') {
          imported.push({
            ...base,
            x: Number(node.getAttribute('x')) || 0,
            y: Number(node.getAttribute('y')) || 0,
            width: Number(node.getAttribute('width')) || 0,
            height: Number(node.getAttribute('height')) || 0,
          });
        } else if (tag === 'ellipse') {
          imported.push({
            ...base,
            cx: Number(node.getAttribute('cx')) || 0,
            cy: Number(node.getAttribute('cy')) || 0,
            rx: Number(node.getAttribute('rx')) || 0,
            ry: Number(node.getAttribute('ry')) || 0,
          });
        } else if (tag === 'line') {
          imported.push({
            ...base,
            x1: Number(node.getAttribute('x1')) || 0,
            y1: Number(node.getAttribute('y1')) || 0,
            x2: Number(node.getAttribute('x2')) || 0,
            y2: Number(node.getAttribute('y2')) || 0,
            fillNone: true,
          });
        } else if (tag === 'text') {
          imported.push({
            ...base,
            x: Number(node.getAttribute('x')) || 0,
            y: Number(node.getAttribute('y')) || 0,
            text: node.textContent || 'Text',
            fontSize: Number(node.getAttribute('font-size')) || defaultStyle.fontSize,
            strokeNone: true,
          });
        }
      });
      if (!imported.length) {
        window.alert('No supported shapes found in that SVG.');
        return;
      }
      pushHistory();
      shapes = imported;
      selectedId = null;
      render();
    };
    reader.readAsText(file);
  }

  function copySvg() {
    const markup = exportSvgMarkup();
    navigator.clipboard.writeText(markup).then(() => {
      document.getElementById('btn-copy-svg').textContent = 'Copied!';
      setTimeout(() => {
        document.getElementById('btn-copy-svg').textContent = 'Copy SVG';
      }, 1200);
    }).catch(() => {
      svgOutput.select();
      document.execCommand('copy');
    });
  }

  function downloadSvg() {
    const blob = new Blob([exportSvgMarkup()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workstation-export.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateGridVisibility() {
    gridBg.style.display = showGrid ? 'block' : 'none';
  }

  document.querySelectorAll('.ws-tool').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  document.getElementById('btn-delete').addEventListener('click', deleteSelected);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-new').addEventListener('click', clearDocument);
  document.getElementById('btn-load-convergence').addEventListener('click', loadConvergencePreset);
  document.getElementById('btn-copy-svg').addEventListener('click', copySvg);
  document.getElementById('btn-download').addEventListener('click', downloadSvg);
  document.getElementById('file-import').addEventListener('change', (evt) => {
    const file = evt.target.files?.[0];
    if (file) importSvgFile(file);
    evt.target.value = '';
  });

  document.getElementById('snap-grid').addEventListener('change', (evt) => {
    snapGrid = evt.target.checked;
  });
  document.getElementById('show-grid').addEventListener('change', (evt) => {
    showGrid = evt.target.checked;
    updateGridVisibility();
  });

  Object.values(props).forEach((input) => {
    if (!input || !input.addEventListener) return;
    input.addEventListener('input', () => applyInspector(false));
    input.addEventListener('change', () => applyInspector(true));
  });

  artboard.addEventListener('pointerdown', onPointerDown);
  artboard.addEventListener('pointermove', onPointerMove);
  artboard.addEventListener('pointerup', onPointerUp);
  artboard.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('keydown', (evt) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const key = evt.key.toLowerCase();
    if (key === 'delete' || key === 'backspace') {
      evt.preventDefault();
      deleteSelected();
    }
    if ((evt.metaKey || evt.ctrlKey) && key === 'z') {
      evt.preventDefault();
      undo();
    }
    if (key === 'v') setTool('select');
    if (key === 'r') setTool('rect');
    if (key === 'e') setTool('ellipse');
    if (key === 'l') setTool('line');
    if (key === 't') setTool('text');
    if (key === 'escape') deselect();
  });

  if (!loadLocal()) loadConvergencePreset(false);

  setTool('select');
  updateGridVisibility();
  render();
})();
