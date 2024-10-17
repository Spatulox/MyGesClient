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

let leDocToShow = document.getElementById("weirdPlace")

export async function loadPageGo(string, event = null){

    let currPage
    try{
        currPage = event?.srcElement.innerText ? event.srcElement.innerText : "Accueil"
        console.log(leDocToShow)
        leDocToShow.style.display = "none"
        leDocToShow = document.getElementById(string.split(".html")[0])
        console.log(leDocToShow)
        leDocToShow.style.display = "inherit"
    } catch (e) {
        console.log(e)
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