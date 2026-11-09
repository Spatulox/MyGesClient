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

type PageDefinition = {
    title: string;
    load?: () => Promise<void>;
};

// Every page: its title (header and Discord status) and how to load it
const PAGES: Record<string, PageDefinition> = {
    dashboard: { title: "Accueil", load: () => dashboard() },
    schedule: { title: "Agenda", load: () => schedule() },
    grades: { title: "Notes", load: () => grades() },
    absences: { title: "Absences", load: () => absences() },
    courses: { title: "Cours", load: () => courses() },
    projects: { title: "Projets", load: () => projects() },
    events: { title: "Évènements", load: () => events() },
    account: { title: "Compte", load: () => account() },
    softwareAccount: { title: "Compte" },
    credits: { title: "Crédit" },
};

const DEFAULT_PAGE: PageDefinition = { title: "Accueil" };

export async function loadPageGo(pageName: string): Promise<void> {
    if (!isPossibleToSwitchTabs) {
        return;
    }

    const pageId = pageName.split(".html")[0];
    const page = PAGES[pageId] ?? DEFAULT_PAGE;

    try {
        // Masquer l'ancienne page
        if (leDocToShow) {
            leDocToShow.style.display = "none";
        }
        // Afficher la nouvelle page
        leDocToShow = document.getElementById(pageId);
        if (leDocToShow) {
            leDocToShow.style.display = "inherit";
        }

        renameMainTitle(page.title);
        await page.load?.();
    } catch (e) {
        console.log(e);
    }

    try {
        await UpdateDiscordRPC("Unofficial MyGes Client", page.title);
    } catch (e) {
        console.log(e);
    }
}
