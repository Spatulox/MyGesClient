import {popup} from "../JS/popups";
import {getYear} from "../JS/functions";

async function projects(){

    try{
        const year = getYear()
        const mygesProjects = await GetProjects(year.toString())
        console.log(mygesProjects)
    } catch (e) {
        console.log(e)
        popup(e.toString())
    }
}