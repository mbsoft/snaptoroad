
exports.handler = async (event) => {
    const axios = require('axios');
    const util = require('util');
    const region = event.queryStringParameters.region; //event.queryStringParamaters? event.queryStringParameters.region:event.region;
    const mockCount = event.queryStringParameters.number; //event.queryStringParameters? event.queryStringParameters.number:event.number;
    const mockType = event.queryStringParameters.type; //event.queryStringParameters?event.queryStringParameters.type:event.type;
    const mockVehCount = event.queryStringParameters.vehicles;
    const randomPointsOnPolygon = require('random-points-on-polygon');
    const poly = require(`./data/${region}_poly.json`);
    const casual = require('casual');
    var randomFeature = Math.floor(Math.random() * (poly.features.length - 0) + 0);
    const pointsOrigins = randomPointsOnPolygon(mockCount, poly.features[randomFeature]);
    const pointsDestinations = randomPointsOnPolygon(mockCount, poly.features[randomFeature]);
    var pointsVehicles = 0;
    console.log("event: ", util.inspect(event, { showHidden: false, depth: null}));
    //if (mockVehCount) {
    pointsVehicles = randomPointsOnPolygon(mockVehCount, poly.features[randomFeature]);
    
    //} else {
    //    pointsVehicles = randomPointsOnPolygon(10, poly.features[randomFeature]);
    //}
    var pointsArray = [];
    var precision = 10;
    var idx = 1;
    var addr = '';
    var dropoff_addr = '';

 
    //mockType = null --> random jobs
    //mockType = darp --> pickup/delivery shipments
    if (mockType === 'service') {
        for (var j = 0; j < pointsOrigins.length; j++) {
                var pointObject = {
                    "id": idx++,
                    "latitude": pointsOrigins[j].geometry.coordinates[1].toFixed(precision),
                    "longitude": pointsOrigins[j].geometry.coordinates[0].toFixed(precision),
                    "name": casual.full_name,
                    "business": casual.company_name,
                    "phone": casual.phone,
                    "attributes": [casual.integer(1,5)],
                    "priority": casual.coin_flip
                };
                pointsArray.push(pointObject);       
        }
    } else if (mockType === 'darp') {
        for (var j = 0; j < pointsOrigins.length; j++) {
                    var pointObject = {
                        "id": idx++,
                        "pickup_latitude": pointsOrigins[j].geometry.coordinates[1].toFixed(precision),
                        "pickup_longitude": pointsOrigins[j].geometry.coordinates[0].toFixed(precision),
                        "dropoff_latitude": pointsDestinations[j].geometry.coordinates[1].toFixed(precision),
                        "dropoff_longitude": pointsDestinations[j].geometry.coordinates[0].toFixed(precision),
                        "name": casual.full_name,
                        "business": casual.company_name,
                        "phone": casual.phone,
                        "attributes": [casual.integer(1,5)],
                        "priority": casual.coin_flip
                    };
                    pointsArray.push(pointObject);       


        }        
    }

     
    let vehicleArray = require('./data/vehicles.json');

    vehicleArray = vehicleArray.slice(0,mockVehCount);
    vehicleArray.forEach((veh,idx) => {
       let attr = {"attr3": [casual.integer(1,5),casual.integer(1,5)]};
       let latitude = pointsVehicles[idx].geometry.coordinates[1].toFixed(precision);
       let longitude = pointsVehicles[idx].geometry.coordinates[0].toFixed(precision);
       vehicleArray[idx] = {...veh,...attr, latitude,longitude}; 
    });
    
    // create vehicle geojson
    let vehicleGeoJson = {
        type: 'FeatureCollection',
        features: []
    };
    vehicleArray.forEach((veh,idx) => {
       let feature = {
           type: 'Feature',
           properties: {
               'id': veh.vin,
               'pointType': 16
           },
           geometry: {
               coordinates: [veh.longitude,veh.latitude],
               type: 'Point'
           }
       };
       vehicleGeoJson.features.push(feature);
    });
    pointsArray.forEach((pt,idx) => {
        let feature = {
            type: 'Feature',
            properties: {
                id: mockType === 'darp'?pt.pickup_address:pt.address,
                pointType: 255
            },
            geometry: {
                coordinates: [mockType === 'darp'?pt.pickup_longitude:pt.longitude, mockType === 'darp'?pt.pickup_latitude:pt.latitude],
                type: 'Point'
            }
        }
        vehicleGeoJson.features.push(feature);
    })
    
    const response = {
        statusCode: 200,
        body: {
            region: poly,
            pointsArray,
            vehicleArray,
            vehGeoJson: vehicleGeoJson
        }
    };

    return response;
};


