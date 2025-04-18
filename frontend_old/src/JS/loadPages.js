// Normal functions
import {capitalizeFirstLetter} from "./functions.js";

// GO functions
import {UpdateDiscordRPC} from "../../wailsjs/go/backend/App.js";

// Page Functions
// They are used
import {dashboard} from "../JS-Page/dashbord.js";
import {schedule} from "../JS-Page/schedule.js";
import {grades} from "../JS-Page/grades.js";
import {events} from "../JS-Page/events.js";
import {account} from "../JS-Page/account.js";
import {courses} from "../JS-Page/courses.js";
import {projects} from "../JS-Page/projects.js";
import {absences} from "../JS-Page/absences.js";

let leDocToShow = document.getElementById("weirdPlace")
let isPossibleToSwitchTabs = true

function renameMainTitle(string){
    document.getElementById("headerTitle").innerText = string
}

export async function setIsPossibleToSwitchTabs(value){
    isPossibleToSwitchTabs = value
}

export async function loadPageGo(string, event){
    if(!isPossibleToSwitchTabs){
        return
    }

    let currPage
    try{
        currPage = event?.srcElement.innerText ? event.srcElement.innerText : "Accueil"
        currPage = capitalizeFirstLetter(currPage)
        leDocToShow.style.display = "none"
        leDocToShow = document.getElementById(string.split(".html")[0])
        leDocToShow.style.display = "inherit"
        await updatePages(string.split(".html")[0])
    } catch (e) {
        console.log(e)
    }

    try{
        UpdateDiscordRPC("Unofficial MyGes Client", currPage)
    } catch (e) {
        console.log(e)
    }
}

async function updatePages(pages){
    try{
        switch (pages){
            case 'account':
                await account()
            case 'softwareAccount':
                renameMainTitle("Compte")
                break;
            case 'courses':
                await courses()
                renameMainTitle("Cours")
                break;
            case 'dashboard':
                await dashboard()
                renameMainTitle("Accueil")
                break;
            case 'events':
                await events()
                renameMainTitle("Évènements")
                break;
            case 'grades':
                await grades()
                renameMainTitle("Notes")
                break;
            case 'schedule':
                await schedule()
                renameMainTitle("Agenda")
                break;
            case 'projects' :
                await projects()
                renameMainTitle("Projets")
                break;
            case 'absences' :
                await absences()
                renameMainTitle("Absences")
                break;
            case 'credits' :
                await absences()
                renameMainTitle("Crédit")
                break;
            default:
                renameMainTitle("Accueil")
                //console.log("Default option in switch case when loading page ??")
                break;
        }
    } catch (e) {
        console.log(e)
    }

}