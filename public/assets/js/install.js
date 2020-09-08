var deferredInstallPrompt
const container = document.querySelector('#app-install')

window.addEventListener('beforeinstallprompt', saveBeforeInstallPrompt)
function saveBeforeInstallPrompt(evt){
    deferredInstallPrompt = evt
    container.classList.remove('d-none')
    const installButton = document.querySelector('#install-app-btn')
    installButton.onclick = function(e){
        deferredInstallPrompt.prompt()
        location.reload()
    }

    deferredInstallPrompt.userChoice.then((choice) => {
        if(choice.outcome === 'accepted'){
            container.classList.add('d-none')
        }else{
            console.log('dismissed')
        }
    })
}

window.addEventListener('appinstalled', appInstalled)
function appInstalled(){
    container.classList.add('d-none')
}