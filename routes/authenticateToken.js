require("dotenv").config();
const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
app.use(express.json());
const cors = require("cors");
const fetch = require("node-fetch");
let headers = new fetch.Headers();
app.use(bodyParser.json(), cors());
const jwt_decode = require("jwt-decode");
const jwt = require("jsonwebtoken");
  function authenticateToken(req, res, next) {
    if (!req.headers.access_token) {
      //res.render('../views/pages/login')
      res.status(404);
      // return;
    }
    const token = req.headers.authorization; //Issue
    const r_token = token.replace(/^Bearer\s/, "");
    jwt.verify(r_token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        console.log("err", err);
        res.status(404).send(err);
        return;
      }
      req.user = user;
      next();
    });
  }
module.exports = authenticateToken;
