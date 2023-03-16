const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
app.use(express.json());
const cors = require("cors");
const fetch = require("node-fetch");
let headers = new fetch.Headers();
const db = require("./FirebaseDB");
const authenticateToken = require("./authenticateToken");
const sendProposal  = require("./sendProposal");
app.use(bodyParser.json(), cors());

router.get("/getUtilityCompanies",authenticateToken, async (req, res) => {
  try{
    let url;
    console.log("id", req.user);
    await db.collection("Locations").doc(req.user.locationId).get().then(async(e)=>{
      let state=e.data().state;
         console.log(state)
       url =`https://phx.gosolo.io/api/v3/utility_company?attributes=id%2Cname%2Cshort_name%2Cstate&state=${state}&limit=1000` 
  })
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
        console.log("/getUtilityCompanies GET Successful");
        res.status(200).send(result);
      })
      .catch((e) => {
        console.log("/getUtilityCompanies API Error");
        res.status(200).send({ error: e });
      });
}
catch{
  console.log("/getUtilityCompanies Error");
  res.status(500).send()
}
});

router.get("/getCustomerData", async (req, res) => {
  try{
    let url = "https://phx.gosolo.io/api/v3/customers?company_id=9146&attributes=id%2Ccreated%2Cmodified%2Cfirst_name%2Clast_name%2Cemail%2Cphone%2Caddress%2Czip%2Cstate%2Clat%2Clon%2Cskyline_realtime%2Clender_id%2Cutility_id%2Cis_roofing%2Cproposal_sold_id%2Cstatus_id%2Clead_number%2Csetter_id%2Ccompany_custom%2Cpreposal_url%2Cvalue_questions"
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
        console.log("/getData GET Successful");
        res.status(200).send(result);
      })
      .catch((e) => {
        console.log("/get API Error");
        res.status(200).send({ error: e });
      });
  }
  catch{
    console.log("/getUtilityCompanies Error");
    res.status(500).send()
  }
})

router.post("/sendProposal", async (req, res) => {
  try{
    let lead = req.body.lead;
    let json = await sendProposal(lead)
    res.status(200).send(json)
}
catch{
  res.status(500).send()
}
});
router.post("/updateProposal", async (req, res) => {
  try{
  let lead = req.body.lead;

  let data = {
    company_id: lead.company_id,
    usage_bill_url: await ConvertGDriveViewToDownload(lead.utilPic),
  };

    await fetch(`https://phx.gosolo.io/api/v3/customers/${parseInt(lead.customerId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "apikey": "c005de95871e5474b87656baa753417b:$2a$10$wFJTc3AS5oa39i.oeLdu3edVwwbfRbdbusDnGl3tN9dQ7ia2ktLLu"
  }
  })
  .then(res => res.json())
  .then(async(json) => {
    console.log(json)
    res.status(200).send(json)
  })
  .catch((err) => {
    console.log(err)
    res.status(200).send({
      "error":err
    })
  })
  // console.log(data);
  // res.status(200).send(data);
}
catch{
  res.status(500).send()
}
});
module.exports = router;
// async function ConvertGDriveViewToDownload(viewLink){
//   let replacingLink 
//   let editString = viewLink.replace("https://drive.google.com/file/d/", "https://drive.google.com/uc?export=download&id=")
//   if(editString == viewLink){
//   editString = viewLink.replace("https://drive.google.com/open?id=", "https://drive.google.com/uc?export=download&id=")
//   }
//   let splitT = editString.slice(-18)
//   if(splitT == "/view?usp=drivesdk"){
//     return editString.slice(0,-18)
//   }
//   else{
//     return editString
//   }
// }
// async function sendProposal(lead, forceSend){
//   if(forceSend){
//     await db.collection("Locations").doc(lead.locationId).get().then((doc)=>{
//         lead.state = doc.data().state
//     })
//     let data = {
//       company_id: parseInt(lead.company_id),
//       user_email: lead.rep,
//       email: lead.email,
//       first_name: lead.firstName,
//       last_name: lead.lastName,
//       state: lead.state,
//       city: lead.city,
//       zip: lead.zip,
//       address: lead.street + " " + lead.city + ", " + lead.state + " " + lead.zip,
//       phone: lead.phone,
//       // monthly_usage:  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
//       // average_monthly_cost: lead.averageMonthlyBill || 0, //remove when monthly usage resolved,
//       utility_id:lead.utility_id,
//       utility_company: lead.utility_name,
//       notes: "Lead Generated via Systems for "+ lead.firstName +" "+ lead.lastName + " - "+ lead.id ,
//       lat: lead.lat,
//       lon: lead.lng,
//       usage_bill_url: lead?.utilPic != null ? await ConvertGDriveViewToDownload(lead?.utilPic) : [],
//     };
//     let usageDetails = false
//     if (lead.averageMonthlyBill != undefined && lead.averageMonthlyBill != 0 && lead.averageMonthlyBill != "undefined"){
//       console.log("avreage", lead.averageMonthlyBill);
//       data.average_monthly_cost = lead.averageMonthlyBill
//       usageDetails = true;
//     }
//     if (lead.annualBill != undefined && lead.annualBill !==0 && lead.annualBill != "undefined" ){
//       data.annual_usage = lead.annualBill
//       usageDetails = true;
//       console.log("ann",lead.annualBill);
//     }
//     if (lead.monthlyBill != undefined && lead.monthlyBill[0]!= "undefined" && lead.monthlyBill !== [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]){
//       data.monthly_usage = lead.monthlyBill
//       usageDetails = true;
//       console.log("mo");
//     }
    
//     if (!usageDetails){
//       data.annual_usage = 0
//     }
//     console.log("data", data);
//       await fetch("https://phx.gosolo.io/api/v3/customers", {
//       method: "POST",
//       body: JSON.stringify(data),
//       headers: {
//         "Content-Type": "application/json",
//         "apikey": "c005de95871e5474b87656baa753417b:$2a$10$wFJTc3AS5oa39i.oeLdu3edVwwbfRbdbusDnGl3tN9dQ7ia2ktLLu"
//     }
//     })
//     .then(res => res.json())
//     .then(async(json) => {
//       console.log("json", json);
      
//       await db.collection("Leads").doc(lead.id).update({
//         path: await json.path
//       })
//       return json
//     })
//   }
// }