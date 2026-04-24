# Archive Mailing-List escrime_medievale - 2003 a 2011

Ce depot contient une version HTML statique des archives de la mailing-list
`escrime_medievale`.

## Organisation

- `ML escrime_medievale/` : donnees sources extraites depuis l'archive zip.
- `dist/` : sortie HTML statique deployable.
- `dist/index.html` : page d'accueil avec recherche dans les conversations.
- `dist/conversations/` : une page HTML par conversation, nommee `YYYY-MM-DD-slug.html`.
- `assets/` : CSS et JavaScript de navigation copies dans `dist/assets/`.
- `scripts/build-site.mjs` : generateur du site statique.

Le site est genere sans dependance externe cote build. L'affichage utilise
Simple.css via CDN, complete par une feuille locale.

## Regeneration

Depuis la racine du depot :

```bash
node scripts/build-site.mjs
```

Par defaut, le build est partiel : il regenere la page d'accueil, la premiere
conversation et leurs dependances, sans supprimer les fichiers deja generes pour
les autres conversations. Si des pages de conversations existent deja dans
`dist/conversations/`, la page d'accueil continue a les lister. Quand le champ
`From:` ne contient pas de nom exploitable, le generateur derive le nom
d'auteur depuis la partie avant `@` de l'adresse e-mail, avec quelques
exceptions explicites maintenues dans `scripts/build-site.mjs`. Pour regenerer
toutes les conversations, il faut demander explicitement un build total :

```bash
node scripts/build-site.mjs --full
```

## Deploiement Vercel

Le deploiement Vercel utilise uniquement la sortie `dist/`. Il faut lancer la
commande depuis la racine du depot pour reutiliser le lien Vercel local dans
`.vercel/project.json`, actuellement configure pour le projet
`archive-escrime-medievale`.

```bash
npx vercel deploy --prod --yes --scope slandais-projects
```

Ne pas passer `dist` comme dossier a la commande `vercel deploy` depuis la
racine : le CLI peut alors le traiter comme un projet Vercel distinct. La
configuration `vercel.json` a la racine indique deja a Vercel de publier
`dist/`.

Pour automatiser le deploiement sans questions interactives, utiliser le script
PowerShell suivant depuis la racine du depot :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-prod.ps1
```

Ce script verifie le lien Vercel local puis deploie en production avec
`--yes`, sans utiliser `--cwd dist`.
