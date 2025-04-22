// SaveEvent is async imported inside the loadingGoFunctionOutiseModules.js file
import { SaveEvents } from "../../wailsjs/go/backend/App";
import { events } from "../JS-Page/events";
import { popup } from "./popups";

export async function initCreateEvent(): Promise<void> {
    // Récupération des éléments du DOM avec typage
    const addButton = document.getElementById('open-modal') as HTMLElement | null;
    const closeModalBtn = document.getElementById('close-modal') as HTMLElement | null;
    const createEventBtn = document.getElementById('create-btn') as HTMLElement | null;
    const eventForm = document.getElementById('event-form') as HTMLFormElement | null;
    const overlay = document.getElementById('overlay') as HTMLElement | null;

    if (!addButton || !closeModalBtn || !createEventBtn || !eventForm || !overlay) {
        console.error("Un ou plusieurs éléments du DOM sont introuvables.");
        return;
    }

    addButton.addEventListener('click', () => {
        addButton.classList.remove("initial");
        addButton.classList.add('active');
        overlay.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        closeModal();
    });

    createEventBtn.addEventListener('click', async (e: MouseEvent) => {
        e.stopPropagation();

        const eventName = document.getElementById("event-name") as HTMLInputElement | null;
        const eventDescription = document.getElementById("event-description") as HTMLInputElement | null;
        const eventStart = document.getElementById("event-start") as HTMLInputElement | null;
        const eventEnd = document.getElementById("event-end") as HTMLInputElement | null;
        const eventColor = document.getElementById("event-color") as HTMLInputElement | null;

        if (!eventName?.value.trim()) {
            popup("Vous devez spécifier un nom pour l'évènement");
            return;
        }

        if (!eventStart?.value) {
            popup("Vous devez spécifier une date de début pour l'évènement");
            return;
        }

        if (!eventEnd?.value) {
            popup("Vous devez spécifier une date de fin pour l'évènement");
            return;
        }

        if (!eventColor?.value) {
            popup("Vous devez spécifier une couleur pour l'évènement");
            return;
        }

        const today = new Date();
        const startDate = new Date(eventStart.value);
        const endDate = new Date(eventEnd.value);

        if (startDate <= today) {
            popup("La date de début doit se situer dans le futur");
            return;
        }

        if (endDate <= startDate) {
            popup("La date de fin doit être après la date de début");
            return;
        }

        if (endDate.getTime() === startDate.getTime()) {
            popup("La date de début et de fin doivent être différente");
            return;
        }

        try {
            await SaveEvents(
                eventName.value.trim(),
                eventDescription?.value || "",
                startDate.toISOString(),
                endDate.toISOString(),
                eventColor.value
            );
            await events()
            popup("Évènement sauvegardé avec succès");
        } catch (err: any) {
            popup(err?.message ?? String(err));
            return;
        }

        // Si l'évènement est créé avec succès
        closeModal();
        clearForm();
    });

    eventForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();
    });

    // Empêche la fermeture lors d'un clic dans la modal
    const modal = addButton.querySelector('.modal') as HTMLElement | null;
    if (modal) {
        modal.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
        });
    }

    document.addEventListener('click', (e: MouseEvent) => {
        if (e.target instanceof Node && !addButton.contains(e.target) && addButton.classList.contains('active')) {
            closeModal();
        }
    });

    function closeModal(): void {
        if(addButton){
            addButton.classList.remove('active');
        }
        if(overlay){
            overlay.style.display = 'none';
        }
    }

    function clearForm(): void {
        const name = document.getElementById('event-name') as HTMLInputElement | null;
        const desc = document.getElementById('event-description') as HTMLInputElement | null;
        const start = document.getElementById('event-start') as HTMLInputElement | null;
        const end = document.getElementById('event-end') as HTMLInputElement | null;
        const color = document.getElementById('event-color') as HTMLInputElement | null;

        if (name) name.value = '';
        if (desc) desc.value = '';
        if (start) start.value = '';
        if (end) end.value = '';
        if (color) color.value = '#5865f2';
    }
}
