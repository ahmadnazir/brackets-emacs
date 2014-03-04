/*global define, brackets, console*/
define(function (require, exports, module) {
    'use strict';
    
    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        AppInit = brackets.getModule("utils/AppInit");
 
    function moveBeginningOfLine() {
        console.log("Move beginning of Line");
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
        
        //log("Brackets EMACS Keybindings extension loaded.");
 
    });
 
});
