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
        
        // Text Selection Ring
        ring        = [],
        ringLength  = 30,
        
        // Mark
        isMarkSet   = false;
     
    function moveBeginningOfLine() {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos();
        editor.setCursorPos(cursorPos.line, 0);
    }

    function moveEndOfLine() {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos();
        // @todo: don't have a way to get the current line
        // This is a crude way to get to the end of line
        editor.setCursorPos(cursorPos.line, 1000);
    }

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

    AppInit.appReady(function () {

        var menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            
            // Command Ids
            MOVE_BEGINNING_OF_LINE = "emacs.move-beginning-of-line",
            MOVE_END_OF_LINE = "emacs.move-end-of-line",
            YANK = "emacs.yank",
            SET_MARK_COMMAND = "emacs.set-mark-command",
            KILL_REGION = "emacs.kill-region",
            KILL_RING_SAVE = "emacs.kill-ring-save",

            /*
             * Emacs commands
             *
             * Find list of commands in emacs: Ctrl-h b
             */
            commands = [
                {
                    id: MOVE_BEGINNING_OF_LINE,
                    name: "Move Beginning of Line",
                    keyBinding: "Ctrl-A",
                    callback: moveBeginningOfLine
                },
                {
                    id: MOVE_END_OF_LINE,
                    name: "Move End of Line",
                    keyBinding: "Ctrl-E",
                    callback: moveEndOfLine
                },
                {
                    id: YANK,
                    name: "Yank",
                    keyBinding: "Ctrl-Y",
                    callback: yank
                },
                {
                    id: SET_MARK_COMMAND,
                    name: "Set Mark Command",
                    keyBinding: "Ctrl-Space",
                    callback: setMarkCommand
                },
                {
                    id: KILL_REGION,
                    name: "Kill Region",
                    keyBinding: "Ctrl-W",
                    callback: killRegion
                },
                {
                    id: KILL_RING_SAVE,
                    name: "Kill Ring Save",
                    keyBinding: "Alt-W",
                    callback: killRingSave
                }
            ],
        
            // override commands
            overrideCommands = [
                {
                    id: Commands.EDIT_UNDO,
                    keyBinding: "Ctrl-/"
                }
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