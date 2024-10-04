const lightDark = document.getElementById('theme');
const body = document.getElementsByTagName('body')[0]

lightDark.addEventListener('click', function() {

    if(body.classList.contains('light')){
        lightDark.src = "./src/assets/images/black-moon.png"
        //replaceValueJsonFile("./config.json", "theme", "dark")
    }
    else{
        lightDark.src = "./src/assets/images/black-sun.png"
        //replaceValueJsonFile("./config.json", "theme", "light")
    }

    body.classList.toggle('light')
    body.classList.toggle('dark')

});