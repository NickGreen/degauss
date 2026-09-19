/* Degauss settings screen: mirror slider values and fire test bursts. */

(function () {
	'use strict';

	function sync(input) {
		var output = document.querySelector('output[for="' + input.id + '"]');
		if (output) {
			output.value = input.value;
		}
		if (window.Degauss) {
			window.Degauss.config[input.dataset.key] = parseInt(input.value, 10);
		}
	}

	function onInput(event) {
		sync(event.target);
	}

	function onTest() {
		if (window.Degauss) {
			window.Degauss.fire();
		}
	}

	function init() {
		Array.prototype.forEach.call(document.querySelectorAll('.degauss-slider'), function (input) {
			input.addEventListener('input', onInput);
			sync(input);
		});
		var button = document.getElementById('degauss-test');
		if (button) {
			button.addEventListener('click', onTest);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
