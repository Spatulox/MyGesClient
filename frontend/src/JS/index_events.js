
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
    const connectionField = document.getElementById("username").style.display || "noexist"

    if(connectionField === "none"){
        if(!password){
            popup("Le mot de passe ne doit pas être vide")
            return
        }
    } else {
        if(!username || !password){
            popup("Les deux champs doivent être rempli")
            return
        }
    }

    const still = stillPopup("Verifying infos")
    try{
        const user = await GetRegisteredUsers()
        if(user){
            try{
                if( connectionField === "none"){
                    console.log("Connect user")
                    const selectedUser = document.getElementById("selectConnectionSelect")
                    const selectedText = selectedUser.options[selectedUser.selectedIndex].text;
                    const {user, err} = await ConnectUser(selectedText, password)
                    if(err){
                       popup("Une erreur s'est produit")
                       return
                    }

                } else {
                    console.log("update password")
                    console.log("Update the password user")
                    if(await UpdateUserPassword(username, password)){
                        popup("Mot de passe mis à jour")
                        document.getElementById("buttonConnection").value = "Créer un compte"
                    }
                }

            } catch (e) {
                stopStillPopup(still)
                popup(e)
                return
            }

        } else {
            console.log("Creater User")
            // Vérify and create the user
            const message = await VerifyUser(username, password);
            popup(JSON.parse(message).message)
        }
        stopStillPopup(still)

    } catch (err){
        stopStillPopup(still)
        popup(err)
        return
    }

    buttonCancelConnection.style.visibility = "visible"
    const connection = document.getElementById('connection')
    connection.classList.remove("active")
    start()
    username.value = ""
    password.value = ""
});

buttonCancelConnection.addEventListener('click', function() {
    const connection = document.getElementById('connection')
    connection.classList.remove("active")

})

// ------------ Popup events -------------- //

async function eulaShow(){
    const eula = document.getElementById('eula')
    eula.classList.add('active')
}

async function changeLoginPassword(button = true){
    document.getElementById("username").value = ""
    document.getElementById("password").value = ""
    const selct = document.getElementById("selectConnectionSelect")
    if(button){
        document.getElementById("buttonConnection").value = "Modifier le mot de passe"
        document.getElementById("username").style.display = ""
        if(selct){
            selct.style.display = "none"
        }
    } else {
        if(selct){
            selct.style.display = "inherit"
        }
    }
    const connection = document.getElementById('connection')
    connection.classList.add('active')
}

async function deconnectionFromMyges(){
    try{
        await DeconnectUser()
    } catch (e) {
        console.log(e)
        popup("Impossible de vous déconnecter")
        return
    }
    document.getElementById("buttonConnection").value = "Créer un compte"
    document.getElementById("username").value = ""
    document.getElementById("password").value = ""
    loadPage("cya")

    let users
    try{
        users = await GetRegisteredUsers()
    } catch (e) {
        console.log(e)
    }

    console.log(users)
    console.log("yeeeeeeeete")
    if (users && users.length > 0) {
        console.log("yeeeeeeeete")
        createSelectUserDeco(users)
    }

    changeLoginPassword(false)
}

async function deleteOldData(){
    popup("Under contruction")
}

function createSelectUserDeco(users){
    try{
        console.log("tttttttttttttttt")
        const connexionSelectField = document.getElementById("connexionSelect")
        let select = document.getElementById("selectConnectionSelect")
        if(select){
            select.remove()

        }
        select = document.createElement("select");
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
    } catch (e) {
        console.log(e)
    }
}