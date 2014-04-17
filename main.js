/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, console*/
define(function (require, exports, module) {
    'use strict';
    
    var EditorManager       = brackets.getModule("editor/EditorManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        Commands            = brackets.getModule("command/Commands"),
        KeyBindingManager   = brackets.getModule("command/KeyBindingManager"),
        AppInit             = brackets.getModule("utils/AppInit"),
        
        // Constants
        CHAR        = "character",
        WORD        = "word",
        LINE        = "line",
        MAX_LINE_LENGTH = 1000,
        UPPER       = "UpperCase",
        LOWER       = "LowerCase",
        
//        // Mark
//        isMarkSet   = false,

        // Text Selection Ring
        ring        = [],
        ringIndex   = 0,
        ringSize    = 15;
        
//    function setMarkCommand() {
//        isMarkSet = !isMarkSet;
//        
//        console.log("Mark " + (isMarkSet ? "un" : "") + "set");
//    }

    function _killRingSave(selectedText) {
        if (!selectedText) {
            return;
        }
        ring[ringIndex % ringSize] = selectedText;
        ringIndex++;
    }

    function killRingSave() {
        var editor  = EditorManager.getFocusedEditor();
        _killRingSave(editor.getSelectedText());
    }

    function killRegion(killLine) {
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            selection;
        if (killLine) {
            var start = editor.getCursorPos(),
                end = {line: start.line, ch: start.ch + MAX_LINE_LENGTH},
                text = doc.getRange(start, end);
            if (!text) {
                end.line++;
                end.ch = 0;
                text = "\n";
            }
            selection = {start: start, end: end};
            _killRingSave(text);
        } else {
            selection = editor.getSelection();
            _killRingSave(editor.getSelectedText());
        }
        doc.replaceRange("", selection.start, selection.end);
    }

    function yank() {
        if (ring.length === 0) {
            return;
        }
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            cursorPos   = editor.getCursorPos();
        doc.replaceRange(ring[(ringIndex - 1) % ringSize], cursorPos);
    }
    
    function toggleCase(type) {
        var editor       = EditorManager.getActiveEditor(),
            doc          = editor.document,
            cursorPos    = editor.getCursorPos();
        var selectedText = editor.getSelectedText();
        var textRange    = editor.getSelection();
        if (!selectedText) {
            return;
        }
        switch (type) {
        case UPPER:
            selectedText = selectedText.toUpperCase();
            break;
        case LOWER:
            selectedText = selectedText.toLowerCase();
            break;
        }
        doc.replaceRange(selectedText, textRange.start, textRange.end);
    }

//    function iSearchBackward() {
//        // @todo: stub
//    }
    
    /**
     * Function to move the cursor
     *
     * @param   {number}    unit        Number of units to move
     * @param   {number}    type        CHAR|WORD|LINE
     * @param   {boolean}   absolute    Flag to specify if the cursor isn't moved relative to the current
     *                                  position
     */
    function moveCursor(unit, type, absolute) {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos(),
            line        = cursorPos.line,
            column        = cursorPos.ch;
        switch (type) {
        case CHAR:
            column += unit - (absolute ? column : 0);
            break;
        case LINE:
            line += unit - (absolute ? line : 0);
            break;
        case WORD:
            if (Math.abs(unit) !== 1) {
                console.error("Cursor positioning for multiple words is not supported");
                return;
            }
            var text = editor.document.getLine(line),
                lineLength = text.length;
            if (unit === 1) {
                text = text.substring(column);
            } else {
                // @todo: use a better implementation for reversing a string
                // http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
                text = text.split("").reverse().join("").substring(lineLength - column);
            }
                
            var indexOfNextWord = text.search(/\W\w/) + 1;
            if (indexOfNextWord > 0) {
                column += (unit * indexOfNextWord) - (absolute ? column : 0);
            } else {
                line += unit > 0 ? 1 : -1;
                column = MAX_LINE_LENGTH;
            }
            break;
        }
        editor.setCursorPos(line, column);
    }
    
    AppInit.appReady(function () {

        var menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            
            // Command Ids
            MOVE_BEGINNING_OF_LINE  = "emacs.move-beginning-of-line",
            MOVE_END_OF_LINE        = "emacs.move-end-of-line",
            YANK                    = "emacs.yank",
            KILL_REGION             = "emacs.kill-region",
            KILL_RING_SAVE          = "emacs.kill-ring-save",
            KILL_LINE               = "emacs.kill-line",
            FORWARD_CHAR            = "emacs.forward-char",
            BACKWARD_CHAR           = "emacs.backward-char",
            FORWARD_WORD            = "emacs.forward-word",
            BACKWARD_WORD           = "emacs.backward-word",
            PREVIOUS_LINE           = "emacs.previous-line",
            NEXT_LINE               = "emacs.next-line",
            PREFIX_COMMAND          = "emacs.prefix-command",
            PREFIX_FOR_KEY_G        = "emacs.random",
            UNDO                    = "emacs.undo",
            REDO                    = "emacs.redo",
            ISEARCH_FORWARD         = "emacs.isearch-forward",
            FIND_FILE               = "emacs.find-file",
            SAVE_BUFFER             = "emacs.save-buffer",
            COMMENT_DWIM            = "emacs.comment-dwim",
            UPCASE_REGION           = "emacs.upcase-region",
            DOWNCASE_REGION         = "emacs.downcase-region",
            // .. not implemented ..
            SET_MARK_COMMAND        = "emacs.set-mark-command",
            ISEARCH_BACKWARD        = "emacs.isearch-backward",

            /*
             * Emacs commands
             *
             * Find list of commands in emacs: Ctrl-h b
             */
            commands = [
                {
                    id:         MOVE_BEGINNING_OF_LINE,
                    name:       "Move Beginning of Line",
                    key:        "Ctrl-A",
                    callback:   moveCursor.bind(this, 0, CHAR, true)
                },
                {
                    id:         MOVE_END_OF_LINE,
                    name:       "Move End of Line",
                    key:        "Ctrl-E",
                    callback:   moveCursor.bind(this, MAX_LINE_LENGTH, CHAR, true)
                },
                {
                    id:         YANK,
                    name:       "Yank",
                    key:        "Ctrl-Y",
                    callback:   yank
                },
                {
                    id:         KILL_REGION,
                    name:       "Kill Region",
                    key:        "Ctrl-W",
                    callback:   killRegion
                },
                {
                    id:         KILL_RING_SAVE,
                    name:       "Kill Ring Save",
                    key:        "Alt-W",
                    callback:   killRingSave
                },
                {
                    id:         KILL_LINE,
                    name:       "Kill Ring Save",
                    key:        "Ctrl-K",
                    callback:   killRegion.bind(null, true)
                },

//                {
//                    id:         ISEARCH_BACKWARD,
//                    name:       "Incremental Search Backward",
//                    key:        "Ctrl-R",
//                    callback:   iSearchBackward
//                },
                {
                    id:         FORWARD_CHAR,
                    name:       "Forward Character",
                    key:        "Ctrl-F",
                    callback:   moveCursor.bind(this, 1, CHAR)
                },
                {
                    id:         BACKWARD_CHAR,
                    name:       "Backward Character",
                    key:        "Ctrl-B",
                    callback:   moveCursor.bind(this, -1, CHAR)
                },
                {
                    id:         FORWARD_WORD,
                    name:       "Forward Word",
                    key:        "Alt-F",
                    callback:   moveCursor.bind(this, 1, WORD)
                },
                {
                    id:         BACKWARD_WORD,
                    name:       "Backward Word",
                    key:        "Alt-B",
                    callback:   moveCursor.bind(this, -1, WORD)
                },
                {
                    id:         NEXT_LINE,
                    name:       "Next Line",
                    key:        "Ctrl-N",
                    callback:   moveCursor.bind(this, 1, LINE)
                },
                {
                    id:         PREVIOUS_LINE,
                    name:       "Previous Line",
                    key:        "Ctrl-P",
                    callback:   moveCursor.bind(this, -1, LINE)
                },
                {
                    id:         UPCASE_REGION,
                    name:       "Change to Upper",
                    key:        "Alt-U",
                    callback:   toggleCase.bind(this, UPPER)
                },
                {
                    id:         DOWNCASE_REGION,
                    name:       "Change to Lower",
                    key:        "Alt-L",
                    callback:   toggleCase.bind(this, LOWER)
                },
                {
                    id:         PREFIX_COMMAND,
                    name:       "Prefix Command",
                    key:        "Ctrl-X",
                    commands:   [
                        {
                            id:         FIND_FILE,
                            key:        "Ctrl-F",
                            overrideId:   Commands.FILE_OPEN
                        },
                        {
                            id:         SAVE_BUFFER,
                            key:        "Ctrl-S",
                            overrideId:   Commands.FILE_SAVE
                        }
                    ]
                },
                {
                    id:         PREFIX_FOR_KEY_G,
                    name:       "Prefix command for key C-G",
                    key:        "Ctrl-G",
                    commands:   [
                        {
                            id:         REDO,
                            key:        "Ctrl-/",
                            overrideId:   Commands.EDIT_REDO
                        }
                    ]
                },
                {
                    id:         UNDO,
                    name:       "Undo",
                    key:        "Ctrl-/",
                    overrideId:   Commands.EDIT_UNDO
                },
                {
                    id:         COMMENT_DWIM,
                    name:       "Comment (Do What I Mean)",
                    key:        "Alt-;",
                    overrideId:   Commands.EDIT_LINE_COMMENT
                },
                {
                    id:         ISEARCH_FORWARD,
                    name:       "ISearch Forward",
                    key:        "Ctrl-S",
                    overrideId:   Commands.EDIT_FIND
                }
//              {
//                  id:         SET_MARK_COMMAND,
//                  name:       "Set Mark Command",
//                  key:        "Ctrl-Space",
//                  callback:   setMarkCommand
//              }
            ];


        /**
         * EventHandler Class
         *
         * Executes relevant commands when any of the specified keys are used.
         *
         * @param   {Array} commands    Commands that can be used for the next key.
         *
         * @todo: move the EventHandler to a separate module
         */
        function EventHandler(allCommands) {
            this.availableCommands = allCommands; // @todo: no need to copy array, right?
        }

        EventHandler.prototype.commands = commands;
        
        EventHandler.prototype.availableCommands = undefined; // set on instantiation
        
        EventHandler.prototype.getCommand = function (key) {
            var command = this.availableCommands.filter(function find(command) {
                return (command.key === key) ? command : false;
            });
            if (command.length === 0) { // not found
                return false;
            }
            return command[0]; // get the first match, there should only be one
        };

        /**
         * Function for reseting the context i.e. the number of available commands are not dependent on the last key used
         *
         * @param   {Array} commands    Commands that can be used for the next key.
         */
        EventHandler.prototype.resetContext = function (commands) {
            this.availableCommands = commands || this.commands;
        };

        EventHandler.prototype.handle = function (key) {
            // Get the command to execute based on the stack
            var command = this.getCommand(key);
            
            if (!command) {
                this.resetContext();
                return;
            }
            
            if (!command.commands) {
                if (command.overrideId) {
                    CommandManager.execute(command.overrideId);
                } else {
                    command.callback();
                }
            }
            
            // Update the context
            this.resetContext(command.commands || undefined);
        };
        
        var handler = new EventHandler(commands);

        function removeBinding(command) {
            KeyBindingManager.removeBinding(command.key);
            if (typeof command.commands !== "undefined" && command.commands.length > 0) {
                command.commands.forEach(removeBinding);
            }
        }

        function addBinding(command) {
            KeyBindingManager.addBinding(command.id, command.key);
        }

        function register(command) {
            CommandManager.register(command.name,
                                    command.id,
                                    handler.handle.bind(handler, command.key));
            menus.addMenuItem(command.id);
        }

        // @todo: using setTimeout since key module takes some time to load        
        window.setTimeout(function () {
            menus.addMenuItem(Menus.DIVIDER);
            commands.forEach(removeBinding);
            commands.forEach(register);
            commands.forEach(addBinding);
        }, 500);
         
    });
});