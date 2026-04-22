# Archive Mailing-List Escrime Ancienne - 2002 à 2011

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

Le deploiement Vercel utilise uniquement la sortie `dist/`.

```bash
npx vercel deploy --prod --cwd dist
```
