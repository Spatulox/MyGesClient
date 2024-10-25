import {loadPageGo} from "./loadPages";
import {popup} from "./popups";
import {DeconnectUser, GetRegisteredUsers} from "../../wailsjs/go/backend/App";

let loginContainer
let bgConnexion

document.addEventListener('DOMContentLoaded', () => {
    loginContainer = document.getElementsByClassName('login-container')[0]
    bgConnexion =document.getElementsByClassName("bg-connexion")[0]
    //initializeDropDownMenu()
})

export function initializeDropDownMenu(){
    console.log("Initialize drop down menu")
    const customSelect = document.querySelector('.custom-select');
    const selectSelected = customSelect.querySelector('.select-selected');
    const selectItems = customSelect.querySelector('.select-items');

    function toggleSelect(e) {
        e.stopPropagation();
        selectItems.classList.toggle('select-hide');
        this.classList.toggle('select-arrow-active');
    }

    selectSelected.removeEventListener("click", toggleSelect)
    selectSelected.addEventListener("click", toggleSelect)

    function handleItemClick(e) {
        if (this.innerHTML !== "Créer un compte") {
            showUsernameField(false);
            changeLoginButtonName("Se connecter");
            changeTitle("Se connecter");
        } else {
            changeLoginButtonName("Créer un compte");
            changeTitle("Créer un compte");
            showUsernameField();
        }

        e.stopPropagation();
        selectSelected.innerHTML = this.innerHTML;
        selectItems.classList.add('select-hide');
        selectSelected.classList.remove('select-arrow-active');
    }

    function handleOutsideClick() {
        selectItems.classList.add('select-hide');
        selectSelected.classList.remove('select-arrow-active');
    }

    selectItems.querySelectorAll('div').forEach(item => {
        item.removeEventListener('click', handleItemClick);
        item.addEventListener('click', handleItemClick);
    });

    document.removeEventListener('click', handleOutsideClick);
    document.addEventListener('click', handleOutsideClick);
}

export async function changeLoginPassword(button = true){
    changeTitle("Modifier le mot de passe")
    changeLoginButtonName("Modifier")
    showDropDownMenu(false)
    hideConnectionError()
    showButtonCancelConnection()
    showUsernameField()
    openConnexion()
}

export async function deconnectionFromMyges(){
    console.log("Déconnexion")
    try{
        await DeconnectUser()
    } catch (e) {
        console.log(e)
        popup("Impossible de vous déconnecter")
        return
    }

    changeTitle("Créer un compte")
    changeLoginButtonName("Créer un compte")
    showDropDownMenu(true)
    showButtonConnection()
    showButtonCancelConnection()

    document.getElementById("username").value = ""
    document.getElementById("password").value = ""

    console.log("Starting the connexion form")

    let users
    try{
        users = await GetRegisteredUsers()
    } catch (e) {
        console.log(e)
        popup("Une erreur est survenue : "+e.toString())
        return
    }

    if (users && users.length > 0) {
        createDropDownMenu(users)
    }

    openConnexion()
    loadPageGo("cya")
    initializeDropDownMenu()
}

export function openConnexion(){
    loginContainer.classList.remove("goesUp")
    loginContainer.classList.add("activeAnim")
    bgConnexion.classList.add("active")
    setTimeout(()=>{
        loginContainer.classList.add("active")
        loginContainer.classList.remove("activeAnim")
    }, 1500)
}

export function closeConnexion(){
    loginContainer.classList.add("goesUp")
    bgConnexion.classList.remove("active")
    setTimeout(()=>{
        loginContainer.classList.remove("active")
    }, 500)
    clearConnectionForm()
}

export function shakeConnexion(){
    loginContainer.classList.add("shake")
    setTimeout(()=>{
        loginContainer.classList.remove("shake")
    }, 500)
}

export function changeTitle(title){
    const connexionTitle = document.getElementById("connexion-title")
    connexionTitle.innerHTML = title
    changeLoginButtonName(title)
    changeDefaultSelected(title)
}

function changeDefaultSelected(title){
    const defaultSelected = document.getElementsByClassName("select-selected")[0]
    defaultSelected.innerHTML = title
    changeLoginButtonName(title)
}


export function changeLoginButtonName(name){
    const loginBtn = document.getElementById('buttonConnection');
    loginBtn.value = name
    loginBtn.innerHTML = name
}

export function showDropDownMenu(bool = true){
    const dropDown = document.getElementsByClassName("select-selected")[0]

    if(bool){
        dropDown.style.display = "block"
        return
    }
    dropDown.style.display = "none"
}

export function showConnectionError(error){
    const connexion_error = document.getElementById("connexion_error")
    connexion_error.innerHTML = error
    connexion_error.style.display = "block"
}

export function showButtonConnection(bool = true){
    const button = document.getElementById("buttonConnection")
    if(bool){
        button.style.display = "block"
        return
    }
    button.style.display = "none"
}

export function showButtonCancelConnection(bool = true){
    const button = document.getElementById("buttonCancelConnection")
    if(bool){
        button.style.display = "block"
        return
    }
    button.style.display = "none"
}

export function hideConnectionError(){
    const connexion_error = document.getElementById("connexion_error")
    connexion_error.innerHTML = ""
    connexion_error.style.display = "none"
}

export function showUsernameField(bool = true){
    const username = document.getElementById("username")
    const usernameLabel = document.getElementById("username-label")
    if(bool){
        username.style.display = "block"
        usernameLabel.style.display = "block"
        return
    }
    usernameLabel.style.display = "none"
    username.style.display = "none"
}

export function createDropDownMenu(users){
    const connexionSelectField = document.getElementById("select-connexion")

    connexionSelectField.innerHTML = "<div>Créer un compte</div>"

    users.forEach(user => {
        const div = document.createElement("div");
        div.value = user.ID;
        div.innerHTML = user.Username;
        connexionSelectField.appendChild(div);
    });

    initializeDropDownMenu()
    showDropDownMenu(true)

}

export function clearConnectionForm(){
    const username = document.getElementById("username")
    const password = document.getElementById("password")
    username.value = ""
    password.value = ""
}