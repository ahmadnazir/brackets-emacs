/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, console*/
define(function (require, exports, module) {
    'use strict';
    
    var EditorManager       = brackets.getModule("editor/EditorManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
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
        //@todo: don't have a way to get the current line
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

        var commands, menus;

        /*
         * Emacs commands
         *
         * Find list of commands in emacs: Ctrl-h b
         */
        
        commands = [
            {
                name: "Move Beginning of Line",
                keyBinding: "Ctrl-A",
                callback: moveBeginningOfLine
            },
            {
                name: "Move End of Line",
                keyBinding: "Ctrl-E",
                callback: moveEndOfLine
            },
            {
                name: "Yank",
                keyBinding: "Ctrl-Y",
                callback: yank
            },
            {
                name: "Set Mark Command",
                keyBinding: "Ctrl-Space",
                callback: setMarkCommand
            },
            {
                name: "Kill Ring Save",
                keyBinding: "Alt-W",
                callback: killRingSave
            },
            {
                name: "Kill Region",
                keyBinding: "Ctrl-W",
                callback: killRegion

            }


        ];
        
        menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        
        commands.forEach(function (item, index) {
            CommandManager.register(item.name, item.name, item.callback);
        });

        menus.addMenuItem(Menus.DIVIDER);

        window.setTimeout(function () { // @todo: because the keybindingmodule hasn't loaded yet.
            commands.forEach(function (item, index) {
                KeyBindingManager.removeBinding(item.keyBinding);
                menus.addMenuItem(item.name, [{key: item.keyBinding}]);
            });
        }, 500);
        
//        
//        CommandManager.register(Strings.CMD_CUT,              Commands.EDIT_CUT,              ignoreCommand);
//        CommandManager.register(Strings.CMD_COPY,             Commands.EDIT_COPY,             ignoreCommand);
//        CommandManager.register(Strings.CMD_PASTE,            Commands.EDIT_PASTE,            ignoreCommand);

        //log("Brackets EMACS Keybindings extension loaded.");
 
    });
 
});