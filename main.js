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
        CHAR    = 0,
        WORD    = 1,
        LINE    = 2,
        
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
    
    function moveCursor(unit, type, relative) {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos(),
            line        = cursorPos.line,
            char        = cursorPos.ch;
        switch (type) {
        case CHAR:
            char += unit - (relative ? char : 0);
            break;
        case LINE:
            line += unit - (relative ? line : 0);
            break;
        }
        editor.setCursorPos(line, char);
    }
    
    AppInit.appReady(function () {

        var menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            
            // Command Ids
            MOVE_BEGINNING_OF_LINE  = "emacs.move-beginning-of-line",
            MOVE_END_OF_LINE        = "emacs.move-end-of-line",
            YANK                    = "emacs.yank",
            SET_MARK_COMMAND        = "emacs.set-mark-command",
            KILL_REGION             = "emacs.kill-region",
            KILL_RING_SAVE          = "emacs.kill-ring-save",
            FORWARD_CHAR            = "emacs.forward-char",
            BACKWARD_CHAR           = "emacs.backward-char",
            PREVIOUS_LINE           = "emacs.previous-line",
            NEXT_LINE               = "emacs.next-line",

            // .. not implemented ..
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
                    callback:   moveCursor.bind(this, 1000, CHAR, true) // @todo: Hardcoded 1000 as end of line.
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