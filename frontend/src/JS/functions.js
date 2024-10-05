import { GetParentDir, WriteLogFile } from "../../wailsjs/go/backend/App";


export function log(str) {

    GetParentDir().then((parentDir) => {
        console.log("Parent directory:", parentDir);
        const logDir = parentDir.split('\\src')[0] + "\\log"; // Utilisation de / au lieu de \\ pour la compatibilité multiplateforme
        const filePath = logDir + '\\log.txt';

        var today = new Date();
        let previousStr = `[${today.toLocaleDateString()} - ${today.toLocaleTimeString()}] `;

        console.log(previousStr + str);
        WriteLogFile(filePath, previousStr + str + '\n')
            .then(()=>{
                console.log(previousStr + str + '\n')
            })
            .catch((err)=>{
                console.error("ERROR : Impossible to write the log file : "+err)
            })
    })
    .catch((error) => {
        console.error("Error getting parent directory:", error);
    });
}

export function capitalizeFirstLetter(string) {
    // Séparer la chaîne et prendre la première partie
    let part = string.split(".html")[0];

    // Vérifier si la chaîne n'est pas vide
    if (part.length === 0) return part;

    // Mettre en majuscule la première lettre et la concaténer avec le reste de la chaîne
    return part.charAt(0).toUpperCase() + part.slice(1);
}