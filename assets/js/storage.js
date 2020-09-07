const initials = {
    db_name: 'area_weather',
    db_version: 1,
    db_store: 'forecast',
    images_cache: 'forecast-static-imgs-v1'
}

/***
 * LOCAL STORAGE LOGIC START
 */
function database(func){
    if (!navigator.serviceWorker) {
        return false
    }

    const request = indexedDB.open(initials.db_name, initials.db_version)
    request.onupgradeneeded = () => {
        switch (request.result.version) {
            case 1:
                const forecast = request.result.createObjectStore(initials.db_store, {keyPath: 'id'}).createIndex('by_name', 'name')
                break;
            default:
                break;
        }
    }

    request.onerror = (error) => {
        func(error, undefined)
    }

    request.onsuccess = () => {
        func(null, request)
    }
}

function storeForecast(request, city, func){
    var request_url_1 = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=f3a4a11737ab4f3d8b60a94ce9168e28` //`/openweather/weather` 
    const req1 = fetch(request_url_1)
    req1.then(d => d.json()).then(d => {
        const data = {
            id: 0, 
            lat: 0, 
            lon: 0, 
            country: "", 
            name: "", 
            current: {}, 
            hourly: [], 
            daily: []
        }

        data.id = d.id
        data.lat = d.coord.lat
        data.lon = d.coord.lon
        data.country = d.sys.country
        data.name = d.name

        var request_url_2 = `https://api.openweathermap.org/data/2.5/onecall?lat=${data.lat}&lon=${data.lon}&exclude=minutely&units=metric&appid=f3a4a11737ab4f3d8b60a94ce9168e28` //`/openweather/data`
        const req2 = fetch(request_url_2)
        req2.then(d => d.json()).then(d => {
            const forecast = request.result.transaction(initials.db_store, 'readwrite').objectStore(initials.db_store)
            
            data.current.dt = d.current.dt
            data.current.sunrise = d.current.sunrise
            data.current.sunset = d.current.sunset
            data.current.temp = d.current.temp
            data.current.pressure = d.current.pressure
            data.current.humidity = d.current.humidity
            data.current.clouds = d.current.clouds
            data.current.visibility = d.current.visibility
            data.current.wind_speed = d.current.wind_speed
            data.current.wind_deg = d.current.wind_deg
            data.current.main = d.current.weather[0].main
            data.current.icon = `https://openweathermap.org/img/wn/${d.current.weather[0].icon}@2x.png`
            if(d.current.rain){
                data.current.rain = d.current.rain["1h"]
            }
            if(d.current.snow){
                data.current.snow = d.current.snow["1h"]
            }

            data.hourly = d.hourly.map(d => {
                return{
                    dt: d.dt,
                    sunrise: d.sunrise,
                    sunset: d.sunset,
                    temp: d.temp,
                    pressure: d.pressure,
                    humidity: d.humidity,
                    clouds: d.clouds,
                    visibility: d.visibility,
                    wind_speed: d.wind_speed,
                    wind_deg: d.wind_deg,
                    main: d.weather[0].main,
                    icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
                    rain: (d.rain) ? d.rain["1h"] : undefined,
                    snow: (d.snow) ? d.snow["1h"] : undefined
                }
            })

            data.daily = d.daily.map(d => {
                return{
                    dt: d.dt,
                    sunrise: d.sunrise,
                    sunset: d.sunset,
                    temp: d.temp,
                    pressure: d.pressure,
                    humidity: d.humidity,
                    clouds: d.clouds,
                    wind_speed: d.wind_speed,
                    wind_deg: d.wind_deg,
                    main: d.weather[0].main,
                    icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
                    rain: d.rain,
                    snow: d.snow
                }
            })
            console.log('here')

            forecast.put(data)
            func(null, data.id)
        }).catch(error => {
            func(error, undefined)
        })
    }).catch(error => {
        func(error, undefined)
    })
}

function getForecast(request, id, func){
    const forecast = request.result.transaction(initials.db_store, 'readonly').objectStore(initials.db_store).get(Number(id))
    forecast.onsuccess = () => {
        func(null, forecast.result)
    }

    forecast.onerror = (error) => {
        func(error, undefined)
    }
}

function getForecasts(request, func){
    const forecast = request.result.transaction(initials.db_store, 'readonly').objectStore(initials.db_store).index('by_name').getAll()
    forecast.onsuccess = () => {
        func(null, forecast.result.reverse())
    }

    forecast.onerror = (error) => {
        func(error, undefined)
    }
}

function destroyForecast(request, id, func){
    const forecast = request.result.transaction(initials.db_store, 'readwrite').objectStore(initials.db_store).delete(id)
    forecast.onsuccess = () => {
        imagesNeeded(request, (error, images) => {
            if(error){
                return false
            }
            clearImageCache(images)
        })
        func(null)
    }

    forecast.onerror = (error) => {
        func(error)
    }
}

function imagesNeeded(request, func){
    const imageUrls = []
    const forecast = request.result.transaction(initials.db_store, 'readwrite').objectStore(initials.db_store).getAll()
    forecast.onsuccess = function(){
        forecast.result.forEach(d => {
            if (d.current.icon) {
                imageUrls.push(d.current.icon)
            }
            d.hourly.forEach(d => {
                if (d.icon) {
                    imageUrls.push(d.icon)
                }
            })
            d.daily.forEach(d => {
                if (d.icon) {
                    imageUrls.push(d.icon)
                }
            })
        })
        func(null, imageUrls)
    }

    forecast.onerror = (error) => {
        func(error, undefined)
    }
}

function clearImageCache(images){
    if(images.length < 1) return
    return caches.open(initials.images_cache).then(cache => {
        return cache.keys().then(requests => {
            requests.forEach(request => {
                var url = new URL(request.url)
                if (!images.includes(url.href) && url.hostname === "openweathermap.org") {
                    cache.delete(request)
                }
            })
        }).catch(error => {

        })
    }).catch(error => {

    })
}

/**
 * Other Functions
 */
const SUCCESS_ALERT = 1;
const FAILURE_ALERT = 2;
function alert(type, message){
    var note = document.querySelector('#notification')
    switch (type) {
        case SUCCESS_ALERT:
            note.innerHTML = `
            <div class="alert alert-success d-flex justify-content-between">
                <strong>${message}</strong>
                <button class="btn btn-outline-dark btn-sm rounded-circle" onclick="this.parentNode.classList.remove('d-flex'); this.parentNode.style.display = 'none'"><span class="ti-close"></span></button>
            </div>`
            break;
        case FAILURE_ALERT:
            note.innerHTML = `
            <div class="alert alert-danger d-flex justify-content-between">
                <strong>${message}</strong>
                <button class="btn btn-outline-dark btn-sm rounded-circle" onclick="this.parentNode.classList.remove('d-flex'); this.parentNode.style.display = 'none'"><span class="ti-close"></span></button>
            </div>`
            break;
        default:
            break;
    }
}

/*
* This function parses ampersand-separated name=value argument pairs from
* the query string of the URL. It stores the name=value pairs in
* properties of an object and returns that object. Use it like this:
*
* var args = urlArgs(); // Parse args from URL
* var q = args.q || ""; // Use argument, if defined, or a default value
* var n = args.n ? parseInt(args.n) : 10;
*/
function urlArgs() {
    var args = {};
    // Start with an empty object
    var query = location.search.substring(1); // Get query string, minus '?'
    var pairs = query.split("&");
    // Split at ampersands
    for(var i = 0; i < pairs.length; i++) {
        // For each fragment
        var pos = pairs[i].indexOf('=');
        // Look for "name=value"
        if (pos == -1) continue;
        // If not found, skip it
        var name = pairs[i].substring(0,pos); // Extract the name
        var value = pairs[i].substring(pos+1); // Extract the value
        value = decodeURIComponent(value);
        // Decode the value
        args[name] = value;
        // Store as a property
    }
    return args;
    // Return the parsed arguments
}

function deleteItem(id){
    database((error, request) => {
        if(error){
            return alert(FAILURE_ALERT, "Error deleting the item!")
        }
        destroyForecast(request, id, (error) => {
            if(error){
                return alert(FAILURE_ALERT, "Error deleting the item!")
            }
            alert(SUCCESS_ALERT, "Item deleted successfully")
            setTimeout(() => {
                location.reload()
            }, 1000)
        })
    })
}

function historyPage(data){
    var content = ""
    const container = $('#history')
    if(data.length > 0){
        data.forEach(d => {
            var item = `
            <div class="row content-bg content-shadow mb-1 mt-1 rounded-top rounded-bottom">
                <div class="col-2 d-flex align-items-center justify-content-center">
                    <img src="${d.current.icon}" class="img-fluid" alt="weather icon">
                </div>
                <div class="col-10 p-1 pr-2 d-flex align-items-center justify-content-between">
                    <span><strong>${d.name}, ${d.country}</strong> ${new Date(d.current.dt).toDateString()}</span>
                    <span>
                        <a href="current.html?id=${d.id}" class="btn btn-outline-primary btn-sm text-decoration-none rounded-circle"><span class="ti-eye"></span><span class="d-none">View</span></a>
                        <button class="btn btn-outline-danger btn-sm text-decoration-none rounded-circle" onclick="deleteItem(${d.id})"><span class="ti-trash"></span><span class="d-none">Delete</span></button>
                    </span>
                </div>
            </div>`
            content += item
        })
        container.html(content)
    }
}

function currentPage(data){
    const container = $('#current')
    if(data){
        var item = `
        <div class="row content-bg content-shadow mb-3 mt-3 rounded-top rounded-bottom">
            <div class="col-12 pt-3">
                <span class="ti-location-pin"></span> <strong>${data.name}, ${data.country}</strong> <span>${new Date(data.current.dt).toLocaleDateString()}</span>
            </div>
            <div class="col-lg-4">
                <div class="row">
                    <div class="col-12 d-flex justify-content-center align-items-center mb-3 pt-3">
                        <img src="${data.current.icon}" class="img-fluid" alt="weather icon">
                    </div>
                    <div class="col-12">
                        <h2 class="display-4 text-center">${data.current.main}</h2>
                    </div>
                    <div class="col-6 text-center">
                        <div class="we-hover rounded-bottom rounded-top">
                            <span class="ti-shine icon-size"></span><p>Sunrise: ${new Date(data.current.sunrise).toDateString()}</p>
                        </div>
                    </div>
                    <div class="col-6 text-center">
                        <div class="we-hover rounded-bottom rounded-top">
                            <span class="ti-cloud icon-size"></span><p> Sunset: ${new Date(data.current.sunset).toDateString()}</p>
                        </div>    
                    </div>
                </div>                        
            </div>
            <div class="col-lg-8">
                <div class="container">
                    <div class="row">
                    <div class="col-lg-4">
                        <div class="row text-center we-hover rounded-bottom rounded-top">
                            <div class="col-12">
                                <h3 class="display-1"><sub>${data.current.temp}</sub><sup><span class="ti-control-record degree-size"></span></sup></h3>
                            </div>
                            <div class="col-12">
                                <h4><sup><span class="ti-control-record" style="font-size: small;"></span></sup>C <span class="text-muted">| <sup><span class="ti-control-record" style="font-size: small;"></span></sup>F | K</span></h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-8">
                        <div class="row">
                            ${
                                (data.current.min_temp) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Min. temperature: ' + data.current.min_temp + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup>C</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.max_temp) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Max. temperature: ' + data.current.max_temp + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup>C</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.pressure) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Pressure: ' + data.current.pressure + 'hPa</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.humidity) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Humidity: ' + data.current.humidity + '%</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.visibility) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Visibility: ' + data.current.visibility + ' metres</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.clouds) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Cloud: ' + data.current.clouds + '%</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.wind_speed) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Speed: ' + data.current.wind_speed + 'm/s</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.wind_deg) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Direction: ' + data.current.wind_deg + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup></span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.rain) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Rainfall: ' + data.current.rain + 'mm</span>' +
                                '</div>' : ""
                            }
                            ${
                                (data.current.snow) ?
                                '<div class="col-md-6  mb-1">' +
                                    '<span class="p-2 we-hover rounded-bottom rounded-top">Snow: ' + data.current.snow + 'mm</span>' +
                                '</div>' : ""
                            }
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="row mt-3">
                            <div class="col-6 pb-3">
                                <a href="/hourly.html?id=${data.id}" style="text-decoration: none;" class="btn-sm btn-outline-warning"><span class="ti-time"></span> Hourly forecast</a>
                            </div>
                            <div class="col-6 pb-3">
                                <a href="/daily.html?id=${data.id}" style="text-decoration: none;" class="btn-sm btn-outline-warning"><span class="ti-calendar"></span> Daily forecast</a>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>`
        $('#title').text(`${data.name} Weather Forecast`)
        container.html(item)
    }
}

function hourlyPage(data){
    const container = $('#hourly')
    var content = ""

    if(data && data.hourly.length > 0){
        data.hourly.forEach(d => {
            var item = `
                <div class="row content-bg content-shadow mb-3 mt-3 rounded-top rounded-bottom">
                    <div class="col-12 pt-3">
                        <span>${new Date(d.dt).toDateString()}</span>
                    </div>
                    <div class="col-lg-4">
                        <div class="row">
                            <div class="col-12 d-flex justify-content-center align-items-center mb-3 pt-3">
                                <img src="${d.icon}" class="img-fluid" alt="${"image of " + d.main + "-" + d.dt + " graphic"}">
                            </div>
                            <div class="col-12">
                                <h2 class="display-4 text-center">${d.main}</h2>
                            </div><!--
                            <div class="col-6 text-center">
                                <div class="we-hover rounded-bottom rounded-top">
                                    <span class="ti-shine icon-size"></span><p>Sunrise: ${new Date(d.sunrise).toDateString()}</p>
                                </div>
                            </div>
                            <div class="col-6 text-center">
                                <div class="we-hover rounded-bottom rounded-top">
                                    <span class="ti-cloud icon-size"></span><p> Sunset: ${new Date(d.sunset).toDateString()}</p>
                                </div>    
                            </div>-->
                        </div>                        
                    </div>
                    <div class="col-lg-8">
                        <div class="container">
                            <div class="row">
                            <div class="col-lg-4">
                                <div class="row text-center we-hover rounded-bottom rounded-top">
                                    <div class="col-12">
                                        <h3 class="display-1"><sub>${d.temp}</sub><sup><span class="ti-control-record degree-size"></span></sup></h3>
                                    </div>
                                    <div class="col-12">
                                        <h4><sup><span class="ti-control-record" style="font-size: small;"></span></sup>C <span class="text-muted">| <sup><span class="ti-control-record" style="font-size: small;"></span></sup>F | K</span></h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-8">
                                <div class="row">
                                    ${
                                        (d.min_temp) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Min. temperature: ' + d.min_temp + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup>C</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.max_temp) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Max. temperature: ' + d.max_temp + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup>C</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.pressure) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Pressure: ' + d.pressure + 'hPa</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.humidity) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Humidity: ' + d.humidity + '%</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.visibility) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Visibility: ' + d.visibility + ' metres</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.clouds) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Cloud: ' + d.clouds + '%</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.wind_speed) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Speed: ' + d.wind_speed + 'm/s</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.wind_deg) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Direction: ' + d.wind_deg + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup></span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.rain) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Rainfall: ' + d.rain + 'mm</span>' +
                                        '</div>' : ""
                                    }
                                    ${
                                        (d.snow) ?
                                        '<div class="col-md-6  mb-1">' +
                                            '<span class="p-2 we-hover rounded-bottom rounded-top">Snow: ' + d.snow + 'mm</span>' +
                                        '</div>' : ""
                                    }
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>`
            content += item
        })
    }

    var head = `
    <div class="container">
        <div class="row mt-3">
            <div class="col-4">
                <a href="/current.html?id=${data.id}" class="btn btn-outline-warning btn-sm"><span class="ti-arrow-left"></span><span class="d-none">Back to current details</span></a>
            </div>
            <div class="col-8 d-flex align-items-center o-text-secondary">
                <h1 style="font-size: 1rem">
                    <span class="ti-location-pin"></span> <strong>${data.name}, ${data.country}</strong> : Hourly Forecast
                </h1>
            </div>
        </div>
    </div>
    <div class="container">
        ${content}
    </div>`
    $('#title').text(`${data.name} Weather Forecast`)
    container.html(head)
    
}

function dailyPage(data){
    const container = $('#daily')
    var content = ''

    if(data && data.daily.length > 0){
        data.daily.forEach(d => {
            var item = `
                <div class="row content-bg content-shadow mb-3 mt-3 rounded-top rounded-bottom">
                    <div class="col-12 pt-3">
                        <span class="ti-calendar"></span> <span>${new Date(d.dt).toDateString()}</span>
                    </div>
                    <div class="col-lg-4">
                        <div class="row">
                            <div class="col-12 d-flex justify-content-center align-items-center mb-3 pt-3">
                                <img src="${d.icon}" class="img-fluid" alt="${"image of " + d.main + "-" + d.dt + " graphic"}">
                            </div>
                            <div class="col-12">
                                <h2 class="display-4 text-center">${d.main}</h2>
                            </div>
                            <div class="col-6 text-center">
                                <div class="we-hover rounded-bottom rounded-top">
                                    <span class="ti-shine icon-size"></span><p>Sunrise: ${new Date(d.sunrise).toDateString()}</p>
                                </div>
                            </div>
                            <div class="col-6 text-center">
                                <div class="we-hover rounded-bottom rounded-top">
                                    <span class="ti-cloud icon-size"></span><p> Sunset: ${new Date(d.sunset).toDateString()}</p>
                                </div>    
                            </div>
                        </div>                        
                    </div>
                    <div class="col-lg-8">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-4">
                                    <div class="row text-center we-hover rounded-bottom rounded-top">
                                        <div class="col-12">
                                            <h3 class="display-1"><sub>${Number((d.temp.max + d.temp.min) / 2).toFixed(2)}</sub><sup><span class="ti-control-record degree-size"></span></sup></h3>
                                        </div>
                                        <div class="col-12">
                                            <h4><sup><span class="ti-control-record" style="font-size: small;"></span></sup>C <span class="text-muted">| <sup><span class="ti-control-record" style="font-size: small;"></span></sup>F | K</span></h4>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-8">
                                    <div class="row">
                                        <div class="col-12">
                                            <table class="table table-responsive">
                                                <thead>
                                                    <th>Morning</th>
                                                    <th>Day</th>
                                                    <th>Evening</th>
                                                    <th>Night</th>
                                                    <th>Min</th>
                                                    <th>Max</th>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>${d.temp.morn}</td>
                                                        <td>${d.temp.day}</td>
                                                        <td>${d.temp.eve}</td>
                                                        <td>${d.temp.night}</td>
                                                        <td>${d.temp.min}</td>
                                                        <td>${d.temp.max}</td>
                                                    </tr>
                                                </tbody>
                                                <tfoot>
                                                    <div class="row">
                                                        <div class="col-12 d-flex justify-content-center">
                                                            Temperature in <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup>C
                                                        </div>
                                                    </div>
                                                </tfoot>
                                            </table>
                                        </div>
                                        ${
                                            (d.pressure) ?
                                            '<div class="col-md-6  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Pressure: ' + d.pressure + 'hPa</span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.humidity) ?
                                            '<div class="col-md-6  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Humidity: ' + d.humidity + '%</span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.visibility) ?
                                            '<div class="col-md-6  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Visibility: ' + d.visibility + ' metres</span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.clouds) ?
                                            '<div class="col-md-6  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Cloud: ' + d.clouds + '%</span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.snow) ?
                                            '<div class="col-md-6  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Snow: ' + d.snow + 'mm</span>' +
                                            '</div>' : ""
                                        }
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="row mt-3">
                                        ${
                                            (d.wind_speed) ?
                                            '<div class="col-md-4  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Speed: ' + d.wind_speed + 'm/s</span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.wind_deg) ?
                                            '<div class="col-md-4  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Wind Direction: ' + d.wind_deg + ' <sup><span class="ti-control-record" style="font-size: x-small;"></span></sup></span>' +
                                            '</div>' : ""
                                        }
                                        ${
                                            (d.rain) ?
                                            '<div class="col-md-4  mb-1">' +
                                                '<span class="p-2 we-hover rounded-bottom rounded-top">Rainfall: ' + d.rain + 'mm</span>' +
                                            '</div>' : ""
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
            content += item    
        })
    }

    var head = `
    <div class="container">
        <div class="row mt-3">
            <div class="col-4">
                <a href="/current.html?id=${data.id}" class="btn btn-outline-warning btn-sm"><span class="ti-arrow-left"></span><span class="d-none">Back to current details</span></a>
            </div>
            <div class="col-8 d-flex align-items-center o-text-secondary">
                <h1 style="font-size: 1rem">
                    <span class="ti-location-pin"></span> <strong> ${data.name}, ${data.country}</strong> : Daily Forecast
                </h1>
            </div>
        </div>
    </div>
    <div class="container">
        ${content}
    </div>`
    $('#title').text(`${data.name} Weather Forecast`)
    container.html(head)
}

function indexPage(func){
    const form = document.querySelector('#weather-search')
    form.onsubmit = function(e){
        e.preventDefault()
        var city = form.city.value
        func(city)
    }
}

//https://samples.openweathermap.org/data/2.5/weather?q=london,uk&appid=f3a4a11737ab4f3d8b60a94ce9168e28
//https://api.openweathermap.org/data/2.5/onecall?lat=33.441792&lon=-94.037689&exclude=minutely&appid=f3a4a11737ab4f3d8b60a94ce9168e28

/***
 * Function calls
 */
$(document).ready(() => {

    database((error, request) => {
        if(error){
            return alert(FAILURE_ALERT, error)
        }
        switch (true) {
            case location.pathname.startsWith('/index.html') || location.pathname === '/':
                indexPage(city => {
                    storeForecast(request, city, (error, forecastId) => {
                        if(error){
                            return alert(FAILURE_ALERT, `Error ${error} occured while searching. Try again`)
                        }
                        location.href = '/current.html?id=' + forecastId
                    })
                })         
                break;
            case location.pathname.startsWith('/history.html'):
                getForecasts(request, (error, forecats) => {
                    if(error){
                        return alert(FAILURE_ALERT, "Error retrieving previous search")
                    }
                    historyPage(forecats)
                })     
                break;
            case location.pathname.startsWith('/current.html'):
                try {
                    var id = urlArgs().id
                    getForecast(request, id, (error, forecast) => {
                        if(error){
                            return alert(FAILURE_ALERT, "Error retrieving data")
                        }
                        currentPage(forecast)
                    })
                } catch (error) {
                    history.back()
                }
                break;
            case location.pathname.startsWith('/hourly.html'):
                try {
                    var id = urlArgs().id
                    getForecast(request, id, (error, forecast) => {
                        if(error){
                            return alert(FAILURE_ALERT, "Error retrieving data")
                        }
                        hourlyPage(forecast)
                    })
                } catch (error) {
                    history.back()
                }
                break;
            case location.pathname.startsWith('/daily.html'):
                try {
                    var id = urlArgs().id
                    getForecast(request, id, (error, forecast) => {
                        if(error){
                            return alert(FAILURE_ALERT, "Error retrieving data")
                        }
                        dailyPage(forecast)
                    })
                } catch (error) {
                    history.back()
                }
                break;
            default:
                break;
        }
    })
})