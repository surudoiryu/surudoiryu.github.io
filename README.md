# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Environment

Gebruik in `.env` minimaal:

- `REACT_APP_GRAPHQL_ENDPOINT` (bijv. `http://localhost:4000/graphql`)
- alternatief: `REACT_APP_GRAPHQL_HOST` + `REACT_APP_GRAPHQL_PATH`
- optioneel auth: `REACT_APP_GRAPHQL_AUTH_TOKEN` (Bearer) of `REACT_APP_GRAPHQL_API_KEY`

De frontend leest catalogusdata (Producten/Brands/Shops) uit Firestore.

## Catalog Sync Worker

Catalogus-sync draait via een losse worker (niet via de browserclient).

### 1) Benodigde worker env vars

Maak bijvoorbeeld een `.env.worker` of zet deze in je scheduler-omgeving:

- `GRAPHQL_ENDPOINT` (of fallback `REACT_APP_GRAPHQL_ENDPOINT`)
- `GRAPHQL_AUTH_TOKEN` (optioneel)
- `GRAPHQL_API_KEY` (optioneel)

Voorbeeldbestand: `.env.worker.example`

Firebase Admin auth (kies één):

- `GOOGLE_APPLICATION_CREDENTIALS=/pad/naar/service-account.json`
- of:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (met `\n` escapes)

### 2) Handmatig sync draaien

```bash
npm run sync:catalog
```

Dit script staat in:

- `scripts/catalog-sync-worker.mjs`

### 3) Cron (elk uur)

Linux/macOS `crontab -e` voorbeeld:

```cron
0 * * * * cd /path/to/surudoiryu.github.io && /usr/bin/npm run sync:catalog >> /var/log/catalog-sync.log 2>&1
```

Windows (Task Scheduler) equivalent:

1. Maak een taak met trigger: "Every 1 hour".
2. Action:
   - Program: `powershell.exe`
   - Arguments: `-NoProfile -Command "cd 'E:\Freelance Werk\5. Intern\surudoiryu.github.io'; npm run sync:catalog"`

### 4) Firestore Rules (aanbevolen model)

- Client app: read-only op `Producten`, `Brands`, `Shops`, `SyncStatus`.
- Worker/service account: write op deze collecties.
- User data (`users`, `reviews`, likes): directe client writes volgens auth rules.

Concreet staat dit in:

- `firestore.rules`

### 5) Rules deployen

Voorbeeld met Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Belangrijk:

- Registreren blijft direct schrijven naar `users/{uid}`.
- Reviews plaatsen blijft direct schrijven naar `reviews/{reviewId}`.
- Catalogus (`Producten`/`Brands`/`Shops`) wordt alleen via worker bijgewerkt.
