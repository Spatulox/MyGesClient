
// ------------------------------------------------------------------ //
// Functions

function loadPage(string, event){ // Used in index.html
    loadPageGo(string, event)
}

// ------------------------------------------------------------------ //
// Listener
const lightDark = document.getElementById('theme');
const body = document.getElementsByTagName('body')[0]
const buttonEula = document.getElementById('buttonEula')

const buttonConnection = document.getElementById('buttonConnection')
const buttonCancelConnection = document.getElementById('buttonCancelConnection')



// ------------ Utilitites events -------------- //
lightDark.addEventListener('click', function() {

    if(body.classList.contains('light')){
        lightDark.src = "./src/assets/images/black-moon.png"
        UpdateUserTheme("dark")
    }
    else{
        lightDark.src = "./src/assets/images/black-sun.png"
        UpdateUserTheme("light")
    }

    body.classList.toggle('light')
    body.classList.toggle('dark')

});

buttonEula.addEventListener('click', function() {
    const eula = document.getElementById('eula')
    UpdateUserEula()
    eula.classList.remove('active')
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
                closeConnexion()
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

async function eulaShow(){
    const eula = document.getElementById('eula')
    eula.classList.add('active')
}



async function deleteOldData(){
    if(await DeleteOldData()){
        popup("Supression réussie !")
        return
    }
    popup("Une erreur c'est produite. Certaines donnée on cependant peut être été bien supprimée")
}