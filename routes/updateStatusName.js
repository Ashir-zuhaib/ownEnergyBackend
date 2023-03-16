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

async function getStatusName(statusId) {
    let data;
    console.log("data", statusId);
    await db
      .collection("AppointmentOutcomes")
      .doc(statusId)
      .get()
      .then((doc) => {
        data = doc.data();
      });
    return data.name;
  }

async function updateLeadStatusName() {
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
      let statusId = Leads[i].status;
      console.log("LeadsStat", statusId);
      if (statusId !== "") {
        let statusName = await getStatusName(statusId);
        // Leads[i].statusName = statusName
        await db
          .collection("Leads")
          .doc(Leads[i].id)
          .update({
            statusName: statusName,
          })
          .then(() => console.log("updated"));
        // updatedLead.push(Leads[i])
      }
    }
  }


  module.exports =updateLeadStatusName
