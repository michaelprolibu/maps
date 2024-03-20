
let map;
let current;
let currentMarker;
let markers = [];
let data;
let cards = [];

const getData = async () => {
    const response = await fetch('/js/data.json');
    let json_data = await response.json();
    data = json_data.data;
}

const createMarker = ({ lat, lng }, color = '#B22222') => {
    const customSymbol = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="19" fill="${color}"/><path d="M17.5625 31.5312C10.7188 21.6875 9.5 20.6562 9.5 17C9.5 12.0312 13.4844 8 18.5 8C23.4688 8 27.5 12.0312 27.5 17C27.5 20.6562 26.2344 21.6875 19.3906 31.5312C18.9688 32.1875 17.9844 32.1875 17.5625 31.5312ZM18.5 20.75C20.5625 20.75 22.25 19.1094 22.25 17C22.25 14.9375 20.5625 13.25 18.5 13.25C16.3906 13.25 14.75 14.9375 14.75 17C14.75 19.1094 16.3906 20.75 18.5 20.75Z" fill="white"/></svg>`),
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#FFFFFF',
        scale: 2,
        anchor: new google.maps.Point(12, 24)
    };
    const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: 'Ubicación actual',
        icon: customSymbol
    });
    return marker;
}

const createInfoWindow = (marker, conc, auto = false) => {
    const infowindow = new google.maps.InfoWindow({
        content: `
        <h2 class="title-popup">${conc.name}</h2>
        <div class="address-popup"><img src="./assets/map.svg" alt=""> ${conc.address}</div>
        <div class="hours-popup">
        <div class="section-h-popup"><h3>Horario:</h3><div><span>${conc.times_daily}</span><span>${conc.times_weekend}</span></div></div>
        <div class="section-h-popup"><h3>Teléfono:</h3><div><span>${conc.phone}</span></div></div></div>
        </div>
        <div class="indications-popup">
        <span>Este concesionario esta a ${conc.distance_to_user.toFixed(2)} km</span>
        <a href="https://www.google.com/maps/dir/${current.lat},${current.lng}/${conc.lat},${conc.log}" target="_blank" class="">Maps <img src="./assets/export.svg" alt="" /></a>
        <a href="https://www.waze.com/ul?from=${current.lat},${current.lng}&to=${conc.lat},${conc.log}&navigate=yes" target="_blank" class="">Waze <img src="./assets/export.svg" alt="" /></a>
        </div>
        <div class="footer-popup ${getOpenOrClosed(conc)}">
        ${getOpenOrClosed(conc) ? 'Abierto' : 'Cerrado'}
        </div>`,
        ariaLabel: `${conc.name}`,
    });
    if (!auto) {
        infowindow.open({
            anchor: marker,
            map
        })
    } else {
        marker.addListener("click", function () {
            infowindow.open({
                anchor: marker,
                map
            })
        })
    }
}

const getCurrentPosition = () => {
    navigator.geolocation.getCurrentPosition((position) => {
        current = { lat: position.coords.latitude, lng: position.coords.longitude };
        currentMarker = createMarker(current, '#2C75D4'); //Marcador de mi posición
        map.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        map.setZoom(12);
        configureSelects();
    }, (error) => {
        // console.error(error);
        //TODO: Generar una alerta
        if (error instanceof GeolocationPositionError) {
            alert('Necesitamos tu ubicación');
        }
    });
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    var R = 6371;
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c;
    return distance;
}

const getMostNear = (concs) => {
    let near;
    concs.map((conc) => {
        if (!near || conc.distance_to_user < near.distance_to_user) near = conc
    })
    return near;
}

const setBounds = async () => {
    const { LatLngBounds } = await google.maps.importLibrary("core");
    const bounds = new LatLngBounds();
    markers.map((marker) => {
        bounds.extend(marker.position);
    })
    if ($('#checkPosition').prop('checked')) {
        bounds.extend(currentMarker.position);
    }
    map.fitBounds(bounds, 45);
    if (markers.length == 1 && !$('#checkPosition').prop('checked')) {
        map.setZoom(16);
    }
}

const clearMap = () => {
    markers.map((marker) => marker.setMap(null));
    markers = [];
}


const updateList = () => {
    clearMap();
    let selectedCityId = $('#citySelect').val();
    let selectedBrandId = $('#brandSelect').val();
    let concs = [];
    if (selectedCityId > 0) {
        let selectedCityData = data.find(item => item.id == selectedCityId);
        concs = selectedCityData.concessionaires.filter(con => con.brand.some(brand => selectedBrandId != 0 ? con.brand.some(brand => brand.id == selectedBrandId) : true));
    } else {
        data.map((city) => {
            concs = concs.concat(city.concessionaires.filter(con => selectedBrandId > 0 ? con.brand.some(brand => brand.id == selectedBrandId) : true));
        })
    }
    concs.forEach(function (conc) {
        conc['distance_to_user'] = calculateDistance(current.lat, current.lng, parseFloat(conc.lat), parseFloat(conc.log));
    })
    if ($('#checkPosition').prop('checked')) {
        printCard([getMostNear(concs)]);
        setMarkersInMap([getMostNear(concs)]);
    } else {
        printCard(concs);
        setMarkersInMap(concs);
    }
}

const setMarkersInMap = (concs) => {
    concs.map(async (conc) => {
        const marker = await createMarker({ lat: parseFloat(conc.lat), lng: parseFloat(conc.log) });
        marker.addListener('click', () => {
            createInfoWindow(marker, conc);
        })
        markers.push(marker);
    })
    setBounds();
}

const getOpenOrClosed = (conc) => {
    const date = new Date();
    const hour = date.getHours();
    const day_in_week = date.getDay();
    if (day_in_week > 0 && day_in_week < 6) {
        if (hour >= conc.open_daily && hour <= conc.close_daily) return true;
    }
    else {
        if (hour >= conc.open_weekend && hour <= conc.close_weekend) return true;
    }
    return false;
}

const printCard = (arr) => {
    const content = document.getElementById('cardsContent');
    if (cards.length > 0) {
        cards.map((card) => {
            card.remove();
        })
    }
    cards = arr.map((conc) => {
        const html_card = `
        <div class="card-content">
        <div class="">
        <h4>${conc.name}</h4>
        <div class=""><img src="./assets/map.svg" alt=""> ${conc.address}</div>
        </div>
        <img class="arrow" src="./assets/arrow.svg" alt="">
        </div>
        <div class="card-footer ${getOpenOrClosed(conc)}">
        ${getOpenOrClosed(conc) ? 'Abierto' : 'Cerrado'}
        </div>
        `;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = html_card;
        card.addEventListener('click', () => showCardMarker(conc));
        return card;
    });
    cards.map((card) => {
        content.appendChild(card);
    })
}

const showCardMarker = async (card) => {
    clearMap();
    const cardMarker = await createMarker({ lat: parseFloat(card.lat), lng: parseFloat(card.log) });
    cardMarker.addListener('click', () => {
        createInfoWindow(cardMarker, card);
    })
    markers.push(cardMarker);
    await setBounds();
    createInfoWindow(cardMarker, card);
    toggleMenu();
}

const changeBrandEvent = (event) => {
    updateList();
}

const changeCityEvent = (event) => {
    let selectedCityId = $(event).val();
    let selectedCityData = data.find(item => item.id == selectedCityId);
    let brandSelect = $('#brandSelect');
    brandSelect.empty();
    const brands = [];
    if (selectedCityId == -1) {
        brandSelect.append($("<option />", {
            value: null,
            text: 'Marca*',
            hidden: true,
            selected: true
        }));
    }
    if (selectedCityId != 0 && selectedCityId != -1) {
        selectedCityData.concessionaires.forEach(function (conc) {
            conc.brand.forEach(function (brand) {
                if (!brands.find((brand1) => brand1.id == brand.id)) {
                    brands.push(brand);
                }
            });
        })
        brandSelect.append($("<option />", {
            value: 0,
            text: 'Todas las marcas'
        }));
        brands.forEach(function (brand) {
            brandSelect.append($('<option>', {
                value: brand.id,
                text: brand.name
            }));
        })
        updateList();
    } else {
        data.forEach(function (city) {
            city.concessionaires.forEach(function (conc) {
                conc.brand.forEach(function (brand) {
                    if (!brands.find((brand1) => brand1.id == brand.id)) {
                        brands.push(brand);
                    }
                });
            })
        })
        brandSelect.append($("<option />", {
            value: 0,
            text: 'Todas las marcas'
        }));
        brands.forEach(function (brand) {
            brandSelect.append($('<option>', {
                value: brand.id,
                text: brand.name
            }));
        });
        updateList();
    }
}

const configureSelects = () => {
    let citySelect = $('#citySelect');
    let brandSelect = $('#brandSelect');
    citySelect.append($("<option />", {
        value: -1,
        text: 'Ciudad*',
        selected: true,
        hidden: true
    }));
    citySelect.append($("<option />", {
        value: 0,
        text: 'Todas las ciudades',
    }));
    data.forEach(function (item) {
        citySelect.append($('<option>', {
            value: item.id,
            text: item.city.charAt(0).toUpperCase() + item.city.slice(1)
        }));
    });
    citySelect.change(function () { changeCityEvent(this) });
    brandSelect.change(function () { changeBrandEvent(this) });
    citySelect.change();
}

const createForm = (content_id) => {
    const form_old = document.querySelector('form#form_maps');
    if (form_old) form_old.remove();
    const content = document.getElementById(`${content_id}`);
    const form = document.createElement('form');
    form.className = 'form';
    form.id = 'form_maps';
    let formTmpHTML = `
    <select id="citySelect">
        <option selected disabled hidden value="null">Ciudad<span>*</span></option>
    </select>
    <select id="brandSelect">
        <option selected disabled hidden value="null">Marca<span>*</span></option>
    </select>
    <input type="checkbox" name="position" id="checkPosition">
    <label for="checkPosition">El más cercano a mi posición</label>
    `;
    form.innerHTML = formTmpHTML;
    if (content_id == 'form_content') {
        content.insertBefore(form, document.getElementById('cardsContent'));
    } else {
        content.insertBefore(form, content.firstChild);
    }
    getCurrentPosition();
}

const toggleMenu = () => {
    const menu = document.getElementById('form_content');
    if (menu.classList.contains('open')) menu.classList.remove('open');
    else menu.classList.add('open');
}

const createorDeleteMenuButton = (content) => {
    const menu_old = document.querySelector('.menu-button');
    if (menu_old) menu_old.remove();
    if (content != 'form_content') {
        const map_content = document.querySelector('section.map');
        const menu = document.createElement('div');
        menu.className = 'menu-button';
        menu.addEventListener('click', () => {
            toggleMenu();
        })
        const close_button = document.getElementById('close_button');
        close_button.addEventListener('click', () => {
            toggleMenu();
        })
        map_content.appendChild(menu);
    }
}

async function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: { lat: parseFloat(4.7109886), lng: parseFloat(-74.072092) },
        fullscreenControl: false, // Desactiva el control de pantalla completa
        streetViewControl: false, // Desactiva el control de Street View
        mapTypeControl: false // Desactiva el control de tipo de mapa
    });
    await getData();

    $(document).ready(function () {
        const resize_fn = () => {
            const content_id = window.screen.width <= 700 ? 'app_main' : 'form_content';
            createForm(content_id);
            createorDeleteMenuButton(content_id)
        }
        window.addEventListener('resize', () => {
            resize_fn();
        });
        resize_fn();
    });
}