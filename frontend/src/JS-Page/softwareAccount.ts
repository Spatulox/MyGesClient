import {
    GetBackgroundService,
    GetBackgroundServiceSupported,
    GetUserData,
    SetBackgroundService,
    UpdateReminderMinutes
} from "../../wailsjs/go/backend/App";
import { popup } from "../JS/popups";

const DEFAULT_REMINDER_MINUTES = 15;

function reminderSelect(): HTMLSelectElement | null {
    return document.getElementById("reminderMinutes-select") as HTMLSelectElement | null;
}

function backgroundServiceToggle(): HTMLInputElement | null {
    return document.getElementById("backgroundService-toggle") as HTMLInputElement | null;
}

// Wires the reminder settings, once at startup
export function initReminderSettings(): void {
    reminderSelect()?.addEventListener("change", async (e) => {
        const select = e.target as HTMLSelectElement;
        try {
            await UpdateReminderMinutes(parseInt(select.value, 10));
            popup("Délai de rappel enregistré");
        } catch (err) {
            console.error(err);
            popup("Impossible d'enregistrer le délai de rappel");
            await loadReminderSettings();
        }
    });

    backgroundServiceToggle()?.addEventListener("change", async (e) => {
        const toggle = e.target as HTMLInputElement;
        const enabled = toggle.checked;
        toggle.disabled = true;
        try {
            await SetBackgroundService(enabled);
            popup(enabled
                ? "Les rappels fonctionneront aussi quand l'application est fermée"
                : "Service de rappels désactivé");
        } catch (err) {
            console.error(err);
            toggle.checked = !enabled;
            popup("Impossible de modifier le service de rappels");
        } finally {
            toggle.disabled = false;
        }
    });
}

// Shows the current values, each time the page is opened (the autostart entry
// can also be removed from the settings of the OS)
export async function loadReminderSettings(): Promise<void> {
    const select = reminderSelect();
    if (select) {
        try {
            const user = await GetUserData();
            const minutes = user?.ReminderMinutes ?? DEFAULT_REMINDER_MINUTES;
            select.value = String(minutes);
            if (select.value !== String(minutes)) {
                // A value without option: keep it selectable
                select.add(new Option(`${minutes} min avant`, String(minutes), true, true));
            }
        } catch (err) {
            console.error(err);
        }
    }

    const row = document.getElementById("backgroundService-row") as HTMLElement | null;
    const toggle = backgroundServiceToggle();
    try {
        const supported = await GetBackgroundServiceSupported();
        if (row) row.style.display = supported ? "" : "none";
        if (supported && toggle) {
            toggle.checked = await GetBackgroundService();
        }
    } catch (err) {
        console.error(err);
    }
}

export async function softwareAccount(): Promise<void> {
    await loadReminderSettings();
}
