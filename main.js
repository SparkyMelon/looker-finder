const {app, BrowserWindow} = require('electron');
const path = require('path');
const {Client, PlaceType1, PlaceType2} = require('@googlemaps/google-maps-services-js');
require('dotenv').config();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.webContents.openDevTools();

  win.webContents.on('ipc-message', async (event, message, ...args) => {
    switch (message) {
      case 'fetch-types':
        let types = Object.values(PlaceType1);
        types = types.concat(Object.values(PlaceType2));
  
        event.reply('fetch-types-reply', types);
        break;
      case 'search-places':
        const [postcode, radiusMiles, searchTerms] = args; 

        try {
          const client = new Client({
            key: process.env.GOOGLE_MAPS_API_KEY
          });
  
          // Geocode the postcode
          const geocodeResponse = await client.geocode({
            params: {
              key: process.env.GOOGLE_MAPS_API_KEY,
              address: postcode,
            }
          }).then(response => response.data);
  
          if (!geocodeResponse.results || !geocodeResponse.results[0].geometry.location) {
            event.reply('search-places-error', `Unable to geocode postcode: ${postcode}`);
            return;
          }
  
          const {
            lat,
            lng
          } = geocodeResponse.results[0].geometry.location;
  
          // Convert miles to meters
          const radiusMeters = radiusMiles * 1609.34;
  
          // Places API request
          const nearbyResponse = await client.placesNearby({
            params: {
              key: process.env.GOOGLE_MAPS_API_KEY,
              location: {
                lat: lat,
                lng: lng
              },
              radius: radiusMeters,
              type: searchTerms,
            }
          }).then(response => response.data);
  
          if (!nearbyResponse.results) {
            event.reply('search-places-error', 'Unable to find nearby places');
            return;
          }
  
          let places = [];
          for (let i = 0; i < nearbyResponse.results.length; i++) {
            const placeResponse = await client.placeDetails({
              params: {
                key: process.env.GOOGLE_MAPS_API_KEY,
                place_id: nearbyResponse.results[i].place_id,
                fields: ['name', 'formatted_phone_number', 'website', 'formatted_address', 'type']
              }
            });
  
            places.push({
              'name': placeResponse.data.result.name,
              'phone_number': placeResponse.data.result.formatted_phone_number,
              'website': placeResponse.data.result.website,
              'address': placeResponse.data.result.formatted_address,
              'types': placeResponse.data.result.types.join(', '),
            });
          }
  
          // OLD
          event.reply('nearby-places-reply', places);
  
        } catch (error) {
          console.error('Error:', error);
          console.error(error.response.data.error_message);
          event.reply('search-places-error', 'An unexpected error occurred.');
        }
        break;
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// TODO
// - Fetch place data from the place IDs from the previous response
//   and display on the front end
// - Fetch all place types and display to select them,
//   update the search term from type to actual search for refinement
// - Styling
// - Export feature

// Stretch goals
// - Use a LLM to generate an email based on a prompt from the user,
//   utilizing all hydrated data from the API to personalize it
// - Email service for complete automation (create a blacklist once sent so you only ever email a company once)