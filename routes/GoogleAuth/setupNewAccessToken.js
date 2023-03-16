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
async function setupNewAccessToken() {
    let oAuth2Client;
    console.log("Setting Up New Access Token");
    oAuth2Client = new OAuth2(
      "41725163713-sgsecm9abs5n4234loo5tmsu2ueu6tc0.apps.googleusercontent.com",
      "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"
    );
    let access_token;
    console.log("Requesting New Access Token....", access_token);
    access_token = await getAccessToken((token) => {
      console.log("New Access Token Granted", token);
      newToken = {
        access_token: token.access_token,
        refresh_token:
          "1//04KHnrL3S0Q9eCgYIARAAGAQSNwF-L9Ir7Grv0k9g2ul_M3z1wQb5TPxrNXTDSFEmK1pfoRHgYrGEDThRgTAUcf67pDbvmoEsHAI",
        expires_at: new Date(Date.now() + token.expires_in * 1000), // token.data.expires_in is in seconds and we want milliseconds
      };
      oAuth2Client.setCredentials(newToken);
      console.log("New Access Token Deployed", token);
      // add to firestore
      db.collection("Tokens").doc(TOKEN_ID).update(newToken);
    });
  }
  async function getAccessToken(next) {
    console.log("Getting New Access Token");
    await axios
      .post("https://oauth2.googleapis.com/token", {
        client_id:
          "41725163713-sgsecm9abs5n4234loo5tmsu2ueu6tc0.apps.googleusercontent.com",
        client_secret: "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",
        refresh_token:
          "1//04KHnrL3S0Q9eCgYIARAAGAQSNwF-L9Ir7Grv0k9g2ul_M3z1wQb5TPxrNXTDSFEmK1pfoRHgYrGEDThRgTAUcf67pDbvmoEsHAI",
        grant_type: "refresh_token",
      })
      .then((response) => {
        console.log("New Access Token Issued");
        // console.log(response);
        console.log(response.data.access_token);
        next(response.data);
      })
      .catch((error) => {
        console.log("New Access Token Not Granted");
        console.log(error);
        console.log("Done Talking");
      });
  }
  module.exports = setupNewAccessToken