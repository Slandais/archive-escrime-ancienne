# Archive Mailing-List Escrime Ancienne - 2003 à 2011

Ce dépôt contient une version HTML statique des archives de la mailing-list
`escrime_medievale`.

## Organisation

- `ML escrime_medievale/` : données sources extraites depuis l'archive zip.
- `dist/` : sortie HTML statique deployable.
- `dist/index.html` : page d'accueil avec recherche dans les conversations.
- `dist/conversations/` : une page HTML par conversation.
- `assets/` : CSS et JavaScript de navigation copies dans `dist/assets/`.
- `scripts/build-site.mjs` : générateur du site statique.

Le site est généré sans dépendance externe côté build. L'affichage utilise
Simple.css via CDN, complété par une feuille locale.

## Regénération

Depuis la racine du dépôt :

```bash
node scripts/build-site.mjs
```

Par défaut, le build est partiel : il régénère la page d'accueil, la première
conversation et leurs dépendances, sans supprimer les fichiers déjà générés pour
les autres conversations. Si des pages de conversations existent déjà dans
`dist/conversations/`, la page d'accueil continue à les lister. Quand le champ
`From:` ne contient pas de nom exploitable, le générateur dérive le nom
d'auteur depuis la partie avant `@` de l'adresse e-mail, avec quelques
exceptions explicites maintenues dans `scripts/build-site.mjs`. Pour régénérer
toutes les conversations, il faut demander explicitement un build total :

```bash
node scripts/build-site.mjs --full
```

Le déploiement Vercel utilise uniquement la sortie `dist/`. Lancer la commande
depuis la racine du dépôt permet d'utiliser le lien Vercel local
`.vercel/project.json`, actuellement configuré pour le projet
`archive-escrime-ancienne`.

```bash
npx vercel deploy --prod --yes --scope slandais-projects
```

Ne pas passer `dist` comme dossier a la commande `vercel deploy` depuis la
racine : le CLI peut alors le traiter comme un projet Vercel distinct. La
configuration `vercel.json` a la racine indique deja a Vercel de publier
`dist/`.
