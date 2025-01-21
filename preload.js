const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  searchPubs: async (postcode, radiusMiles, searchTerms) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.on('nearby-places-reply', (event, pubs) => {
        resolve(pubs); 
      });

      ipcRenderer.on('search-places-error', (event, error) => {
        reject(error);
      });

      ipcRenderer.send('search-places', postcode, radiusMiles, searchTerms);
    });
  }
});