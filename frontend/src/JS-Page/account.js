import {GetProfile} from "../../wailsjs/go/backend/App";
import {scrollMainPart} from "../JS/functions";
import {stillPopup, stopStillPopup} from "../JS/popups";
// Fonction pour créer un élément avec des attributs et du contenu
const createElement = (tag, attributes = {}, content = '') => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    element.innerHTML = content;
    return element;
};

// Fonction pour créer une section d'informations
const createInfoSection = (title, data) => {
    const section = createElement('div', { class: 'info-section' });
    section.appendChild(createElement('h3', {}, title));
    Object.entries(data).forEach(([key, value]) => {
        section.appendChild(createElement('p', {}, `<strong>${key}:</strong> ${value}`));
    });
    return section;
};

// Fonction principale pour créer la carte étudiant
const createStudentCard = (profile) => {
    const card = createElement('div', { class: 'card' });

    // En-tête de la carte
    const header = createElement('div', { class: 'card-header' });
    header.appendChild(createElement('img', { src: profile.img_link, alt: 'Avatar', class: 'avatar' }));
    header.appendChild(createElement('h2', {}, `${profile.firstname} ${profile.name}`));
    header.appendChild(createElement('p', { class: 'student-id' }, `#${profile.student_id}`));
    card.appendChild(header);

    // Corps de la carte
    const body = createElement('div', { class: 'card-body' });
    let lesData = {
        'Civilité': profile.civility,
        'Date de naissance': new Date(profile.birthday).toLocaleDateString(),
        'Lieu de naissance': `${profile.birth_place}, ${profile.birth_country}`,
        'Nationalité': profile.nationality
    }
    if(profile.nom_avant_mariage !== "N/A"){
        lesData['Nom de jeune fille'] = profile.nom_avant_mariage
    }
    console.log(lesData)
    // Informations personnelles
    body.appendChild(createInfoSection('Informations Personnelles', lesData));

    // Coordonnées
    body.appendChild(createInfoSection('Coordonnées', {
        'Adresse': `${profile.add1}, ${profile.zipcode} ${profile.city}, ${profile.country}`,
        'Mobile': profile.mobile,
        'Téléphone': profile.telephone,
        'E-mail personnel': profile.personal_mail
    }));

    // Informations académiques
    body.appendChild(createInfoSection('Informations Académiques', {
        'E-mail étudiant': profile.email,
        'Numéro INE': profile.ine
    }));

    card.appendChild(body);
    return card;
};


export async function account() {
    const target = document.getElementById("account-presentation")

    scrollMainPart()
    let laStill = stillPopup("Recherche de vos informations...")

    try{
        let profile = await GetProfile()
        profile = await JSON.parse(profile)

        const user = {

            img_link : profile._links.photo.href,
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

        stopStillPopup(laStill)
        const studentCard = createStudentCard(user);
        target.innerHTML = ""
        target.appendChild(studentCard);

    } catch (e) {
        console.log(e)
        stopStillPopup(laStill)
        target.innerHTML = "Une erreur c'est produite"
    }
}
