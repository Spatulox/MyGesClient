# Changelog

Une section par tag, avec un titre `## <tag>` (ex. `## v1.2.0_beta`).
Le workflow de release publie le contenu de la section du tag poussé
(repli sur `## v1.2.0` si la section exacte n'existe pas).

## v1.3.1

### Nouveautés
- Rappels des évènements : une notification du système est envoyée avant chaque évènement (15 min avant par défaut, réglable dans Compte > Rappels des évènements, ou « Jamais ») (#56).
- Option « Recevoir les rappels quand l'application est fermée » (Linux et Windows) : un service léger, sans fenêtre, démarre avec la session (`~/.config/autostart` sous Linux, clé `Run` de l'utilisateur sous Windows). Décocher l'option l'arrête et le retire du démarrage ; la désinstallation Windows le retire aussi.
- Nouveau paramètre « Afficher MyGesClient dans mon statut Discord » (Compte > Confidentialité), activé par défaut.
- Builds macOS (universel Intel + Apple Silicon, non signé) et ARM64 pour Linux (.deb) et Windows (installeur et portable).
- Les logs sont aussi écrits dans un fichier (voir le README), y compris sous Windows où ils étaient perdus.

### Sécurité
- Le mot de passe MyGes est rangé dans le trousseau du système (Gestionnaire d'identification Windows, Trousseau macOS, Secret Service sous Linux) au lieu d'être en clair dans la base locale. Les mots de passe existants y sont déplacés au premier lancement (#65).
- Sans trousseau disponible (Linux sans gnome-keyring ni KWallet), le mot de passe reste dans la base locale, et il est déplacé dans le trousseau dès que celui-ci devient disponible.
- Si le mot de passe est introuvable (trousseau vidé, base copiée sur une autre machine), l'application démarre avec les données locales et demande de le ressaisir.
- Attention : une version antérieure ne trouvera plus le mot de passe (il n'est plus dans la base) ; il faudra le ressaisir via « Modifier le mot de passe ».
- Si le mot de passe doit rester dans la base locale faute de trousseau, l'application le signale (popup et page Compte).
- Linux / macOS : le dossier de la base locale n'est plus lisible par les autres utilisateurs de la machine (dossier en 700, base en 600).
- Un trousseau verrouillé qui attend son déverrouillage ne bloque plus le démarrage (20 s max par accès).

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
