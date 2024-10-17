import {
    GetRegisteredUsers,
    GetUserData,
    InitDiscordRPC,
    UpdateDiscordRPC,
} from "../../wailsjs/go/backend/App";
import { loadPageGo } from "./loadPages";
import {initCreateEvent} from "./createEvents";

import {stillPopup, stopStillPopup} from './popups'
import {
    changeLoginButtonName,
    changeTitle,
    createDropDownMenu,
    openConnexion,
    showButtonCancelConnection
} from "./login-register";

export async function start(){
    initCreateEvent()

    // Check if :
    // - The user exist
    // - The user has accepted the EULA
    // - Apply the Theme
    const laStill = stillPopup("Login...")
    try {
        let user = await GetUserData();
        if (user === null || !user.Password) {
            changeTitle("Créer un compte")
            changeLoginButtonName("Créer un compte")
            showButtonCancelConnection(false)

            try{
                // If there already a user in the DB add the list
                const users = await GetRegisteredUsers()
                if (users && users.length > 0) {
                    createDropDownMenu(users)
                }
            } catch (e) {
                console.log(e)
            }

            openConnexion()
            stopStillPopup(laStill)
            return
        }
        // Check if the eula is accepted
        if(!user.EULA || user.EULA === false)
        {
            const eula = document.getElementById('eula')
            eula.classList.add('active')
        }

        // Apply the theme
        const theme = document.getElementsByTagName('body')[0]
        const themeImg = document.getElementById('theme')
        if(user.Theme){
            theme.classList = user.Theme
        }

        if(theme.classList.contains('light')){
            themeImg.src = './src/assets/images/black-sun.png'
        }
        else{
            themeImg.src = './src/assets/images/black-moon.png'
        }

        connectDiscord()
        loadPageGo("dashboard.html")

    } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur :", error);
        stopStillPopup(laStill)
        return
    }
    stopStillPopup(laStill)
}

async function connectDiscord(){
        // Initialiser Discord RPC
    InitDiscordRPC()
        .then(() => console.log("Discord RPC initialized"))
        .catch(error => console.error("Failed to initialize Discord RPC:", error));

}

function updateActivity(state, details) {
    UpdateDiscordRPC(state, details)
        .then(() => console.log("Discord RPC activity updated"))
        .catch(error => console.error("Failed to update Discord RPC activity:", error));
}

start()
    .then(()=>{
    console.log("Frontend Started")
})



function createSelectUser(users){
    const connexionSelectField = document.getElementById("connexionSelect")
    let select = document.getElementById("selectConnectionSelect")
    if(!select){
        select = document.createElement("select");
    }
    select.innerHTML = ""
    select.id = "selectConnectionSelect"

    // ODefault option
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "default";
    defaultOpt.textContent = "Créer un compte";
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    // Add users
    users.forEach(user => {
        const option = document.createElement("option");
        option.value = user.ID;
        option.textContent = user.Username;
        select.appendChild(option);
    });

    // Add select to document
    connexionSelectField.appendChild(select);

    select.addEventListener("change", ()=>{
        if(select.selectedIndex > 0){
            document.getElementById("username").style.display = "none"
            document.getElementById('buttonConnection').value = "Connexion"
        } else {
            document.getElementById("username").style.display = "block"
            document.getElementById('buttonConnection').value = "Créer un compte"
        }
    })
}