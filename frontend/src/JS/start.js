import {
    GetUserData,
    InitDiscordRPC,
    UpdateDiscordRPC,
    GetStartupStatus
} from "../../wailsjs/go/backend/App";
import { loadPageGo } from "./loadPages";
import {initCreateEvent} from "./createEvents";

import {popup, stillPopup, stopStillPopup} from './popups'
import {
    changeLoginButtonName, changeLoginPassword,
    changeTitle,
    deconnectionFromMyges,
    openConnexion,
    showButtonCancelConnection
} from "./login-register";
import { hasCommonClass} from "./functions";
import {deleteOldData, eulaShow} from "./index_events";
import { grades } from "../JS-Page/grades";
import { absences } from "../JS-Page/absences";
import { account } from "../JS-Page/account";
import { events } from "../JS-Page/events";
import { courses } from "../JS-Page/courses";
import { changeWeek, hideScheduleButtons, schedule, showScheduleButtons } from "../JS-Page/schedule";
import { projects } from "../JS-Page/projects";

let initializedStart = false

const StartupStatus = {
    StatusNotStarted: 0,
    StatusInProgress: 1,
    StatusIncompleteNoUsers: 2,
    StatusIncompleteNoInternet: 3,
    StatusCompleted: 4,
    StatusFailed: 5
  };
  
  // Pour s'assurer que l'objet ne peut pas être modifié
  Object.freeze(StartupStatus);

export async function start(){
    if(!initializedStart){
        await initializeLoadPage()
        await initCreateEvent()
        await initializeCredits()
        await initializeSchedulePart()
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

            await openConnexion()
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
        const themeImg = document.getElementsByClassName('themeLightDark')
        if(user.Theme){
            theme.classList = user.Theme
        }

        Array.from(themeImg).forEach((th)=>{
            if(hasCommonClass(theme, th)){
                th.style.display = "block"
            }
            else{
                th.style.display = "none"
            }
        })

        try{
            connectDiscord()
            loadPageGo("dashboard.html")

            // Need to wait the full start of the app
            let status = await GetStartupStatus()
            while (status === StartupStatus.StatusInProgress) {
                await new Promise(resolve => setTimeout(resolve, 100));
                status = await GetStartupStatus()
            }
            initAllPages(status)
        } catch (e) {
            console.log(e)
            popup(e.toString())
        }

    } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur :", error);
        stopStillPopup(laStill)
        return
    }
    stopStillPopup(laStill)
}

async function initAllPages(startingStatus = -1){

    schedule()
    switch (startingStatus) {
        case StartupStatus.StatusCompleted:
            projects()
            account()
            courses()
        case StartupStatus.StatusIncompleteNoInternet:
            grades()
            events()
            absences()
        default:
            break;
    }
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
    const modal = document.getElementById('modal-event');

    Array.from(loadingPageButton).forEach((button) =>{
        button.addEventListener("click", async (event) =>{
            modal.style.display = 'none';

            Array.from(loadingPageButton).forEach((but) => {
                but.classList.remove("active")
            })

            button.classList.add("active")
            try{
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

async function initializeSchedulePart(){
    const modal = document.getElementById('modal');
    const forceRefreshButton = document.getElementById("force-refresh")
    const forceNowButton = document.getElementById("force-now")
    const closeBtn = document.getElementsByClassName('close')[0];

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    forceRefreshButton.addEventListener("click", async ()=>{
        hideScheduleButtons()
        try{await changeWeek(0, true)}catch(e){console.log(e)}
        showScheduleButtons()
    })

    forceNowButton.addEventListener("click", async ()=>{
        hideScheduleButtons()
        try{await schedule(true)}catch(e){console.log(e)}
        showScheduleButtons()
    })

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

}