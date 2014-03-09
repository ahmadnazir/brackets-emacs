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
        
        // Text Selection Ring
        ring        = [],
        ringLength  = 30,
        
        // Mark
        isMarkSet   = false;

    function setMarkCommand() {
        isMarkSet = !isMarkSet;
        
        console.log("Mark " + (isMarkSet ? "un" : "") + "set");
    }

    function _killRingSave(selectedText) {
        if (!selectedText) {
            return;
        }
        ring.push(selectedText);
    }

    function killRingSave() {
        var editor  = EditorManager.getFocusedEditor();
        _killRingSave(editor.getSelectedText());
    }

    function killRegion() {
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            selection   = editor.getSelection();
        _killRingSave(editor.getSelectedText());
        doc.replaceRange("", selection.start, selection.end);
    }

    function yank() {
        if (ring.length === 0) {
            return;
        }
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            cursorPos   = editor.getCursorPos();
        doc.replaceRange(ring[ring.length - 1], cursorPos);
    }

    function iSearchBackward() {
        // @todo: stub
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
            FORWARD_CHAR            = "emacs.forward-char",
            BACKWARD_CHAR           = "emacs.backward-char",
            FORWARD_WORD            = "emacs.forward-word",
            BACKWARD_WORD           = "emacs.backward-word",
            PREVIOUS_LINE           = "emacs.previous-line",
            NEXT_LINE               = "emacs.next-line",

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
                    keyBinding: "Ctrl-A",
                    callback:   moveCursor.bind(this, 0, CHAR, true)
                },
                {
                    id:         MOVE_END_OF_LINE,
                    name:       "Move End of Line",
                    keyBinding: "Ctrl-E",
                    callback:   moveCursor.bind(this, MAX_LINE_LENGTH, CHAR, true)
                },
                {
                    id:         YANK,
                    name:       "Yank",
                    keyBinding: "Ctrl-Y",
                    callback:   yank
                },
                {
                    id:         SET_MARK_COMMAND,
                    name:       "Set Mark Command",
                    keyBinding: "Ctrl-Space",
                    callback:   setMarkCommand
                },
                {
                    id:         KILL_REGION,
                    name:       "Kill Region",
                    keyBinding: "Ctrl-W",
                    callback:   killRegion
                },
                {
                    id:         KILL_RING_SAVE,
                    name:       "Kill Ring Save",
                    keyBinding: "Alt-W",
                    callback:   killRingSave
                },
                {
                    id:         ISEARCH_BACKWARD,
                    name:       "Incremental Search Backward",
                    keyBinding: "Ctrl-R",
                    callback:   iSearchBackward
                },
                {
                    id:         FORWARD_CHAR,
                    name:       "Forward Character",
                    keyBinding: "Ctrl-F",
                    callback:   moveCursor.bind(this, 1, CHAR)
                },
                {
                    id:         BACKWARD_CHAR,
                    name:       "Backward Character",
                    keyBinding: "Ctrl-B",
                    callback:   moveCursor.bind(this, -1, CHAR)
                },
                {
                    id:         FORWARD_WORD,
                    name:       "Forward Word",
                    keyBinding: "Alt-F",
                    callback:   moveCursor.bind(this, 1, WORD)
                },
                {
                    id:         BACKWARD_WORD,
                    name:       "Backward Word",
                    keyBinding: "Alt-B",
                    callback:   moveCursor.bind(this, -1, WORD)
                },
                {
                    id:         NEXT_LINE,
                    name:       "Next Line",
                    keyBinding: "Ctrl-N",
                    callback:   moveCursor.bind(this, 1, LINE)
                },
                {
                    id:         PREVIOUS_LINE,
                    name:       "Previous Line",
                    keyBinding: "Ctrl-P",
                    callback:   moveCursor.bind(this, -1, LINE)
                }
            ],
        
            // override commands
            overrideCommands = [
                {
                    id:         Commands.EDIT_UNDO,
                    keyBinding: "Ctrl-/"
                },
                {
                    id:         Commands.EDIT_LINE_COMMENT,
                    keyBinding: "Alt-;"
                }

//              // @todo: activate this when file save keybinding is implemented
//              {
//                  id:         Commands.EDIT_FIND,
//                  keyBinding: "Ctrl-S"
//              }

            ];
        
        function remap(item) {
            KeyBindingManager.removeBinding(item.keyBinding);
            KeyBindingManager.addBinding(item.id, item.keyBinding);
            menus.addMenuItem(item.id);
        }
                
        commands.forEach(function (item, index) {
            CommandManager.register(item.name, item.id, item.callback);
        });

        window.setTimeout(function () { // @todo: keybinding module takes some time to load
            overrideCommands.forEach(remap);
            menus.addMenuItem(Menus.DIVIDER);
            commands.forEach(remap);
        }, 500);
         
    });
});