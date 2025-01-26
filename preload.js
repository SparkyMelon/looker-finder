const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  fetchTypes: async () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.on('fetch-types-reply', (event, types) => {
        resolve(types);
      });

      ipcRenderer.on('fetch-types-error', (event, error) => {
        reject(error);
      });

      ipcRenderer.send('fetch-types');
    })
  },
  searchPlaces: async (postcode, radiusMiles, searchTerms) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.on('nearby-places-reply', (event, places) => {
        resolve(places); 
      });

      ipcRenderer.on('search-places-error', (event, error) => {
        reject(error);
      });

      ipcRenderer.send('search-places', postcode, radiusMiles, searchTerms);
    });
  }
});
