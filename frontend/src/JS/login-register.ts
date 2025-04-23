import { loadPageGo, setIsPossibleToSwitchTabs } from "./loadPages";
import { popup } from "./popups";
import { DeconnectUser, GetRegisteredUsers } from "../../wailsjs/go/backend/App";

// Types
type User = {
    ID: number;
    Username: string;
    Password: string;
    Theme: string;
    EULA: boolean;
    Year: string;
}

// Variables globales typées
let loginContainer: HTMLElement | null;
let bgConnexion: HTMLElement | null;

document.addEventListener('DOMContentLoaded', () => {
    loginContainer = document.getElementsByClassName('login-container')[0] as HTMLElement | undefined || null;
    bgConnexion = document.getElementsByClassName("bg-connexion")[0] as HTMLElement | undefined || null;
});

export function showUsernameField(bool: boolean = true): void {
    const username = document.getElementById("username") as HTMLElement | null;
    const usernameLabel = document.getElementById("username-label") as HTMLElement | null;
    if (!username || !usernameLabel) return;
    if (bool) {
        username.style.display = "block";
        usernameLabel.style.display = "block";
        return;
    }
    usernameLabel.style.display = "none";
    username.style.display = "none";
}

function toggleSelect(this: HTMLElement, e: Event): void {
    const customSelect = document.querySelector('.custom-select') as HTMLElement | null;
    if (!customSelect) return;
    const selectItems = customSelect.querySelector('.select-items') as HTMLElement | null;
    if (!selectItems) return;
    e.stopPropagation();
    selectItems.classList.toggle('select-hide');
    this.classList.toggle('select-arrow-active');
}

export function initializeDropDownMenu(): void {
    console.log("Initialize drop down menu");
    const customSelect = document.querySelector('.custom-select') as HTMLElement | null;
    if (!customSelect) return;
    const selectSelected = customSelect.querySelector('.select-selected') as HTMLElement | null;
    const selectItems = customSelect.querySelector('.select-items') as HTMLElement | null;
    if (!selectSelected || !selectItems) return;

    selectSelected.removeEventListener("click", toggleSelect as EventListener);
    selectSelected.addEventListener("click", toggleSelect as EventListener);

    function handleItemClick(this: HTMLElement, e: Event): void {
        if (this.innerHTML !== "Créer un compte") {
            showUsernameField(false);
            changeLoginButtonName("Se connecter");
            changeTitle("Se connecter");
        } else {
            changeLoginButtonName("Créer un compte");
            changeTitle("Créer un compte");
            showUsernameField(true);
        }

        e.stopPropagation();
        selectSelected!.innerHTML = this.innerHTML;
        selectItems!.classList.add('select-hide');
        selectSelected!.classList.remove('select-arrow-active');
    }

    function handleOutsideClick(): void {
        selectItems!.classList.add('select-hide');
        selectSelected!.classList.remove('select-arrow-active');
    }

    selectItems.querySelectorAll('div').forEach(item => {
        item.removeEventListener('click', handleItemClick as EventListener);
        item.addEventListener('click', handleItemClick as EventListener);
    });

    document.removeEventListener('click', handleOutsideClick as EventListener);
    document.addEventListener('click', handleOutsideClick as EventListener);
}

export async function changeLoginPassword(button: boolean = true): Promise<void> {
    changeTitle("Modifier le mot de passe");
    changeLoginButtonName("Modifier");
    showDropDownMenu(false);
    hideConnectionError();
    showButtonCancelConnection();
    showUsernameField();
    await openConnexion();
}

export async function deconnectionFromMyges(): Promise<void> {
    loadPageGo("cya");
    console.log("Déconnexion");
    setIsPossibleToSwitchTabs(false);
    const message_cya = document.getElementById("message-cya") as HTMLElement | null;
    if (message_cya) message_cya.innerText = "Stopping app";
    try {
        await DeconnectUser();
        if (message_cya) message_cya.innerText = "Launching app";
    } catch (e) {
        console.log(e);
        popup("Impossible de vous déconnecter");
        loadPageGo("softwareAccount");
        setIsPossibleToSwitchTabs(true);
        return;
    }

    changeTitle("Créer un compte");
    changeLoginButtonName("Créer un compte");
    showDropDownMenu(true);
    showButtonConnection();
    showButtonCancelConnection(false);

    const username = document.getElementById("username") as HTMLInputElement | null;
    const password = document.getElementById("password") as HTMLInputElement | null;
    if (username) username.value = "";
    if (password) password.value = "";

    console.log("Starting the connexion form");

    await openConnexion();
    setIsPossibleToSwitchTabs(true);
}

export async function openConnexion(): Promise<void> {
    try {
        const users: User[] = await GetRegisteredUsers();
        if (users && users.length > 0) {
            createDropDownMenu(users);
        }
    } catch (e) {
        console.log(e);
    }

    if (loginContainer && bgConnexion) {
        loginContainer.classList.remove("goesUp");
        loginContainer.classList.add("activeAnim");
        bgConnexion.classList.add("active");
        setTimeout(() => {
            loginContainer?.classList.add("active");
            loginContainer?.classList.remove("activeAnim");
        }, 1500);
    }
}

export function closeConnexion(): void {
    if (loginContainer && bgConnexion) {
        loginContainer.classList.add("goesUp");
        bgConnexion.classList.remove("active");
        setTimeout(() => {
            loginContainer?.classList.remove("active");
        }, 500);
        clearConnectionForm();
    }
}

export function shakeConnexion(): void {
    if (loginContainer) {
        loginContainer.classList.add("shake");
        setTimeout(() => {
            loginContainer?.classList.remove("shake");
        }, 500);
    }
}

export function changeTitle(title: string): void {
    const connexionTitle = document.getElementById("connexion-title");
    if (connexionTitle) {
        connexionTitle.innerHTML = title;
    }
    changeLoginButtonName(title);
    changeDefaultSelected(title);
}

function changeDefaultSelected(title: string): void {
    const defaultSelected = document.getElementsByClassName("select-selected")[0] as HTMLElement | undefined;
    if (defaultSelected) {
        defaultSelected.innerHTML = title;
        changeLoginButtonName(title);
    }
}

export function changeLoginButtonName(name: string): void {
    const loginBtn = document.getElementById('buttonConnection') as HTMLInputElement | HTMLButtonElement | null;
    if (loginBtn) {
        if ('value' in loginBtn) loginBtn.value = name;
        loginBtn.innerHTML = name;
    }
}

export function showDropDownMenu(bool: boolean = true): void {
    const dropDown = document.getElementsByClassName("select-selected")[0] as HTMLElement | undefined;
    if (!dropDown) return;
    dropDown.style.display = bool ? "block" : "none";
}

export function showConnectionError(error: string): void {
    const connexion_error = document.getElementById("connexion_error") as HTMLElement | null;
    if (connexion_error) {
        connexion_error.innerHTML = error;
        connexion_error.style.display = "block";
    }
}

export function showButtonConnection(bool: boolean = true): void {
    const button = document.getElementById("buttonConnection") as HTMLElement | null;
    if (button) button.style.display = bool ? "block" : "none";
}

export function showButtonCancelConnection(bool: boolean = true): void {
    const button = document.getElementById("buttonCancelConnection") as HTMLElement | null;
    if (button) button.style.display = bool ? "block" : "none";
}

export function hideConnectionError(): void {
    const connexion_error = document.getElementById("connexion_error") as HTMLElement | null;
    if (connexion_error) {
        connexion_error.innerHTML = "";
        connexion_error.style.display = "none";
    }
}

export function createDropDownMenu(users: User[]): void {
    const connexionSelectField = document.getElementById("select-connexion") as HTMLElement | null;
    if (!connexionSelectField) return;

    connexionSelectField.innerHTML = "<div>Créer un compte</div>";

    users.forEach(user => {
        const div = document.createElement("div");
        (div as any).value = user.ID; // value n'existe pas sur div, mais utilisé dans le code original
        div.innerHTML = user.Username;
        connexionSelectField.appendChild(div);
    });
    showDropDownMenu(true);
    showUsernameField(true);
    initializeDropDownMenu();
}

export function clearConnectionForm(): void {
    const username = document.getElementById("username") as HTMLInputElement | null;
    const password = document.getElementById("password") as HTMLInputElement | null;
    if (username) username.value = "";
    if (password) password.value = "";
}
