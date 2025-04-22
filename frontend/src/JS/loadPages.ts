// Normal functions
import { capitalizeFirstLetter } from "./functions";

// GO functions
import { UpdateDiscordRPC } from "../../wailsjs/go/backend/App";

// Page Functions
import { dashboard } from "../JS-Page/dashbord";
import { schedule } from "../JS-Page/schedule";
import { grades } from "../JS-Page/grades";
import { events } from "../JS-Page/events";
import { account } from "../JS-Page/account";
import { courses } from "../JS-Page/courses";
import { absences } from "../JS-Page/absences";
import { projects } from "../JS-Page/projects";

let leDocToShow: HTMLElement | null = document.getElementById("weirdPlace");
let isPossibleToSwitchTabs = true;

function renameMainTitle(str: string): void {
    const headerTitle = document.getElementById("headerTitle");
    if (headerTitle) {
        headerTitle.innerText = str;
    }
}

export async function setIsPossibleToSwitchTabs(value: boolean): Promise<void> {
    isPossibleToSwitchTabs = value;
}

export async function loadPageGo(pageName: string, event?: Event): Promise<void> {
    if (!isPossibleToSwitchTabs) {
        return;
    }

    let currPage: string = "Accueil";
    try {
        // Récupération du texte du bouton cliqué, ou "Accueil" par défaut
        const srcElement = (event?.target as HTMLElement) || null;
        if (srcElement && srcElement.innerText) {
            currPage = capitalizeFirstLetter(srcElement.innerText);
        }

        // Masquer l'ancienne page
        if (leDocToShow) {
            leDocToShow.style.display = "none";
        }
        // Afficher la nouvelle page
        const pageId = pageName.split(".html")[0];
        leDocToShow = document.getElementById(pageId);
        if (leDocToShow) {
            leDocToShow.style.display = "inherit";
        }

        await updatePages(pageId);
    } catch (e) {
        console.log(e);
    }

    try {
        await UpdateDiscordRPC("Unofficial MyGes Client", currPage);
    } catch (e) {
        console.log(e);
    }
}

async function updatePages(page: string): Promise<void> {
    try {
        switch (page) {
            case 'account':
                await account();
                renameMainTitle("Compte");
                break;
            case 'softwareAccount':
                renameMainTitle("Compte");
                break;
            case 'courses':
                await courses();
                renameMainTitle("Cours");
                break;
            case 'dashboard':
                await dashboard();
                renameMainTitle("Accueil");
                break;
            case 'events':
                await events();
                renameMainTitle("Évènements");
                break;
            case 'grades':
                await grades();
                renameMainTitle("Notes");
                break;
            case 'schedule':
                await schedule();
                renameMainTitle("Agenda");
                break;
            case 'projects':
                await projects();
                renameMainTitle("Projets");
                break;
            case 'absences':
                await absences();
                renameMainTitle("Absences");
                break;
            case 'credits':
                await absences();
                renameMainTitle("Crédit");
                break;
            default:
                renameMainTitle("Accueil");
                //console.log("Default option in switch case when loading page ??")
                break;
        }
    } catch (e) {
        console.log(e);
    }
}