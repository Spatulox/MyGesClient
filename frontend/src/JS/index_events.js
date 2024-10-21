
// ------------------------------------------------------------------ //
// Functions

import {popup, stillPopup, stopStillPopup} from "./popups";
import {closeConnexion, hideConnectionError, shakeConnexion, showConnectionError} from "./login-register";
import {
    DeleteOldData,
    UpdateUserEula,
    UpdateUserPassword,
    UpdateUserTheme,
    VerifyUser
} from "../../wailsjs/go/backend/App";
import {start} from "./start";
import {hasCommonClass} from "./functions";

/*function loadPage(string, event){ // Used in index.html
    loadPageGo(string, event)
}*/

// ------------------------------------------------------------------ //
// Listener
const lightDark = document.getElementsByClassName('themeLightDark');
const body = document.getElementsByTagName('body')[0]
const buttonEula = document.getElementById('buttonEula')

const buttonConnection = document.getElementById('buttonConnection')
const buttonCancelConnection = document.getElementById('buttonCancelConnection')



// ------------ Theme events -------------- //
Array.from(lightDark).forEach((theme)=>{
    theme.addEventListener('click', async function() {

        const newTheme = body.classList.contains('light') ? 'dark' : 'light';
        try{
            await UpdateUserTheme(newTheme)
        } catch (e) {
            console.log(e)
            popup(e.toString())
            popup("Impossible de sauvegarder votre thème choisi")
            //return
        }

        body.classList.toggle('light')
        body.classList.toggle('dark')

        Array.from(lightDark).forEach((img) => {
            if (img.classList.contains(newTheme)) {
                img.style.display = "block";
            } else {
                img.style.display = "none";
            }
        });

    });
})

buttonEula.addEventListener('click', async function() {
    try{
        const eula = document.getElementById('eula')
        await UpdateUserEula()
        eula.classList.remove('active')
    } catch (e) {
        console.log(e)
        popup(e.toString())
    }
})


buttonConnection.addEventListener("click", async function() {
    const username = document.getElementById("username").value
    const password = document.getElementById("password").value
    const selectConnexion = document.getElementsByClassName("select-selected")[0] || false
    const selectUser = document.getElementsByClassName("select-selected")[0].innerHTML.trim()

    const loginBtn = document.getElementById('buttonConnection');
    const oldInnerHtmlLoginBtn = loginBtn.innerHTML

    loadingConnectionButton(oldInnerHtmlLoginBtn)

    if(selectConnexion.style.display !== "none"){

        if(selectUser === "Créer un compte"){

            // Créer un compte
            console.log("Créer un compte")
            if(!username || !password){
                showConnectionError("Le nom d'utilisateur et le mot de passe doivent être rempli")
                shakeConnexion()
                loadingConnectionButton(oldInnerHtmlLoginBtn, false)
                return
            }
            const still = stillPopup("Verifying infos")
            try{
                const message = await VerifyUser(username, password);
                popup(JSON.parse(message).message)
            } catch (e) {
                console.log(e)
                showConnectionError(e.toString())
                shakeConnexion()
                stopStillPopup(still)
                loadingConnectionButton(oldInnerHtmlLoginBtn, false)
                return
            }
            stopStillPopup(still)
        } else {

            // Se connecter
            console.log("Connexion")
            if(!password){
                showConnectionError("Le mot de passe doit être rempli")
                shakeConnexion()
                loadingConnectionButton(oldInnerHtmlLoginBtn, false)
                return
            }
            const still = stillPopup("Verifying infos")
            try{
                console.log(selectUser)
                const {user, err} = await ConnectUser(selectUser, password)
                if(err){
                    showConnectionError("Une erreur s'est produit")
                    shakeConnexion()
                    loadingConnectionButton(oldInnerHtmlLoginBtn, false)
                    return
                }
                //closeConnexion()
            } catch (e) {
                console.log(e)
                showConnectionError("Une erreur s'est produit")
                shakeConnexion()
                stopStillPopup(still)
                loadingConnectionButton(oldInnerHtmlLoginBtn, false)
                return
            }
            stopStillPopup(still)
        }
        closeConnexion()
        start()
    } else {
        console.log("Update the password user")
        // Update le mot de passe
        if(!username || !password){
            showConnectionError("Le nom d'utilisateur et le mot de passe doivent être rempli")
            shakeConnexion()
            loadingConnectionButton(oldInnerHtmlLoginBtn, false)
            return
        }
        try{
            if(await UpdateUserPassword(username, password)){
                popup("Mot de passe mis à jour")
            }
        } catch (e) {
            console.log(e)
            showConnectionError(e.toString())
            shakeConnexion()
            loadingConnectionButton(oldInnerHtmlLoginBtn, false)
            return
        }
        closeConnexion()
    }
    hideConnectionError()
    loadingConnectionButton(oldInnerHtmlLoginBtn, false)
});

buttonCancelConnection.addEventListener('click', function() {
    closeConnexion()
})

function loadingConnectionButton(oldInnerHtmlLoginBtn, bool = true){
    const loginBtn = document.getElementById('buttonConnection');
    if(bool){
        loginBtn.innerHTML = "<img src='../../src/assets/images/circle-loading.gif' alt='loading' width='30px'>"
        loginBtn.style.padding = "2px"
    } else {
        loginBtn.innerHTML = oldInnerHtmlLoginBtn
        loginBtn.style.display = "block"
        loginBtn.style.padding = ""
    }
}

// ------------ Popup events -------------- //

export async function eulaShow(){
    const eula = document.getElementById('eula')
    eula.classList.add('active')
}



export async function deleteOldData(){
    if(await DeleteOldData()){
        popup("Supression réussie !")
        return
    }
    popup("Une erreur c'est produite. Certaines donnée on cependant peut être été bien supprimée")
}