**1.1.1     (8th August 2016)**

Fixed:

Cursor positioning when using the commands Alt-B "kill-line" and Alt-F "backward-kill-word".

Thanks to [blackmiaool](https://github.com/blackmiaool) for the fix.

**1.1.0     (21st October 2015)**

Added:

*  Alt-D                :   "kill-line"
*  Alt-backspace        :   "backward-kill-word"

Fixed:

- #8 "forward-word" takes the cursor to the start of the next word

Contributions:
- [blackmiaool](https://github.com/blackmiaool)

**1.0.9   (27th July 2014)**

Fix for [#2](https://github.com/ahmadnazir/brackets-emacs/issues/2)

**1.0.8   (29th May 2014)**

Fix for [#8](https://github.com/ahmadnazir/brackets-emacs/issues/8)

**1.0.7   (4th May 2014)**

Fix for [#7](https://github.com/ahmadnazir/brackets-emacs/issues/7)

**1.0.6   (3rd May 2014)**

Basic mark-mode support and additional cursor navigation functionality.

*   C-SPC               :   "set-mark-command"
*   C-g                 :   "keyboard-quit"
*   M-<                 :   "beginning-of-buffer"
*   M->                 :   "end-of-buffer"

Thanks to [Andrew Sutherland](https://github.com/asutherland) for implementing the mark-mode functionality.

**1.0.5   (22nd April 2014)**

*   Implemented context sensitive commands: Ctrl-S, Ctrl-R
    e.g. Pressing Ctrl-S will launch search and pressing it again will go to the next item found

*   (Ctrl-Y) Alt-Y      :   "yank-pop"

**1.0.4   (18th April 2014)**

*   Fixed a bug with the Alt-F command. The command did not work at the end of the line.

**1.0.3   (17th April 2014)**

*   Alt-U               :   "upcase-word"
*   Alt-L               :   "downcase-word"
*   Ctrl-G Ctrl-/       :   Redo
*   Ctrl-X Ctrl-W       :   "write-file"

Thanks to [Udit Mukherjee](https://github.com/uditmukherjee457) for the contributions.

**1.0.2     (7th April 2014)**

*  Ctrl-K               :   "kill-line"
