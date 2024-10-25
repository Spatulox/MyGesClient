let popupStillCounter = 0;
let popupNormalCounter = 0;
const MAX_POPUPS = 5;

function createPopup(type, content) {
    const popupContainer = document.querySelector(`#${type}popup`);
    const newPopup = document.createElement('div');

    let popupCounter = type === 'still' ? popupStillCounter++ : popupNormalCounter++;

    newPopup.id = `popup-${type}-${popupCounter}`;
    newPopup.classList.add('popup');
    newPopup.dataset.index = popupCounter;

    if (type === 'still') {
        newPopup.innerHTML = `
            <div class="flex flexStart no-wrap">
                <img src="./src/assets/images/circle-loading.gif" alt="loading circle">
                <div>${content}</div>
            </div>`;
    } else {
        newPopup.innerHTML = `<div class="flex flexCenter">${content}</div>`;
    }

    popupContainer.appendChild(newPopup);
    newPopup.classList.add('active');

    const totalPopups = popupContainer.querySelectorAll('.popup').length;
    if (totalPopups > MAX_POPUPS) {
        // Supprimer la première popup (celle en haut)
        const firstPopup = popupContainer.querySelector('.popup');
        if (firstPopup) {
            const popupTmp = document.getElementById(firstPopup.id);
            if (popupTmp) {
                const type = popupTmp.id.split('-')[1];
                popupTmp.classList.remove('active');

                // The normal function removePopup is to slow when the user is spamming :/
                popupTmp.remove();
                updatePopupPositions(type);
                if (type === 'still') {
                    popupStillCounter--;
                } else {
                    popupNormalCounter--;
                }
            }
        }
    }

    if (type === 'still' && popupStillCounter > 1) {
        updatePopupPositions(type);
    } else if(type === 'normal' && popupNormalCounter > 1) {
        updatePopupPositions(type);
    }

    newPopup.addEventListener('click', function() {
        newPopup.remove()
        updatePopupPositions(type);
    });

    return newPopup.id;
}

function updatePopupPositions(type) {
    const popups = document.querySelectorAll(`#${type}popup .popup`);
    popups.forEach((popup, index) => {
        const heightMove = 5 + (70 * index);
        popup.style.top = `${heightMove}px`;
        popup.dataset.index = index;
    });
}

function removePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        const type = popupId.split('-')[1];
        popup.classList.remove('active');
        setTimeout(() => {
            popup.remove();
            updatePopupPositions(type);
            if (type === 'still') {
                popupStillCounter--;
            } else {
                popupNormalCounter--;
            }
        }, 500); // Délai pour l'animation de disparition
    }
}

export function stillPopup(string = "Error when passing args to still popup") {
    return createPopup('still', string);
}

export function editStillPopup( popupId, string = "Error when passing args to still popup") {
    const pop = document.getElementById(popupId)
    pop.innerHTML = `
            <div class="flex flexStart no-wrap">
                <img src="./src/assets/images/circle-loading.gif" alt="loading circle">
                <div>${string}</div>
            </div>`;
}

export function stopStillPopup(popupId) {
    removePopup(popupId);
}

export function popup(string) {
    const popupId = createPopup('normal', string);
    setTimeout(() => {
        removePopup(popupId);
    }, 5000);
}

// Used to hard remove popups which stay still when "spamming"
setInterval(()=>{
    // Check the number of popup
    const normalpopups = document.querySelectorAll(`#normalpopup .popup`);
    const stillpopups = document.querySelectorAll(`#stillpopup .popup`);

    popupNormalCounter = normalpopups.length
    popupStillCounter = stillpopups.length

    normalpopups.forEach(popup => {
        // Incrémenter ou initialiser le count
        let count = parseInt(popup.getAttribute('count')) || 0;
        count++;
        popup.setAttribute('count', count);

        //Take 10 seconds before hard delete
        if (count > 2) {
            const popupId = popup.getAttribute('id'); // Récupérer l'ID de la popup
            removePopup(popupId); // Exécuter la fonction removePopup
        }
    });

    stillpopups.forEach(popup => {
        // Incrémenter ou initialiser le count
        let count = parseInt(popup.getAttribute('count')) || 0;
        count++;
        popup.setAttribute('count', count);

        // Take 1 minute before hard delete
        if (count >= 12) {
            const popupId = popup.getAttribute('id'); // Récupérer l'ID de la popup
            removePopup(popupId); // Exécuter la fonction removePopup
        }
    });

}, 5000)