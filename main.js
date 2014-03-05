/*global define, brackets, console*/
define(function (require, exports, module) {
    'use strict';
    
    var EditorManager = brackets.getModule("editor/EditorManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        AppInit = brackets.getModule("utils/AppInit");
 
    function moveBeginningOfLine() {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos();
        
        editor.setCursorPos(cursorPos.line, 0);
    }
    
    AppInit.appReady(function () {

        var commands, menus;

        /*
         * Emacs commands
         */
        commands = [
            {
                name: "Move Beginning of Line",
                keyBinding: "Ctrl-A",
                callback: moveBeginningOfLine
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
        }, 1000);
        
//        
//        CommandManager.register(Strings.CMD_CUT,              Commands.EDIT_CUT,              ignoreCommand);
//        CommandManager.register(Strings.CMD_COPY,             Commands.EDIT_COPY,             ignoreCommand);
//        CommandManager.register(Strings.CMD_PASTE,            Commands.EDIT_PASTE,            ignoreCommand);

        //log("Brackets EMACS Keybindings extension loaded.");
 
    });
 
});
