import {
    GetUserData,
    InitDiscordRPC,
    UpdateDiscordRPC,
} from "../../wailsjs/go/backend/App";
import { loadPageGo } from "./loadPages";

export async function start(){

    // Check if :
    // - The user exist
    // - The user has accepted the EULA
    // - Apply the Theme
    const laStill = stillPopup("Login...")
    try {
        let user = await GetUserData();
        if (user === null || !user.Password) {
            buttonCancelConnection.style.visibility = "hidden"
            const connection = document.getElementById('connection')
            connection.classList.add('active')
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



