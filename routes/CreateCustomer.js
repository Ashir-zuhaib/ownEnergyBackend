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
const algoliasearch = require("algoliasearch");
const client = algoliasearch(process.env.ALGO_APP_ID, process.env.ALGO_API_KEY);

async function matchCustomer(leads, customerData, fields, delimeter, propNo) {
    const index = client.initIndex("Leads");
    index.setSettings({
      paginationLimitedTo: 10000000000,
    });
    let lId = 0;
    if (leads.length == 0) {
      let allLeads = []; // get all Customer/Leads
      //use algolia
      let queryString = "";
      let fieldNames = "";
      for (let a = 0; a < fields.cxDataFields.length; a++) {
        let cxDataFieldName = fields.cxDataFields[a].fieldName;
        fieldNames = fieldNames + " " + cxDataFieldName;
        if (customerData[cxDataFieldName] == undefined) {
          queryString = "";
          break;
        } else {
          queryString = queryString + " " + customerData[cxDataFieldName];
        }
      }
      if (queryString !== "") {
        console.log("Matching on ", fieldNames);
        console.log("Values", queryString);
        await index.search(queryString).then(async ({ hits }) => {
          console.log("hits", hits.length);
          for (let i = 0; i < hits.length; i++) {
            let matchFound = false;
            for (let j = 0; j < leads.length; j++) {
              if (leads[j].objectID === hits[i].objectID) {
                matchFound = true;
              }
            }
            if (!matchFound) {
              leads.push(hits[i]);
            }
          }
        });
      }
      for (let i = 0; i < leads.length; i++) {
        let match = false;
        for (let j = 0; j < fields.cxFields.length; j++) {
          // console.log("Checking",fields.cxFields[j].fieldName," Against ", fields.cxDataFields[j].fieldName);
          let cxFieldVal;
          let cxDataFieldVal;
          let cxFieldSplit = fields.cxFields[j].split;
          let cxFieldName = fields.cxFields[j].fieldName;
          let cxDataFieldSplit = fields.cxDataFields[j].split;
          let cxDataFieldName = fields.cxDataFields[j].fieldName;
          if (leads[i][cxFieldName] !== undefined) {
            if (cxFieldSplit !== false) {
              try {
                cxFieldVal = leads[i][cxFieldName].split(delimeter)[cxFieldSplit];
              } catch {
                cxFieldVal = leads[i][cxFieldName];
              }
            } else {
              cxFieldVal = leads[i][cxFieldName];
            }
          }
          if (customerData[cxDataFieldName] !== undefined) {
            if (cxDataFieldSplit !== false) {
              try {
                cxDataFieldVal =
                  customerData[cxDataFieldName].split(delimeter)[
                    cxDataFieldSplit
                  ];
              } catch {
                cxDataFieldVal = customerData[cxDataFieldName];
              }
            } else {
              cxDataFieldVal = customerData[cxDataFieldName];
            }
          }
  
          if (cxFieldVal !== undefined && cxDataFieldVal !== undefined) {
            if (
              cxFieldVal == cxDataFieldVal &&
              cxFieldVal !== null &&
              cxDataFieldVal !== null
            ) {
              match = true;
              console.log(
                "Matched Values",
                cxFieldVal,
                " Against ",
                cxDataFieldVal
              );
            } else {
              match = false;
              console.log(
                "Not Matched Values",
                cxFieldVal,
                " Against ",
                cxDataFieldVal
              );
              break;
            }
          }
        }
        if (match) {
          if (leads[i]?.points !== undefined) {
            leads[i].points += 1 / propNo;
          } else {
            leads[i].points = 1 / propNo;
          }
          // leads.push(allLeads[i]);
        }
      }
      if (leads.length == 1) {
        lId = leads[0].objectID;
      }
    } else {
      let newLead = [];
      for (let i = 0; i < leads.length; i++) {
        let match = false;
        for (let j = 0; j < fields.cxFields.length; j++) {
          let cxFieldVal;
          let cxDataFieldVal;
          let cxFieldSplit = fields.cxFields[j].split;
          let cxFieldName = fields.cxFields[j].fieldName;
          let cxDataFieldSplit = fields.cxDataFields[j].split;
          let cxDataFieldName = fields.cxDataFields[j].fieldName;
          if (leads[i][cxFieldName] !== undefined) {
            if (cxFieldSplit !== false) {
              try {
                cxFieldVal = leads[i][cxFieldName].split(delimeter)[cxFieldSplit];
              } catch {
                cxFieldVal = leads[i][cxFieldName];
              }
            } else {
              cxFieldVal = leads[i][cxFieldName];
            }
          }
          if (customerData[cxDataFieldName] !== undefined) {
            if (cxDataFieldSplit !== false) {
              try {
                cxDataFieldVal =
                  customerData[cxDataFieldName].split(delimeter)[
                    cxDataFieldSplit
                  ];
              } catch {
                cxDataFieldVal = customerData[cxDataFieldName];
              }
            } else {
              cxDataFieldVal = customerData[cxDataFieldName];
            }
          }
  
          if (cxFieldVal !== undefined && cxDataFieldVal !== undefined) {
            if (
              cxFieldVal == cxDataFieldVal &&
              cxFieldVal !== null &&
              cxDataFieldVal !== null
            ) {
              match = true;
              console.log(
                "Matched Values",
                cxFieldVal,
                " Against ",
                cxDataFieldVal
              );
            } else {
              match = false;
              console.log(
                "Not Matched Values",
                cxFieldVal,
                " Against ",
                cxDataFieldVal
              );
              break;
            }
          }
        }
        if (match) {
          if (leads[i].points !== undefined) {
            leads[i].points += 1 / propNo;
          } else {
            leads[i].points = 1 / propNo;
          }
        }
      }
      let maxPoints = 0;
      let maxCount = 0;
      let maxLead;
      for (let i = 0; i < leads.length; i++) {
        if (leads[i].points > maxPoints) {
          maxPoints = leads[i].points;
          maxCount = 0;
          maxLead = leads[i];
        }
        if (leads[i].points == maxPoints) {
          maxCount++;
        }
      }
      if (maxCount == 1) {
        lId = maxLead.objectID;
      }
    }
    return lId;
  }
  
  async function CreateCustomer(customerData, forceNew = false) {
    try{
    let leads = [];
    let fields = [];
    let lId = 0;
    if (!forceNew) {
      console.log("Force new false");
      console.log("Getting all Fields");
      await db
        .collection("Fields")
        .get()
        .then((query) => {
          query.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            fields.push(data);
          });
        });
      for (let i = 0; i < fields.length; i++) {
        if (lId == 0) {
          // console.log("Checking", fields[i].fields.cxFields);
          // console.log("Against", fields[i].fields.cxDataFields);
          lId = await matchCustomer(
            leads,
            customerData,
            fields[i].fields,
            fields[i].fields.delimiter,
            fields[i].fields.points
          );
        }
      }
    }
    console.log("lead length", leads.length);
    if (lId == 0) {
      //lid zero or point less than equal quarter sendEmail
      await db
        .collection("Leads")
        .add(customerData)
        .then(() => console.log("New Customer Added"));
      return true;
    } else {
      await db
        .collection("Leads")
        .doc(lId)
        .set(customerData, { merge: true })
        .then(() =>
          console.log(
            lId,
            "++++++++++++++++++++++++++++++++++++++++Updated++++++++++++++++++++++++++++++++++"
          )
        );
      return false;
    }
}
catch{
    console.log("error");
}
}
  module.exports = CreateCustomer