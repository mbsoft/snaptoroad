

(async function () {
  const map = new mapboxgl.Map({
    container: 'map',
    style: carto.basemaps.voyager,
    center: [-77.06038791500906, 38.890629810953854],
    zoom: 12
  });
  
  let i = 0;
  map.on('click', (e) => {
    const markMe = new mapboxgl.Marker()
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map);

    // 10 minutes
    axios.get(`https://3jgvmc5v4n.us-east-2.awsapprunner.com/isochrone?key=fceb4b3a889c46a0ace8b2b65c1e6562&profile=driving&coordinates=${e.lngLat.lat},${e.lngLat.lng}&time=600&fill=lightgreen&line=green&opacity=0.3`, {responseType: 'json'})
      .then((res) => {
          var dm = res.data;
          const viz = new carto.Viz(`
            color: opacity(rgb(170,255,153),0.4)
            strokeWidth: 1
          `);
          const isochroneSource = new carto.source.GeoJSON(dm);
          const isochroneLayer = new carto.Layer(`isochrone-${i++}`, isochroneSource, viz);
          isochroneLayer.addTo(map);
      });

      // 15 minutes
      axios.get(`https://3jgvmc5v4n.us-east-2.awsapprunner.com/isochrone?key=fceb4b3a889c46a0ace8b2b65c1e6562&profile=driving&coordinates=${e.lngLat.lat},${e.lngLat.lng}&time=900&fill=lightgreen&line=green&opacity=0.3`, {responseType: 'json'})
      .then((res) => {
          var dm = res.data;
          const viz = new carto.Viz(`
            color: opacity(rgb(124,185,232),0.3)
            strokeWidth: 1
          `);
          const isochroneSource = new carto.source.GeoJSON(dm);
          const isochroneLayer = new carto.Layer(`isochrone-${i++}`, isochroneSource, viz);
          isochroneLayer.addTo(map);
          const interactivity = new carto.Interactivity(isochroneLayer);
          interactivity.on('featureHover', updateDetails);
      });

      // 20 minutes
      axios.get(`https://3jgvmc5v4n.us-east-2.awsapprunner.com/isochrone?key=fceb4b3a889c46a0ace8b2b65c1e6562&profile=driving&coordinates=${e.lngLat.lat},${e.lngLat.lng}&time=1200&fill=lightgreen&line=green&opacity=0.3`, {responseType: 'json'})
      .then((res) => {
          var dm = res.data;
          const viz = new carto.Viz(`
            color: opacity(rgb(255,77,106),0.2)
            strokeWidth: 1
          `);
          const isochroneSource = new carto.source.GeoJSON(dm);
          const isochroneLayer = new carto.Layer(`isochrone-${i++}`, isochroneSource, viz);
          isochroneLayer.addTo(map);
      });
  });


  function updateDetails(event) {
    let content = '';
    //for (let feature of event.features) {
      content += `
        <div class="container">
          <p class="open-sans">Latitude: ${event.coordinates.lat.toFixed(4)}</p>
          <p class="open-sans">Longitude: ${event.coordinates.lng.toFixed(4)}</p>
        </div>
      `;
    //}
    document.getElementById('content').innerHTML = content;
  }


})()
