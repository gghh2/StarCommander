; ============================================
; Star Commander - Keybind Script (AHK v1)
; ============================================
; 
; KEYBINDS:
; Numpad0 = Broadcast to ALL channels
; Numpad1 = Artilleurs
; Numpad2 = Ingénieurs
; Numpad3 = Escadrille
; ============================================

#NoEnv
#SingleInstance Force
SetWorkingDir %A_ScriptDir%

SERVER_URL := "http://localhost:3000"

TrayTip, Star Commander, Keybinds active!`n0=All 1=Artilleurs 2=Ingenieurs 3=Escadrille, 5, 1

Numpad0::
    SendRadioCommand("all")
return

Numpad1::
    SendRadioCommand("Artilleurs")
return

Numpad2::
    SendRadioCommand("Ingénieurs")
return

Numpad3::
    SendRadioCommand("Escadrille")
return

SendRadioCommand(target) {
    global SERVER_URL
    try {
        http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", SERVER_URL "/radio/" target, false)
        http.Send()
        ToolTip, Radio: %target%
        SetTimer, RemoveToolTip, -1500
    } catch e {
        ToolTip, Server not running!
        SetTimer, RemoveToolTip, -2000
    }
}

RemoveToolTip:
    ToolTip
return
