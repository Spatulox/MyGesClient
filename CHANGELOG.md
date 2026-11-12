# Changelog

Une section par tag, avec un titre `## <tag>` (ex. `## v1.2.0_beta`).
Le workflow de release publie le contenu de la section du tag poussé
(repli sur `## v1.2.0` si la section exacte n'existe pas).

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
