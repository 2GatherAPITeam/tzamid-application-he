'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
};

//! annyang
//! version : 2.6.0
//! author  : Tal Ater @TalAter
//! license : MIT
//! https://www.TalAter.com/annyang/
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD + global
        define([], function () {
            return root.annyang = factory(root);
        });
    } else if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module.exports) {
        // CommonJS
        module.exports = factory(root);
    } else {
        // Browser globals
        root.annyang = factory(root);
    }
})(typeof window !== 'undefined' ? window : undefined, function (root, undefined) {
    'use strict';

    /**
     * # Quick Tutorial, Intro and Demos
     *
     * The quickest way to get started is to visit the [annyang homepage](https://www.talater.com/annyang/).
     *
     * For a more in-depth look at annyang, read on.
     *
     * # API Reference
     */

    var annyang;

    // Get the SpeechRecognition object, while handling browser prefixes
    var SpeechRecognition = root.SpeechRecognition || root.webkitSpeechRecognition || root.mozSpeechRecognition || root.msSpeechRecognition || root.oSpeechRecognition;

    // Check browser support
    // This is done as early as possible, to make it as fast as possible for unsupported browsers
    if (!SpeechRecognition) {
        return null;
    }

    var commandsList = [];
    var recognition;
    var callbacks = { start: [], error: [], end: [], soundstart: [], result: [], resultMatch: [], resultNoMatch: [], errorNetwork: [], errorPermissionBlocked: [], errorPermissionDenied: [] };
    var autoRestart;
    var lastStartedAt = 0;
    var autoRestartCount = 0;
    var debugState = false;
    var debugStyle = 'font-weight: bold; color: #00f;';
    var pauseListening = false;
    var _isListening = false;

    // The command matching code is a modified version of Backbone.Router by Jeremy Ashkenas, under the MIT license.
    var optionalParam = /\s*\((.*?)\)\s*/g;
    var optionalRegex = /(\(\?:[^)]+\))\?/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#]/g;
    var commandToRegExp = function commandToRegExp(command) {
        command = command.replace(escapeRegExp, '\\$&').replace(optionalParam, '(?:$1)?').replace(namedParam, function (match, optional) {
            return optional ? match : '([^\\s]+)';
        }).replace(splatParam, '(.*?)').replace(optionalRegex, '\\s*$1?\\s*');
        return new RegExp('^' + command + '$', 'i');
    };

    // This method receives an array of callbacks to iterate over, and invokes each of them
    var invokeCallbacks = function invokeCallbacks(callbacks) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
        }

        callbacks.forEach(function (callback) {
            callback.callback.apply(callback.context, args);
        });
    };

    var isInitialized = function isInitialized() {
        return recognition !== undefined;
    };

    // method for logging in developer console when debug mode is on
    var logMessage = function logMessage(text, extraParameters) {
        if (text.indexOf('%c') === -1 && !extraParameters) {
            console.log(text);
        } else {
            console.log(text, extraParameters || debugStyle);
        }
    };

    var initIfNeeded = function initIfNeeded() {
        if (!isInitialized()) {
            annyang.init({}, false);
        }
    };

    var registerCommand = function registerCommand(command, callback, originalPhrase) {
        commandsList.push({ command: command, callback: callback, originalPhrase: originalPhrase });
        if (debugState) {
            logMessage('Command successfully loaded: %c' + originalPhrase, debugStyle);
        }
    };

    var parseResults = function parseResults(results) {
        invokeCallbacks(callbacks.result, results);
        var commandText;
        // go over each of the 5 results and alternative results received (we've set maxAlternatives to 5 above)
        for (var i = 0; i < results.length; i++) {
            // the text recognized
            commandText = results[i].trim();
            if (debugState) {
                logMessage('Speech recognized: %c' + commandText, debugStyle);
            }

            // try and match recognized text to one of the commands on the list
            for (var j = 0, l = commandsList.length; j < l; j++) {
                var currentCommand = commandsList[j];
                var result = currentCommand.command.exec(commandText);
                if (result) {
                    var parameters = result.slice(1);
                    if (debugState) {
                        logMessage('command matched: %c' + currentCommand.originalPhrase, debugStyle);
                        if (parameters.length) {
                            logMessage('with parameters', parameters);
                        }
                    }
                    // execute the matched command
                    currentCommand.callback.apply(this, parameters);
                    invokeCallbacks(callbacks.resultMatch, commandText, currentCommand.originalPhrase, results);
                    return;
                }
            }
        }
        invokeCallbacks(callbacks.resultNoMatch, results);
    };

    annyang = {

        /**
         * Initialize annyang with a list of commands to recognize.
         *
         * #### Examples:
         * ````javascript
         * var commands = {'hello :name': helloFunction};
         * var commands2 = {'hi': helloFunction};
         *
         * // initialize annyang, overwriting any previously added commands
         * annyang.init(commands, true);
         * // adds an additional command without removing the previous commands
         * annyang.init(commands2, false);
         * ````
         * As of v1.1.0 it is no longer required to call init(). Just start() listening whenever you want, and addCommands() whenever, and as often as you like.
         *
         * @param {Object} commands - Commands that annyang should listen to
         * @param {boolean} [resetCommands=true] - Remove all commands before initializing?
         * @method init
         * @deprecated
         * @see [Commands Object](#commands-object)
         */
        init: function init(commands) {
            var resetCommands = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            // Abort previous instances of recognition already running
            if (recognition && recognition.abort) {
                recognition.abort();
            }

            // initiate SpeechRecognition
            recognition = new SpeechRecognition();

            // Set the max number of alternative transcripts to try and match with a command
            recognition.maxAlternatives = 5;

            // In HTTPS, turn off continuous mode for faster results.
            // In HTTP,  turn on  continuous mode for much slower results, but no repeating security notices
            recognition.continuous = root.location.protocol === 'http:';

            // Sets the language to the default 'en-US'. This can be changed with annyang.setLanguage()
            recognition.lang = 'en-US';

            recognition.onstart = function () {
                _isListening = true;
                invokeCallbacks(callbacks.start);
            };

            recognition.onsoundstart = function () {
                invokeCallbacks(callbacks.soundstart);
            };

            recognition.onerror = function (event) {
                invokeCallbacks(callbacks.error, event);
                switch (event.error) {
                    case 'network':
                        invokeCallbacks(callbacks.errorNetwork, event);
                        break;
                    case 'not-allowed':
                    case 'service-not-allowed':
                        // if permission to use the mic is denied, turn off auto-restart
                        autoRestart = false;
                        // determine if permission was denied by user or automatically.
                        if (new Date().getTime() - lastStartedAt < 200) {
                            invokeCallbacks(callbacks.errorPermissionBlocked, event);
                        } else {
                            invokeCallbacks(callbacks.errorPermissionDenied, event);
                        }
                        break;
                }
            };

            recognition.onend = function () {
                _isListening = false;
                invokeCallbacks(callbacks.end);
                // annyang will auto restart if it is closed automatically and not by user action.
                if (autoRestart) {
                    // play nicely with the browser, and never restart annyang automatically more than once per second
                    var timeSinceLastStart = new Date().getTime() - lastStartedAt;
                    autoRestartCount += 1;
                    if (autoRestartCount % 10 === 0) {
                        if (debugState) {
                            logMessage('Speech Recognition is repeatedly stopping and starting. See http://is.gd/annyang_restarts for tips.');
                        }
                    }
                    if (timeSinceLastStart < 1000) {
                        setTimeout(function () {
                            annyang.start({ paused: pauseListening });
                        }, 1000 - timeSinceLastStart);
                    } else {
                        annyang.start({ paused: pauseListening });
                    }
                }
            };

            recognition.onresult = function (event) {
                if (pauseListening) {
                    if (debugState) {
                        logMessage('Speech heard, but annyang is paused');
                    }
                    return false;
                }

                // Map the results to an array
                var SpeechRecognitionResult = event.results[event.resultIndex];
                var results = [];
                for (var k = 0; k < SpeechRecognitionResult.length; k++) {
                    results[k] = SpeechRecognitionResult[k].transcript;
                }

                parseResults(results);
            };

            // build commands list
            if (resetCommands) {
                commandsList = [];
            }
            if (commands.length) {
                this.addCommands(commands);
            }
        },

        /**
         * Start listening.
         * It's a good idea to call this after adding some commands first, but not mandatory.
         *
         * Receives an optional options object which supports the following options:
         *
         * - `autoRestart`  (boolean, default: true) Should annyang restart itself if it is closed indirectly, because of silence or window conflicts?
         * - `continuous`   (boolean) Allow forcing continuous mode on or off. Annyang is pretty smart about this, so only set this if you know what you're doing.
         * - `paused`       (boolean, default: true) Start annyang in paused mode.
         *
         * #### Examples:
         * ````javascript
         * // Start listening, don't restart automatically
         * annyang.start({ autoRestart: false });
         * // Start listening, don't restart automatically, stop recognition after first phrase recognized
         * annyang.start({ autoRestart: false, continuous: false });
         * ````
         * @param {Object} [options] - Optional options.
         * @method start
         */
        start: function start(options) {
            initIfNeeded();
            options = options || {};
            if (options.paused !== undefined) {
                pauseListening = !!options.paused;
            } else {
                pauseListening = false;
            }
            if (options.autoRestart !== undefined) {
                autoRestart = !!options.autoRestart;
            } else {
                autoRestart = true;
            }
            if (options.continuous !== undefined) {
                recognition.continuous = !!options.continuous;
            }

            lastStartedAt = new Date().getTime();
            try {
                recognition.start();
            } catch (e) {
                if (debugState) {
                    logMessage(e.message);
                }
            }
        },

        /**
         * Stop listening, and turn off mic.
         *
         * Alternatively, to only temporarily pause annyang responding to commands without stopping the SpeechRecognition engine or closing the mic, use pause() instead.
         * @see [pause()](#pause)
         *
         * @method abort
         */
        abort: function abort() {
            autoRestart = false;
            autoRestartCount = 0;
            if (isInitialized()) {
                recognition.abort();
            }
        },

        /**
         * Pause listening. annyang will stop responding to commands (until the resume or start methods are called), without turning off the browser's SpeechRecognition engine or the mic.
         *
         * Alternatively, to stop the SpeechRecognition engine and close the mic, use abort() instead.
         * @see [abort()](#abort)
         *
         * @method pause
         */
        pause: function pause() {
            pauseListening = true;
        },

        /**
         * Resumes listening and restores command callback execution when a result matches.
         * If SpeechRecognition was aborted (stopped), start it.
         *
         * @method resume
         */
        resume: function resume() {
            annyang.start();
        },

        /**
         * Turn on output of debug messages to the console. Ugly, but super-handy!
         *
         * @param {boolean} [newState=true] - Turn on/off debug messages
         * @method debug
         */
        debug: function debug() {
            var newState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

            debugState = !!newState;
        },

        /**
         * Set the language the user will speak in. If this method is not called, defaults to 'en-US'.
         *
         * @param {String} language - The language (locale)
         * @method setLanguage
         * @see [Languages](https://github.com/TalAter/annyang/blob/master/docs/FAQ.md#what-languages-are-supported)
         */
        setLanguage: function setLanguage(language) {
            initIfNeeded();
            recognition.lang = language;
        },

        /**
         * Add commands that annyang will respond to. Similar in syntax to init(), but doesn't remove existing commands.
         *
         * #### Examples:
         * ````javascript
         * var commands = {'hello :name': helloFunction, 'howdy': helloFunction};
         * var commands2 = {'hi': helloFunction};
         *
         * annyang.addCommands(commands);
         * annyang.addCommands(commands2);
         * // annyang will now listen to all three commands
         * ````
         *
         * @param {Object} commands - Commands that annyang should listen to
         * @method addCommands
         * @see [Commands Object](#commands-object)
         */
        addCommands: function addCommands(commands) {
            var cb;

            initIfNeeded();

            for (var phrase in commands) {
                if (commands.hasOwnProperty(phrase)) {
                    cb = root[commands[phrase]] || commands[phrase];
                    if (typeof cb === 'function') {
                        // convert command to regex then register the command
                        registerCommand(commandToRegExp(phrase), cb, phrase);
                    } else if ((typeof cb === 'undefined' ? 'undefined' : _typeof(cb)) === 'object' && cb.regexp instanceof RegExp) {
                        // register the command
                        registerCommand(new RegExp(cb.regexp.source, 'i'), cb.callback, phrase);
                    } else {
                        if (debugState) {
                            logMessage('Can not register command: %c' + phrase, debugStyle);
                        }
                        continue;
                    }
                }
            }
        },

        /**
         * Remove existing commands. Called with a single phrase, array of phrases, or methodically. Pass no params to remove all commands.
         *
         * #### Examples:
         * ````javascript
         * var commands = {'hello': helloFunction, 'howdy': helloFunction, 'hi': helloFunction};
         *
         * // Remove all existing commands
         * annyang.removeCommands();
         *
         * // Add some commands
         * annyang.addCommands(commands);
         *
         * // Don't respond to hello
         * annyang.removeCommands('hello');
         *
         * // Don't respond to howdy or hi
         * annyang.removeCommands(['howdy', 'hi']);
         * ````
         * @param {String|Array|Undefined} [commandsToRemove] - Commands to remove
         * @method removeCommands
         */
        removeCommands: function removeCommands(commandsToRemove) {
            if (commandsToRemove === undefined) {
                commandsList = [];
            } else {
                commandsToRemove = Array.isArray(commandsToRemove) ? commandsToRemove : [commandsToRemove];
                commandsList = commandsList.filter(function (command) {
                    for (var i = 0; i < commandsToRemove.length; i++) {
                        if (commandsToRemove[i] === command.originalPhrase) {
                            return false;
                        }
                    }
                    return true;
                });
            }
        },

        /**
         * Add a callback function to be called in case one of the following events happens:
         *
         * * `start` - Fired as soon as the browser's Speech Recognition engine starts listening
         * * `soundstart` - Fired as soon as any sound (possibly speech) has been detected.
         *     This will fire once per Speech Recognition starting. See https://is.gd/annyang_sound_start
         * * `error` - Fired when the browser's Speech Recogntion engine returns an error, this generic error callback will be followed by more accurate error callbacks (both will fire if both are defined)
         *     Callback function will be called with the error event as the first argument
         * * `errorNetwork` - Fired when Speech Recognition fails because of a network error
         *     Callback function will be called with the error event as the first argument
         * * `errorPermissionBlocked` - Fired when the browser blocks the permission request to use Speech Recognition.
         *     Callback function will be called with the error event as the first argument
         * * `errorPermissionDenied` - Fired when the user blocks the permission request to use Speech Recognition.
         *     Callback function will be called with the error event as the first argument
         * * `end` - Fired when the browser's Speech Recognition engine stops
         * * `result` - Fired as soon as some speech was identified. This generic callback will be followed by either the `resultMatch` or `resultNoMatch` callbacks.
         *     Callback functions for to this event will be called with an array of possible phrases the user said as the first argument
         * * `resultMatch` - Fired when annyang was able to match between what the user said and a registered command
         *     Callback functions for this event will be called with three arguments in the following order:
         *       * The phrase the user said that matched a command
         *       * The command that was matched
         *       * An array of possible alternative phrases the user might have said
         * * `resultNoMatch` - Fired when what the user said didn't match any of the registered commands.
         *     Callback functions for this event will be called with an array of possible phrases the user might've said as the first argument
         *
         * #### Examples:
         * ````javascript
         * annyang.addCallback('error', function() {
         *   $('.myErrorText').text('There was an error!');
         * });
         *
         * annyang.addCallback('resultMatch', function(userSaid, commandText, phrases) {
         *   console.log(userSaid); // sample output: 'hello'
         *   console.log(commandText); // sample output: 'hello (there)'
         *   console.log(phrases); // sample output: ['hello', 'halo', 'yellow', 'polo', 'hello kitty']
         * });
         *
         * // pass local context to a global function called notConnected
         * annyang.addCallback('errorNetwork', notConnected, this);
         * ````
         * @param {String} type - Name of event that will trigger this callback
         * @param {Function} callback - The function to call when event is triggered
         * @param {Object} [context] - Optional context for the callback function
         * @method addCallback
         */
        addCallback: function addCallback(type, callback, context) {
            var cb = root[callback] || callback;
            if (typeof cb === 'function' && callbacks[type] !== undefined) {
                callbacks[type].push({ callback: cb, context: context || this });
            }
        },

        /**
         * Remove callbacks from events.
         *
         * - Pass an event name and a callback command to remove that callback command from that event type.
         * - Pass just an event name to remove all callback commands from that event type.
         * - Pass undefined as event name and a callback command to remove that callback command from all event types.
         * - Pass no params to remove all callback commands from all event types.
         *
         * #### Examples:
         * ````javascript
         * annyang.addCallback('start', myFunction1);
         * annyang.addCallback('start', myFunction2);
         * annyang.addCallback('end', myFunction1);
         * annyang.addCallback('end', myFunction2);
         *
         * // Remove all callbacks from all events:
         * annyang.removeCallback();
         *
         * // Remove all callbacks attached to end event:
         * annyang.removeCallback('end');
         *
         * // Remove myFunction2 from being called on start:
         * annyang.removeCallback('start', myFunction2);
         *
         * // Remove myFunction1 from being called on all events:
         * annyang.removeCallback(undefined, myFunction1);
         * ````
         *
         * @param type Name of event type to remove callback from
         * @param callback The callback function to remove
         * @returns undefined
         * @method removeCallback
         */
        removeCallback: function removeCallback(type, callback) {
            var compareWithCallbackParameter = function compareWithCallbackParameter(cb) {
                return cb.callback !== callback;
            };
            // Go over each callback type in callbacks store object
            for (var callbackType in callbacks) {
                if (callbacks.hasOwnProperty(callbackType)) {
                    // if this is the type user asked to delete, or he asked to delete all, go ahead.
                    if (type === undefined || type === callbackType) {
                        // If user asked to delete all callbacks in this type or all types
                        if (callback === undefined) {
                            callbacks[callbackType] = [];
                        } else {
                            // Remove all matching callbacks
                            callbacks[callbackType] = callbacks[callbackType].filter(compareWithCallbackParameter);
                        }
                    }
                }
            }
        },

        /**
         * Returns true if speech recognition is currently on.
         * Returns false if speech recognition is off or annyang is paused.
         *
         * @return boolean true = SpeechRecognition is on and annyang is listening
         * @method isListening
         */
        isListening: function isListening() {
            return _isListening && !pauseListening;
        },

        /**
         * Returns the instance of the browser's SpeechRecognition object used by annyang.
         * Useful in case you want direct access to the browser's Speech Recognition engine.
         *
         * @returns SpeechRecognition The browser's Speech Recognizer currently used by annyang
         * @method getSpeechRecognizer
         */
        getSpeechRecognizer: function getSpeechRecognizer() {
            return recognition;
        },

        /**
         * Simulate speech being recognized. This will trigger the same events and behavior as when the Speech Recognition
         * detects speech.
         *
         * Can accept either a string containing a single sentence, or an array containing multiple sentences to be checked
         * in order until one of them matches a command (similar to the way Speech Recognition Alternatives are parsed)
         *
         * #### Examples:
         * ````javascript
         * annyang.trigger('Time for some thrilling heroics');
         * annyang.trigger(
         *     ['Time for some thrilling heroics', 'Time for some thrilling aerobics']
         *   );
         * ````
         *
         * @param string|array sentences A sentence as a string or an array of strings of possible sentences
         * @returns undefined
         * @method trigger
         */
        trigger: function trigger(sentences) {
            if (!annyang.isListening()) {
                if (debugState) {
                    if (!_isListening) {
                        logMessage('Cannot trigger while annyang is aborted');
                    } else {
                        logMessage('Speech heard, but annyang is paused');
                    }
                }
                return;
            }

            if (!Array.isArray(sentences)) {
                sentences = [sentences];
            }

            parseResults(sentences);
        }
    };

    return annyang;
});

/**
 * # Good to Know
 *
 * ## Commands Object
 *
 * Both the [init()]() and addCommands() methods receive a `commands` object.
 *
 * annyang understands commands with `named variables`, `splats`, and `optional words`.
 *
 * * Use `named variables` for one word arguments in your command.
 * * Use `splats` to capture multi-word text at the end of your command (greedy).
 * * Use `optional words` or phrases to define a part of the command as optional.
 *
 * #### Examples:
 * ````html
 * <script>
 * var commands = {
 *   // annyang will capture anything after a splat (*) and pass it to the function.
 *   // e.g. saying "Show me Batman and Robin" will call showFlickr('Batman and Robin');
 *   'show me *tag': showFlickr,
 *
 *   // A named variable is a one word variable, that can fit anywhere in your command.
 *   // e.g. saying "calculate October stats" will call calculateStats('October');
 *   'calculate :month stats': calculateStats,
 *
 *   // By defining a part of the following command as optional, annyang will respond
 *   // to both: "say hello to my little friend" as well as "say hello friend"
 *   'say hello (to my little) friend': greeting
 * };
 *
 * var showFlickr = function(tag) {
 *   var url = 'http://api.flickr.com/services/rest/?tags='+tag;
 *   $.getJSON(url);
 * }
 *
 * var calculateStats = function(month) {
 *   $('#stats').text('Statistics for '+month);
 * }
 *
 * var greeting = function() {
 *   $('#greeting').text('Hello!');
 * }
 * </script>
 * ````
 *
 * ### Using Regular Expressions in commands
 * For advanced commands, you can pass a regular expression object, instead of
 * a simple string command.
 *
 * This is done by passing an object containing two properties: `regexp`, and
 * `callback` instead of the function.
 *
 * #### Examples:
 * ````javascript
 * var calculateFunction = function(month) { console.log(month); }
 * var commands = {
 *   // This example will accept any word as the "month"
 *   'calculate :month stats': calculateFunction,
 *   // This example will only accept months which are at the start of a quarter
 *   'calculate :quarter stats': {'regexp': /^calculate (January|April|July|October) stats$/, 'callback': calculateFunction}
 * }
 ````
 *
 */
//# sourceMappingURL=annyang.js.map


'use strict';

var Gatherapi = function () {
    function Gatherapi(options) {
        _classCallCheck(this, Gatherapi);

        this.options = options;
        this.requiredUtills = !options.requiredUtills ? ["voice command"] : options.requiredUtills;
        if (options.middlewareDevices) {
            this.middleware = new Middleware(options.middlewareDevices, this);
        }

        this.objects = [];
        this.plugins = [];
        this.objectToObjectFactoryMap = { inputFactory: "tg-input", buttonFactory: "tg-button", linkFactory: "tg-a",
            paragraphFactory: "tg-paragraph", imgFactory: "tg-img", liFactory: new LiFactory(this) };

        this.pluginToPluginFactoryMap = { loginFactory: "tg-login", menuFactory: "tg-menu", accessibilityFactory: "tg-accessibility",
            chatFactory: "tg-chat", libraryFactory: "tg-library", gameFactory: "tg-game" };

        this.utils = {
            annyangUtil: new AnnyangUtil(),
            chatUtil: new ChatUtil(),
            textToVoice: new SpeechUtil(),
            boxModal: new BoxModelUtil()
        };

        this.objectFactories = { inputFactory: new InputFactory(this), imgFactory: new ImgFactory(this), buttonFactory: new ButtonFactory(this),
            paragraphFactory: new ParagraphFactory(this), linkFactory: new LinkFactory(this) };

        this.pluginFactories = { loginFactory: new LoginFactory(), chatFactory: new ChatFactory(),
            menuFactory: new MenuFactory(), libraryFactory: new LibraryFactory(),
            accessibilityFactory: new AccessibilityFactory(), gameFactory: new GameFactory() };

        this.utilsConfiguration();
        if (this.middleware) {
            this.middleware.init();
        }
        this.scanForPluginsOrObjects();
    }

    _createClass(Gatherapi, [{
        key: "utilsConfiguration",
        value: function utilsConfiguration() {
            this.utils.annyangUtil.initAnnyang(this.options.language);
            this.utils.annyangUtil.addExitCommand();
            this.utils.textToVoice.initSpeech(this.options.language);
        }
    }, {
        key: "scanForPluginsOrObjects",
        value: function scanForPluginsOrObjects() {
            this.scanObjects();
            this.scanPlugins();
        }
    }, {
        key: "scanObjects",
        value: function scanObjects() {
            for (var objectToObjectFactoryKey in this.objectToObjectFactoryMap) {
                var elements = document.getElementsByTagName(this.objectToObjectFactoryMap[objectToObjectFactoryKey]);
                for (var index = 0; index < elements.length; index++) {
                    this.objectFactories[objectToObjectFactoryKey].createObject(elements[index]);
                }
            }
        }
    }, {
        key: "enableExternalInputsHandlers",
        value: function enableExternalInputsHandlers() {
            var lang = this.options.virtualKeyboardLang;
            for (var ei in this.middleware.externalInputs) {
                if (this.middleware.externalInputs[ei].connected) {
                    this.objects.forEach(function (object) {
                        object["enable" + ei](lang);
                    });
                }
            }
        }
    }, {
        key: "scanPlugins",
        value: function scanPlugins() {
            for (var pluginToPluginFactoryKey in this.pluginToPluginFactoryMap) {
                var elements = document.getElementsByTagName(this.pluginToPluginFactoryMap[pluginToPluginFactoryKey]);
                for (var index = 0; index < elements.length; index++) {
                    this.pluginFactories[pluginToPluginFactoryKey].createPlugin(elements[index]);
                }
            }
        }
    }]);

    return Gatherapi;
}();

'use strict';

var Middleware = function () {
    function Middleware(devices, gatherApiObject) {
        _classCallCheck(this, Middleware);

        this.devices = devices;
        this.gatherApiObject = gatherApiObject;
        this.connectedDevices = {};
        this.externalInputs = {
            Clickers: new Clickers(),
            Tobii: new Tobii(),
            joystick: new Joystick()
        };
    }

    _createClass(Middleware, [{
        key: "init",
        value: function init(callback) {
            var devicesToCheck = [];
            for (var key in this.devices) {
                devicesToCheck.push({ productId: this.devices[key].productId, vendorId: this.devices[key].vendorId });
            }
            this.checkForConnectedDevices(JSON.stringify(devicesToCheck), callback);
        }
    }, {
        key: "checkForConnectedDevices",
        value: function checkForConnectedDevices(data, callback) {
            var xmlhttp = new XMLHttpRequest();
            var self = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                    self.connectedDevices = JSON.parse(xmlhttp.responseText);
                    var needExternalInit = false;
                    for (var externalInput in self.externalInputs) {
                        if (self.devices[externalInput]) {
                            var ei = self.externalInputs[externalInput];
                            for (var connectedDevice in self.connectedDevices) {
                                if (self.connectedDevices[connectedDevice].productId == self.devices[externalInput].productId && self.connectedDevices[connectedDevice].vendorId == self.devices[externalInput].vendorId) {
                                    ei.connectExternalInput();
                                    needExternalInit = true;
                                    break;
                                }
                            }
                            if (needExternalInit) {
                                self.gatherApiObject.enableExternalInputsHandlers();
                            } else if (self.devices.length != 0 && callback) {
                                callback();
                            } else if (self.devices.length != 0) {
                                alert("one of the following required devices isn't connected: " + Object.keys(self.devices));
                            }
                        }
                    }
                }
            };

            xmlhttp.open("POST", "http://localhost:8082/device-checker/get-user-active-devices", true);
            xmlhttp.setRequestHeader("Content-type", "application/json");
            xmlhttp.setRequestHeader('Accept', 'application/JSON');
            xmlhttp.send(data);
        }
    }, {
        key: "getConnectedDevices",
        value: function getConnectedDevices() {
            return this.connectedDevices;
        }
    }, {
        key: "showConnectedDevices",
        value: function showConnectedDevices() {
            console.log(this.connectedDevices);
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {
            console.log("enabled Tobii");
        }
    }, {
        key: "enableKeyboard",
        value: function enableKeyboard() {
            console.log("enbled Keyboard");
        }
    }]);

    return Middleware;
}();

var ExternalInput = function ExternalInput() {
    _classCallCheck(this, ExternalInput);

    this.connected = false;
    if (this.connectExternalInput === undefined) {
        throw new TypeError("Must override connectExternalInput");
    }
};

var clickersInstance = null;

var Clickers = function (_ExternalInput) {
    _inherits(Clickers, _ExternalInput);

    function Clickers() {
        var _ret;

        _classCallCheck(this, Clickers);

        var _this = _possibleConstructorReturn(this, (Clickers.__proto__ || Object.getPrototypeOf(Clickers)).call(this));

        if (!clickersInstance) {
            clickersInstance = _this;
        }
        _this.i = 0;
        return _ret = clickersInstance, _possibleConstructorReturn(_this, _ret);
    }

    _createClass(Clickers, [{
        key: "connectExternalInput",
        value: function connectExternalInput() {

            myElement = document.querySelector('body');
            myElement.onmousedown = this.doubleclick;
            var blockContextMenu, myElement;
            blockContextMenu = function blockContextMenu(evt) {
                evt.preventDefault();
            };

            myElement.addEventListener('contextmenu', blockContextMenu);
        }
    }, {
        key: "doubleclick",
        value: function doubleclick(event) {
            console.log(event);
            var self = this;
            var el = document.querySelector('body');
            if (el.getAttribute("data-dblclick") == null) {
                el.setAttribute("data-dblclick", 1);
                setTimeout(function () {
                    if (el.getAttribute("data-dblclick") == 1) {
                        if (event.button == 0) {
                            clickersInstance.rightClickFunction();
                        } else {
                            clickersInstance.leftClickFunction();
                        }
                    }
                    el.removeAttribute("data-dblclick");
                }, 300);
            } else {
                el.removeAttribute("data-dblclick");
                clickersInstance.chooseFunction();
            }
        }
    }, {
        key: "leftClickFunction",
        value: function leftClickFunction() {
            var markables = document.querySelectorAll("input,a,select,button,textarea,.tg-library-img");
            if (this.i == 1) {
                this.i = markables.length - 1;
            }
            this.i--;
            var mark = markables[this.i];
            console.log(mark);
            mark.focus();
        }
    }, {
        key: "rightClickFunction",
        value: function rightClickFunction() {
            var markables = document.querySelectorAll("input,a,select,button,textarea,.tg-library-img");
            if (this.i == markables.length - 1) {
                this.i = -1;
            }
            this.i = this.i + 1;
            var mark = markables[this.i];
            console.log(mark);
            mark.focus();
        }
    }, {
        key: "chooseFunction",
        value: function chooseFunction() {
            var markables = document.querySelectorAll("input,a,select,button,textarea,.tg-library-img");
            markables[this.i].click();
        }
    }]);

    return Clickers;
}(ExternalInput);

var tobiiInstance = null;

var Tobii = function (_ExternalInput2) {
    _inherits(Tobii, _ExternalInput2);

    function Tobii() {
        var _ret2;

        _classCallCheck(this, Tobii);

        var _this2 = _possibleConstructorReturn(this, (Tobii.__proto__ || Object.getPrototypeOf(Tobii)).call(this));

        if (!tobiiInstance) {
            tobiiInstance = _this2;
        }
        return _ret2 = tobiiInstance, _possibleConstructorReturn(_this2, _ret2);
    }

    _createClass(Tobii, [{
        key: "connectExternalInput",
        value: function connectExternalInput() {
            this.connected = true;
        }
    }]);

    return Tobii;
}(ExternalInput);

var joystickInstance = null;

var Joystick = function (_ExternalInput3) {
    _inherits(Joystick, _ExternalInput3);

    function Joystick() {
        var _ret3;

        _classCallCheck(this, Joystick);

        var _this3 = _possibleConstructorReturn(this, (Joystick.__proto__ || Object.getPrototypeOf(Joystick)).call(this));

        if (!joystickInstance) {
            joystickInstance = _this3;
        }
        return _ret3 = joystickInstance, _possibleConstructorReturn(_this3, _ret3);
    }

    _createClass(Joystick, [{
        key: "connectExternalInput",
        value: function connectExternalInput() {
            this.connected = true;
        }
    }]);

    return Joystick;
}(ExternalInput);

var Util = function Util() {
    _classCallCheck(this, Util);
};

'use strict';

var annyangUtilInstance = null;

var AnnyangUtil = function (_Util) {
    _inherits(AnnyangUtil, _Util);

    function AnnyangUtil() {
        var _ret4;

        _classCallCheck(this, AnnyangUtil);

        var _this4 = _possibleConstructorReturn(this, (AnnyangUtil.__proto__ || Object.getPrototypeOf(AnnyangUtil)).call(this));

        if (!annyangUtilInstance) {
            _this4.languages = { hebrew: 'he', english: 'en-US', arabic: 'ar' };
            _this4.jsonData = {
                "lang": [{ "he": [{ "link": "עבור" }, { "button": "לחץ על" }, { "imgCloseModal": "סגור חלון" }, { "imgScrollModalDown": "למטה" }, { "imgScrollModalUp": "למעלה" }, { "exit": "יציאה" }],
                    "en-US": [{ "link": "go to" }, { "button": "click on" }, { "imgCloseModal": "close window" }, { "imgScrollModalDown": "down" }, { "imgScrollModalUp": "up" }, { "exit": "exit" }]
                }]
            };
            _this4.userLanguages;
            annyangUtilInstance = _this4;
        }
        return _ret4 = annyangUtilInstance, _possibleConstructorReturn(_this4, _ret4);
    }

    _createClass(AnnyangUtil, [{
        key: "setLanguages",
        value: function setLanguages(languages) {
            this.userLanguages = languages;
        }
        //init annyang if the admin does not define lang the default lang will be hebrew

    }, {
        key: "initAnnyang",
        value: function initAnnyang(languages) {
            this.setLanguages(languages);
            if (annyang) {
                if (languages != null || languages != undefined) {
                    console.log(languages);
                    annyang.setLanguage(this.languages[languages]);
                } else {
                    annyang.setLanguage('he');
                }
                annyang.start();
                annyang.debug();
            }
        }
    }, {
        key: "addAnnyangCommands",
        value: function addAnnyangCommands(options) {
            annyang.addCommands(options.commands);
        }

        //this function return keyword according the lang

    }, {
        key: "getLangObj",
        value: function getLangObj() {
            // let jsonObject = JSON.parse(this.jsonData);
            if (this.userLanguages != null || this.userLanguages != undefined) {
                console.log("getLangObj userLanguages" + this.userLanguages);
                var lang = sessionStorage.getItem("lang");
                return this.jsonData["lang"][0][this.languages[this.userLanguages]];
            } else {
                return this.jsonData["lang"][0]["he"];
            }
        }
        //init exit command

    }, {
        key: "addExitCommand",
        value: function addExitCommand() {

            var commands = {};

            var langObj = this.getLangObj();
            for (var langCommand in langObj) {
                if (langObj[langCommand].hasOwnProperty("exit")) {
                    commands[langObj[langCommand]["exit"]] = function () {
                        window.location.replace("index.html");
                    };
                }
            }

            var annyangOptions = { commands: commands };
            this.addAnnyangCommands(annyangOptions);
        }
    }]);

    return AnnyangUtil;
}(Util);

'use strict';

var chatUtilInstance = null;

var ChatUtil = function (_Util2) {
    _inherits(ChatUtil, _Util2);

    function ChatUtil() {
        var _ret5;

        _classCallCheck(this, ChatUtil);

        var _this5 = _possibleConstructorReturn(this, (ChatUtil.__proto__ || Object.getPrototypeOf(ChatUtil)).call(this));

        if (!chatUtilInstance) {
            chatUtilInstance = _this5;
        }
        return _ret5 = chatUtilInstance, _possibleConstructorReturn(_this5, _ret5);
    }

    _createClass(ChatUtil, [{
        key: "initChat",
        value: function initChat(wsChatServer) {
            var wsUri = wsChatServer;
            var websocket = new WebSocket(wsUri);
            var myname;

            websocket.onopen = function (ev) {
                // connection is open
                $('#message_box').append("<div class=\"system_msg\">Connected!</div>"); //notify user
            };

            $('#send-btn').click(function () {
                //use clicks message send button
                var mymessage = $('#message').val(); //get message text
                myname = $('#name').val(); //get user name

                if (myname == "") {
                    //empty name?
                    alert("Enter your Name please!");
                    return;
                }
                if (mymessage == "") {
                    //emtpy message?
                    alert("Enter Some message Please!");
                    return;
                }
                document.getElementById("name").style.visibility = "hidden";

                var objDiv = document.getElementById("message_box");
                objDiv.scrollTop = objDiv.scrollHeight;
                //prepare json data
                var msg = {
                    message: mymessage,
                    name: myname,
                    color: '<?php echo $colours[$user_colour]; ?>'
                };
                //convert and send data to server
                websocket.send(JSON.stringify(msg));
            });

            //#### Message received from server?
            websocket.onmessage = function (ev) {
                var msg = JSON.parse(ev.data); //PHP sends Json data
                var type = msg.type; //message type
                var umsg = msg.message; //message text
                var uname = msg.name; //user name
                var ucolor = msg.color; //color

                if (type == 'usermsg' && uname != null) {
                    $('#message_box').append("<div><span class=\"user_name\" style=\"color:#" + ucolor + "\">" + uname + "</span> : <span class=\"user_message\">" + umsg + "</span></div>");
                    //voice to text only what the other says
                    if (sessionStorage.getItem("utils").indexOf("ttv") != -1) {
                        if (uname != myname) {
                            var u = new SpeechSynthesisUtterance(uname + "say" + umsg);
                            u.lang = 'en-US';
                            var speaker = new SpeechUtil();
                            speaker.startSpeak(u);
                        }
                    }
                }
                if (type == 'system' && umsg != null) {
                    $('#message_box').append("<div class=\"system_msg\">" + umsg + "</div>");
                }

                $('#message').val(''); //reset text

                var objDiv = document.getElementById("message_box");
                objDiv.scrollTop = objDiv.scrollHeight;
            };

            websocket.onerror = function (ev) {
                $('#message_box').append("<div class=\"system_error\">Error Occurred - " + ev.data + "</div>");
            };
            websocket.onclose = function (ev) {
                $('#message_box').append("<div class=\"system_msg\">Connection Closed</div>");
            };
        }
    }]);

    return ChatUtil;
}(Util);

'use strict';

var SpeechUtilInstance = null;

var SpeechUtil = function (_Util3) {
    _inherits(SpeechUtil, _Util3);

    function SpeechUtil() {
        var _ret6;

        _classCallCheck(this, SpeechUtil);

        var _this6 = _possibleConstructorReturn(this, (SpeechUtil.__proto__ || Object.getPrototypeOf(SpeechUtil)).call(this));

        if (!SpeechUtilInstance) {
            _this6.languages = { english: 'en-US', france: 'fr-FR' };
            _this6.SpeechUtilInstance = _this6;
            _this6.utterance = new SpeechSynthesisUtterance();
            _this6.annyangUtil = new AnnyangUtil();
            _this6.initAnnyang();
        }
        return _ret6 = _this6.SpeechUtilInstance, _possibleConstructorReturn(_this6, _ret6);
    }

    _createClass(SpeechUtil, [{
        key: "initSpeech",
        value: function initSpeech(languages) {
            if (languages != null || languages != undefined) {
                this.utterance.lang = this.languages[this.languages[languages]];
            } else {
                this.utterance.lang = 'english';
            }
        }
    }, {
        key: "startSpeak",
        value: function startSpeak(utterance) {
            console.log("inside startSpeak");
            window.speechSynthesis.speak(utterance);
        }
    }, {
        key: "cancelSpeak",
        value: function cancelSpeak() {
            window.speechSynthesis.cancel();
        }
    }, {
        key: "chunkContents",
        value: function chunkContents(text) {
            var speaker = new SpeechUtil();
            var chunkLength = 120;
            var pattRegex = new RegExp('^[\\s\\S]{' + Math.floor(chunkLength / 2) + ',' + chunkLength + '}[.!?,]{1}|^[\\s\\S]{1,' + chunkLength + '}$|^[\\s\\S]{1,' + chunkLength + '} ');
            var arr = [];
            var txt = text;
            while (txt.length > 0) {
                arr.push(txt.match(pattRegex)[0]);
                txt = txt.substring(arr[arr.length - 1].length);
            }
            var self = this.utterance;
            arr.forEach(function (element) {
                var content = element.trim();
                console.log(content);
                self.text = content;
                speaker.startSpeak(self);
            });
        }
    }, {
        key: "read",
        value: function read(path) {
            var speaker = new SpeechUtil();
            var rawFile = new XMLHttpRequest();
            rawFile.open("GET", path, false);
            var self = this.utterance;
            rawFile.onreadystatechange = function () {
                if (rawFile.readyState === 4) {
                    if (rawFile.status === 200 || rawFile.status == 0) {
                        var allText = rawFile.responseText;

                        var chunkLength = 150;
                        var pattRegex = new RegExp('^[\\s\\S]{' + Math.floor(chunkLength / 2) + ',' + chunkLength + '}[.!?,]{1}|^[\\s\\S]{1,' + chunkLength + '}$|^[\\s\\S]{1,' + chunkLength + '} ');
                        var arr = [];
                        var txt = allText;
                        while (txt.length > 0) {
                            arr.push(txt.match(pattRegex)[0]);
                            txt = txt.substring(arr[arr.length - 1].length);
                        }
                        arr.forEach(function (element) {
                            var content = element.trim();
                            console.log(content);
                            self.text = content;
                            speaker.startSpeak(self);
                        });
                    };
                }
            };
            rawFile.send(null);
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {

            var commands = {};
            commands['stop'] = function () {
                // speechSynthesisInstance.cancel();
                window.speechSynthesis.cancel();
                console.log("stop");
            };
            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return SpeechUtil;
}(Util);

'use strict';

var accessibilityUtilInstance = null;

var AccessibilityUtil = function (_Util4) {
    _inherits(AccessibilityUtil, _Util4);

    function AccessibilityUtil() {
        var _ret7;

        _classCallCheck(this, AccessibilityUtil);

        var _this7 = _possibleConstructorReturn(this, (AccessibilityUtil.__proto__ || Object.getPrototypeOf(AccessibilityUtil)).call(this));

        if (!accessibilityUtilInstance) {
            accessibilityUtilInstance = _this7;
        }
        return _ret7 = accessibilityUtilInstance, _possibleConstructorReturn(_this7, _ret7);
    }

    _createClass(AccessibilityUtil, [{
        key: "initAccessibility",
        value: function initAccessibility() {}
    }]);

    return AccessibilityUtil;
}(Util);

'use strict';

var boxModalUtilInstance = null;

var BoxModelUtil = function (_Util5) {
    _inherits(BoxModelUtil, _Util5);

    function BoxModelUtil() {
        var _ret8;

        _classCallCheck(this, BoxModelUtil);

        var _this8 = _possibleConstructorReturn(this, (BoxModelUtil.__proto__ || Object.getPrototypeOf(BoxModelUtil)).call(this));

        if (!boxModalUtilInstance) {
            _this8.annyangUtil = new AnnyangUtil();
            _this8.divModel = document.createElement("div");
            _this8.divContent = document.createElement("div");
            _this8.spanClose = document.createElement("span");
            _this8.pararpghText = document.createElement("p");
            _this8.initModal();
            boxModalUtilInstance = _this8;
        }
        return _ret8 = boxModalUtilInstance, _possibleConstructorReturn(_this8, _ret8);
    }

    _createClass(BoxModelUtil, [{
        key: "initModal",
        value: function initModal() {
            // let divModel = document.createElement("div");
            this.divModel.setAttribute("id", "myModal");
            this.divModel.setAttribute("class", "modal");
            // let divContent = document.createElement("div");
            this.divContent.setAttribute("class", "modal-content");
            // let spanClose = document.createElement("span");
            this.spanClose.setAttribute("class", "close");
            this.spanClose.innerHTML = "&times";
            // let pararpghText = document.createElement("p");
            this.pararpghText.setAttribute("class", "content-paragraph modal-scroll");
            this.pararpghText.innerHTML = "";
            this.divContent.appendChild(this.spanClose);
            this.divContent.appendChild(this.pararpghText);
            this.divModel.appendChild(this.divContent);
            document.body.appendChild(this.divModel);

            // Get the modal
            var modal = document.getElementById('myModal');
            // modal.style.display = "block";


            // When the user clicks on <span> (x), close the modal
            this.spanClose.onclick = function () {
                var modal = document.getElementById('myModal');
                modal.style.display = "none";
            };

            // When the user clicks anywhere outside of the modal, close it
            window.onclick = function (event) {
                var modal = document.getElementById('myModal');
                if (event.target == modal) {
                    modal.style.display = "none";
                    sessionStorage.scrollPosition = 0;
                    console.log("insied modal close " + sessionStorage.getItem("scrollPosition"));
                    $(".modal-content").scrollTop(0);
                }
            };
        }
    }, {
        key: "setText",
        value: function setText(allText) {

            this.pararpghText.innerHTML = "";
            // By lines
            var lines = allText.split('\n');
            for (var line = 0; line < lines.length; line++) {
                this.pararpghText.innerHTML += lines[line];
                this.pararpghText.innerHTML += "<br>";
            }
            this.divModel.style.display = "block";
        }
    }]);

    return BoxModelUtil;
}(Util);

var Plugin = function Plugin() {
    _classCallCheck(this, Plugin);

    if (this.draw === undefined) {
        throw new TypeError("Must override draw");
    }
};

var Chat = function (_Plugin) {
    _inherits(Chat, _Plugin);

    function Chat(domElement) {
        _classCallCheck(this, Chat);

        var _this9 = _possibleConstructorReturn(this, (Chat.__proto__ || Object.getPrototypeOf(Chat)).call(this));

        _this9.domElement = domElement;
        _this9.inputFactory = new InputFactory();
        _this9.buttonFactory = new ButtonFactory();
        _this9.chatUtil = new ChatUtil();
        return _this9;
    }

    _createClass(Chat, [{
        key: "draw",
        value: function draw(wsChatServer) {

            this.domElement.innerHTML += '<div class="chatmain">' + '<div class="messages">' + '<div class="above"  id="message_box">' + '</div>' + '<div class="bellow">' + '<tg-input class="text" name="name" id="name" placeholder="Your Name" /></tg-input>' + '<tg-input class="text" name="message" id="message" placeholder="Message" /></tg-input>' +
            // '<section class="text"> </section>'+1
            '<tg-button></tg-button>' + '</div>' + '</div>' + '<div class="loggedin">' + '<section class="me">' + '<img class="mypic" src="images/anyone.png">' + '<p class="name">Me me: </p>' + '<p class="status">Online</hp>' + '</section>' + '<section class="others">' + '</section>' + '</div>' + '<div class="clear"></div>' + '</div>';

            var inputOption = {
                inputAttribute: {},
                commands: {
                    name: {}

                }
            };

            this.options = eval(this.domElement.getAttribute("options"));

            var inputs = this.domElement.getElementsByTagName("tg-input");

            for (var i = 0; i < inputs.length; i++) {
                var attributes = inputs[i].attributes;
                if (i == 0) {
                    inputOption.commands["name"]["name"] = this.options.commands.name.name;
                    inputOption.commands["name"]["func"] = this.options.commands.name.func;
                } else {
                    inputOption.commands["name"]["name"] = this.options.commands.message.name;
                    inputOption.commands["name"]["func"] = this.options.commands.message.func;
                }

                while (inputs[i].attributes.length > 0) {
                    var attributeName = attributes[0].nodeName;
                    inputOption.inputAttribute[attributeName] = attributes[0].nodeValue;
                    inputs[i].removeAttribute(attributeName);
                }
                this.inputFactory.createObject(inputs[i], inputOption);
            }

            var tgButton = this.domElement.getElementsByTagName("tg-button");

            var buttonSend = {
                buttonAttribute: {
                    id: "send-btn",
                    class: "send"
                },
                buttonValue: "send",
                onClickFunc: {}
            };
            buttonSend["onClickFunc"]["func"] = this.options.onClickFunc.func;
            this.buttonFactory.createObject(tgButton[0], buttonSend);

            this.chatUtil.initChat(wsChatServer);
        }
    }]);

    return Chat;
}(Plugin);

var Login = function (_Plugin2) {
    _inherits(Login, _Plugin2);

    function Login(domElement) {
        _classCallCheck(this, Login);

        var _this10 = _possibleConstructorReturn(this, (Login.__proto__ || Object.getPrototypeOf(Login)).call(this));

        _this10.domElement = domElement;
        _this10.inputFactory = new InputFactory();
        _this10.buttonFactory = new ButtonFactory();
        return _this10;
    }

    _createClass(Login, [{
        key: "draw",
        value: function draw() {
            try {
                this.options = eval(this.domElement.getAttribute("options"));

                if (this.options == undefined) {
                    throw "Exception: Can't init tg-accessibility, option attribute is undefined";
                }
                //if user define label in login options
                if (this.options.labels) {

                    this.domElement.innerHTML += "<label> </label>" + "<label> </label>";

                    var labels = this.domElement.getElementsByTagName("label");
                    var labelChild = 0;
                    for (var label in this.options.labels) {
                        labels[labelChild].innerHTML += this.options.labels[label];
                        labels[labelChild++].innerHTML += "<tg-input></tg-input>";
                    }
                    this.domElement.innerHTML += "<tg-button></tg-button>";
                } else {
                    this.domElement.innerHTML += "<tg-input></tg-input>" + "<tg-input></tg-input>" + "<tg-button></tg-button>";
                }

                var textInput = {
                    inputAttribute: {
                        type: "text"
                    },
                    commands: {
                        name: {}

                    }
                };

                var passInput = {
                    inputAttribute: {
                        type: "password"
                    },
                    commands: {
                        name: {}

                    }
                };

                var inputs = this.domElement.getElementsByTagName("tg-input");
                for (var i = 0; i < inputs.length; i++) {
                    if (i == 0) {

                        textInput.commands["name"]["name"] = this.options.commands.username.name;
                        textInput.commands["name"]["func"] = this.options.commands.username.func;
                        this.inputFactory.createObject(inputs[i], textInput);
                    } else {
                        passInput.commands["name"]["name"] = this.options.commands.password.name;
                        passInput.commands["name"]["func"] = this.options.commands.password.func;
                        this.inputFactory.createObject(inputs[i], passInput);
                    }
                }

                //check if user define button value and button function
                if (this.options.buttonValue && this.options.commands.submit || this.options.buttonValue && this.options.onClickFunc) {

                    var tgButton = this.domElement.getElementsByTagName("tg-button");

                    //if user define own voice command by submit property inside commands
                    if (this.options.commands.submit) {

                        var buttonLogin = {
                            buttonAttribute: {},
                            buttonValue: this.options.buttonValue,
                            commands: {
                                submit: {}
                            }
                        };

                        buttonLogin["commands"]["submit"]["name"] = this.options.commands.submit.name;
                        buttonLogin["commands"]["submit"]["func"] = this.options.commands.submit.func;
                    }
                    //we use 2gather button keyword
                    else {

                            var buttonLogin = {
                                buttonAttribute: {},
                                buttonValue: this.options.buttonValue,
                                onClickFunc: {}
                            };

                            buttonLogin["onClickFunc"]["func"] = this.options.onClickFunc.func;
                        }
                    this.buttonFactory.createObject(tgButton[0], buttonLogin);
                }
            } catch (e) {
                console.log(e);
            }
        }
    }]);

    return Login;
}(Plugin);

var Library = function (_Plugin3) {
    _inherits(Library, _Plugin3);

    function Library(domElement) {
        _classCallCheck(this, Library);

        var _this11 = _possibleConstructorReturn(this, (Library.__proto__ || Object.getPrototypeOf(Library)).call(this));

        _this11.domElement = domElement;
        _this11.imgFactory = new ImgFactory();

        return _this11;
    }

    _createClass(Library, [{
        key: "draw",
        value: function draw() {
            try {
                var options = eval(this.domElement.getAttribute("options"));
                if (this.options == undefined) {
                    throw "Exception: Can't init tg-library, option attribute is undefined";
                }

                var libraryContainer = document.createElement("div");
                //our class for this divContainer plugin
                libraryContainer.setAttribute("class", "tg-library-books");

                for (var propertyName in options) {

                    var divStory = document.createElement("div");
                    //our class for this divStory plugin
                    divStory.setAttribute("class", "tg-library-story");

                    //our class for this header
                    var bookHeader = document.createElement("h5");
                    bookHeader.setAttribute("class", "tg-library-header");

                    var tgImg = document.createElement("tg-img");

                    var libraryImg = {
                        imgAttribute: {},
                        path: "",
                        img: "",
                        voiceCommand: ""
                    };

                    for (var propertyAtrr in options[propertyName]["imgAttribute"]) {
                        libraryImg.imgAttribute[propertyAtrr] = options[propertyName]["imgAttribute"][propertyAtrr];
                    }

                    libraryImg.path = options[propertyName]["path"];
                    libraryImg.img = options[propertyName]["img"];
                    libraryImg.voiceCommand = options[propertyName]["voiceCommand"];
                    bookHeader.innerHTML += options[propertyName]["voiceCommand"];

                    this.imgFactory.createObject(tgImg, libraryImg);

                    divStory.appendChild(bookHeader);
                    divStory.appendChild(tgImg);
                    libraryContainer.appendChild(divStory);
                }

                this.domElement.appendChild(libraryContainer);
            } catch (e) {
                console.log(e);
            }
        }
    }]);

    return Library;
}(Plugin);

var Accessibility = function (_Plugin4) {
    _inherits(Accessibility, _Plugin4);

    function Accessibility(domElement) {
        _classCallCheck(this, Accessibility);

        var _this12 = _possibleConstructorReturn(this, (Accessibility.__proto__ || Object.getPrototypeOf(Accessibility)).call(this));

        _this12.domElement = domElement;
        _this12.buttonFactory = new ButtonFactory();
        _this12.liFactory = new LiFactory();
        _this12.jsonData = {
            "objects": {
                "bigger_font": {
                    "id": "bigger_font",
                    "func": "var divtxt = document.querySelector('body > div:not(#acc_panel)');" + "var curSize  = window.getComputedStyle(divtxt, null).getPropertyValue('font-size');" + "var newSize = parseInt(curSize.replace('px', '')) + 1;" + "divtxt.style.fontSize = newSize + 'px';"
                },
                "smaller_font": {
                    "id": "smaller_font",
                    "func": "var divtxt = document.querySelector('body > div:not(#acc_panel)');" + "var curSize  = window.getComputedStyle(divtxt, null).getPropertyValue('font-size');" + "var newSize = parseInt(curSize.replace('px', '')) - 1;" + "if (newSize <= 10) {" + "newSize = 10+ 'px';}" + "divtxt.style.fontSize = newSize + 'px';"
                },
                "legible_font": {
                    "id": "legible_font",
                    "func": "$('body').toggleClass('lfont');"
                },
                "bright_Contrast": {
                    "id": "bright_Contrast",
                    "func": "$('body,nav,main,header,section,article,footer,div,button').toggleClass('bc_blocks');" + "$('main,header,footer,div,button').toggleClass('bc_border');" + "$('h1,h2,h3,h4,h5,h6,span,label').toggleClass('bc_headers');" + "$('a').toggleClass('bc_links');" + "$('img,svg').toggleClass('bc_image');"
                },
                "impared": {
                    "id": "impared",
                    "func": "$('body,main,nav,header,section,article,footer,div').toggleClass('vi_whitefont');" + "$('h1,h2,h3,h4,h5,h6,span,label,button').toggleClass('vi_yellowfont');" + "$('a').toggleClass('vi_link');" + "$('img,svg').toggleClass('vi_image');"
                },
                "color_blind": {
                    "id": "color_blind",
                    "func": "$('body,img').toggleClass('cb_grayscale');" + "$('body,main').toggleClass('cb_bodyWhite');"
                },
                "blackCursor": {
                    "id": "blackCursor",
                    "func": "$('body').toggleClass('black_cursor');"
                },
                "whiteCursor": {
                    "id": "whiteCursor",
                    "func": "$('body').toggleClass('white_cursor');"
                },
                "magnifier": {
                    "id": "magnifier",
                    "func": "$('.wrapper').toggleClass('largeBodyFonts');" + "$('header,#question,.buttonGame').toggleClass('lfonts');" + "$('.row_activity').toggleClass('largeB');" + "$('.container').toggleClass('largef');" + "$('.snow-globe').toggleClass('largeSnowGlobe');" + "$('.bottom').toggleClass('largeSnowBottom');" + "$('.cell img').toggleClass('largeimg');"
                },
                "imagesDescriptions": {
                    "id": "imagesDescriptions",
                    "func": "if(flag ==0){iDescriptions();" + "$('#text').css('display','block');}" + "else{flag =0;" + "$('#text').css('display','none');}"
                },
                "hightlightTitles": {
                    "id": "hightlightTitles",
                    "func": "$('h1,h2,h3,h4,h5,h6').toggleClass('hightlight_titles');"
                },
                "hightlightLinks": {
                    "id": "hightlightLinks",
                    "func": "$('a').toggleClass('hightlight_Links');"
                }
            }
        };

        return _this12;
    }

    _createClass(Accessibility, [{
        key: "draw",
        value: function draw() {
            var _this13 = this;

            this.options = eval(this.domElement.getAttribute("options"));

            if (this.options == undefined) {
                throw "Exception: Can't init tg-accessibility, option attribute is undefined";
            }

            var tgButtonElement = document.createElement("tg-button");
            this.domElement.appendChild(tgButtonElement);

            //main container
            var divAccPanel = document.createElement("div");
            divAccPanel.setAttribute("id", "acc_panel");
            this.domElement.appendChild(divAccPanel);

            //accessibility header
            var divHeader = document.createElement("div");
            divHeader.setAttribute("class", "header_panel");

            var ulHeader = document.createElement("ul");
            divAccPanel.appendChild(divHeader);
            divHeader.appendChild(ulHeader);

            var tgLButtonClose = document.createElement("tg-button");
            ulHeader.appendChild(tgLButtonClose);
            var buttonClose = {
                liAttribute: {
                    id: "hide_panel"
                },
                buttonValue: "Close",
                commands: {
                    submit: {}
                }
            };

            buttonClose.commands["submit"]["name"] = "close accessibility";
            buttonClose.commands["submit"]["func"] = function () {
                $('#acc_panel').hide();
            };

            this.buttonFactory.createObject(tgLButtonClose, buttonClose);

            var headerAccess = document.createElement("h3");
            headerAccess.innerHTML += "Accessibility";
            divHeader.appendChild(headerAccess);

            var divButtonPanel = document.createElement("div");
            divButtonPanel.setAttribute("class", "buttons_panel");
            divAccPanel.appendChild(divButtonPanel);

            console.log(this.jsonData);
            console.log(this.jsonData.objects.length);

            var div_row_panel;
            var row3_panel;
            var ul;

            var index = 0;

            var _loop = function _loop(propertyName) {
                tgLi = document.createElement("tg-li");

                //create duc for put 3 li inside it

                if (index == 0 || index == 3 || index == 6) {

                    div_row_panel = document.createElement("div");
                    div_row_panel.setAttribute("class", "row_panel");
                    divButtonPanel.appendChild(div_row_panel);

                    row3_panel = document.createElement("div");
                    row3_panel.setAttribute("class", "row3_panel");
                    div_row_panel.appendChild(row3_panel);

                    ul = document.createElement("ul");
                    row3_panel.appendChild(ul);
                }

                var li = {
                    liAttribute: {},
                    commands: {
                        submit: {}
                    }
                };

                var option = _this13.options[propertyName]["option"];
                var text = _this13.options[propertyName]["text"];
                var func = void 0;
                var image = _this13.options[propertyName]["image"];

                //set func
                if (option != null || option != undefined) {
                    li.liAttribute.id = _this13.jsonData.objects[option]["id"];
                    func = _this13.jsonData.objects[option]["func"];
                    li.commands["submit"]["func"] = function () {
                        eval(func);
                    };
                }
                //set text to function
                if (text != null || text != undefined) {
                    li.liAttribute.text = _this13.options[propertyName]["text"];
                    li.commands["submit"]["name"] = _this13.options[propertyName]["text"];
                }

                _this13.liFactory.createObject(tgLi, li);

                var img = document.createElement("img");
                //set img to function
                if (image != null || image != undefined) {
                    img.setAttribute("src", image);
                }

                liChild = tgLi.firstChild;

                liChild.appendChild(img);
                ul.appendChild(tgLi);

                index++;
            };

            for (var propertyName in this.options) {
                var tgLi;
                var liChild;

                _loop(propertyName);
            }

            var tgLi = document.createElement("tg-li");
            div_row_panel = document.createElement("div");
            div_row_panel.setAttribute("class", "row_panel");
            divButtonPanel.appendChild(div_row_panel);

            row3_panel = document.createElement("div");
            row3_panel.setAttribute("class", "row3_panel");
            div_row_panel.appendChild(row3_panel);

            var tgButton = this.domElement.getElementsByTagName("tg-button");

            var buttonAccess = {
                buttonAttribute: {
                    id: "acc_logo"
                },
                // buttonValue : "Open Accessibility",
                commands: {
                    submit: {}
                }
            };

            buttonAccess["commands"]["submit"]["name"] = "נגישות";
            buttonAccess["commands"]["submit"]["func"] = function () {
                $("#acc_panel").toggle();
                console.log("tg-button");
            };

            this.buttonFactory.createObject(tgButton[0], buttonAccess);
        }
    }]);

    return Accessibility;
}(Plugin);

var Menu = function (_Plugin5) {
    _inherits(Menu, _Plugin5);

    function Menu(domElement) {
        _classCallCheck(this, Menu);

        var _this14 = _possibleConstructorReturn(this, (Menu.__proto__ || Object.getPrototypeOf(Menu)).call(this));

        _this14.domElement = domElement;
        _this14.linkFactory = new LinkFactory();
        return _this14;
    }

    _createClass(Menu, [{
        key: "draw",
        value: function draw() {
            try {
                this.options = eval(this.domElement.getAttribute("options"));

                if (this.options == undefined) {
                    throw "Exception: Can't init tg-menu, option attribute is undefined";
                }

                var nav = document.createElement("nav");
                var ul = document.createElement("ul");
                ul.setAttribute("class", "tg-ul");

                for (var propertyName in this.options) {
                    var _li = document.createElement("li");
                    _li.setAttribute("class", "tg-li");
                    var a = document.createElement("tg-a");

                    var menuOptions = {
                        link: {}
                    };

                    for (var propertyAtrr in this.options[propertyName]) {
                        menuOptions.link[propertyAtrr] = this.options[propertyName][propertyAtrr];
                    }

                    this.linkFactory.createObject(a, menuOptions);
                    _li.appendChild(a);
                    ul.appendChild(_li);
                }
                nav.appendChild(ul);
                this.domElement.appendChild(nav);
            } catch (e) {
                console.log(e);
            }
        }
    }]);

    return Menu;
}(Plugin);

var Game = function (_Plugin6) {
    _inherits(Game, _Plugin6);

    function Game(domElement) {
        _classCallCheck(this, Game);

        var _this15 = _possibleConstructorReturn(this, (Game.__proto__ || Object.getPrototypeOf(Game)).call(this));

        _this15.domElement = domElement;
        _this15.linkFactory = new LinkFactory();
        _this15.questions = {
            "questions": [{
                "question": "Which picture shows Shrek?",
                "choices": ["shrek", "pooh", "dog", "thing"],
                "correctAnswer": 0
            }, {
                "question": "Which picture shows an Owl?",
                "choices": ["Penguin", "Flamingo", "Owl", "Quetzal"],
                "correctAnswer": 2
            }, {
                "question": "Which picture shows a fruit?",
                "choices": ["Brocoli", "Carrots", "Apple", "Paprika"],
                "correctAnswer": 2
            }, {
                "question": "Which picture shows the answer of 2+2?",
                "choices": ["8", "4", "6", "5"],
                "correctAnswer": 1
            }, {
                "question": "Which picture shows a Quetzal?",
                "choices": ["8", "4", "6", "5"],
                "correctAnswer": 2
            }]
        };

        _this15.questionCounter = 0; //Tracks question number
        _this15.selections = []; //Array containing user choices
        // var quiz = document.getElementById("quiz"); //Quiz div object
        _this15.questions;
        _this15.quiz = $('#quiz');

        return _this15;
    }

    _createClass(Game, [{
        key: "draw",
        value: function draw() {

            //main container
            var divQuiz = document.createElement("div");
            divQuiz.setAttribute("id", "quiz");
            this.domElement.appendChild(divQuiz);

            var divNext = document.createElement("div");
            divNext.setAttribute("class", "buttonGame");
            divNext.setAttribute("id", "next");
            this.domElement.appendChild(divNext);

            var divPrev = document.createElement("div");
            divPrev.setAttribute("class", "buttonGame");
            divPrev.setAttribute("id", "prev");
            this.domElement.appendChild(divPrev);

            var divStart = document.createElement("div");
            divStart.setAttribute("class", "buttonGame");
            divStart.setAttribute("id", "start");
            this.domElement.appendChild(divStart);

            var aNext = document.createElement("tg-a");
            divNext.appendChild(aNext);
            var nextLink = {
                link: {
                    href: "#",
                    text: "Next"
                }
            };
            this.linkFactory.createObject(aNext, nextLink);

            var aPrev = document.createElement("tg-a");
            divPrev.appendChild(aPrev);
            var prevLink = {
                link: {
                    href: "#",
                    text: "Prev"
                }
            };
            this.linkFactory.createObject(aPrev, prevLink);

            var aStart = document.createElement("tg-a");
            divStart.appendChild(aStart);
            var startLink = {
                link: {
                    href: "#",
                    text: "Start Over"
                }
            };
            this.linkFactory.createObject(aStart, startLink);

            this.displayNext();

            // Click handler for the 'next' button
            $('#next').on('click', function (e) {
                e.preventDefault();

                // Suspend click listener during fade animation
                if (this.quiz.is(':animated')) {
                    return false;
                }
                this.choose();

                // If no user selection, progress is stopped
                if (isNaN(this.selections[this.questionCounter])) {
                    alert('Please make a selection!');
                } else {
                    this.questionCounter++;
                    this.displayNext();
                }
            });

            // Click handler for the 'prev' button
            $('#prev').on('click', function (e) {
                e.preventDefault();

                if (this.quiz.is(':animated')) {
                    return false;
                }
                this.choose();
                this.questionCounter--;
                this.displayNext();
            });

            // Click handler for the 'Start Over' button
            $('#start').on('click', function (e) {
                e.preventDefault();

                if (this.quiz.is(':animated')) {
                    return false;
                }
                this.questionCounter = 0;
                this.selections = [];
                this.displayNext();
                $('#start').hide();
            });

            // Animates buttons on hover
            $('.buttonGame').on('mouseenter', function () {
                $(this).addClass('active');
            });
            $('.buttonGame').on('mouseleave', function () {
                $(this).removeClass('active');
            });

            // // Creates and returns the div that contains the questions and
            // // the answer selections
        }
    }, {
        key: "createQuestionElement",
        value: function createQuestionElement(index) {
            var qElement = $('<div>', {
                id: 'question'
            });
            var header = $('<h4>Question ' + (index + 1) + '</h4>');
            qElement.append(header);

            var question = $('<h3>').append(this.questions[index].question);
            qElement.append(question);

            var radioButtons = this.createRadios(index);
            qElement.append(radioButtons);

            return qElement;
        }

        // // Creates a list of the answer choices as radio inputs

    }, {
        key: "createRadios",
        value: function createRadios(index) {

            var radioList = $('<div>', {
                class: 'row'
            });

            var input = '';
            // var item = '';
            for (var i = 0; i < this.questions[index].choices.length; i++) {

                input = '<label class="cell"><input type="radio" name="answer" value=' + i + ' /> ' + (i + 1) + "." + "   " + '<img src="images/quez/' + this.questions[index].choices[i] + "." + "jpg" + '" width="40%" alt=' + this.questions[index].choices[i] + ' /></label>';
                // item = '<img src="images/quez/'+questions[index].choices[i]+"."+"jpg"+'" width="40%" alt='+questions[index].choices[i]+' />';
                // // input += item;
                // input.append(item);
                radioList.append(input);
            }

            return radioList;
        }

        //
        // // Reads the user selection and pushes the value to an array

    }, {
        key: "choose",
        value: function choose() {
            this.selections[this.questionCounter] = +$('input[name="answer"]:checked').val();
        }

        // Computes score and returns a paragraph element to be displayed

    }, {
        key: "displayScore",
        value: function displayScore() {
            var score = $('<p>', { class: 'score' });

            var numCorrect = 0;
            for (var i = 0; i < this.selections.length; i++) {
                if (this.selections[i] === this.questions[i].correctAnswer) {
                    numCorrect++;
                }
            }

            score.append('You got ' + numCorrect + ' questions out of ' + this.questions.length + ' right!!!');
            return score;
        }
    }, {
        key: "displayNext",
        value: function displayNext() {
            this.quiz.fadeOut(function () {
                $('#question').remove();

                if (this.questionCounter < this.questions.length) {
                    var nextQuestion = this.createQuestionElement(questionCounter);
                    this.quiz.append(nextQuestion).fadeIn();
                    if (!isNaN(this.selections[this.questionCounter])) {
                        $('input[value=' + this.selections[this.questionCounter] + ']').prop('checked', true);
                    }

                    // Controls display of 'prev' button
                    if (this.questionCounter === 1) {
                        $('#prev').show();
                    } else if (this.questionCounter === 0) {

                        $('#prev').hide();
                        $('#next').show();
                    }
                } else {
                    var scoreElem = this.displayScore();
                    this.quiz.append(scoreElem).fadeIn();
                    $('#next').hide();
                    $('#prev').hide();
                    $('#start').show();
                }
            });
        }
    }]);

    return Game;
}(Plugin);

var PluginFactory = function PluginFactory() {
    _classCallCheck(this, PluginFactory);

    if (this.createPlugin === undefined) {
        throw new TypeError("Must override createPlugin");
    }
};

var loginFactoryInstance = null;

var LoginFactory = function (_PluginFactory) {
    _inherits(LoginFactory, _PluginFactory);

    function LoginFactory() {
        var _ret10;

        _classCallCheck(this, LoginFactory);

        var _this16 = _possibleConstructorReturn(this, (LoginFactory.__proto__ || Object.getPrototypeOf(LoginFactory)).call(this));

        if (!loginFactoryInstance) {
            loginFactoryInstance = _this16;
            _this16.annyangUtil = new AnnyangUtil();
        }
        return _ret10 = loginFactoryInstance, _possibleConstructorReturn(_this16, _ret10);
    }

    _createClass(LoginFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var login = new Login(domElement);
            this.options = eval(domElement.getAttribute("options"));
            login.draw();
            return login;
        }
    }]);

    return LoginFactory;
}(PluginFactory);

var chatFactoryInstance = null;

var ChatFactory = function (_PluginFactory2) {
    _inherits(ChatFactory, _PluginFactory2);

    function ChatFactory() {
        var _ret11;

        _classCallCheck(this, ChatFactory);

        var _this17 = _possibleConstructorReturn(this, (ChatFactory.__proto__ || Object.getPrototypeOf(ChatFactory)).call(this));

        if (!chatFactoryInstance) {
            chatFactoryInstance = _this17;
        }
        return _ret11 = chatFactoryInstance, _possibleConstructorReturn(_this17, _ret11);
    }

    _createClass(ChatFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var chat = new Chat(domElement);
            this.options = eval(domElement.getAttribute("options"));
            chat.draw(this.options.wsURL);
            return chat;
        }
    }]);

    return ChatFactory;
}(PluginFactory);

var menuFactoryInstance = null;

var MenuFactory = function (_PluginFactory3) {
    _inherits(MenuFactory, _PluginFactory3);

    function MenuFactory() {
        var _ret12;

        _classCallCheck(this, MenuFactory);

        var _this18 = _possibleConstructorReturn(this, (MenuFactory.__proto__ || Object.getPrototypeOf(MenuFactory)).call(this));

        if (!menuFactoryInstance) {
            menuFactoryInstance = _this18;
        }
        return _ret12 = menuFactoryInstance, _possibleConstructorReturn(_this18, _ret12);
    }

    _createClass(MenuFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var menu = new Menu(domElement);
            this.options = eval(domElement.getAttribute("options"));
            menu.draw();
            return menu;
        }
    }]);

    return MenuFactory;
}(PluginFactory);

var libraryFactoryInstance = null;

var LibraryFactory = function (_PluginFactory4) {
    _inherits(LibraryFactory, _PluginFactory4);

    function LibraryFactory() {
        var _ret13;

        _classCallCheck(this, LibraryFactory);

        var _this19 = _possibleConstructorReturn(this, (LibraryFactory.__proto__ || Object.getPrototypeOf(LibraryFactory)).call(this));

        if (!libraryFactoryInstance) {
            libraryFactoryInstance = _this19;
            _this19.annyangUtil = new AnnyangUtil();
        }
        return _ret13 = libraryFactoryInstance, _possibleConstructorReturn(_this19, _ret13);
    }

    _createClass(LibraryFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var library = new Library(domElement);
            this.options = eval(domElement.getAttribute("options"));
            library.draw();
            return library;
        }
    }]);

    return LibraryFactory;
}(PluginFactory);

var accessibilityFactoryInstance = null;

var AccessibilityFactory = function (_PluginFactory5) {
    _inherits(AccessibilityFactory, _PluginFactory5);

    function AccessibilityFactory() {
        var _ret14;

        _classCallCheck(this, AccessibilityFactory);

        var _this20 = _possibleConstructorReturn(this, (AccessibilityFactory.__proto__ || Object.getPrototypeOf(AccessibilityFactory)).call(this));

        if (!accessibilityFactoryInstance) {
            accessibilityFactoryInstance = _this20;
            _this20.annyangUtil = new AnnyangUtil();
        }
        return _ret14 = accessibilityFactoryInstance, _possibleConstructorReturn(_this20, _ret14);
    }

    _createClass(AccessibilityFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var accessibility = new Accessibility(domElement);
            this.options = eval(domElement.getAttribute("options"));
            accessibility.draw();
            // this.initUtils();
            return accessibility;
        }
    }]);

    return AccessibilityFactory;
}(PluginFactory);

var gameFactoryInstance = null;

var GameFactory = function (_PluginFactory6) {
    _inherits(GameFactory, _PluginFactory6);

    function GameFactory() {
        var _ret15;

        _classCallCheck(this, GameFactory);

        var _this21 = _possibleConstructorReturn(this, (GameFactory.__proto__ || Object.getPrototypeOf(GameFactory)).call(this));

        if (!gameFactoryInstance) {
            gameFactoryInstance = _this21;
            _this21.annyangUtil = new AnnyangUtil();
        }
        return _ret15 = gameFactoryInstance, _possibleConstructorReturn(_this21, _ret15);
    }

    _createClass(GameFactory, [{
        key: "createPlugin",
        value: function createPlugin(domElement) {
            var game = new Game(domElement);
            this.options = eval(domElement.getAttribute("options"));
            game.draw();
            return game;
        }
    }]);

    return GameFactory;
}(PluginFactory);

var ObjectFactory = function ObjectFactory() {
    _classCallCheck(this, ObjectFactory);

    if (this.createObject === undefined) {
        throw new TypeError("Must override createObject");
    }
    if (this.initUtils === undefined) {
        throw new TypeError("Must override initUtils");
    }
    // if (this.initHearingUtils === undefined) {
    //     throw new TypeError("Must override initHearingUtils");
    // }
    // if(sessionStorage.getItem("disability").indexOf("hearing") != -1){
    //     this.initHearingUtils();
    // }
};

var inputFactoryInstance = null;

var InputFactory = function (_ObjectFactory) {
    _inherits(InputFactory, _ObjectFactory);

    function InputFactory(gatherApiObject) {
        var _ret16;

        _classCallCheck(this, InputFactory);

        var _this22 = _possibleConstructorReturn(this, (InputFactory.__proto__ || Object.getPrototypeOf(InputFactory)).call(this));

        _this22.gatherApiObject = gatherApiObject;
        if (!inputFactoryInstance) {
            inputFactoryInstance = _this22;
            _this22.annyangUtil = new AnnyangUtil();
        }
        return _ret16 = inputFactoryInstance, _possibleConstructorReturn(_this22, _ret16);
    }

    _createClass(InputFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var inputText = void 0;

            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                inputText = new InputText(domElement);
                inputText.draw(null);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            } else {
                this.options = options;
                inputText = new InputText(domElement);
                inputText.draw(this.options);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            }
            this.gatherApiObject.objects.push(inputText);
            return inputText;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {

            var commands = {};

            for (var command in this.options.commands) {
                commands[this.options.commands[command].name] = this.options.commands[command].func;
            }
            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return InputFactory;
}(ObjectFactory);

var TGObject = function TGObject() {
    _classCallCheck(this, TGObject);

    if (this.draw === undefined) {
        throw new TypeError("Must override draw");
    }
    if (this.enableTobii === undefined) {
        throw new TypeError("Must override draw");
    }
    if (this.enablejoystick === undefined) {
        throw new TypeError("Must override draw");
    }
    if (this.enableClickers === undefined) {
        throw new TypeError("Must override draw");
    }
};

var InputText = function (_TGObject) {
    _inherits(InputText, _TGObject);

    function InputText(domElement) {
        _classCallCheck(this, InputText);

        var _this23 = _possibleConstructorReturn(this, (InputText.__proto__ || Object.getPrototypeOf(InputText)).call(this));

        _this23.domElement = domElement;
        return _this23;
    }

    _createClass(InputText, [{
        key: "draw",
        value: function draw(options) {

            var input = void 0;
            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                input = this.initInput();
            } else {
                this.options = options;
                input = this.initInput();
            }
            this.domElement.appendChild(input);
        }
    }, {
        key: "initInput",
        value: function initInput() {
            var input = document.createElement("input");
            if (this.options.inputAttribute) {
                for (var attribute in this.options.inputAttribute) {
                    input.setAttribute(attribute, this.options.inputAttribute[attribute]);
                }
            }

            return input;
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {}
    }, {
        key: "enablejoystick",
        value: function enablejoystick(lang) {
            $('#' + this.options.inputAttribute.id).keyboard({
                layout: lang
            });
        }
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return InputText;
}(TGObject);

var Li = function (_TGObject2) {
    _inherits(Li, _TGObject2);

    function Li(domElement) {
        _classCallCheck(this, Li);

        var _this24 = _possibleConstructorReturn(this, (Li.__proto__ || Object.getPrototypeOf(Li)).call(this));

        _this24.domElement = domElement;
        _this24.annyangUtil = new AnnyangUtil();

        return _this24;
    }

    _createClass(Li, [{
        key: "draw",
        value: function draw(options) {

            var li = void 0;

            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                li = this.initLi();
            } else {
                this.options = options;
                li = this.initLi();
            }

            this.domElement.appendChild(li);
        }
    }, {
        key: "initLi",
        value: function initLi() {

            var li = document.createElement("li");

            if (this.options.liAttribute) {
                for (var attribute in this.options.liAttribute) {
                    if (attribute == "text") {
                        li.innerHTML += this.options.liAttribute[attribute];
                    }
                    li.setAttribute(attribute, this.options.liAttribute[attribute]);
                }
            }
            if (this.options.commands) {
                li.onclick = this.options.commands.submit.func;
            }

            return li;
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {}
    }, {
        key: "enablejoystick",
        value: function enablejoystick() {}
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return Li;
}(TGObject);

var Button = function (_TGObject3) {
    _inherits(Button, _TGObject3);

    function Button(domElement) {
        _classCallCheck(this, Button);

        var _this25 = _possibleConstructorReturn(this, (Button.__proto__ || Object.getPrototypeOf(Button)).call(this));

        _this25.domElement = domElement;
        return _this25;
    }

    _createClass(Button, [{
        key: "draw",
        value: function draw(options) {

            var button = void 0;

            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                button = this.initButton();
            } else {
                this.options = options;
                button = this.initButton();
            }
            this.domElement.appendChild(button);
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {
            this.button.classList.add("btn-lg");
        }
    }, {
        key: "enablejoystick",
        value: function enablejoystick() {}
    }, {
        key: "initButton",
        value: function initButton() {

            this.button = document.createElement("button");

            if (this.options.buttonAttribute) {
                for (var attribute in this.options.buttonAttribute) {
                    this.button.setAttribute(attribute, this.options.buttonAttribute[attribute]);
                }
            }
            if (this.options.buttonValue) {
                this.button.innerHTML = this.options.buttonValue;
            }
            if (this.options.onClickFunc) {
                this.button.onclick = this.options.onClickFunc.func;
            } else if (this.options.commands) {
                this.button.onclick = this.options.commands.submit.func;
            }
            return this.button;
        }
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return Button;
}(TGObject);

var Link = function (_TGObject4) {
    _inherits(Link, _TGObject4);

    function Link(domElement) {
        _classCallCheck(this, Link);

        var _this26 = _possibleConstructorReturn(this, (Link.__proto__ || Object.getPrototypeOf(Link)).call(this));

        _this26.domElement = domElement;
        return _this26;
    }

    _createClass(Link, [{
        key: "draw",
        value: function draw(options) {

            var link = void 0;
            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                this.link = this.initLink();
            } else {
                this.options = options;
                this.link = this.initLink();
            }
            this.domElement.appendChild(this.link);
        }
    }, {
        key: "initLink",
        value: function initLink() {
            var link = document.createElement("a");
            for (var propertyName in this.options) {
                for (var attribute in this.options[propertyName]) {
                    if (attribute == "text") {
                        link.innerHTML = this.options[propertyName][attribute];
                    } else if (attribute == "commandTrigger") {} else {
                        link.setAttribute(attribute, this.options[propertyName][attribute]);
                    }
                }
            }
            return link;
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {
            this.link.style.fontSize = "2em";
            console.log("li tobi");
        }
    }, {
        key: "enablejoystick",
        value: function enablejoystick() {}
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return Link;
}(TGObject);

var Paragraph = function (_TGObject5) {
    _inherits(Paragraph, _TGObject5);

    function Paragraph(domElement) {
        _classCallCheck(this, Paragraph);

        var _this27 = _possibleConstructorReturn(this, (Paragraph.__proto__ || Object.getPrototypeOf(Paragraph)).call(this));

        _this27.domElement = domElement;
        return _this27;
    }

    _createClass(Paragraph, [{
        key: "draw",
        value: function draw(options) {

            var paragraph = void 0;
            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                paragraph = this.initpPragraph();
            } else {
                this.options = options;
                paragraph = this.initpPragraph();
            }
            this.domElement.appendChild(paragraph);
        }
    }, {
        key: "initpPragraph",
        value: function initpPragraph() {
            var paragraph = document.createElement("p");
            paragraph.innerHTML = this.options.commands.content;
            return paragraph;
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {}
    }, {
        key: "enablejoystick",
        value: function enablejoystick() {}
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return Paragraph;
}(TGObject);

var Img = function (_TGObject6) {
    _inherits(Img, _TGObject6);

    function Img(domElement, gatherApiObject) {
        _classCallCheck(this, Img);

        var _this28 = _possibleConstructorReturn(this, (Img.__proto__ || Object.getPrototypeOf(Img)).call(this));

        _this28.domElement = domElement;
        _this28.annyangUtil = new AnnyangUtil();
        _this28.speechUtil = new SpeechUtil();
        _this28.boxModal = new BoxModelUtil();
        _this28.gatherApiObject = gatherApiObject;
        return _this28;
    }

    _createClass(Img, [{
        key: "draw",
        value: function draw(options) {

            var img = void 0;

            if (options == null || options == undefined) {
                this.options = eval(this.domElement.getAttribute("options"));
                img = this.initImage();
            } else {
                this.options = options;
                img = this.initImage();
            }

            this.domElement.appendChild(img);
        }
    }, {
        key: "initImage",
        value: function initImage() {
            var self = this;

            this.img = document.createElement("img");

            if (this.options.imgAttribute) {
                for (var attribute in this.options.imgAttribute) {
                    this.img.setAttribute(attribute, this.options.imgAttribute[attribute]);
                }
            }
            if (this.options.img) {
                this.img.setAttribute("src", this.options["img"]);
            }
            if (this.options.path) {

                var path = this.options["path"];
                // When the user clicks the button, open the modal
                this.img.onclick = function () {

                    document.getElementsByClassName("content-paragraph").innerHTML += "";
                    var rawFile = new XMLHttpRequest();
                    rawFile.open("GET", path, false);
                    rawFile.onreadystatechange = function () {
                        if (rawFile.readyState === 4) {
                            if (rawFile.status === 200 || rawFile.status == 0) {
                                var allText = rawFile.responseText;
                                // let boxModal = new BoxModelUtil();
                                self.boxModal.setText(allText);
                            }
                        }
                    };
                    rawFile.send(null);
                };
            }
            //init voice command
            var commands = {};
            if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {

                //first check if there is file path exist for voice command
                if (this.options.path) {
                    sessionStorage.scrollPosition = 0;
                    if (this.options.voiceCommand) {
                        var dataCommand = this.options.voiceCommand;
                        commands[this.options.voiceCommand] = function () {
                            self.img.click();
                        };
                    }
                    var langObj = this.annyangUtil.getLangObj();
                    for (var langCommand in langObj) {
                        if (langObj[langCommand].hasOwnProperty("imgCloseModal")) {
                            commands[langObj[langCommand]["imgCloseModal"]] = function () {
                                var modal = document.getElementById('myModal');
                                modal.style.display = "none";
                                sessionStorage.scrollPosition = 0;
                                console.log("insied modal close " + sessionStorage.getItem("scrollPosition"));
                                $(".modal-content").scrollTop(0);
                            };
                        } else if (langObj[langCommand].hasOwnProperty("imgScrollModalDown")) {
                            commands[langObj[langCommand]["imgScrollModalDown"]] = function () {
                                // var modal = document.getElementsByClassName('modal-content');
                                // modal.scrollTop = 100;
                                var position = parseInt(sessionStorage.getItem("scrollPosition"));
                                console.log(position + " before");
                                position = position + 50;
                                sessionStorage.scrollPosition = position;
                                console.log(position + " after");
                                $(".modal-content").scrollTop(position);
                            };
                        }
                    }
                }
            }
            //the user is blind
            else {
                    var self = this;
                    var _path = this.options["path"];
                    if (this.options.path) {
                        if (this.options.voiceCommand) {
                            var _dataCommand = this.options.voiceCommand;
                            commands[this.options.voiceCommand] = function () {
                                self.speechUtil.read(_path);
                            };
                        }
                    }
                }

            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);

            return this.img;
        }
    }, {
        key: "enableTobii",
        value: function enableTobii() {
            this.img.style.transform = "scale(2)";
            console.log("img tobi");
        }
    }, {
        key: "enablejoystick",
        value: function enablejoystick() {}
    }, {
        key: "enableClickers",
        value: function enableClickers() {}
    }]);

    return Img;
}(TGObject);

var buttonFactoryInstance = null;

var ButtonFactory = function (_ObjectFactory2) {
    _inherits(ButtonFactory, _ObjectFactory2);

    function ButtonFactory(gatherApiObject) {
        var _ret17;

        _classCallCheck(this, ButtonFactory);

        var _this29 = _possibleConstructorReturn(this, (ButtonFactory.__proto__ || Object.getPrototypeOf(ButtonFactory)).call(this));

        _this29.gatherApiObject = gatherApiObject;
        if (!buttonFactoryInstance) {
            buttonFactoryInstance = _this29;
            _this29.annyangUtil = new AnnyangUtil();
        }
        return _ret17 = buttonFactoryInstance, _possibleConstructorReturn(_this29, _ret17);
    }

    _createClass(ButtonFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var button = void 0;
            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                button = new Button(domElement);
                button.draw();
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            } else {
                this.options = options;
                button = new Button(domElement);
                button.draw(this.options);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            }
            this.gatherApiObject.objects.push(button);
            return button;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {

            var commands = {};

            if (this.options.commands) {

                for (var command in this.options.commands) {
                    commands[this.options.commands[command].name] = this.options.commands[command].func;
                }
            } else {
                if (this.options.onClickFunc) {

                    var langObj = this.annyangUtil.getLangObj();
                    for (var langCommand in langObj) {

                        if (langObj[langCommand].hasOwnProperty("button")) {
                            commands[langObj[langCommand]["button"] + " " + this.options["buttonValue"]] = this.options.onClickFunc.func;
                        }
                    }
                }
            }
            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return ButtonFactory;
}(ObjectFactory);

var linkFactoryInstance = null;

var LinkFactory = function (_ObjectFactory3) {
    _inherits(LinkFactory, _ObjectFactory3);

    function LinkFactory(gatherApiObject) {
        var _ret18;

        _classCallCheck(this, LinkFactory);

        var _this30 = _possibleConstructorReturn(this, (LinkFactory.__proto__ || Object.getPrototypeOf(LinkFactory)).call(this));

        _this30.gatherApiObject = gatherApiObject;
        if (!linkFactoryInstance) {
            linkFactoryInstance = _this30;
            _this30.annyangUtil = new AnnyangUtil();
        }
        return _ret18 = linkFactoryInstance, _possibleConstructorReturn(_this30, _ret18);
    }

    _createClass(LinkFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var link = void 0;

            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                link = new Link(domElement);
                link.draw(null);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            } else {
                this.options = options;
                link = new Link(domElement);
                link.draw(this.options);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            }
            this.gatherApiObject.objects.push(link);
            return link;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {
            var _this31 = this;

            var commands = {};

            for (var propertyName in this.options) {

                if (this.options[propertyName]["commandTrigger"]) {
                    (function () {
                        var webPage = _this31.options[propertyName].href;
                        commands[_this31.options[propertyName]["commandTrigger"]] = function () {
                            window.location.replace(webPage);
                        };
                    })();
                } else {
                    if (this.options[propertyName]["href"]) {
                        var langObj = this.annyangUtil.getLangObj();
                        for (var langCommand in langObj) {
                            if (langObj[langCommand].hasOwnProperty("link")) {
                                (function () {
                                    var webPage = _this31.options[propertyName]["href"];
                                    commands[langObj[langCommand]["link"] + " " + _this31.options[propertyName]["text"]] = function () {
                                        window.location.replace(webPage);
                                    };
                                })();
                            }
                        }
                    }
                }
            }
            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return LinkFactory;
}(ObjectFactory);

var liFactoryInstance = null;

var LiFactory = function (_ObjectFactory4) {
    _inherits(LiFactory, _ObjectFactory4);

    function LiFactory(gatherApiObject) {
        var _ret21;

        _classCallCheck(this, LiFactory);

        var _this32 = _possibleConstructorReturn(this, (LiFactory.__proto__ || Object.getPrototypeOf(LiFactory)).call(this));

        _this32.gatherApiObject = gatherApiObject;
        if (!liFactoryInstance) {
            liFactoryInstance = _this32;
            _this32.annyangUtil = new AnnyangUtil();
        }
        return _ret21 = liFactoryInstance, _possibleConstructorReturn(_this32, _ret21);
    }

    _createClass(LiFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var li = void 0;
            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                li = new Li(domElement);
                li.draw();
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            } else {
                this.options = options;
                li = new Li(domElement);
                li.draw(this.options);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            }
            this.gatherApiObject.objects.push(li);
            return li;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {

            var commands = {};

            if (this.options.commands) {
                for (var command in this.options.commands) {
                    commands[this.options.commands[command].name] = this.options.commands[command].func;
                }
            }

            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return LiFactory;
}(ObjectFactory);

var paragraphFactoryInstance = null;

var ParagraphFactory = function (_ObjectFactory5) {
    _inherits(ParagraphFactory, _ObjectFactory5);

    function ParagraphFactory(gatherApiObject) {
        var _ret22;

        _classCallCheck(this, ParagraphFactory);

        var _this33 = _possibleConstructorReturn(this, (ParagraphFactory.__proto__ || Object.getPrototypeOf(ParagraphFactory)).call(this));

        _this33.gatherApiObject = gatherApiObject;
        if (!paragraphFactoryInstance) {
            paragraphFactoryInstance = _this33;
            _this33.annyangUtil = new AnnyangUtil();
            _this33.SpeechUtils = new SpeechUtil();
        }
        return _ret22 = paragraphFactoryInstance, _possibleConstructorReturn(_this33, _ret22);
    }

    _createClass(ParagraphFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var paragraph = void 0;

            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                paragraph = new Paragraph(domElement);
                paragraph.draw(null);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            } else {
                this.options = options;
                paragraph = new Paragraph(domElement);
                paragraph.draw(this.options);
                if (this.gatherApiObject.requiredUtills.indexOf("voice command") != -1) {
                    this.initUtils();
                }
            }
            this.gatherApiObject.objects.push(paragraph);
            return paragraph;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {

            var commands = {};
            var text = this.options.commands.content;
            var self = this.SpeechUtils;
            commands[this.options.commands.commandTrigger] = function () {
                self.chunkContents(text);
            };
            var annyangOptions = { commands: commands };
            this.annyangUtil.addAnnyangCommands(annyangOptions);
        }
    }]);

    return ParagraphFactory;
}(ObjectFactory);

var imgFactoryInstance = null;

var ImgFactory = function (_ObjectFactory6) {
    _inherits(ImgFactory, _ObjectFactory6);

    function ImgFactory(gatherApiObject) {
        var _ret23;

        _classCallCheck(this, ImgFactory);

        var _this34 = _possibleConstructorReturn(this, (ImgFactory.__proto__ || Object.getPrototypeOf(ImgFactory)).call(this));

        _this34.gatherApiObject = gatherApiObject;
        if (!imgFactoryInstance) {
            imgFactoryInstance = _this34;
            _this34.annyangUtil = new AnnyangUtil();
        }
        return _ret23 = imgFactoryInstance, _possibleConstructorReturn(_this34, _ret23);
    }

    _createClass(ImgFactory, [{
        key: "createObject",
        value: function createObject(domElement, options) {

            var img = void 0;
            if (options == null || options == undefined) {
                this.options = eval(domElement.getAttribute("options"));
                img = new Img(domElement, this.gatherApiObject);
                img.draw();
            } else {
                this.options = options;
                img = new Img(domElement, this.gatherApiObject);
                img.draw(this.options);
            }
            this.gatherApiObject.objects.push(img);
            return img;
        }
    }, {
        key: "initUtils",
        value: function initUtils() {
            this.initAnnyang();
        }
    }, {
        key: "initAnnyang",
        value: function initAnnyang() {}
    }]);

    return ImgFactory;
}(ObjectFactory);