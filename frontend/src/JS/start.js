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
    changeLoginButtonName, changeLoginPassword,
    changeTitle,
    createDropDownMenu, deconnectionFromMyges,
    openConnexion,
    showButtonCancelConnection
} from "./login-register";
import {capitalizeFirstLetter} from "./functions";
import {deleteOldData, eulaShow} from "./index_events";

let initializedStart = false

export async function start(){
    if(!initializedStart){
        await initializeLoadPage()
        await initCreateEvent()
        await initializeCredits()
        initializedStart = true
    }

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

async function initializeLoadPage(){
    let loadingPageButton = document.getElementsByClassName("loadPage")

    Array.from(loadingPageButton).forEach((button) =>{
        button.addEventListener("click", async (event)=>{
            let currPage
            try{
                console.log(button)
                console.log(button.dataset.idpage)
                await loadPageGo(button.dataset.idpage + "")
            } catch (e) {
                console.log(e)
            }
        })
    } )

}

async function initializeCredits(){
    const changePassword = document.getElementById("changePassword")
    const eulaShowId = document.getElementById("eulaShow")
    const deleteOldDataId = document.getElementById("deleteOldData")
    const deconnectionFromMygesId = document.getElementById("deconnectionFromMyges")

    changePassword.addEventListener("click", ()=>{
        changeLoginPassword()
    })

    eulaShowId.addEventListener("click", ()=>{
        eulaShow()
    })

    deleteOldDataId.addEventListener("click", ()=>{
        deleteOldData()
    })

    deconnectionFromMygesId.addEventListener("click", ()=>{
        deconnectionFromMyges()
    })
}