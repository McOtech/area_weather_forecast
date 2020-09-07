var deferredInstallPrompt
window.addEventListener('beforeinstallprompt', saveBeforeInstallPrompt)
function saveBeforeInstallPrompt(evt){
    deferredInstallPrompt = evt
    const container = document.querySelector('#app-install')
    container.classList.remove('d-none')
    const installButton = document.querySelector('#install-app-btn')
    installButton.onclick = function(e){
        deferredInstallPrompt.prompt()
        location.reload()
    }
    // var btn = confirm("Would you like to install our App?")
    // if (btn) {
    //     deferredInstallPrompt.prompt()
    // }
    // console.log(deferredInstallPrompt.userChoice)
}
