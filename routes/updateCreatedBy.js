require("dotenv").config();
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
async function updateCreatedBy(){
  let Leads = [];
  await db
    .collection("Leads")
    .get()
    .then((query) => {
      query.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        Leads.push(data);
      });
    });
  console.log("leads", Leads.length);
  for (let i = 0; i < Leads.length; i++) {
    let setterId = Leads[i].setter;
    console.log("setterId", setterId);
      let setterName = await getUsers(setterId);
   
      await db
        .collection("Leads")
        .doc(Leads[i].id)
        .update({
          setterName: setterName.name,
        })
        .then(() => console.log("updated"));
    }
  }
  async function getUsers(aId) {
    let user = {};
    await db
      .collection("Users")
      .doc(aId)
      .get()
      .then((e) => {
        user = e.data();
        user.id = e.id;
      })
      .catch((e) => {
        console.log("aid not fount", aId);
      });
    return user;
  }
  module.exports =updateCreatedBy