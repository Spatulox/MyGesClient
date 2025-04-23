// SaveEvent is async imported inside the loadingGoFunctionOutiseModules.js file
import { SaveEvents, GetPresetByName, SaveEventPreset } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { handleEvents } from "../JS-Page/dashbord";
import { events } from "../JS-Page/events";
import { popup } from "./popups";

export async function initCreateEvent(): Promise<void> {
    // Récupération des éléments du DOM avec typage
    const addButton = document.getElementById('open-modal') as HTMLElement | null;
    const closeModalBtn = document.getElementById('close-modal') as HTMLElement | null;
    const createEventBtn = document.getElementById('create-btn') as HTMLElement | null;
    const eventForm = document.getElementById('event-form') as HTMLFormElement | null;
    const overlay = document.getElementById('overlay') as HTMLElement | null;

    const event_start = document.getElementById("event-start") as HTMLInputElement | null;
    const event_end = document.getElementById("event-end") as HTMLInputElement | null;

    const eventColor = document.getElementById("event-color") as HTMLInputElement | null;
    const colorPreset = document.querySelectorAll('.color-preset')


    if (!addButton || !closeModalBtn || !createEventBtn || !eventForm || !overlay || !event_start || !event_end || !eventColor) {
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

    event_start.addEventListener("input", function() {
        if (event_start.value) {
            let startDate = parseLocalDateTime(event_start.value);
            startDate.setMinutes(startDate.getMinutes() + 90);
            let formatted = formatLocalDateTime(startDate);
            event_end.value = formatted;
    
            console.log(startDate);
            console.log(formatted);
        }
    });
    
    function parseLocalDateTime(value: string): Date {
        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
    }
    
    function formatLocalDateTime(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    colorPreset.forEach(async preset => {
        const dot = preset.querySelector('.color-dot') as HTMLElement;
        const colorInput = preset.querySelector('.color-picker') as HTMLInputElement;
        const editBtn = preset.querySelector('.edit-color') as HTMLButtonElement;

        let theSavedPreset: structures.Preset
        try{
            console.log(dot.id)
            theSavedPreset = await GetPresetByName(dot.id)
            dot.style.background = theSavedPreset.Value
        } catch (e: any){
            await SaveEventPreset(dot.id, dot.style.background)
        }
      
        // Sélection sur clic de la pastille
        dot.addEventListener('click', () => {
            const isSelected = dot.classList.contains('selected');
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            if (!isSelected) {
              dot.classList.add('selected');
            }
            eventColor.value = rgbToHex(dot.style.background)
          });
          
      
        // Ouvre le color picker natif et initialise sa valeur avec la couleur du dot
        editBtn.addEventListener('click', () => {
          // Récupère la couleur actuelle du dot (convertit en format hex si nécessaire)
          let currentColor = dot.dataset.color || rgbToHex(dot.style.backgroundColor);
          colorInput.value = currentColor;
          colorInput.click();
        });
      
        // Change la couleur de la pastille
        colorInput.addEventListener('input', async () => {
            dot.style.background = colorInput.value;
            dot.dataset.color = colorInput.value;
            try{
                await SaveEventPreset(dot.id, colorInput.value)
            } catch (e) {
                console.error(e)
            }
            eventColor.value = rgbToHex(colorInput.value)
                colorPreset.forEach((preset)=>{
                const dot_tmp = preset.querySelector('.color-dot') as HTMLElement;
                dot_tmp.classList.remove('selected')
            })
            dot.classList.add("selected")
        });
    });
      
    function rgbToHex(rgb: string): string {
        if (rgb.startsWith('#')) return rgb;
        const result = rgb.match(/\d+/g);
        if (!result) return '#000000';
        return (
          '#' +
          result
            .slice(0, 3)
            .map(x => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            })
            .join('')
        );
    }

      

    createEventBtn.addEventListener('click', async (e: MouseEvent) => {
        e.stopPropagation();

        const eventName = document.getElementById("event-name") as HTMLInputElement | null;
        const eventDescription = document.getElementById("event-description") as HTMLInputElement | null;

        if (!eventName?.value.trim()) {
            popup("Vous devez spécifier un nom pour l'évènement");
            return;
        }

        if (!event_start?.value) {
            popup("Vous devez spécifier une date de début pour l'évènement");
            return;
        }

        if (!event_end?.value) {
            popup("Vous devez spécifier une date de fin pour l'évènement");
            return;
        }

        if (!eventColor?.value) {
            popup("Vous devez spécifier une couleur pour l'évènement");
            return;
        }

        // Check if a preset is selected 
        let isPreset: string | null = null
        colorPreset.forEach((preset)=>{
            const dot = preset.querySelector('.color-dot') as HTMLElement;
            if(dot.classList.contains('selected')){
                isPreset = dot.id
                return
            }
        })
        const today = new Date();
        const startDate = new Date(event_start.value);
        const endDate = new Date(event_end.value);

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
                isPreset ? isPreset :eventColor.value
            );
            handleEvents()
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
