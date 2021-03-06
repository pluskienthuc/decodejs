---
---
/**
 * @name  {{ site.name }}
 * @description  {{ site.description }}
 * @author  {{ site.author }} <{{ site.author_email }}> ({{ site.url }})
 * @version  {{ site.version }}
 * @copyright  {{ site.author }} 2017
 * @license  {{ site.license }}
 */

(function () {

    // https://davidwalsh.name/javascript-debounce-function
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        }
    }

    var input = document.getElementById('input'),
        output = document.getElementById('output'),
        view = document.getElementById('view'),

        encode = document.getElementsByName('encode'),

        beautify = document.getElementById('beautify'),
        highlight = document.getElementById('highlight'),

        copyjs = document.getElementById('copyjs'),
        redecode = document.getElementById('redecode'),
        clear = document.getElementById('clear'),

        clipboard = new Clipboard('#copyjs'),
        copytimeout,

        startEffect = function () {
            if (output.value === '') view.textContent = 'Please wait...';
            view.classList.add('waiting');
        },
        stopEffect = function () {
            view.classList.remove('waiting');
        },

        textreset = function () {
            if (copyjs.textContent === 'Copy') return;
            copyjs.textContent = 'Copy';
            copyjs.removeAttribute('style');
        },
        timereset = function () {
            copytimeout = setTimeout(function () {
                textreset();
            }, 3000);
        },

        workerFormat,
        workerDecode,

        format = debounce(function () {
            var source = output.value.trim();

            if (source === '') return;
            if (!beautify.checked && !highlight.checked) {
                view.textContent = source;
                return;
            }

            if (!workerFormat) {
                workerFormat = new Worker('{{ "/assets/js/worker/format.js?v=" | append: site.github.build_revision | relative_url }}');
                workerFormat.addEventListener('message', function (e) {
                    view[(highlight.checked ? 'innerHTML' : 'textContent')] = e.data;
                    stopEffect();
                });
            }

            startEffect();
            workerFormat.postMessage({
                source: source,
                beautify: beautify.checked,
                highlight: highlight.checked
            });
        }, 250),

        decode = debounce(function () {
            var source = input.value.trim(),
                packer = bvDecode.encode.value;

            if (source === '') return;
            if (packer === 'nicify') return;
            if (packer === '') {
                output.value = source;
                format();
                return;
            }

            if (!workerDecode) {
                workerDecode = new Worker('{{ "/assets/js/worker/decode.js?v=" | append: site.github.build_revision | relative_url }}');
                workerDecode.addEventListener('message', function (e) {
                    output.value = e.data;
                    if (!beautify.checked && !highlight.checked) stopEffect();
                    format();
                });
            }

            startEffect();
            output.value = '';
            workerDecode.postMessage({
                source: source,
                packer: packer
            });
        }, 250);

    input.oninput = debounce(function () {
        decode();
    });
    for (var i = 0; i < encode.length; i++) {
        encode[i].onchange = decode;
    }

    beautify.onchange = format;
    highlight.onchange = format;

    copyjs.onmouseout = function () {
        textreset();
        clearTimeout(copytimeout);
    };
    clipboard.on('success', function (e) {
        e.trigger.textContent = 'Copied';
        e.trigger.style.color = '#b5e853';
        e.clearSelection();
        timereset();
    });
    clipboard.on('error', function (e) {
        e.trigger.textContent = 'Selected';
        e.trigger.style.color = '#ff2323';
        timereset();
    });

    redecode.onclick = function () {
        input.value = output.value;
        decode();
    }

    clear.onclick = function () {
        view.textContent = 'Please choose a right encoding type!';
        stopEffect();

        if (workerDecode) {
            workerDecode.terminate();
            workerDecode = undefined;
        }
        if (workerFormat) {
            workerFormat.terminate();
            workerFormat = undefined;
        }
    }

})();