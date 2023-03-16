const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
app.use(express.json());
const cors = require("cors");
const fetch = require("node-fetch");
let headers = new fetch.Headers();
const db = require("./FirebaseDB");
app.use(bodyParser.json(), cors());

router.post("/editCompanyKW", async (req, res) => {
    try {
      let userId = req.body.userId;
      const companyKW = req.body.companyKW;
     const Users = await db.collection("Users").doc(userId);
      await Users.update({ companyKW: req.body.companyKW }).then(() => {
        console.log("companyKW Updated");
        res.status(200).send("companyKW Updated");
      });
    } catch {
        console.log("Unsuccessfull");
      res.status(500).send("Unsuccessfull");
    }
  });
  
  router.post("/editCompanyCommission", async (req, res) => {
    try {
      let userId = req.body.userId;
      const companyCommission = req.body.companyCommission;
      console.log(userId)
      const Users = await db.collection("Users").doc(userId);
      await Users.update({ companyCommission: req.body.companyCommission }).then(() => {
        console.log("companyCommission Updated");
        res.status(200).send("companyCommission Updated");
      });
    } catch {
        console.log("Unsuccessfull");
      res.status(500).send("Unsuccessfull");
    }
  });

  module.exports = router;