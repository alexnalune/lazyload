var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (global, factory) {
    (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.LazyLoad = factory();
})(this, function () {
    'use strict';

    var defaultSettings = {
        elements_selector: "img",
        container: document,
        threshold: 300,
        data_src: "original",
        data_srcset: "originalSet",
        class_loading: "loading",
        class_loaded: "loaded",
        class_error: "error",
        callback_load: null,
        callback_error: null,
        callback_set: null
    };

    var purgeElements = function purgeElements(elements) {
        return elements.filter(function (element) {
            return !element.dataset.wasProcessed;
        });
    };

    /* Creates instance and notifies it through the window element */
    var createInstance = function createInstance(classObj, options) {
        var instance = new classObj(options);
        var event = new CustomEvent("LazyLoad::Initialized", { detail: { instance: instance } });
        window.dispatchEvent(event);
    };

    /* Auto initialization of one or more instances of lazyload, depending on the 
        options passed in (plain object or an array) */
    var autoInitialize = function autoInitialize(classObj, options) {
        if (!options.length) {
            // Plain object
            createInstance(classObj, options);
        } else {
            // Array of objects
            for (var i = 0, optionsItem; optionsItem = options[i]; i += 1) {
                createInstance(classObj, optionsItem);
            }
        }
    };

    var setSourcesForPicture = function setSourcesForPicture(element, settings) {
        var dataSrcSet = settings.data_srcset;

        var parent = element.parentElement;
        if (parent.tagName !== "PICTURE") {
            return;
        }
        for (var i = 0, pictureChild; pictureChild = parent.children[i]; i += 1) {
            if (pictureChild.tagName === "SOURCE") {
                var sourceSrcset = pictureChild.dataset[dataSrcSet];
                if (sourceSrcset) {
                    pictureChild.setAttribute("srcset", sourceSrcset);
                }
            }
        }
    };

    var setSources = function setSources(element, settings) {
        var dataSrc = settings.data_src,
            dataSrcSet = settings.data_srcset;

        var tagName = element.tagName;
        var elementSrc = element.dataset[dataSrc];
        if (tagName === "IMG") {
            setSourcesForPicture(element, settings);
            var imgSrcset = element.dataset[dataSrcSet];
            if (imgSrcset) {
                element.setAttribute("srcset", imgSrcset);
            }
            if (elementSrc) {
                element.setAttribute("src", elementSrc);
            }
            return;
        }
        if (tagName === "IFRAME") {
            if (elementSrc) {
                element.setAttribute("src", elementSrc);
            }
            return;
        }
        if (elementSrc) {
            element.style.backgroundImage = 'url("' + elementSrc + '")';
        }
    };

    var callCallback = function callCallback(callback, argument) {
        if (callback) {
            callback(argument);
        }
    };

    var loadString = "load";
    var errorString = "error";

    var removeListeners = function removeListeners(element, loadHandler, errorHandler) {
        element.removeEventListener(loadString, loadHandler);
        element.removeEventListener(errorString, errorHandler);
    };

    var addOneShotListeners = function addOneShotListeners(element, settings) {
        var onLoad = function onLoad(event) {
            onEvent(event, true, settings);
            removeListeners(element, onLoad, onError);
        };
        var onError = function onError(event) {
            onEvent(event, false, settings);
            removeListeners(element, onLoad, onError);
        };
        element.addEventListener(loadString, onLoad);
        element.addEventListener(errorString, onError);
    };

    var onEvent = function onEvent(event, success, settings) {
        var element = event.target;
        element.classList.remove(settings.class_loading);
        element.classList.add(success ? settings.class_loaded : settings.class_error); // Setting loaded or error class
        callCallback(success ? settings.callback_load : settings.callback_error, element); // Calling loaded or error callback
    };

    var revealElement = function revealElement(element, settings) {
        if (["IMG", "IFRAME"].indexOf(element.tagName) > -1) {
            addOneShotListeners(element, settings);
            element.classList.add(settings.class_loading);
        }
        setSources(element, settings);
        element.dataset.wasProcessed = true;
        callCallback(settings.callback_set, element);
    };

    var LazyLoad = function LazyLoad(instanceSettings) {
        this._settings = _extends({}, defaultSettings, instanceSettings);
        this._setObserver();
        this.update();
    };

    LazyLoad.prototype = {
        _setObserver: function _setObserver() {
            var _this = this;

            if (!("IntersectionObserver" in window)) {
                return;
            }

            var settings = this._settings;
            var onIntersection = function onIntersection(entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    var element = entry.target;
                    revealElement(element, settings);
                    _this._observer.unobserve(element);
                });
                _this._elements = purgeElements(_this._elements);
            };
            this._observer = new IntersectionObserver(onIntersection, {
                root: settings.container === document ? null : settings.container,
                rootMargin: settings.threshold + "px"
            });
        },

        update: function update() {
            var _this2 = this;

            var settings = this._settings;
            var elements = settings.container.querySelectorAll(settings.elements_selector);

            this._elements = purgeElements(Array.prototype.slice.call(elements)); // nodeset to array for IE compatibility
            if (this._observer) {
                this._elements.forEach(function (element) {
                    _this2._observer.observe(element);
                });
                return;
            }
            // Fallback: load all elements at once
            this._elements.forEach(function (element) {
                revealElement(element, settings);
            });
            this._elements = purgeElements(this._elements);
        },

        destroy: function destroy() {
            var _this3 = this;

            if (this._observer) {
                purgeElements(this._elements).forEach(function (element) {
                    _this3._observer.unobserve(element);
                });
                this._observer = null;
            }
            this._elements = null;
            this._settings = null;
        }
    };

    /* Automatic instances creation if required (useful for async script loading!) */
    var autoInitOptions = window.lazyLoadOptions;
    if (autoInitOptions) {
        autoInitialize(LazyLoad, autoInitOptions);
    }

    return LazyLoad;
});