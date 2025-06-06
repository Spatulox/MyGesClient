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
                renameMainTitle("Compte");
                await account();
                break;
            case 'softwareAccount':
                renameMainTitle("Compte");
                break;
            case 'courses':
                renameMainTitle("Cours");
                await courses();
                break;
            case 'dashboard':
                renameMainTitle("Accueil");
                await dashboard();
                break;
            case 'events':
                renameMainTitle("Évènements");
                await events();
                break;
            case 'grades':
                renameMainTitle("Notes");
                await grades();
                break;
            case 'schedule':
                renameMainTitle("Agenda");
                await schedule();
                break;
            case 'projects':
                renameMainTitle("Projets");
                await projects();
                break;
            case 'absences':
                renameMainTitle("Absences");
                await absences();
                break;
            case 'credits':
                renameMainTitle("Crédit");
                await absences();
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