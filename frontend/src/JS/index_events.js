
// ------------------------------------------------------------------ //
// Functions

function loadPage(string){ // Used in index.html
    loadPageGo(string)
}

// ------------------------------------------------------------------ //
// Listener
const lightDark = document.getElementById('theme');
const body = document.getElementsByTagName('body')[0]
const buttonEula = document.getElementById('buttonEula')

const buttonConnection = document.getElementById('buttonConnection')
const buttonCancelConnection = document.getElementById('buttonCancelConnection')



// ------------ Utilitites events -------------- //
lightDark.addEventListener('click', function() {

    if(body.classList.contains('light')){
        lightDark.src = "./src/assets/images/black-moon.png"
        UpdateUserTheme("dark")
    }
    else{
        lightDark.src = "./src/assets/images/black-sun.png"
        UpdateUserTheme("light")
    }

    body.classList.toggle('light')
    body.classList.toggle('dark')

});

buttonEula.addEventListener('click', function() {
    const eula = document.getElementById('eula')
    UpdateUserEula()
    eula.classList.remove('active')
})

buttonCancelConnection.addEventListener('click', function() {
    const connection = document.getElementById('connection')
    connection.classList.remove("active")

})


// ------------ Popup events -------------- //

async function eulaShow(){
    const eula = document.getElementById('eula')
    eula.classList.add('active')
}

async function changeLoginPassword(){
    //const eula = document.getElementById('eula')
    const connection = document.getElementById('connection')
    connection.classList.add('active')
}

async function deconnectionFromMyges(){
    loadPage("cya")
    changeLoginPassword()
}

async function deleteOldData(){
    popup("Under contruction")
}