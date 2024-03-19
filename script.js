/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoibWFobSIsImEiOiJjbHJiaTVkanowb3lzMndwcnYwN3ZleGJkIn0.6g4SedBzopOipcNKBKj3lg'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/mahm/cltrpoijj013901p5fpqob5wf',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 11 // starting zoom level
});


// button to apply / remove hexgrid filter 
const button = document.getElementById("btn")

// legend 
const legend = document.getElementById('legend');

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

// fetch data from site and display the layer on the map 
let pointsgeojson;

fetch('https://raw.githubusercontent.com/smith-lg/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        console.log(response);
        pointsgeojson = response;
    })

// load map layer 
map.on('load', () => {
    map.addSource('cycle-data', {
        type: 'geojson', 
        data: pointsgeojson
    });

    map.addLayer({
        'id': 'cycle-pts',
        'type': 'circle', 
        'source': 'cycle-data'
    });


    
/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function

    let bboxgeojson;
    // find range of points to box in 
    let bbox = turf.envelope(pointsgeojson);

    // create bbox feature that eveloped points 
    bboxgeojson = {
        'type': 'FeatureCollection',
        'features': [bbox]
    };

    // add bbox layer to map 
    map.addSource('collisons-bbox', {
        type: 'geojson', 
        data: bboxgeojson
    });
    map.addLayer({
        'id': 'bounding-box-fill', 
        'type': 'line', 
        'source': 'collisons-bbox'
    });
    // console.log(bboxgeojson);

    /*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    // note the coordiantes of the verticies of the bbox 
    let bboxcoords = [bbox.geometry.coordinates[0][0][0], 
                    bbox.geometry.coordinates[0][0][1], 
                    bbox.geometry.coordinates[0][2][0], 
                    bbox.geometry.coordinates[0][2][1]]
    // create the hexgrid within the bbox range 
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometers'});

    map.addSource('hexgrid', {
        type: 'geojson', 
        data: hexgeojson
    });
   /* map.addLayer({
        'id': 'hexgrid-layer', 
        'type': 'fill', 
        'source': 'hexgrid',
        'paint' : {
            'fill-color': '#800026',
            'fill-opacity': 0.5
        }
    });
    */

    // aggregate data 
    let collishex = turf.collect(hexgeojson, pointsgeojson, '_id', 'values');

    let maxcollis = 0;


    collishex.features.forEach((feature) => {
        // identify collisons in polygon 
        feature.properties.COUNT = feature.properties.values.length;
        if (feature.properties.COUNT > maxcollis) {
            console.log(feature);
            // add point COUNT to to collishex features 
            maxcollis = feature.properties.COUNT
        }
    });
   // console.log(maxcollis);

    // add hexgrid layer of aggregated data 
    map.addSource('collis-hex', {
        type: 'geojson', 
        data: collishex
    });
    map.addLayer({
        'id': 'collishex-layer', 
        'type': 'fill', 
        'source': 'collis-hex',
        'paint' : {
            'fill-color': [
                // show diff. color depending on density of collisions in the hexgrid 
                'step', ['get', 'COUNT'], '#fd8d3c',
                    10, '#fc4e2a', 
                    15, '#bd0026',
                    25, '#e31a1c', 
                    30, '#800026'],
            'fill-opacity': 0.5
        }
    });

})



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


let btnID = null; 
// button functionality -- remove layer upon click, apply layer if clicked again 
button.addEventListener("click", function (){
    if (btnID !== true){
        btnID = true;
        // remove layer
        map.removeLayer('collishex-layer')
        map.removeLayer('hexgrid-layer')
    }
    else{
        btnID = false;
        // if the button has already been pressed, clicking the button again will show the layer
        map.addLayer({
            'id': 'collishex-layer', 
            'type': 'fill', 
            'source': 'collis-hex',
            'paint' : {
                'fill-color': [
                    'step', ['get', 'COUNT'], '#fd8d3c',
                    10, '#fc4e2a', 
                    15, '#bd0026',
                    25, '#e31a1c', 
                    30, '#800026'],
                'fill-opacity': 0.3
            }
        });
    }

})

// labels of legend steps 
const legendlabels = [
    '<10',  
    '10-15', 
    '15-25', 
    '25-30', 
    '>30'
];
// legend colors 
const legendcolours = [
    '#fd8d3c', '#fc4e2a',  '#bd0026', '#e31a1c','#800026'
];
// create labels for legend item 
legendlabels.forEach((label, i) => {
    const colour = legendcolours[i];

    const item = document.createElement('div'); //each layer gets a 'row' - this isn't in the legend yet, we do this later
    const key = document.createElement('span'); //add a 'key' to the row. A key will be the colour circle

    key.className = 'legend-key'; //the key will take on the shape and style properties defined in css
    key.style.backgroundColor = colour; // the background color is retreived from teh layers array

    const value = document.createElement('span'); //add a value variable to the 'row' in the legend
    value.innerHTML = `${label}`; //give the value variable text based on the label

    item.appendChild(key); //add the key (colour cirlce) to the legend row
    item.appendChild(value); //add the value to the legend row

    legend.appendChild(item); //add row to the legend
});


// popups 
map.addControl(new mapboxgl.NavigationControl());

// EVENTS - MOUSE CLICK
map.on('mouseenter', 'cycle-pts', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over collisions layer
});

map.on('mouseleave', 'cycle-pts', () => {
    map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves collisions layer
});

map.on('click', 'cycle-pts', (e) => {
    new mapboxgl.Popup() // upon clicking, declare a popup object 
        .setLngLat(e.lngLat) // method uses coordinates of mouse click to display popup at 
        // using popup, show ACCLASS (type of injury) of the collision that was clicked on 
        .setHTML("<b>Injury:</b> " + e.features[0].properties.ACCLASS)
        .addTo(map); //Show popup on map
});
