# Instructions pour les agents

Ce projet concerne la creation d'une interface web HTML pour permettre l'acces
aux archives de la mailing list "Escrime Ancienne".
Le titre est "Archive Mailing-List Escrime Ancienne - 2003 a 2011"

## Principes de travail

- Repondre en francais, sauf demande contraire.
- Preserver les donnees sources et ne jamais supprimer de fichiers sans demande explicite.
- Garder les modifications petites, lisibles et faciles a relire.
- Verifier l'etat Git avant et apres les changements importants.
- Ne pas ajouter les gros fichiers binaires ou archives au suivi Git sans confirmation.
- Pour les actions courantes, lancer uniquement un build partiel du site. Le build partiel est le comportement par defaut : il genere ou met a jour la page d'accueil, la premiere conversation et leurs dependances, sans supprimer les fichiers deja generes pour les autres conversations. Quand les autres conversations existent deja dans `dist/conversations/`, la page d'accueil doit continuer a les lister. Ne lancer un build total que sur demande explicite.

## Git

- Utiliser des messages de commit courts et explicites.
- Ne pas reecrire l'historique Git sans demande explicite.
- Signaler les fichiers non suivis qui semblent importants.

## Documentation

- Documenter les decisions utiles dans le README ou dans des fichiers dedies.
- Preferer des notes simples et structurees a une documentation trop lourde.

## Deploiement Vercel

- Lancer les commandes Vercel depuis la racine du depot, jamais depuis `dist/`.
- Ne pas utiliser `--cwd dist` pour ce projet.
- La cible publiee correcte est deja declaree dans `vercel.json` a la racine via `outputDirectory: "dist"`.
- Pour un deploiement de production non interactif, utiliser `scripts/deploy-prod.ps1`.
