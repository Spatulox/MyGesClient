export function dashboard(){





    /* Animate buttons */
    document.querySelectorAll('.navigation-buttons button').forEach(button => {
        button.addEventListener('click', function() {
            // Ajoute la classe 'clicked' pour déclencher l'animation
            this.classList.add('clicked');

            // Retire la classe après l'animation pour permettre une nouvelle animation
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 600); // Durée de l'animation en millisecondes
        });
    });
}