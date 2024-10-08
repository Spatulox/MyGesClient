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
            removePopup(firstPopup.id);
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

function stillPopup(string = "Error when passing args to still popup") {
    return createPopup('still', string);
}

function editStillPopup( popupId, string = "Error when passing args to still popup") {
    const pop = document.getElementById(popupId)
    pop.innerHTML = `
            <div class="flex flexStart no-wrap">
                <img src="./src/assets/images/circle-loading.gif" alt="loading circle">
                <div>${string}</div>
            </div>`;
}

function stopStillPopup(popupId) {
    removePopup(popupId);
}

function popup(string) {
    const popupId = createPopup('normal', string);
    console.log(string)
    setTimeout(() => {
        removePopup(popupId);
    }, 5000);
}
