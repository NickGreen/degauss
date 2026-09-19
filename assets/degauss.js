/* Degauss: momentary RGB-split glitch over the whole page, on a random timer. */

(function () {
	'use strict';

	var SVG_NS = 'http://www.w3.org/2000/svg';
	var FILTER_ID = 'degauss';
	var ACTIVE_CLASS = 'degauss-on';
	var DEFAULTS = {
		frequency: 1,
		intensity: 1,
		autostart: 1
	};
	var MATRIX = {
		r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
		g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
		b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
	};

	var root = document.documentElement;
	var config = readConfig();
	var filter = null;
	var waitTimer = null;
	var frameTimer = null;
	var running = false;

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function toNumber(value, fallback) {
		var n = parseFloat(value);
		return isFinite(n) ? n : fallback;
	}

	function readConfig() {
		var global = window.DegaussConfig || {};
		var script = document.currentScript;
		var data = script && script.dataset ? script.dataset : {};
		var out = {};
		Object.keys(DEFAULTS).forEach(function (key) {
			var value = DEFAULTS[key];
			if (global[key] !== undefined) {
				value = toNumber(global[key], value);
			}
			if (data[key] !== undefined) {
				value = toNumber(data[key], value);
			}
			out[key] = value;
		});
		return out;
	}

	function rand(min, max) {
		return min + Math.random() * (max - min);
	}

	function randInt(min, max) {
		return Math.round(rand(min, max));
	}

	function lerp(from, to, t) {
		return from + (to - from) * t;
	}

	function chance(probability) {
		return Math.random() < probability;
	}

	function levelT(value) {
		return (clamp(Math.round(toNumber(value, 1)), 1, 10) - 1) / 9;
	}

	function reducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/* Seconds until the next burst: level 1 waits 30-90s, level 10 waits 1-3s. */
	function delaySeconds() {
		var min = 30 * Math.pow(1 / 30, levelT(config.frequency));
		return rand(min, min * 3);
	}

	/* Randomised shape of one burst for the current intensity level. */
	function burstPlan() {
		var t = levelT(config.intensity);
		return {
			frames: Math.max(1, randInt(lerp(3, 8, t) - 1, lerp(3, 8, t) + 1)),
			frameMs: lerp(60, 130, t) * rand(0.7, 1.3),
			offset: lerp(6, 40, t),
			vertical: lerp(1, 12, t),
			verticalChance: lerp(0.3, 0.8, t),
			flipChance: lerp(0, 0.5, t),
			smear: chance(t) ? rand(1, lerp(1, 6, t)) : 0,
			tear: t > 0.3 && chance(t) ? rand(4, lerp(4, 40, t)) : 0
		};
	}

	function svgElement(name, attrs) {
		var node = document.createElementNS(SVG_NS, name);
		Object.keys(attrs).forEach(function (key) {
			node.setAttribute(key, attrs[key]);
		});
		return node;
	}

	function inject() {
		if (filter) {
			return;
		}
		var svg = svgElement('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
		svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
		filter = svgElement('filter', { id: FILTER_ID, 'color-interpolation-filters': 'sRGB' });
		svg.appendChild(filter);

		var style = document.createElement('style');
		style.textContent = 'html.' + ACTIVE_CLASS + '{filter:url(#' + FILTER_ID + ')}';

		document.head.appendChild(style);
		(document.body || root).appendChild(svg);
	}

	function signed(magnitude, plan) {
		return chance(plan.flipChance) ? -magnitude : magnitude;
	}

	/* Rebuild the filter chain with fresh random values for one frame. */
	function renderFrame(plan) {
		var source = 'SourceGraphic';
		var dy = chance(plan.verticalChance) ? randInt(-plan.vertical, plan.vertical) : 0;
		var nodes = [];

		if (plan.tear) {
			nodes.push(svgElement('feTurbulence', {
				type: 'fractalNoise',
				baseFrequency: '0 ' + rand(0.01, 0.06).toFixed(3),
				numOctaves: '1',
				seed: String(randInt(1, 1000)),
				result: 'noise'
			}));
			nodes.push(svgElement('feDisplacementMap', {
				'in': 'SourceGraphic',
				in2: 'noise',
				scale: String(Math.round(plan.tear)),
				xChannelSelector: 'R',
				yChannelSelector: 'G',
				result: 'torn'
			}));
			source = 'torn';
		}

		nodes.push(svgElement('feColorMatrix', { 'in': source, type: 'matrix', values: MATRIX.r, result: 'r' }));
		nodes.push(svgElement('feOffset', { 'in': 'r', dx: String(signed(-randInt(1, plan.offset), plan)), dy: String(dy), result: 'ro' }));
		nodes.push(svgElement('feColorMatrix', { 'in': source, type: 'matrix', values: MATRIX.g, result: 'g' }));
		nodes.push(svgElement('feColorMatrix', { 'in': source, type: 'matrix', values: MATRIX.b, result: 'b' }));
		nodes.push(svgElement('feOffset', { 'in': 'b', dx: String(signed(randInt(1, plan.offset), plan)), dy: String(-dy), result: 'bo' }));
		nodes.push(svgElement('feBlend', { 'in': 'ro', in2: 'g', mode: 'screen', result: 'rg' }));
		nodes.push(svgElement('feBlend', { 'in': 'rg', in2: 'bo', mode: 'screen', result: 'rgb' }));

		if (plan.smear) {
			nodes.push(svgElement('feGaussianBlur', { 'in': 'rgb', stdDeviation: plan.smear.toFixed(1) + ' 0' }));
		}

		while (filter.firstChild) {
			filter.removeChild(filter.firstChild);
		}
		nodes.forEach(function (node) {
			filter.appendChild(node);
		});
	}

	function clearTimers() {
		window.clearTimeout(waitTimer);
		window.clearTimeout(frameTimer);
		waitTimer = null;
		frameTimer = null;
	}

	function schedule() {
		window.clearTimeout(waitTimer);
		waitTimer = null;
		if (!running || document.hidden) {
			return;
		}
		waitTimer = window.setTimeout(burst, delaySeconds() * 1000);
	}

	function frame(plan, remaining) {
		renderFrame(plan);
		root.classList.add(ACTIVE_CLASS);
		frameTimer = window.setTimeout(function () {
			if (remaining > 1) {
				frame(plan, remaining - 1);
			} else {
				settle();
			}
		}, plan.frameMs);
	}

	function settle() {
		root.classList.remove(ACTIVE_CLASS);
		frameTimer = null;
		schedule();
	}

	function run() {
		var plan = burstPlan();
		inject();
		frame(plan, plan.frames);
	}

	function burst() {
		waitTimer = null;
		if (frameTimer || reducedMotion()) {
			schedule();
			return;
		}
		run();
	}

	function fire() {
		if (frameTimer) {
			return;
		}
		window.clearTimeout(waitTimer);
		waitTimer = null;
		run();
	}

	function start() {
		if (running || reducedMotion()) {
			return;
		}
		running = true;
		inject();
		schedule();
	}

	function stop() {
		running = false;
		clearTimers();
		root.classList.remove(ACTIVE_CLASS);
	}

	function onVisibilityChange() {
		if (document.hidden) {
			clearTimers();
			root.classList.remove(ACTIVE_CLASS);
		} else {
			schedule();
		}
	}

	document.addEventListener('visibilitychange', onVisibilityChange);

	window.Degauss = { fire: fire, start: start, stop: stop, config: config };

	if (config.autostart) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', start);
		} else {
			start();
		}
	}
})();
