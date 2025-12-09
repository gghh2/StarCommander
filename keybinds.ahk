; Star Commander - Keybinds (AHK v2)
; 0=All, 1=Mute, 2=Artilleurs, 3=Ingénieurs, 4=Escadrille

#Requires AutoHotkey v2.0

SERVER_URL := "http://localhost:3000"

Numpad0:: {
    SendRadioCommand("all")
}

Numpad1:: {
    SendRadioCommand("mute")
}

Numpad2:: {
    SendRadioCommand("artilleurs")
}

Numpad3:: {
    SendRadioCommand("ingenieurs")
}

Numpad4:: {
    SendRadioCommand("escadrille")
}

SendRadioCommand(target) {
    try {
        http := ComObject("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", SERVER_URL "/radio/" target, false)
        http.Send()
        
        ToolTip("📻 " target)
        SetTimer(() => ToolTip(), -1500)
        
    } catch as e {
        ToolTip("❌ Server not running!")
        SetTimer(() => ToolTip(), -2000)
    }
}

TrayTip("Star Commander", "0=All, 1=Mute, 2=Artilleurs, 3=Ingenieurs, 4=Escadrille", 1)