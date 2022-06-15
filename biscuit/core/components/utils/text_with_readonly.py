import tkinter as tk

class TextWithReadonly(tk.Text):
    '''A text widget that doesn't permit inserts and deletes in regions tagged with "readonly"'''
    def __init__(self, *args, **kwargs):
        tk.Text.__init__(self, *args, **kwargs)

        # this code creates a proxy that will intercept
        # each actual insert and delete. 
        self.tk.eval(WIDGET_PROXY)

        # this code replaces the low level tk widget 
        # with the proxy
        widget = str(self)
        self.tk.eval('''
            rename {widget} _{widget}
            interp alias {{}} ::{widget} {{}} widget_proxy _{widget} 
        '''.format(widget=widget))

WIDGET_PROXY = '''
if {[llength [info commands widget_proxy]] == 0} {
    # Tcl code to implement a text widget proxy that disallows
    # insertions and deletions in regions marked with "readonly"
    proc widget_proxy {actual_widget args} {
        set command [lindex $args 0]
        set args [lrange $args 1 end]
        if {$command == "insert"} {
            set index [lindex $args 0]
            if [_is_readonly $actual_widget $index "$index+1c"] {
                bell
                return ""
            }
        }
        if {$command == "delete"} {
            foreach {index1 index2} $args {
                if {[_is_readonly $actual_widget $index1 $index2]} {
                    bell
                    return ""
                }
            }
        }
        # if we passed the previous checks, allow the command to 
        # run normally
        $actual_widget $command {*}$args
    }

    proc _is_readonly {widget index1 index2} {
        # return true if any text in the range between
        # index1 and index2 has the tag "readonly"
        set result false
        if {$index2 eq ""} {set index2 "$index1+1c"}
        # see if "readonly" is applied to any character in the
        # range. There's probably a more efficient way to do this, but
        # this is Good Enough
        for {set index $index1} \
            {[$widget compare $index < $index2]} \
            {set index [$widget index "$index+1c"]} {
                if {"readonly" in [$widget tag names $index]} {
                    set result true
                    break
                }
            }
        return $result
    }
}
'''
