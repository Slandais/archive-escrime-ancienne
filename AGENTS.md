# Instructions pour les agents

Ce projet concerne la création d'une interface web HTML pour permettre l'accès aux archives de la mailing list "Escrime Ancienne".
Le titre est "Archive Mailing-List Escrime Ancienne - 2003 à 2011"

## Principes de travail

- Répondre en français, sauf demande contraire.
- Préserver les données sources et ne jamais supprimer de fichiers sans demande explicite.
- Garder les modifications petites, lisibles et faciles à relire.
- Vérifier l'état Git avant et après les changements importants.
- Ne pas ajouter les gros fichiers binaires ou archives au suivi Git sans confirmation.
- Pour les actions courantes, lancer uniquement un build partiel du site. Le build partiel est le comportement par défaut : il génère ou met à jour la page d'accueil, la première conversation et leurs dépendances, sans supprimer les fichiers déjà générés pour les autres conversations. Quand les autres conversations existent déjà dans `dist/conversations/`, la page d'accueil doit continuer à les lister. Ne lancer un build total que sur demande explicite.

## Git

- Utiliser des messages de commit courts et explicites.
- Ne pas réécrire l'historique Git sans demande explicite.
- Signaler les fichiers non suivis qui semblent importants.

## Documentation

- Documenter les décisions utiles dans le README ou dans des fichiers dédiés.
- Préférer des notes simples et structurées à une documentation trop lourde.
