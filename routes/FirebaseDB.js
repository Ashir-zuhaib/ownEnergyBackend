require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("../ServiceAccountKey.json");
let fire;
if (!admin.apps.length) {
  fire = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();
module.exports = db;
