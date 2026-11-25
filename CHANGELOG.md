# Changelog

## v1.4.0

### Nouveautés
- Notes : nouvelle page (#52, #66). À gauche la liste des matières avec leur moyenne, à droite le détail de la matière choisie : moyenne, coefficient, ECTS, bonus, histogramme des notes (repère à 10/20, examen en bleu) et détail du calcul.
- Notes : moyenne générale pondérée par les coefficients, et ECTS « en bonne voie » avec une barre par matière (10 et plus, sous 10, pas encore noté).
- Notes : onglet « Année complète » qui regroupe les deux semestres. Une matière présente aux deux semestres n'apparaît qu'une fois, avec sa moyenne annuelle.
- Moyenne d'une matière : 50 % moyenne des notes + 50 % examen, ou celle des deux qui existe (#51). Le bonus est affiché à part et n'entre pas dans le calcul.
- Années précédentes : un sélecteur « Année » sur les pages Notes, Absences et Cours permet de consulter les années scolaires passées (celles listées par MyGes). L'année en cours reste l'affichage par défaut, et un bandeau signale qu'on consulte une archive.
- Absences : nouvelle page avec le nombre d'absences non justifiées et justifiées, le cours le plus manqué, des filtres et une liste par mois (#66).
- Cours : cartes regroupées par trimestre, filtre par trimestre, recherche par cours ou par professeur (#66).
- Accueil : le récapitulatif des notes n'affiche plus 3 notes au hasard mais le semestre en cours (S1/S2 au choix) : moyenne générale, ECTS en bonne voie, meilleure matière, matières sous 10 et les moyennes les plus basses « À surveiller » (#53).
- Évènements : frise chronologique par mois, filtres « À venir / Passés / Tous », délai affiché (« Aujourd'hui », « Dans 3 jours », « Terminé »…), et confirmation avant de supprimer un évènement (#54).
- « Informations de l'Application » : la version de Go et de Wails, le système (OS et architecture) et la date du build sont lus depuis l'application, et sont donc justes pour chaque plateforme.

### Corrections
- Mode nuit : les listes déroulantes (rappels des évènements, choix de l'année) étaient blanc sur blanc ; elles suivent maintenant le thème.
- Thème clair : le calendrier des évènements n'est plus sur un fond gris foncé.
- Une année sans notes ou sans absences ne provoque plus d'erreur.

## v1.3.2_beta

### Nouveautés
- Rappels des évènements : une notification du système est envoyée avant chaque évènement (15 min avant par défaut, réglable dans Compte > Rappels des évènements, ou « Jamais ») (#56).
- Option « Recevoir les rappels quand l'application est fermée » (Linux, Windows et macOS) : un service léger, sans fenêtre, démarre avec la session (`~/.config/autostart` sous Linux, clé `Run` de l'utilisateur sous Windows, LaunchAgent `~/Library/LaunchAgents` sous macOS). Décocher l'option l'arrête et le retire du démarrage ; la désinstallation Windows le retire aussi.
- Nouveau paramètre « Afficher MyGesClient dans mon statut Discord » (Compte > Confidentialité), activé par défaut.
- Builds macOS (universel Intel + Apple Silicon, non signé) et ARM64 pour Linux (.deb) et Windows (installeur et portable).
- Les logs sont aussi écrits dans un fichier (voir le README), y compris sous Windows où ils étaient perdus. Le service de rappels écrit le sien au même endroit (`MyGesClient-service.log`).

### Sécurité
- Le mot de passe MyGes est rangé dans le trousseau du système (Gestionnaire d'identification Windows, Trousseau macOS, Secret Service sous Linux) au lieu d'être en clair dans la base locale. Les mots de passe existants y sont déplacés au premier lancement (#65).
- Sans trousseau disponible (Linux sans gnome-keyring ni KWallet), le mot de passe reste dans la base locale, et il est déplacé dans le trousseau dès que celui-ci devient disponible.
- Si le mot de passe est introuvable (trousseau vidé, base copiée sur une autre machine), l'application démarre avec les données locales et demande de le ressaisir.
- Attention : une version antérieure ne trouvera plus le mot de passe (il n'est plus dans la base) ; il faudra le ressaisir via « Modifier le mot de passe ».
- Si le mot de passe doit rester dans la base locale faute de trousseau, l'application le signale (popup et page Compte).
- Linux / macOS : le dossier de la base locale n'est plus lisible par les autres utilisateurs de la machine (dossier en 700, base en 600).
- Un trousseau verrouillé qui attend son déverrouillage ne bloque plus le démarrage (20 s max par accès).
- Wails passe de 2.10.1 à 2.17.1 (Go 1.26). Côté sécurité, les iframes ne peuvent plus appeler le backend sous Linux. Côté corrections, une erreur dans une méthode Go ne fait plus planter l'app sous Linux, et l'app ne plante plus sous macOS 26 (Tahoe).

### Corrections
- Discord : le statut fonctionne aussi avec Discord installé en Flatpak ou Snap pour n'importe quel utilisateur (le chemin était codé en dur pour l'UID 1000), et avec plusieurs clients Discord (discord-ipc-0 à 9).
- Linux : l'icône de l'application s'associe à sa fenêtre dans le dock (WM_CLASS = io.github.spatulox.MyGesClient).
- Linux : `MYGES_GPU_POLICY=ondemand|never` contourne une fenêtre blanche avec certains pilotes.
- `wailsbuild.sh` compile avec WebKitGTK 4.1 quand il est installé, comme la CI.
- Absences, projets, compte : les dates s'affichent au format français quelle que soit la langue du système.

## v1.3.0_release

### Nouveautés
- Agenda : ajout du campus Voltaire aux lieux parisiens.

### Corrections
- Thème clair cohérent, sans barre de défilement sur la fenêtre.
- Les liens externes s'ouvrent dans le navigateur par défaut.
- Agenda : affiche le nom du cours au lieu du code, « Non spécifiée » quand il n'y a pas de salle, plus de plantage avec trop de cours, le tableau de bord ne vide plus l'agenda.
- Notes : affichées sans préfixe de semestre.
- Projets : conserve la vraie extension des fichiers.
- Les popups restent dans la fenêtre.
- Démarrage : n'attend plus le backend indéfiniment (60 s max).

### Sécurité
- Les mots de passe ne sont plus envoyés au frontend.
- Les données serveur affichées en HTML sont échappées.
- Notes et emploi du temps filtrés par utilisateur.
