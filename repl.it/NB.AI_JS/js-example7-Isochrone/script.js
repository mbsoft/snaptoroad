
(async function () {
  nextbillion.setApiKey('fceb4b3a889c46a0ace8b2b65c1e6562')
  nextbillion.setApiHost('api.nextbillion.io')
  var map = new nextbillion.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 38.890629810953854, 
      lng: -77.06038791500906
    },
    vectorTilesSourceUrl: 'https://api.nextbillion.io/tiles/v3/tiles.json',
    style: 'https://api.nextbillion.io/maps/streets/style.json?key=fceb4b3a889c46a0ace8b2b65c1e6562'
  })

  var options = {
    resolution: 125,
    network: 'nb.ai',
    maxspeed: 65,
    units: 'miles'
  };
  var time = 1200; // in seconds

  var centerPt = null;
  var originMarker = null;
  var isochronePolygon = null;

  document.getElementById('aoi').onchange = function () {
    var pos = {
      lat: 38.890629810953854, 
      lng: -77.06038791500906
    };
    switch (document.getElementById("aoi").value) {
      case "200":
        pos = {
          lat: 37.7720957081475,
          lng: -122.4258842418464
        };
        break;
      case "300":
        pos = {
          lat: 51.50903293724923,
          lng: -0.1246211806754123
        };
        break;
      case "400":
        pos = {
          lat: 19.07523134735482,
          lng: 72.87319299626407
        };
        break;
      case '500':
        pos = {
          lat: -26.198314451358378,
          lng: 28.034264886767932
        };
        break;
      default:
        break;
    }
    map.flyTo({
      center: pos,
      zoom: 13,
      speed: 9.0,
      curve: 0.8,
    });
  }

  map.on('click', (e) => {
    centerPt = turf.point([e.lngLat.lng,e.lngLat.lat]);

      originMarker = new nextbillion.maps.Marker({
        draggable: true,
        position: {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng
        },
        map: map,
        title: 'O',
        icon: 'green'
      });

    // request isochrone
    if (originMarker) {
      icochroneMe();
    }

  });

  async function icochroneMe() {
    if (originMarker) {
      if (isochronePolygon) {
        isochronePolygon.remove();
        isochronePolygon = null;
      }
      const unit = options.unit || 'miles';
      let spokes = turf.featureCollection([]);
      var length = (time/3600) * options.maxspeed;

      // Define the axes for the search grid
      spokes.features.push(turf.destination(centerPt, length, 180, unit));
      spokes.features.push(turf.destination(centerPt, length, 0, unit));
      spokes.features.push(turf.destination(centerPt, length, 90, unit));
      spokes.features.push(turf.destination(centerPt, length, -90, unit));

      var bboxGrid = this.bboxGrid = turf.bbox(spokes);
      var sizeCellGrid = turf.distance(turf.point([bboxGrid[0], bboxGrid[1]]), turf.point([bboxGrid[0], bboxGrid[3]]), unit) / options.resolution;
    
      // divides the grid into individual point grids based on resolution requested
      var targets = turf.pointGrid(bboxGrid, sizeCellGrid, unit);


      targets.features = targets.features.filter(function(feat) {
        // filter out points that are certain to be within drive time limit
        return turf.distance(turf.point(feat.geometry.coordinates), centerPt, unit) <= length/1;
      });
  
      var destinations = turf.featureCollection([]);

      var coord = targets.features.map(function(feat) {
        // turf uses lon/lat order so need to swap using 'flip'
        feat = turf.flip(feat);
        return feat.geometry.coordinates;
      });
      // center is the origin point
      center = turf.flip(centerPt);
      coord.push(center.geometry.coordinates);

      var sources = coord.length - 1;

      // distance matrix table setup 1 origin multiple destinations
      var tableOptions = {
        coordinates: coord,
        sources: [sources]
      }

      console.log(tableOptions);

      var dest_pts = '';
      tableOptions.coordinates.forEach( pt => {
          dest_pts = dest_pts + `${pt[0]},${pt[1]}|`
      });
      dest_pts = dest_pts.slice(0, dest_pts.length -1);

      // NB.ai distance matrix body - defaulting to 'now' time 
      var bodyRequest = {
        "departure_time": 0,
        "origins": `${tableOptions.coordinates[tableOptions.sources][0]},${tableOptions.coordinates[tableOptions.sources][1]}`,
        "destinations": dest_pts,
        "mode": "4w"
      };

      axios.post(`https://api.nextbillion.io/distancematrix/json-concise?key=fceb4b3a889c46a0ace8b2b65c1e6562`, bodyRequest, {responseType: 'json'})
      .then((res) => {
          var dm = res.data;

          dm.rows[0].forEach(function(eta, idx) {
            var distanceMapped = turf.distance(
                turf.point(coord[idx]),
                turf.point(tableOptions.coordinates[idx]),
                unit
            );
            if (distanceMapped < sizeCellGrid) {
                var dest = turf.point(tableOptions.coordinates[idx]);
                dest.properties = {};
                dest.properties.eta = eta[0];
                destinations.features.push(turf.flip(dest));
            }
          });
          var breaks = Array(tableOptions.sources[0]).fill(time);
          destinations.features.forEach(featPt => {
            //var mark = new nextbillion.maps.Marker({
            //  position: { lat: featPt.geometry.coordinates[1], lng: featPt.geometry.coordinates[0] },
            //  map: map,
            //  color: 'lightgray',
            //  opacity: 0.2
            //})
          });
          var result; // = turf.isolines(destinations, breaks, {zProperty: 'eta'});

          var inside = destinations.features.filter(function(feat) {
              return feat.properties.eta <= time;
          });
          destinations.features = inside;

          destinations.features.forEach(featPt => {
            //var mark = new nextbillion.maps.Marker({
            //  position: { lat: featPt.geometry.coordinates[1], lng: featPt.geometry.coordinates[0] },
            //  map: map,
            //  color: '#f7efef' 
            //})
          });

          result = turf.concave(destinations, {units: 'miles', maxEdge: .35});
          console.log(JSON.stringify(result));
          let path = [];
          let poly = null;
          console.log(JSON.stringify(result));


           if (result.geometry.type === "Polygon") {
            result.geometry.coordinates.forEach(poly => {
              poly.forEach(pt => {
                console.log(pt);
                let polyPt = {
                  lat: pt[1],
                  lng: pt[0]
                };
                path.push(polyPt);
              });
              poly = new nextbillion.maps.Polygon({
                path: path,
                fillColor: 'lightgreen',
                strokeColor: 'green',
                map: map
              });
              path = [];
            });             
          } else {
            result.geometry.coordinates.forEach(poly => {
              poly[0].forEach(pt => {
                console.log(pt);
                let polyPt = {
                  lat: pt[1],
                  lng: pt[0]
                };
                path.push(polyPt);
              });
              poly = new nextbillion.maps.Polygon({
                path: path,
                map: map,
                strokeColor: 'green',
                fillColor: 'lightgreen'
              });
              path = [];
            });
        } 

      }); 
  
      var tooltip = new nextbillion.maps.Tooltip({
        marker: originMarker,
        content: `${time/60} min`
      });
      tooltip.open();

    }
  }



})()
