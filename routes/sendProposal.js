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
const db = require("./FirebaseDB");
async function getUser(uId) {
  const allData = {
    email: "",
    id: "",
    name: "",
  };
  const snapshot = await db
    .collection("Users")
    .doc(uId)
    .get()
    .then((q) => {
      allData.email = q.data().email;
      allData.name = q.data().name;
      allData.id = q.id;
    });

  return allData.email;
}
async function sendProposal(lead) {
  console.log("util", lead.utilPic);
    await db
      .collection("Locations")
      .doc(lead.locationId)
      .get()
      .then((doc) => {
        lead.state = doc.data().state;
      });
      
      if (typeof(lead.rep) == "object") {
        console.log("reXpPr", lead.rep);
        lead.rep = lead.rep.email
      }
      console.log("reXpPr", lead.rep);
    let data = {
      company_id: parseInt(lead.company_id),
      user_email: lead.rep,
      email: lead.email,
      first_name: lead.firstName,
      last_name: lead.lastName,
      state: lead.state,
      city: lead.city,
      zip: lead.zip,
      address:
        lead.street + " " + lead.city + ", " + lead.state + " " + lead.zip,
      phone: lead.phone,
      utility_id: parseFloat(lead.utility_id),
      utility_company: lead.utility_name,
      notes:
        "Lead Generated via Systems for " +
        lead.firstName +
        " " +
        lead.lastName +
        " - " +
        lead.id,
      lat: parseFloat(lead.lat),
      lon: parseFloat(lead.lng),
      usage_bill_url:
        lead?.utilPic != "null" && lead?.utilPic != null && lead?.utilPic != ""
          ? await ConvertGDriveViewToDownload(lead?.utilPic)
          : [],
    };
    console.log("basic details for proposal", data.usage_bill_url, "not", lead.utilPic);
    let usageDetails = false;
    if (lead.averageMonthlyBill != undefined && !usageDetails) {
      data.average_monthly_cost = lead.averageMonthlyBill;
      usageDetails = true;
    }
    if (lead.annualBill != undefined && !usageDetails) {
      data.annual_usage = lead.annualBill;
      usageDetails = true;
    }
    if (lead.monthlyBill != undefined && !usageDetails) {
      data.monthly_usage = lead.monthlyBill;
      
      usageDetails = true;
      console.log("s", data.monthly_usage);
    }
    if (!usageDetails) {
      data.annual_usage = 0;
    }
    console.log("billing complete");
    // console.log("data", data);
    await fetch("https://phx.gosolo.io/api/v3/customers", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        apikey:
          "c005de95871e5474b87656baa753417b:$2a$10$wFJTc3AS5oa39i.oeLdu3edVwwbfRbdbusDnGl3tN9dQ7ia2ktLLu",
      },
    })
      .then((res) => res.json())
      .then(async (json) => {
        console.log("json", json);
        if(lead?.id != undefined){
        await db
          .collection("Leads")
          .doc(lead?.id)
          .update({
            path: await json.path,
          });
        }
        return json;
      });
}
async function ConvertGDriveViewToDownload(viewLink) {
  let replacingLink;
  let editString = viewLink.replace(
    "https://drive.google.com/file/d/",
    "https://drive.google.com/uc?export=download&id="
  );
  if (editString == viewLink) {
    editString = viewLink.replace(
      "https://drive.google.com/open?id=",
      "https://drive.google.com/uc?export=download&id="
    );
  }
  let splitT = editString.slice(-18);
  if (splitT == "/view?usp=drivesdk") {
    return editString.slice(0, -18);
  } else {
    return editString;
  }
}
module.exports = sendProposal;
