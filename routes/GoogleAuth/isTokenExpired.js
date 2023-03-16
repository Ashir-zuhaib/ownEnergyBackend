const express = require("express");
const app = express();
app.use(express.json());
const TOKEN_ID = "oNwAeAYYa7LXoL0KX6cl";
const db = require("../FirebaseDB");
function isTokenExpired(curr_date, expires_at) {
    console.log("Minutes Till Expiry = " + (expires_at - curr_date) / 1000 / 60);
    const isExpired = (expires_at - curr_date) / 1000 / 60 < 2;
    return isExpired;
  }
  module.exports = isTokenExpired