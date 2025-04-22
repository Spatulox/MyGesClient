import { GetProfile } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { scrollMainPart } from "../JS/functions";
import { stillPopup, stopStillPopup } from "../JS/popups";

let isStillRunning = false;


// Fonction pour créer un élément avec des attributs et du contenu
function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: { [key: string]: string } = {},
    content: string = ''
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    element.innerHTML = content;
    return element;
}

// Fonction pour créer une section d'informations
function createInfoSection(title: string, data: Record<string, string>): HTMLDivElement {
    const section = createElement('div', { class: 'info-section' }) as HTMLDivElement;
    section.appendChild(createElement('h3', {}, title));
    Object.entries(data).forEach(([key, value]) => {
        section.appendChild(createElement('p', {}, `<strong>${key}:</strong> ${value}`));
    });
    return section;
}

type ApiUser = {
    img_link: string,
    firstname: string,
    name: string,
    student_id: string,
    civility: string,
    birthday: string,
    birth_place: string,
    birth_country: string,
    nationality: string
    nom_avant_mariage: string,
    add1: string,
    zipcode: string,
    city: string,
    country: string,
    mobile: string,
    telephone: string,
    personal_mail: string,
    email: string,
    ine: string
}
// Fonction principale pour créer la carte étudiant
function createStudentCard(profile: ApiUser): HTMLDivElement {
    const card = createElement('div', { class: 'card' }) as HTMLDivElement;

    // En-tête de la carte
    const header = createElement('div', { class: 'card-header' }) as HTMLDivElement;
    header.appendChild(createElement('img', { src: profile.img_link, alt: 'Avatar', class: 'avatar' }));
    header.appendChild(createElement('h2', {}, `${profile.firstname} ${profile.name}`));
    header.appendChild(createElement('p', { class: 'student-id' }, `#${profile.student_id}`));
    card.appendChild(header);

    // Corps de la carte
    const body = createElement('div', { class: 'card-body' }) as HTMLDivElement;
    const lesData: Record<string, string> = {
        'Civilité': profile.civility,
        'Date de naissance': profile.birthday,
        'Lieu de naissance': `${profile.birth_place}, ${profile.birth_country}`,
        'Nationalité': profile.nationality
    };
    if (profile.nom_avant_mariage !== "N/A") {
        lesData['Nom de jeune fille'] = profile.nom_avant_mariage;
    }
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
}

export async function account(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    const target = document.getElementById("account-presentation") as HTMLElement | null;

    scrollMainPart();
    const laStill = stillPopup("Recherche de vos informations...");

    try {
        let profileRaw = await GetProfile();
        const profileParsed = JSON.parse(profileRaw);

        const user: ApiUser = {
            img_link: profileParsed._links.photo.href,
            civility: profileParsed.civility,
            firstname: profileParsed.firstname,
            name: profileParsed.name,
            add1: profileParsed.address1,
            zipcode: profileParsed.zipcode,
            city: profileParsed.city,
            country: profileParsed.country,
            birth_country: profileParsed.birth_country,
            birth_place: profileParsed.birthplace,
            birthday: (new Date(profileParsed.birthday)).toLocaleDateString(),
            nationality: profileParsed.nationality,
            nom_avant_mariage: profileParsed.maiden_name ? profileParsed.maiden_name : "N/A",
            mobile: profileParsed.mobile,
            personal_mail: profileParsed.personal_mail,
            telephone: profileParsed.telephone,
            email: profileParsed.email,
            ine: profileParsed.ine,
            student_id: profileParsed.student_id,
        };

        stopStillPopup(laStill);

        if (target) {
            const studentCard = createStudentCard(user);
            target.innerHTML = "";
            target.appendChild(studentCard);
        }
    } catch (e) {
        console.log(e);
        stopStillPopup(laStill);
        if (target) {
            target.innerHTML = `
            <div class="width80 marginAuto flex flexCenter">
                <div class="box witdth100">Une erreur c'est produite</div>
            </div>`;
        }
    }
    isStillRunning = false;
}