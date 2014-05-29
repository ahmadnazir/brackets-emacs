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
        
        // Command Ids

        BEGINNING_OF_BUFFER     = "emacs.beginning-of-buffer",
        END_OF_BUFFER           = "emacs.end-of-buffer",
        MOVE_BEGINNING_OF_LINE  = "emacs.move-beginning-of-line",
        MOVE_END_OF_LINE        = "emacs.move-end-of-line",
        YANK                    = "emacs.yank",
        YANK_POP                = "emacs.yank-pop",
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
        KEYBOARD_QUIT           = "emacs.keyboard-quit",
        UNDO                    = "emacs.undo",
        REDO                    = "emacs.redo",
        ISEARCH_FORWARD         = "emacs.isearch-forward",
        ISEARCH_FORWARD_AGAIN   = "emacs.isearch-forward (again)",
        ISEARCH_BACKWARD        = "emacs.isearch-backward",
        FIND_FILE               = "emacs.find-file",
        SAVE_BUFFER             = "emacs.save-buffer",
        COMMENT_DWIM            = "emacs.comment-dwim",
        UPCASE_REGION           = "emacs.upcase-region",
        DOWNCASE_REGION         = "emacs.downcase-region",
        SAVE_AS                 = "emacs.write-file",
        SET_MARK_COMMAND        = "emacs.set-mark-command",

        // Constants
        CHAR        = "character",
        WORD        = "word",
        LINE        = "line",
        MAX_LINE_LENGTH = 1000,
        MAX_FILE_LENGTH = 1000000,
        UPPER       = "UpperCase",
        LOWER       = "LowerCase",
        
        // Text Selection Ring
        ring        = [],
        ringWriteIndex   = 0,
        ringReadIndex   = 0,
        ringSize    = 15;
    
    function equivPositions(a, b) {
        return a === b ||
               (a.line === b.line && a.ch === b.ch);
    }
    
    function setMarkCommand() {
        var editor      = EditorManager.getFocusedEditor();
        var codemirror  = editor._codeMirror;
        
        // The mark is the anchor-point of the current selection.
        var mark       = codemirror.getCursor("anchor");
        // The point is the current moving part of the selection.
        var point      = codemirror.getCursor("head");
        var markActive = codemirror.getExtending();
        
        // We want the mark to be active if either:
        // - The point is in a different position than the previous mark
        // - The mark was not active
        codemirror.setExtending(!equivPositions(mark, point) || !markActive);
        // We set the point after updating extending to cause codemirror to
        // update its selection object so it actually updates as the point moves
        // around.
        codemirror.setCursor(point);
    }
    
    function clearMark() {
        var editor      = EditorManager.getFocusedEditor();
        var codemirror  = editor._codeMirror;
        codemirror.setExtending(false);
        codemirror.setCursor(codemirror.getCursor("head"));
    }
    
    function _killRingSave(selectedText) {
        if (!selectedText) {
            return;
        }
        ring[ringWriteIndex % ringSize] = selectedText;
        ringReadIndex = ringWriteIndex;
        ringWriteIndex++;
    }

    function killRingSave() {
        var editor  = EditorManager.getFocusedEditor();
        _killRingSave(editor.getSelectedText());
        clearMark();
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
        clearMark();
    }

    function yank(repeat) {
        if (ring.length === 0) {
            return;
        }
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            start       = editor.getCursorPos(),
            end;
        if (repeat) {
            start = yank.range.start;
            end = yank.range.end;
            ringReadIndex = --ringReadIndex < 0 ? (ring.length + ringReadIndex) : ringReadIndex;
        }
        doc.replaceRange(ring[ringReadIndex % ring.length], start, end);
        yank.range = {
            start: start,
            end: editor.getCursorPos()
        };
        clearMark();
    }

    function _getWordPos(num, relativeToPos) {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos(),
            line,
            column;

        if (relativeToPos) {
            line = relativeToPos.line;
            column = relativeToPos.ch;

            // Sanity Checks
            // @todo: this section can be moved below to improve readability of the code
            if (line < 0  || column < 0) {
                return {line: cursorPos.line, ch: cursorPos.ch};
            }

        } else {
            line = cursorPos.line;
            column = cursorPos.ch;
        }


        if (Math.abs(num) !== 1) {
            throw new Error("Cursor positioning for multiple words is not supported");
        }
        
        var text = editor.document.getLine(line),
            lineLength = text.length,
            indexOfNextWord;

        // Base condition for recursion
        if (typeof text === 'undefined') {
            return {line: line, ch: column};
        }

        if (num > 0) {
            text = text.substring(column);
            indexOfNextWord = text.search(/\W\w/) + 1;
        } else {
            // @todo: use a better implementation for reversing a string
            // http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
            text = text.split("").reverse().join("").substring(lineLength - column);
            indexOfNextWord = text.search(/\w\W/) + 1;
        }

        if (indexOfNextWord > 0) {
            column += (num * indexOfNextWord);
        } else {
            var _line = line + (num > 0 ? 1 : -1);
            var pos = _getWordPos(num,
                    {
                        line: _line,
                        ch: num > 0 ? 0 : editor.document.getLine(_line).length
                    });
            line = pos.line;
            column = pos.ch;
        }

        return {line: line, ch: column};
    }

    function toggleCase(type) {
        var editor       = EditorManager.getActiveEditor(),
            doc          = editor.document,
            cursorPos    = editor.getCursorPos();
        var selectedText = editor.getSelectedText();
        var textRange    = editor.getSelection();

        // If nothing is selected, toggleCase for the next word
        if (!selectedText) {
            var nextPos = _getWordPos(1);
            selectedText = doc.getRange(cursorPos, nextPos);
            //Range to replace
            textRange.start.line = cursorPos.line;
            textRange.start.ch = cursorPos.ch;
            textRange.end.line = nextPos.line;
            textRange.end.ch = nextPos.ch;
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

    /**
     * Function to move the cursor
     *
     * @param   {number}    unit        Number of units to move
     * @param   {number}    type        CHAR|WORD|LINE
     * @param   {boolean}   absolute    Flag to specify if the cursor isn't moved relative to the current
     *                                  position
     */
    function moveCursor(unit, type, absolute) {
        EditorManager.focusEditor();
        var editor      = EditorManager.getFocusedEditor(),
            codemirror  = editor._codeMirror,
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
            if (absolute) {
                throw new Error('The option absolute is not supported for type WORD');
            }
            var pos = _getWordPos(unit);
            line = pos.line;
            column = pos.ch;
            break;
        }
        codemirror.extendSelection({ line: line, ch: column });
    }

    function setCursorPos(pos) {
        var editor      = EditorManager.getFocusedEditor();
        editor.setCursorPos(pos.line, pos.ch);
        console.log(123);
    }

    AppInit.appReady(function () {

        var menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            
            /*
             * Emacs commands
             *
             * Find list of commands in emacs: Ctrl-h b
             */
            commands = [
                {
                    id:         BEGINNING_OF_BUFFER,
                    name:       "Move to Beginning of File",
                    key:        "Alt-Shift-,", // M-<
                    callback:   setCursorPos.bind(null, {line: 0, ch: 0})
                },
                {
                    id:         END_OF_BUFFER,
                    name:       "Move to End of File",
                    key:        "Alt-Shift-.", // M->
                    callback:   setCursorPos.bind(null, {line: MAX_FILE_LENGTH, ch: MAX_LINE_LENGTH})
                },
                {
                    id:         MOVE_BEGINNING_OF_LINE,
                    name:       "Move to Beginning of Line",
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
                    callback:   yank,
                    commands: [
                        {
                            id:         YANK_POP,
                            key:        "Alt-Y",
                            callback:   yank.bind(null, true),
                            repeatable: true
                        }
                    ]
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
                    // @todo:
                    // The handler only works if any text is selected.
                    // The handler should automatically change case of the next word.
                },
                {
                    id:         DOWNCASE_REGION,
                    name:       "Change to Lower",
                    key:        "Alt-L",
                    callback:   toggleCase.bind(this, LOWER)
                    // @todo:
                    // The handler only works if any text is selected.
                    // The handler should automatically change case of the next word.
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
                        },
                        {
                            id:         SAVE_AS,
                            key:        "Ctrl-W",
                            overrideId:   Commands.FILE_SAVE_AS
                        }
                    ]
                },
                {
                    id:         KEYBOARD_QUIT,
                    name:       "Keyboard Quit",
                    key:        "Ctrl-G",
                    // @todo:
                    // bind this command to keyboard-quit handler
                    // it should act similar to the Esc key in most cases
                    // Will look into it later
                    callback:   clearMark,
                    commands:   [
                        {
                            id:         REDO,
                            key:        "Ctrl-/",
                            overrideId:   Commands.EDIT_REDO
                            // @todo:
                            // Ideally this should break the undo chain and start performing redos. However,
                            // since we don't have a good way of tracking the keybindings used, the user
                            // have to use Ctrl-G every time redo has to be performed. 
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
                    overrideId:   Commands.EDIT_FIND,
                    commands: [
                        {
                            id:         ISEARCH_FORWARD_AGAIN,
                            key:        "Ctrl-S",
                            overrideId: Commands.EDIT_FIND_NEXT,
                            repeatable: true
                        },
                        {
                            id:         ISEARCH_BACKWARD,
                            key:        "Ctrl-R",
                            overrideId: Commands.EDIT_FIND_PREVIOUS,
                            repeatable: true
                        }
                    ]
                },
                {
                    id:         SET_MARK_COMMAND,
                    name:       "Set Mark Command",
                    key:        "Ctrl-Space",
                    callback:   setMarkCommand
                },
                
                /*
                 * Dummy commands so that they are added to the keybindings
                 * This is a hack so that the following commands that are context sensitive are registered
                 *
                 * @see #keybindings-context-sensitive
                 */
                
                {
                    id:         ISEARCH_BACKWARD,
                    name:       "Incremental Search Backward",
                    key:        "Ctrl-R"
                },
                {
                    id:         YANK_POP,
                    name:       "Yank Pop",
                    key:        "Alt-Y"
                }

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
            this.availableCommands = allCommands;
        }

        EventHandler.prototype.commands = commands;
        
        EventHandler.prototype.availableCommands = undefined; // set on instantiation
        
        /**
         * @param {Boolean} inContext
         * True if the available commands are restricted based on the previous key used
         */
        EventHandler.prototype.inContext = false;
        
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
            this.inContext = commands ? true : false;
        };

        EventHandler.prototype.handle = function (id, key) {
            
            // Find if the command is being repeated
            var repeat = this.lastCommand === id;
            this.lastCommand = id;
            
            // Get the command to execute based on the stack
            var command = this.getCommand(key);

            // If command is not found, reset the context and invoke the handler again 
            if (!command) {
                if (this.inContext) {
                    this.resetContext();
                    // @todo: at this point there should be some way to inform the user that the prefixer
                    // command has been ignored
                    this.handle(id, key);
                }
                return;
            }
            
            if (repeat && command.repeatCommand) {
                command = command.repeatCommand;
            }
            
            if (command.overrideId) {
                CommandManager.execute(command.overrideId);

                // @todo: The following code can be used to execute multiple commands
                //        and the same can be used for callbacks
//                    var ids = command.overrideId.forEach ? command.overrideId : [command.overrideId];
//                    ids.forEach(function (id) {
//                        CommandManager.execute(id);
//                    });

            } else if (command.callback) {
                command.callback();
            }

            if (!command.repeatable) {
                // Update the context
                this.resetContext(command.commands || undefined);
            }
        };
        
        var handler = new EventHandler(commands);

        function removeBinding(command) {
            KeyBindingManager.removeBinding(command.key);
            if (typeof command.commands !== "undefined" && command.commands.length > 0) {
                command.commands.forEach(removeBinding);
            }
        }

        function addBinding(command) {

            // @todo: #keybindings-context-sensitive
            // We need to add bindings for the context sensitive commands.. but that might throw an error

            KeyBindingManager.addBinding(command.id, command.key);
        }

        function register(command) {
            CommandManager.register(command.name,
                                    command.id,
                                    handler.handle.bind(handler, command.id, command.key));
            // menus.addMenuItem(command.id);
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
