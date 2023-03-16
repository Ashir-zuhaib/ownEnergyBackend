const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
app.use(express.json());
const cors = require("cors");
const fetch = require("node-fetch");
const axios = require("axios");
const lodash = require("lodash");
const TOKEN_ID = "oNwAeAYYa7LXoL0KX6cl";
const db = require("../FirebaseDB");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const setupNewAccessToken = require("./setupNewAccessToken")
const isTokenExpired = require("./isTokenExpired")

// gets new access token
// initializes oAuth2Client
// updates firestore


async function Authorize() {
  try {
    let oAuth2Client;
    const snapshot = await db.collection("Tokens").doc(TOKEN_ID).get();
    const tokenData = snapshot.data();

    var isExpired = isTokenExpired(new Date(), tokenData.expires_at.toDate());
    console.log("Is Token Expired: " + isExpired);

    if (isExpired) {
      setupNewAccessToken();
    } else {
      oAuth2Client = new OAuth2(
        "41725163713-sgsecm9abs5n4234loo5tmsu2ueu6tc0.apps.googleusercontent.com",
        "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"
      );
      oAuth2Client.setCredentials(tokenData);
    }
  } catch (e) {
    console.log("Error", e);
  }
}




// returns true if token is expired



// module.exports = 
module.exports = Authorize