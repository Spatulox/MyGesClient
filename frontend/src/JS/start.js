import {
    GetUserData,
    InitDiscordRPC,
    UpdateDiscordRPC,
    GetStartStatus
} from "../../wailsjs/go/backend/App";
import { loadPageGo } from "./loadPages";
import {getMonday, getSaturday, getYear, wait} from "./functions";

export async function start(){

    try {
        let user = await GetUserData();
        if (user === null || !user.Password) {
            buttonCancelConnection.style.visibility = "hidden"
            const connection = document.getElementById('connection')
            connection.classList.add('active')
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
    }

    try{
        const year = getYear().toString()
        const debut = getMonday().toISOString().split("T")[0]
        const end = getSaturday().toISOString().split("T")[0]
        let count = 0
        let status = await GetStartStatus()
        while(status === 0){
            wait(5)
            status = await GetStartStatus()
            if(count >= 50){
                stillPopup("Something wen wrong in the backend, try to restart the app")
                break
            }
            count ++
        }
        if(status === -1){
            stillPopup("Something went Wrong, plz restart")
            return
        }

    } catch (e) {
        popup("Erreur lors de la mise à jour des données utilisateur :" + e)
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



