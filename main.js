const { app, BrowserWindow } = require('electron');
const path = require('path');
const { Client } = require('@googlemaps/google-maps-services-js');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.webContents.openDevTools();

  win.webContents.on('ipc-message', async (event, channel, postcode, radiusMiles, searchTerms) => {
    if (channel === 'search-places') {
      try {
        const client = new Client({
          key: 'API_KEY_ENV_VAR_HERE'
        });

        // Geocode the postcode
        const geocodeResponse = await client.geocode({
            params: {
                key: 'API_KEY_ENV_VAR_HERE',
                address: postcode,
            }
        }).then(response => response.data); 

        if (!geocodeResponse.results || !geocodeResponse.results[0].geometry.location) {
          event.reply('search-places-error', `Unable to geocode postcode: ${postcode}`);
          return;
        }

        const { lat, lng } = geocodeResponse.results[0].geometry.location;

        // Convert miles to meters
        const radiusMeters = radiusMiles * 1609.34;

        // Places API request
        const nearbyResponse = await client.placesNearby({
            params: {
                key: 'API_KEY_ENV_VAR_HERE',
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

        // TODO
        // - GIT
        // - Update all instances of the word pub to place
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

        event.reply('nearby-places-reply', nearbyResponse.results);

      } catch (error) {
        console.error('Error:', error);
        console.error(error.response.data.error_message);
        event.reply('search-places-error', 'An unexpected error occurred.');
      }
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