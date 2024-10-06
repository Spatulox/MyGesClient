import { CheckXTimeInternetConnection, GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import { log } from "../JS/functions";


function printReservations(reservations) {

    reservations = JSON.parse(reservations)
    // Parcourir chaque réservation
    reservations.forEach(reservation => {
        console.log(`Reservation ID: ${reservation.reservation_id}`);
        console.log(`Type: ${reservation.type}`);
        console.log(`Modality: ${reservation.modality || 'N/A'}`);
        console.log(`Author ID: ${reservation.author}`);
        console.log(`Start Date: ${new Date(reservation.start_date).toLocaleString()}`);
        console.log(`End Date: ${new Date(reservation.end_date).toLocaleString()}`);
        console.log(`State: ${reservation.state}`);
        console.log(`Comment: ${reservation.comment || 'N/A'}`);
        console.log(`Name: ${reservation.name}`);

        // Afficher les informations sur les salles
        reservation.rooms.forEach(room => {
            console.log(`  Room ID: ${room.room_id}`);
            console.log(`  Room Name: ${room.name}`);
            console.log(`  Floor: ${room.floor}`);
            console.log(`  Campus: ${room.campus}`);
            console.log(`  Color: ${room.color}`);
            console.log(`  Latitude: ${room.latitude}`);
            console.log(`  Longitude: ${room.longitude}`);
        });

        // Afficher les informations sur la discipline
        if (reservation.discipline) {
            console.log(`Discipline Name: ${reservation.discipline.name || 'N/A'}`);
            console.log(`Teacher: ${reservation.teacher || 'N/A'}`);
            console.log(`Number of Students: ${reservation.discipline.nb_students || 'N/A'}`);
            console.log('-----------------------------------------');
        }
    });
}


export async  function schedule(){
    const laStillPopup =  stillPopup('Connecting to myGes api')

    try{
        if(!(await CheckXTimeInternetConnection(5))){
            log('Definitely no Internet connection')
            popup('No internet connection')
            stopStillPopup(laStillPopup)
        }
    } catch (e) {
        popup(e)
        stopStillPopup(laStillPopup)
        return
    }

    editStillPopup(laStillPopup, 'Refreshing Schedule')

    /*try{
        const agendaBeta = await RefreshAgenda("2024-09-23", "2024-09-28")
        console.log(agendaBeta)
        //printReservations(agendaBeta)
    } catch (e) {
        popup(e)
        stopStillPopup(laStillPopup)
        return
    }*/

    try{
        const agendaBeta = await GetAgenda("2024-09-23", "2024-09-28")
        console.log(agendaBeta)
        //printReservations(agendaBeta)
    } catch (e) {
        popup(e)
        stopStillPopup(laStillPopup)
        return
    }

    stopStillPopup(laStillPopup)
    /*const agenda = await GetAgenda("2024-10-21", "2024-10-25");
    //console.log(agenda);
    printReservations(agenda)
    stopStillPopup(laStillPopup)*/
}