
// const staticCacheName = `forecast-static-${Date.now()}-v1`
var staticCacheName = `forecast-static-v1`
const staticImageCache = `forecast-static-imgs-v1`
const allCaches = [
    staticCacheName,
    staticImageCache
]
//install event listener
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/history.html',
                '/current.html',
                '/hourly.html',
                '/daily.html',
                '/sw.js',
                '/assets/css/boot.min.css',
                '/assets/css/colors.css',
                '/assets/css/main.css',
                '/assets/css/themify-icons.css',
                '/assets/css/fonts/themify.eot',
                '/assets/css/fonts/themify.svg',
                '/assets/css/fonts/themify.ttf',
                '/assets/css/fonts/themify.woff',
                '/assets/js/jquery.slim.min.js',
                '/assets/js/popper.min.js',
                '/assets/js/bootstrap.min.js',
                '/assets/js/storage.js'
            ])
        })
    )
})

//activate service worker event listener here
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('forecast-static-') && !allCaches.includes(cacheName)
                }).map((cacheName) => {
                    return caches.delete(cacheName)
                })
            )
        })
    )
})

self.addEventListener('fetch', (event) => {
    //responding with a skeleton
    var requestUrl = new URL(event.request.url)
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/index.html' || requestUrl.pathname === '/') { // || requestUrl.pathname === '/cart' || requestUrl.pathname === '/checkout' || (/^\/products\/[a-z,A-Z,0-9, -]+\/\d+$/.test(requestUrl.pathname))
            event.respondWith(caches.match('/index.html'))//skeleton
            return
        }
        if(requestUrl.pathname.startsWith('/history.html')){
            event.respondWith(caches.match('/history.html'))
            return
        }
        if(requestUrl.pathname.startsWith('/current.html')){
            event.respondWith(caches.match('/current.html'))
            return
        }
        if(requestUrl.pathname.startsWith('/hourly.html')){
            event.respondWith(caches.match('/hourly.html'))
            return
        }
        if(requestUrl.pathname.startsWith('/daily.html')){
            event.respondWith(caches.match('/daily.html'))
            return
        }
    }

    if (requestUrl.pathname.startsWith('/assets/images/') || requestUrl.pathname.startsWith('/img/wn/')) {
        event.respondWith(servePhotos(event.request))
        return
    }

    //returns with the cached or pulls it online otherwise
    event.respondWith(
        caches.match(event.request).then((request) => {
            if(request) return request
            return fetch(event.request)
        })
    )
})

//handles the message event listener.
self.addEventListener('message', (event) => {
    if(event.data.action === 'skipWaiting'){
        self.skipWaiting()
    }
})


/**
 * Serve images cached or fetch them online and cache them
 */

function servePhotos(request){
    var storageUrl = request.url

    return caches.open(staticImageCache).then((cache) => {
        return cache.match(storageUrl).then(response => {
            if (response) return response

            return fetch(request).then(networkResponse => {
                cache.put(storageUrl, networkResponse.clone())
                return networkResponse
            })
        })
    })
}
