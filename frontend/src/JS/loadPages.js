// Normal functions
import {capitalizeFirstLetter, log} from "./functions";

// GO functions
import {GetPageContent, UpdateDiscordRPC} from "../../wailsjs/go/backend/App";

// Page Functions
// They are used
import {dashboard} from "../JS-Page/dashbord.js";
import {schedule} from "../JS-Page/schedule";

export async function loadPageGo(string, event = null){

    log(`Loading ${string} page`)

    const mainPart = document.getElementById("replace")
    const headerTitle = document.getElementById("headerTitle")

    try {
        mainPart.innerHTML = await GetPageContent(string)
        updatePages(string.split(".html")[0])

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
    }

    // }
    // catch(err){
    //     log(`Can't execute ${pages}() function, name is not valid : ${err}`);
    // }
}