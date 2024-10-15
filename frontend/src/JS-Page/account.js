import {GetProfile} from "../../wailsjs/go/backend/App";
import {scrollMainPart} from "../JS/functions";


export async function account(){
    scrollMainPart()
    try{
        let profile = await GetProfile()
        profile = await JSON.parse(profile)

        const user = {
            // Critic infos
            civility : profile.civility,
            firstname : profile.firstname,
            name : profile.name,
            add1 : profile.address1,
            zipcode : profile.zipcode,
            city : profile.city,
            country : profile.country,
            birth_country : profile.birth_country,
            birth_place : profile.birthplace,
            birthday : (new Date(profile.birthday)).toLocaleDateString(),
            nationality : profile.nationality,
            nom_avant_mariage : profile.maiden_name ? profile.maiden_name : "N/A",

            //Other Infos
            mobile : profile.mobile,
            personal_mail : profile.personal_mail,
            telephone : profile.telephone,

            // School
            email : profile.email,
            ine : profile.ine,
            student_id : profile.student_id,

        }

        const profileGrid = document.getElementById('profileGrid');
        let count = 0
        for (const [key, value] of Object.entries(user)) {
            const item = document.createElement('div');
            item.className = 'profile-item';
            item.innerHTML = `
                <h3>${key.replaceAll('_', ' ').toUpperCase()}</h3>
                <p>${value}</p>
            `;
            profileGrid.appendChild(item);
        }

    } catch (e) {
        console.log(e)
    }
}