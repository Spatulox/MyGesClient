// Async imports
let loadPageGo;
let UpdateUserEula
let UpdateUserTheme

import('./loadPages.js')
    .then(module => {
        loadPageGo = module.loadPageGo;
    })
    .catch(err => console.error('Erreur de chargement du module:', err));

import('../../wailsjs/go/backend/App')
    .then(module => {
        UpdateUserEula = module.UpdateUserEula;
        UpdateUserTheme = module.UpdateUserTheme
    })
    .catch(err => console.error('Erreur de chargement du module:', err));