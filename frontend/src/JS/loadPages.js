// Normal functions
import {capitalizeFirstLetter, log} from "./functions";

// GO functions
import {GetPageContent, UpdateDiscordRPC} from "../../wailsjs/go/backend/App";

// Page Functions
// They are used
import {dashboard, stopDashboardEvents} from "../JS-Page/dashbord.js";
import {schedule, stopSchedule} from "../JS-Page/schedule";
import {grades} from "../JS-Page/grades";
import {events, stopDisplayingEvents} from "../JS-Page/events";
import {account} from "../JS-Page/account";
import {courses} from "../JS-Page/courses";

export async function loadPageGo(string, event = null){

    // Stop all automatic refresh :
    stopSchedule()
    stopDashboardEvents()
    stopDisplayingEvents()

    log(`Loading ${string} page`)
    const mainPart = document.getElementById("replace")
    const headerTitle = document.getElementById("headerTitle")

    // Remove all hard style applyied in functions corresponding to files
    const replace = document.getElementById("replace")
    replace.style = ""
    let currPage
    try {

        mainPart.innerHTML = await GetPageContent(string)

        await updatePages(string.split(".html")[0])
        currPage = event?.srcElement.innerText ? event.srcElement.innerText : "Accueil"

        headerTitle.innerText = currPage

    } catch(err){
        log("ERROR : An error occured in the loadPage function : "+err)
    }

    if (event != null){
        try{
            headerTitle.innerHTML = event.target.innerHTML
        }
        catch{
            log("ERROR : Impossible to load the title")
        }
    }

    try{
        UpdateDiscordRPC("Unofficial MyGes Client", capitalizeFirstLetter(currPage))
    } catch (e) {
        console.log(e)
    }
}

async function updatePages(pages){
    console.log("pages : "+pages)
    try{
        switch (pages){
            case 'account':
                account()
                break;
            case 'courses':
                courses()
                break;
            case 'dashboard':
                dashboard()
                break;
            case 'events':
                events()
                break;
            case 'grades':
                grades()
                break;
            case 'schedule':
                console.log("schedule call")
                await schedule()
                break;
            default:
                console.log("Default option in switch case when loading page ??")
                break;
        }
    } catch (e) {
        console.log(e)
    }

}