// Normal functions
import {capitalizeFirstLetter, log} from "./functions";

// GO functions
import {GetPageContent, UpdateDiscordRPC} from "../../wailsjs/go/backend/App";

// Page Functions
// They are used
import {dashboard, stopAutomaticEventsInDashboard} from "../JS-Page/dashbord.js";
import {schedule, stopSchedule} from "../JS-Page/schedule";
import {grades} from "../JS-Page/grades";
import {events, stopDisplayingEvents} from "../JS-Page/events";

export async function loadPageGo(string, event = null){

    // Stop all automatic refresh :
    stopSchedule()
    stopAutomaticEventsInDashboard()
    stopDisplayingEvents()

    log(`Loading ${string} page`)

    const mainPart = document.getElementById("replace")
    const headerTitle = document.getElementById("headerTitle")

    // Remove all hard style applyied in functions corresponding to files
    const replace = document.getElementById("replace")
    replace.style = ""

    try {
        mainPart.innerHTML = await GetPageContent(string)
        updatePages(string.split(".html")[0])
        headerTitle.innerText = event.srcElement.innerText ? event.srcElement.innerText : "Accueil"

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

    UpdateDiscordRPC("Unofficial MyGes Client", capitalizeFirstLetter(string.split(".html")[0]))
}

function updatePages(pages){

    switch (pages){
        case 'account':
            //account()
            break
        case 'dashboard':
            dashboard()
            break
        case 'schedule':
            schedule()
            break
        case 'grades':
            grades()
            break
        case 'events':
            events()
            break
    }

    // }
    // catch(err){
    //     log(`Can't execute ${pages}() function, name is not valid : ${err}`);
    // }
}