import { GetUserData } from "../../wailsjs/go/main/App";

async function start(){

    try {
        const user = await GetUserData();
        console.log(user)
        if (user === null || user.password) {
            const connection = document.getElementById('connection')
            connection.classList.add('active')
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur :", error);
    }
    /*
    // Check if the eula is accepted
    if(!user.eula || user.eula === false)
    {
        const eula = document.getElementById('eula')
        eula.classList.add('active')
    }

    // Apply the theme
    const theme = document.getElementsByTagName('body')[0]
    const themeImg = document.getElementById('theme')
    if(user.theme){
        theme.classList = user.theme
    }

    if(theme.classList.contains('light')){
        themeImg.src = './src/assets/images/black-sun.png'
    }
    else{
        themeImg.src = './src/assets/images/black-moon.png'
    }*/

}
start()


