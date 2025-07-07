
exports.handler = async (event) => {
    const axios = require('axios');
    const region = event.queryStringParameters.region; //event.queryStringParamaters? event.queryStringParameters.region:event.region;
    const mockCount = event.queryStringParameters.number; //event.queryStringParameters? event.queryStringParameters.number:event.number;
    const mockType = event.queryStringParameters.type; //event.queryStringParameters?event.queryStringParameters.type:event.type;
    
    const randomPointsOnPolygon = require('random-points-on-polygon');
    const poly = require(`./data/${region}_poly.json`);
    const geo = require(`./data/columbus_geofence.json`);
    const casual = require('casual');
    var randomFeature1 = Math.floor(Math.random() * (poly.features.length - 0) + 0);
    var randomFeature2 = Math.floor(Math.random() * (poly.features.length - 0) + 0);
    const pointsOrigins = randomPointsOnPolygon(mockCount, poly.features[randomFeature1]);
    const pointsDestinations = randomPointsOnPolygon(mockCount, poly.features[randomFeature2]);

    var pointsArray = [];
    var precision = 10;
    var idx = 1;
    var addr = '';
    var dropoff_addr = '';


    //mockType = null --> random jobs
    //mockType = darp --> pickup/delivery shipments
    if (!mockType) {
        for (var j = 0; j < pointsOrigins.length; j++) {
            console.log(`${pointsOrigins[j].geometry.coordinates[1]},${pointsOrigins[j].geometry.coordinates[0]}`);
            await axios.get(`https://api.nextbillion.io/h/revgeocode?key=73d4bee8352b46e483d75fb924889ada&radius=20000&at=${pointsOrigins[j].geometry.coordinates[1]},${pointsOrigins[j].geometry.coordinates[0]}&limit=1`)
            .then((res) => {
                addr = res.data.items[0].title;
                var pointObject = {
                    "id": idx++,
                    "latitude": pointsOrigins[j].geometry.coordinates[1].toFixed(precision),
                    "longitude": pointsOrigins[j].geometry.coordinates[0].toFixed(precision),
                    "name": casual.full_name,
                    "business": casual.company_name,
                    "address": addr,
                    "country": res.data.items[0].address.countryCode,
                    "state": res.data.items[0].address.stateCode,
                    "city": res.data.items[0].address.city,
                    "street": res.data.items[0].address.street,
                    "postalCode": res.data.items[0].address.postalCode,
                    "houseNumber": res.data.items[0].address.houseNumber,
                    "phone": casual.phone,
                    "attributes": [casual.integer(1,5)],
                    "priority": casual.coin_flip
                };
                pointsArray.push(pointObject);       
            });
        }
    } else if (mockType === 'darp') {
        for (var j = 0; j < pointsOrigins.length; j++) {
            await axios.get(`https://api.nextbillion.io/h/revgeocode?key=73d4bee8352b46e483d75fb924889ada&radius=20000&at=${pointsOrigins[j].geometry.coordinates[1]},${pointsOrigins[j].geometry.coordinates[0]}&limit=1`)
            .then(async (res) => {
                addr = res.data.items[0].title;
                await axios.get(`https://api.nextbillion.io/h/revgeocode?key=73d4bee8352b46e483d75fb924889ada&radius=20000&at=${pointsDestinations[j].geometry.coordinates[1]},${pointsDestinations[j].geometry.coordinates[0]}&limit=1`)
                .then((res2) => {
                    dropoff_addr = res2.data.items[0].title;
                    var pointObject = {
                        "id": idx++,
                        "pickup_latitude": pointsOrigins[j].geometry.coordinates[1].toFixed(precision),
                        "pickup_longitude": pointsOrigins[j].geometry.coordinates[0].toFixed(precision),
                        "dropoff_latitude": pointsDestinations[j].geometry.coordinates[1].toFixed(precision),
                        "dropoff_longitude": pointsDestinations[j].geometry.coordinates[0].toFixed(precision),
                        "name": casual.full_name,
                        "business": casual.company_name,
                        "pickup_address": addr,
                        "dropoff_address": dropoff_addr,
                        "phone": casual.phone,
                        "attributes": [casual.integer(1,5)],
                        "priority": casual.coin_flip
                    };
                    pointsArray.push(pointObject);       
                });
            });
        }        
    }

    
    let vehicleArray = require('./data/vehicles.json');
    const pointsVehicles = randomPointsOnPolygon(vehicleArray.length, poly.features[randomFeature1]);
    vehicleArray.forEach((veh,idx) => {
       let attr = {
        "start_lat": pointsVehicles[idx].geometry.coordinates[1].toFixed(precision), 
        "start_lng": pointsVehicles[idx].geometry.coordinates[0].toFixed(precision),
        "driver": casual.full_name, 
        "attr3": [casual.integer(1,3),casual.integer(4,5)]
       };
       vehicleArray[idx] = {...veh,...attr};
    });
    const response = {
        statusCode: 200,
        body: {
            pointsArray,
            vehicleArray,
            geo
        }
    };

    return response;
};


