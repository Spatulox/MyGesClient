import {
    GetUserData,
    InitDiscordRPC,
    GetStartupStatus
} from "../../wailsjs/go/backend/App";
import { loadPageGo } from "./loadPages";
import { initCreateEvent, loadEventPresets } from "./createEvents";

import { popup, stillPopup, stopStillPopup } from './popups';
import {
    changeLoginButtonName, changeLoginPassword,
    changeTitle,
    deconnectionFromMyges,
    openConnexion,
    showButtonCancelConnection
} from "./login-register";
import { hasCommonClass } from "./functions";
import { deleteOldData, eulaShow, showAppInfos } from "./index_events";
import { grades } from "../JS-Page/grades";
import { absences } from "../JS-Page/absences";
import { account } from "../JS-Page/account";
import { events } from "../JS-Page/events";
import { courses } from "../JS-Page/courses";
import { changeWeek, hideScheduleButtons, schedule, showScheduleButtons } from "../JS-Page/schedule";
import { projects } from "../JS-Page/projects";

let initializedStart = false;

const StartupStatus = {
    StatusNotStarted: 0,
    StatusInProgress: 1,
    StatusIncompleteNoUsers: 2,
    StatusIncompleteNoInternet: 3,
    StatusCompleted: 4,
    StatusFailed: 5
} as const;

type StartupStatusType = typeof StartupStatus[keyof typeof StartupStatus];

Object.freeze(StartupStatus);

export async function start(): Promise<void> {
    if (!initializedStart) {
        await initializeLoadPage();
        await initCreateEvent();
        await initializeCredits();
        await initializeSoftwareAccount();
        await initializeSchedulePart();
        initializedStart = true;
    }

    const laStill = stillPopup("Login...");
    try {
        const user = await GetUserData();
        if (!user || !user.Username) {
            changeTitle("Créer un compte");
            changeLoginButtonName("Créer un compte");
            showButtonCancelConnection(false);

            await openConnexion();
            stopStillPopup(laStill);
            return;
        }
        // Presets belong to the user: load them only once we know there is one
        await loadEventPresets();

        // Check if the eula is accepted
        if (!user.EULA) {
            const eula = document.getElementById('eula');
            if (eula) eula.classList.add('active');
        }

        // Apply the theme
        const theme = document.getElementsByTagName('body')[0] as HTMLElement;
        const themeImg = document.getElementsByClassName('themeLightDark');
        if (user.Theme) {
            theme.className = user.Theme;
        }

        Array.from(themeImg).forEach((th) => {
            if (hasCommonClass(theme, th)) {
                (th as HTMLElement).style.display = "block";
            } else {
                (th as HTMLElement).style.display = "none";
            }
        });

        try {
            await connectDiscord();
            await loadPageGo("dashboard.html");

            // Need to wait the full start of the app (bounded: the backend could stay stuck)
            const STARTUP_TIMEOUT_MS = 60_000;
            const waitStart = Date.now();
            let status: StartupStatusType = await GetStartupStatus();
            while (status === StartupStatus.StatusInProgress && Date.now() - waitStart < STARTUP_TIMEOUT_MS) {
                await new Promise(resolve => setTimeout(resolve, 100));
                status = await GetStartupStatus();
            }
            if (status === StartupStatus.StatusInProgress) {
                popup("Le démarrage prend plus de temps que prévu, certaines pages peuvent être incomplètes");
            }
            await initAllPages(status);
        } catch (e: any) {
            console.log(e);
            popup(e?.toString?.() ?? String(e));
        }

    } catch (error: any) {
        console.error("Erreur lors de la récupération des données utilisateur :", error);
        stopStillPopup(laStill);
        return;
    }
    stopStillPopup(laStill);
}

async function initAllPages(startingStatus: StartupStatusType = 0): Promise<void> {
    schedule();
    switch (startingStatus) {
        case StartupStatus.StatusCompleted:
            await projects();
            await account();
            await courses();
        // fallthrough
        case StartupStatus.StatusIncompleteNoInternet:
            await grades();
            await events();
            await absences();
        // fallthrough
        default:
            break;
    }
}

async function connectDiscord(): Promise<void> {
    try {
        await InitDiscordRPC();
        console.log("Discord RPC initialized");
    } catch (error) {
        console.error("Failed to initialize Discord RPC:", error);
    }
}

start()
    .then(() => {
        console.log("Frontend Started");
    });

async function initializeLoadPage(): Promise<void> {
    const loadingPageButton = document.getElementsByClassName("loadPage");
    const modal = document.getElementById('modal-event') as HTMLElement | null;

    Array.from(loadingPageButton).forEach((button) => {
        button.addEventListener("click", async (event: Event) => {
            if (modal) modal.style.display = 'none';

            Array.from(loadingPageButton).forEach((but) => {
                (but as HTMLElement).classList.remove("active");
            });

            (button as HTMLElement).classList.add("active");
            try {
                await loadPageGo((button as HTMLElement).dataset.idpage + "");
            } catch (e) {
                console.log(e);
            }
        });
    });
}

async function initializeCredits(): Promise<void> {
    const eulaShowId = document.getElementById("eulaShow") as HTMLElement | null;
    const softwareInfo = document.getElementById("appVersion") as HTMLElement | null;

    eulaShowId?.addEventListener("click", () => {
        eulaShow();
    });

    softwareInfo?.addEventListener("click", () => {
        console.log("coucou");
        showAppInfos();
    });
}

async function initializeSoftwareAccount(): Promise<void> {
    const changePassword = document.getElementById("changePassword") as HTMLElement | null;
    const deleteOldDataId = document.getElementById("deleteOldData") as HTMLElement | null;
    const deconnectionFromMygesId = document.getElementById("deconnectionFromMyges") as HTMLElement | null;

    changePassword?.addEventListener("click", () => {
        changeLoginPassword();
    });

    deleteOldDataId?.addEventListener("click", () => {
        deleteOldData();
    });

    deconnectionFromMygesId?.addEventListener("click", () => {
        deconnectionFromMyges();
    });
}

async function initializeSchedulePart(): Promise<void> {
    // The course modal (#modal-event) is handled by schedule.ts (setupModal)
    const forceRefreshButton = document.getElementById("force-refresh") as HTMLElement | null;
    const forceNowButton = document.getElementById("force-now") as HTMLElement | null;

    forceRefreshButton?.addEventListener("click", async () => {
        hideScheduleButtons();
        try { await changeWeek(0, true); } catch (e) { console.log(e); }
        showScheduleButtons();
    });

    forceNowButton?.addEventListener("click", async () => {
        hideScheduleButtons();
        try { await schedule(true); } catch (e) { console.log(e); }
        showScheduleButtons();
    });
}
