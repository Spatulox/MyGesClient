import {
    GetDiscordRPC,
    GetUserData,
    IsPasswordStoredInClear,
    SetDiscordRPC
} from "../../wailsjs/go/backend/App";
import { popup } from "../JS/popups";

function discordToggle(): HTMLInputElement | null {
    return document.getElementById("discordRPC-toggle") as HTMLInputElement | null;
}

// Wires the privacy settings, once at startup
export function initPrivacySettings(): void {
    discordToggle()?.addEventListener("change", async (e) => {
        const toggle = e.target as HTMLInputElement;
        const enabled = toggle.checked;
        toggle.disabled = true;
        try {
            await SetDiscordRPC(enabled);
            popup(enabled
                ? "MyGesClient est affiché dans votre statut Discord"
                : "MyGesClient n'est plus affiché dans votre statut Discord");
        } catch (err) {
            console.error(err);
            toggle.checked = !enabled;
            popup("Impossible de modifier le paramètre Discord");
        } finally {
            toggle.disabled = false;
        }
    });
}

// Shows the current values, each time the page is opened (the account may
// have changed)
export async function loadPrivacySettings(): Promise<void> {
    const toggle = discordToggle();
    if (toggle) {
        try {
            toggle.checked = await GetDiscordRPC();
        } catch (err) {
            console.error(err);
        }
    }

    const storage = document.getElementById("passwordStorage");
    if (storage) {
        try {
            storage.textContent = await IsPasswordStoredInClear()
                ? "Base locale (non chiffré)"
                : "Trousseau du système";
        } catch (err) {
            console.error(err);
            storage.textContent = "Inconnu";
        }
    }
}

// Accounts already warned during this session
const warnedAccounts = new Set<string>();

/**
 * Warns once per account and per session when its password is stored in
 * clear text in the local database: no OS keyring was available (a Linux
 * desktop without Secret Service).
 */
export async function warnIfPasswordStoredInClear(): Promise<void> {
    try {
        const user = await GetUserData();
        if (!user?.Username || warnedAccounts.has(user.Username)) {
            return;
        }
        if (await IsPasswordStoredInClear()) {
            warnedAccounts.add(user.Username);
            popup("Aucun trousseau système trouvé : votre mot de passe MyGes est enregistré "
                + "sans chiffrement sur cet ordinateur. Installez gnome-keyring, KWallet ou "
                + "KeePassXC puis relancez l'application pour le protéger.");
        }
    } catch (err) {
        console.error(err);
    }
}
