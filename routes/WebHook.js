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


router.get("/getWebHook", async (req, res) => {
    try{
        let url = "https://phx.gosolo.io/api/v3/webhooks/ownenergy test?company_id=9146"
        await fetch(
            url,
            {
              headers: {
                Accept: "application/json",
                apikey:
                  "c005de95871e5474b87656baa753417b:$2a$10$wFJTc3AS5oa39i.oeLdu3edVwwbfRbdbusDnGl3tN9dQ7ia2ktLLu",
              },
            }
          )
            .then((response) => response.json())
            .then((result) => {
              console.log("/getWebHook GET Successful");
              res.status(200).send(result);
            })
            .catch((e) => {
              console.log("/getWebHook API Error");
              res.status(200).send({ error: e });
            });
    }
    catch{
        res.status(500).send()
    }
})


router.post("/WebHookPost", async (req, res) => {
    try{
        let data ={
            company_id:9146,
            event:"contractSigned",
            url:`https://ownenergyapi.ue.r.appspot.com/WebHook/listenWebHook`
        }
        await fetch("https://phx.gosolo.io/api/v3/webhooks", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "apikey": "c005de95871e5474b87656baa753417b:$2a$10$wFJTc3AS5oa39i.oeLdu3edVwwbfRbdbusDnGl3tN9dQ7ia2ktLLu"
  }
  })
  .then(res => res.json())
  .then(async(json) => {
    console.log("json", json);
    res.status(200).send(json)
  })
}
catch{
    res.status(500).send()
}
})
router.post("/listenWebHook", async(req, res)=>{
  try{ 
  await CreateCustomer(req.body.data)
    res.status(200).send("Recieved")
}
catch{
  res.status(500).send()
}
})
async function matchCustomer(leads, customerData, fields, delimeter, propNo) {
  const index = client.initIndex("Leads");
  index.setSettings({
    paginationLimitedTo: 10000000000
  })
  let lId = 0;
  if (leads.length == 0) {
    let allLeads = []; // get all Customer/Leads
    //use algolia
    let queryString =""
    let fieldNames =""
    for(let a = 0; a < fields.cxDataFields.length; a++){
      let cxDataFieldName = fields.cxDataFields[a].fieldName;
      fieldNames = fieldNames+ " " + cxDataFieldName;
      if(customerData[cxDataFieldName] == undefined){
        queryString =""
        break;
      }
      else{
        queryString = queryString + " " + customerData[cxDataFieldName]
      }
    }
    if(queryString !==""){
      console.log("Matching on ", fieldNames);
      console.log("Values", queryString);
      await index.search(queryString).then(async ({ hits }) => {
        console.log("hits", hits.length);
        for(let i=0; i<hits.length; i++) {
          let matchFound = false;
          for(let j=0; j<leads.length; j++) {
            if(leads[j].objectID === hits[i].objectID){
              matchFound = true;
            }
          } 
          if(!matchFound){
            leads.push(hits[i])
          }
        }
      
      })
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
              cxFieldVal =
              leads[i][cxFieldName].split(delimeter)[cxFieldSplit];
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
    await db.collection("Leads")
      .add(customerData)
      .then(() => console.log("New Customer Added"));
      return true; 
  } else {
    await db.collection("Leads")
      .doc(lId)
      .set(customerData, { merge: true })
      .then(() => console.log(lId, "++++++++++++++++++++++++++++++++++++++++Updated++++++++++++++++++++++++++++++++++"));
      return false
  }
}
module.exports = router;