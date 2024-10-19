// SaveEvent is async imported inside the loadingGoFunctionOutiseModules.js file
import {popup} from "./popups";
import {SaveEvents} from "../../wailsjs/go/backend/App";

export async function initCreateEvent(){
    const addButton = document.getElementById('open-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const createEventBtn = document.getElementById('create-btn');
    const eventForm = document.getElementById('event-form');
    const overlay = document.getElementById('overlay');

    addButton.addEventListener('click', () => {
        addButton.classList.remove("initial")
        addButton.classList.add('active');
        overlay.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    createEventBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Handle event creation here
        let eventName = document.getElementById("event-name")
        let eventDescription = document.getElementById("event-description")
        let eventStart = document.getElementById("event-start")
        let eventEnd = document.getElementById("event-end")
        let eventColor = document.getElementById("event-color")

        if(!eventName?.value.trim()){
            popup("Vous devez spécifier un nom pour l'évènement")
            return
        }

        if(!eventStart?.value){
            popup("Vous devez spécifier une date de début pour l'évènement")
            return
        }

        if(!eventEnd?.value){
            popup("Vous devez spécifier une date de fin pour l'évènement")
            return
        }

        if(!eventColor?.value){
            popup("Vous devez spécifier une couleur pour l'évènement")
            return
        }

        const today = new Date();
        const startDate = new Date(eventStart.value);
        const endDate = new Date(eventEnd.value);

        if( startDate <= today){
            popup("La date de début doit se situer dans le futur")
            return
        }

        if( endDate <= startDate ){
            popup("La date de fin doit se situer dans le futur")
            return
        }

        if( endDate <= startDate ){
            popup("La date de fin doit être après la date de début")
            return
        }

        if( endDate === startDate ){
            popup("La date de début et de fin doivent être différente")
            return
        }

        try{
            await SaveEvents(eventName.value.trim(), eventDescription?.value, startDate.toISOString(), endDate.toISOString(), eventColor.value)
            popup("Évènement sauvegardé avec succès")
        } catch (e) {
            popup(e)
            return
        }

        // If event successfully created
        closeModal();
        clearForm();
    });

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // Prevent closing when clicking inside the modal
    addButton.querySelector('.modal').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        // Vérifier si le clic est en dehors de addButton
        if (!addButton.contains(e.target) && addButton.classList.contains('active')) {
            closeModal();
        }
    });

    function closeModal() {
        addButton.classList.remove('active');
        overlay.style.display = 'none';
    }

    function clearForm() {
        document.getElementById('event-name').value = '';
        document.getElementById('event-description').value = '';
        document.getElementById('event-start').value = '';
        document.getElementById('event-end').value = '';
        document.getElementById('event-color').value = '#5865f2';
    }
}