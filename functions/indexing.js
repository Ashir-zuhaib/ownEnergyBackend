// brings all the modules we need
const algoliasearch = require('algoliasearch')
const dotenv = require('dotenv')
const firebase = require('firebase');
const firestore = require('firebase/firestore');
// load values from the .env file in this directory into process.env
dotenv.load();
// initializes the firebase database.
firebase.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
})
const db = firebase.firestore();
// configure algolia
const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
);
const index = algolia.initIndex(process.env.ALGOLIA_INDEX_NAME);