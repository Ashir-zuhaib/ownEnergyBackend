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
const isTokenExpired =require("./isTokenExpired")
const setupNewAccessToken =require("./setupNewAccessToken")
async function getOAuth2Client() {
  let oAuth2Client = new OAuth2(
    "41725163713-sgsecm9abs5n4234loo5tmsu2ueu6tc0.apps.googleusercontent.com",
    "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"
  );
    console.log("Auth2Client");
    const snapshot = await db.collection("Tokens").doc(TOKEN_ID).get();
    const tokenData = snapshot.data();
    // if discrepancy between local and firestore, use firestore
    if (!lodash.isEqual(oAuth2Client?.credentials, tokenData)) {
      console.log("oauthtoken credential");
      oAuth2Client?.setCredentials(tokenData);
    }
    var isExpired = isTokenExpired(new Date(), tokenData.expires_at.toDate());
    // console.log("isexp",isExpired, oAuth2Client);
    if (isExpired) {
      setupNewAccessToken();
    }
    return oAuth2Client;
  }
  module.exports = getOAuth2Client