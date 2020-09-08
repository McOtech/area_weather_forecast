/***
 * SERVICE WORKER INITIALIZATION
 */
function registerServiceWorker(){
    if (!navigator.serviceWorker) return false
    navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW Registration worked')
        if(!navigator.serviceWorker.controller) return
        if(reg.waiting){
            updateReady(reg.waiting)
            return
        }

        if(reg.installing){
            trackInstalling(reg.installing)
            return
        }

        reg.addEventListener('updatefound', () => {
            trackInstalling(reg.installing)
        })
    }).catch((err) => {
        console.error(new Error(err));

    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        document.querySelector('#app-installed').classList.remove('d-none')
        var reloadBtn = document.querySelector('#reload-btn')
        reloadBtn.onclick = function(){
            window.location.reload()
        }
    })
}

function trackInstalling(worker){
    worker.addEventListener('statechange', () => {
        if (worker.state == 'installed') {
            updateReady(worker)
        }
    })
}

function updateReady(worker){
    var container = document.querySelector('#app-update')
    container.classList.remove('d-none')
    var installBtn = document.querySelector('#install-btn')
    installBtn.onclick = function(){
        worker.postMessage({action: 'skipWaiting'})
        container.classList.add('d-none')
    }
}

registerServiceWorker();