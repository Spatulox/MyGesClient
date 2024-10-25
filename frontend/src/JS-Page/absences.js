import {popup} from "../JS/popups";
import {GetAbsences} from "../../wailsjs/go/backend/App";
import {getYear} from "../JS/functions";

export async function absences(){
    console.log("YOUPI")
    try{
        const year = getYear()
        const absence = await GetAbsences(year.toString())
        console.log(absence)
    } catch (e) {
        console.log(e)
        popup("Une erreur est survenue")
    }
}