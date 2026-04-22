# Instructions pour les agents

Ce projet concerne la création d'une interface web HTML pour permettre l'accès aux archives de la mailing list "Escrime Ancienne".
Le titre est "Archive Mailing-List Escrime Ancienne - 2002 à 2011"

## Principes de travail

- Repondre en francais, sauf demande contraire.
- Preserver les donnees sources et ne jamais supprimer de fichiers sans demande explicite.
- Garder les modifications petites, lisibles et faciles a relire.
- Verifier l'etat Git avant et apres les changements importants.
- Ne pas ajouter les gros fichiers binaires ou archives au suivi Git sans confirmation.

# Actions à mener

Le projet va se dérouler en étapes décrite ci-dessous. Chaque étape dispose d'un état EN_COURS ou TERMINE.
L'étape et le statut en cours son à stocker dans un fichier STEP.txt, si le fichier n'existe pas le créer.

Etape 1 : déziper le fichier .zip à la racine
Etape 2 : Créer un site statique HTML, avec du CSS (utiliser simpleCSS) et éventuellement un peu de JS. Afin de permettre l'accès à la mailing liste via Web. Chaque conversation doit donner lieu à une nouvelle page HTML, les différents échanges de cette conversations les uns sous les autres dans des Panel différent. Pour naviguer entre les conversations, sur mobile un menu hambuger ouvre une side bar listant les conversations. Sur grand écran la side bar est toujours visible. Elle tri les conversations par ordres chronologique. Dans la balise Auteur de la méta description mettre : "Simon LANDAIS pour la FFAMHE".

## Git

- Utiliser des messages de commit courts et explicites.
- Ne pas reecrire l'historique Git sans demande explicite.
- Signaler les fichiers non suivis qui semblent importants.

## Documentation

- Documenter les decisions utiles dans le README ou dans des fichiers dedies.
- Preferer des notes simples et structurees a une documentation trop lourde.
