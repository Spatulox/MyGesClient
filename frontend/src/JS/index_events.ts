// ------------------------------------------------------------------ //
// Functions

import { popup, stillPopup, stopStillPopup } from "./popups";
import {
    changeLoginButtonName,
    closeConnexion,
    hideConnectionError,
    shakeConnexion,
    showConnectionError
} from "./login-register";
import {
    ConnectUser,
    DeleteOldData,
    UpdateUserEula,
    UpdateUserPassword,
    UpdateUserTheme,
    VerifyUser
} from "../../wailsjs/go/backend/App";
import { start } from "./start";

// ------------------------------------------------------------------ //
// Listener

const lightDark = document.getElementsByClassName('themeLightDark');
const body = document.getElementsByTagName('body')[0] as HTMLElement;
const buttonEula = document.getElementById('buttonEula') as HTMLElement | null;
const buttonSoftwareInfo = document.getElementById('buttonSoftwareInfo') as HTMLElement | null;

const buttonConnection = document.getElementById('buttonConnection') as HTMLElement | null;
const buttonCancelConnection = document.getElementById('buttonCancelConnection') as HTMLElement | null;

const encryptBtn = document.getElementById("encrypt-btn") as HTMLElement | null;

// ------------ Theme events -------------- //
Array.from(lightDark).forEach((theme) => {
    theme.addEventListener('click', async function () {
        const newTheme = body.classList.contains('light') ? 'dark' : 'light';
        try {
            await UpdateUserTheme(newTheme);
        } catch (e: any) {
            console.log(e);
            popup(e?.toString?.() ?? String(e));
            popup("Impossible de sauvegarder votre thème choisi");
        }

        body.classList.toggle('light');
        body.classList.toggle('dark');

        Array.from(lightDark).forEach((img) => {
            if (img.classList.contains(newTheme)) {
                (img as HTMLElement).style.display = "block";
            } else {
                (img as HTMLElement).style.display = "none";
            }
        });
    });
});

buttonEula?.addEventListener('click', async function () {
    try {
        const eula = document.getElementById('eula') as HTMLElement | null;
        await UpdateUserEula();
        eula?.classList.remove('active');
    } catch (e: any) {
        console.log(e);
        popup(e?.toString?.() ?? String(e));
    }
});

buttonSoftwareInfo?.addEventListener('click', async function () {
    try {
        const softwareInfo = document.getElementById('softwareInfo') as HTMLElement | null;
        softwareInfo?.classList.remove('active');
    } catch (e: any) {
        console.log(e);
        popup(e?.toString?.() ?? String(e));
    }
});

buttonConnection?.addEventListener("click", async function () {
    const usernameInput = document.getElementById("username") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;
    const selectConnexion = document.getElementsByClassName("select-selected")[0] as HTMLElement | undefined;
    const selectUser = selectConnexion ? selectConnexion.innerHTML.trim() : "";

    const loginBtn = document.getElementById('buttonConnection') as HTMLElement | null;
    const oldInnerHtmlLoginBtn = loginBtn ? loginBtn.innerHTML : "Se connecter";

    loadingConnectionButton(oldInnerHtmlLoginBtn);

    if (selectConnexion && selectConnexion.style.display !== "none") {
        if (selectUser === "Créer un compte") {
            // Créer un compte
            console.log("Créer un compte");
            if (!usernameInput?.value || !passwordInput?.value) {
                showConnectionError("Le nom d'utilisateur et le mot de passe doivent être rempli");
                shakeConnexion();
                loadingConnectionButton(oldInnerHtmlLoginBtn, false);
                return;
            }
            const still = stillPopup("Verifying infos");
            try {
                const message = await VerifyUser(usernameInput.value, passwordInput.value);
                popup(JSON.parse(message).message);
            } catch (e: any) {
                console.log(e);
                showConnectionError(e?.toString?.() ?? String(e));
                shakeConnexion();
                stopStillPopup(still);
                loadingConnectionButton(oldInnerHtmlLoginBtn, false);
                return;
            }
            stopStillPopup(still);
        } else {
            // Se connecter
            console.log("Connexion");
            if (!passwordInput?.value) {
                showConnectionError("Le mot de passe doit être rempli");
                shakeConnexion();
                loadingConnectionButton(oldInnerHtmlLoginBtn, false);
                return;
            }
            const still = stillPopup("Verifying infos");
            try {
                await ConnectUser(selectUser, passwordInput.value);
                //closeConnexion()
            } catch (e: any) {
                console.log(e);
                showConnectionError("Une erreur s'est produite");
                shakeConnexion();
                stopStillPopup(still);
                loadingConnectionButton(oldInnerHtmlLoginBtn, false);
                return;
            }
            stopStillPopup(still);
        }
        closeConnexion();
        start();
    } else {
        // Update le mot de passe
        console.log("Update the password user");
        if (!usernameInput?.value || !passwordInput?.value) {
            showConnectionError("Le nom d'utilisateur et le mot de passe doivent être rempli");
            shakeConnexion();
            loadingConnectionButton(oldInnerHtmlLoginBtn, false);
            return;
        }
        try {
            if (await UpdateUserPassword(usernameInput.value, passwordInput.value)) {
                popup("Mot de passe mis à jour");
            }
        } catch (e: any) {
            console.log(e);
            showConnectionError(e?.toString?.() ?? String(e));
            shakeConnexion();
            loadingConnectionButton(oldInnerHtmlLoginBtn, false);
            return;
        }
        closeConnexion();
    }
    hideConnectionError();
    loadingConnectionButton(oldInnerHtmlLoginBtn, false);
});

buttonCancelConnection?.addEventListener('click', function () {
    closeConnexion();
});

encryptBtn?.addEventListener("click", () => {
    const encryptInput = document.getElementById('encrypt-input');
    popup("Under construction");
});

function loadingConnectionButton(oldInnerHtmlLoginBtn: string, bool: boolean = true): void {
    if (bool) {
        changeLoginButtonName("Loading...");
    } else {
        changeLoginButtonName(oldInnerHtmlLoginBtn);
    }
}

// ------------ Popup events -------------- //

export async function eulaShow(): Promise<void> {
    const eula = document.getElementById('eula') as HTMLElement | null;
    if (eula) {
        eula.classList.add('active');
    }
}

export async function showAppInfos(): Promise<void> {
    const softwareInfo = document.getElementById('softwareInfo') as HTMLElement | null;
    if (softwareInfo) {
        softwareInfo.classList.add('active');
    }
}

export async function deleteOldData(): Promise<void> {
    if (await DeleteOldData()) {
        popup("Supression réussie !");
        return;
    }
    popup("Une erreur c'est produite. Certaines donnée ont cependant peut-être été bien supprimées");
}