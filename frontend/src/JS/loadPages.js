// Normal functions
import {capitalizeFirstLetter} from "./functions";

// GO functions
import {UpdateDiscordRPC} from "../../wailsjs/go/backend/App";

// Page Functions
// They are used
import {dashboard, stopDashboardEvents} from "../JS-Page/dashbord.js";
//import {schedule, stopSchedule} from "../JS-Page/schedule";
import {schedule} from "../JS-Page/scheduletest.js";
import {grades} from "../JS-Page/grades";
import {events, stopDisplayingEvents} from "../JS-Page/events";
import {account} from "../JS-Page/account";
import {courses} from "../JS-Page/courses";
import {projects} from "../JS-Page/projects";
import {absences} from "../JS-Page/absences";

let leDocToShow = document.getElementById("weirdPlace")

function renameMainTitle(string){
    document.getElementById("headerTitle").innerText = string
}

export async function loadPageGo(string, event){

    let currPage
    try{
        currPage = event?.srcElement.innerText ? event.srcElement.innerText : "Accueil"
        currPage = capitalizeFirstLetter(currPage)
        leDocToShow.style.display = "none"
        leDocToShow = document.getElementById(string.split(".html")[0])
        leDocToShow.style.display = "inherit"
        updatePages(string.split(".html")[0])
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
                account()
            case 'softwareAccount':
                renameMainTitle("Compte")
                break;
            case 'courses':
                courses()
                renameMainTitle("Cours")
                break;
            case 'dashboard':
                dashboard()
                renameMainTitle("Accueil")
                break;
            case 'events':
                events()
                renameMainTitle("Évènements")
                break;
            case 'grades':
                grades()
                renameMainTitle("Notes")
                break;
            case 'schedule':
                schedule()
                renameMainTitle("Agenda")
                break;
            case 'projects' :
                projects()
                renameMainTitle("Projets")
                break;
            case 'absences' :
                absences()
                renameMainTitle("Absences")
                break;
            case 'credits' :
                absences()
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