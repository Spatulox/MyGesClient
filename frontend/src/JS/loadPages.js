// Normal functions
import {capitalizeFirstLetter, log} from "./functions";

// GO functions
import {GetPageContent, UpdateDiscordRPC} from "../../wailsjs/go/backend/App";

// Page Functions
import {dashboard} from "../JS-Page/dashbord";

export async function loadPageGo(string, event = null){

    log(`Loading ${string} page`)

    const mainPart = document.getElementById("replace")
    const headerTitle = document.getElementById("headerTitle")

    try {
        mainPart.innerHTML = await GetPageContent(string)
        console.log(await GetPageContent(string))

        updatePages(string)

    } catch{
        log("ERROR : An error occured in the loadPage function")
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
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    //try{
    if (regex.test(pages) && pages !=="softwareAccount" && pages !=="credits") {
        eval(pages + '()');
    }
    else if(pages === "cya"){

    }
    // }
    // catch(err){
    //     log(`Can't execute ${pages}() function, name is not valid : ${err}`);
    // }
}