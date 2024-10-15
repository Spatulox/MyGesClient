// Async imports
let loadPageGo;
let start
let UpdateUserEula
let UpdateUserTheme
let VerifyUser
let SaveEvents
let DeconnectUser
let GetRegisteredUsers
let UpdateUserPassword
let GetUserData
let ConnectUser

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
        VerifyUser = module.VerifyUser
        SaveEvents = module.SaveEvents
        DeconnectUser = module.DeconnectUser
        GetRegisteredUsers = module.GetRegisteredUsers
        UpdateUserPassword = module.UpdateUserPassword
        GetUserData = module.GetUserData
        ConnectUser = module.ConnectUser
    })
    .catch(err => console.error('Erreur de chargement du module:', err));
