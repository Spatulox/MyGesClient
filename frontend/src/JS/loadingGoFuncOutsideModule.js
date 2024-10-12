// Async imports
let loadPageGo;
let start
let UpdateUserEula
let UpdateUserTheme
let CreateUser
let VerifyUser
let SaveEvents

import('./loadPages.js')
    .then(module => {
        loadPageGo = module.loadPageGo;
    })
    .catch(err => console.error('Erreur de chargement du module:', err));

import('./start')
    .then(module => {
        start = module.start;
    })
    .catch(err => console.error('Erreur de chargement du module:', err));

import('../../wailsjs/go/backend/App')
    .then(module => {
        UpdateUserEula = module.UpdateUserEula
        UpdateUserTheme = module.UpdateUserTheme
        CreateUser = module.CreateUser
        VerifyUser = module.VerifyUser
        SaveEvents = module.SaveEvents
    })
    .catch(err => console.error('Erreur de chargement du module:', err));