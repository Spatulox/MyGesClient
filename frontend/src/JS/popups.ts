let popupStillCounter = 0;
let popupNormalCounter = 0;
const MAX_POPUPS = 5;

type PopupType = 'still' | 'normal';

/**
 * Crée une popup de type donné avec le contenu spécifié.
 */
function createPopup(type: PopupType, content: string): string {
    const popupContainer = document.querySelector<HTMLElement>(`#${type}popup`);
    if (!popupContainer) {
        throw new Error(`Le container #${type}popup est introuvable`);
    }

    const newPopup = document.createElement('div');
    let popupCounter = type === 'still' ? popupStillCounter++ : popupNormalCounter++;

    newPopup.id = `popup-${type}-${popupCounter}`;
    newPopup.classList.add('popup');
    newPopup.dataset.index = popupCounter.toString();

    if (type === 'still') {
        newPopup.innerHTML = `
            <div class="flex flexStart no-wrap">
                <!--<img src="./src/assets/images/circle-loading.gif" alt="loading circle">-->
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
        const firstPopup = popupContainer.querySelector('.popup') as HTMLElement | null;
        if (firstPopup) {
            const popupTmp = document.getElementById(firstPopup.id) as HTMLElement | null;
            if (popupTmp) {
                const popupType = popupTmp.id.split('-')[1] as PopupType;
                popupTmp.classList.remove('active');
                popupTmp.remove();
                updatePopupPositions(popupType);
                if (popupType === 'still') {
                    popupStillCounter--;
                } else {
                    popupNormalCounter--;
                }
            }
        }
    }

    if ((type === 'still' && popupStillCounter > 1) || (type === 'normal' && popupNormalCounter > 1)) {
        updatePopupPositions(type);
    }

    newPopup.addEventListener('click', () => {
        newPopup.remove();
        updatePopupPositions(type);
    });

    return newPopup.id;
}

/**
 * Met à jour la position des popups d'un type donné.
 */
function updatePopupPositions(type: PopupType): void {
    const popups = document.querySelectorAll<HTMLElement>(`#${type}popup .popup`);
    popups.forEach((popup, index) => {
        const heightMove = 5 + (70 * index);
        popup.style.top = `${heightMove}px`;
        popup.dataset.index = index.toString();
    });
}

/**
 * Supprime une popup avec animation.
 */
function removePopup(popupId: string | null): void {
    if (!popupId) return;
    const popup = document.getElementById(popupId) as HTMLElement | null;
    if (popup) {
        const type = popupId.split('-')[1] as PopupType;
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

export function stillPopup(message: string = "Error when passing args to still popup"): string {
    return createPopup('still', message);
}

export function editStillPopup(popupId: string, message: string = "Error when passing args to still popup"): void {
    const pop = document.getElementById(popupId);
    if (pop) {
        pop.innerHTML = `
            <div class="flex flexStart no-wrap">
                <!--<img src="./src/assets/images/circle-loading.gif" alt="loading circle">-->
                <div>${message}</div>
            </div>`;
    }
}

export function stopStillPopup(popupId: string): void {
    removePopup(popupId);
}

export function popup(message: string): void {
    const popupId = createPopup('normal', message);
    setTimeout(() => {
        removePopup(popupId);
    }, 5000);
}

// Suppression automatique des popups persistantes et normales
setInterval(() => {
    const normalpopups = document.querySelectorAll<HTMLElement>(`#normalpopup .popup`);
    const stillpopups = document.querySelectorAll<HTMLElement>(`#stillpopup .popup`);

    popupNormalCounter = normalpopups.length;
    popupStillCounter = stillpopups.length;

    normalpopups.forEach(popup => {
        let count = parseInt(popup.getAttribute('count') ?? '0', 10) || 0;
        count++;
        popup.setAttribute('count', count.toString());
        // Suppression après 10 secondes (2 * 5s intervalle)
        if (count > 2) {
            const popupId = popup.getAttribute('id');
            removePopup(popupId);
        }
    });

    stillpopups.forEach(popup => {
        let count = parseInt(popup.getAttribute('count') ?? '0', 10) || 0;
        count++;
        popup.setAttribute('count', count.toString());
        // Suppression après 1 minute (12 * 5s intervalle)
        if (count >= 12) {
            const popupId = popup.getAttribute('id');
            removePopup(popupId);
        }
    });

}, 5000);
