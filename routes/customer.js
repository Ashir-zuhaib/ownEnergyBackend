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
const authenticateToken = require("./authenticateToken")
const algoliasearch = require("algoliasearch");
const CreateCustomer = require("./CreateCustomer")
const client = algoliasearch(process.env.ALGO_APP_ID, process.env.ALGO_API_KEY);
async function isAllowedToView3(functionName, user, subAccessFeatureName = "") {
    let allowLevel = {
      rank: 4,
      id: "",
    };
  
    const access = await db
      .collection("Access")
      .where("keyword", "==", functionName)
      .get();
  
    if (access.size == 1) {
      for (doc of access.docs) {
        accessData = doc.data();
        accessData.id = doc.id;
  
        var subAccess;
        if (subAccessFeatureName == "") {
          subAccess = await db
            .collection("SubAccess")
            .where("accessId", "==", accessData.id)
            .get();
        } else {
          subAccess = await db
            .collection("SubAccess")
            .where("accessId", "==", accessData.id)
            .where("featureName", "==", subAccessFeatureName)
            .get();
        }
  
        for (doc2 of subAccess.docs) {
          subAccessData = doc2.data();
          subAccessData.id = doc2.id;
  
          const accessLevelAccess = await db
            .collection("AccessLevelAccess")
            .where("accessLevelId", "==", user.accessLevelId)
            .where("subAccessId", "==", subAccessData.id)
            .get();
  
          if (accessLevelAccess.size == 1) {
            for (doc3 of accessLevelAccess.docs) {
              accessLevelAccessData = doc3.data();
              accessLevelAccessData.id = doc3.id;
  
              const accessValue = await db
                .collection("AccessValues")
                .where("rank", "==", accessLevelAccessData.accessValues)
                .get();
              if (accessValue.size == 1) {
                for (doc4 of accessValue.docs) {
                  accessValueData = doc4.data();
                  accessValueData.id = doc4.id;
  
                  if (accessValueData.rank < allowLevel.rank) {
                    allowLevel.rank = accessValueData.rank;
                    switch (accessValueData.rank) {
                      case 1:
                        allowLevel.id = "";
                        return allowLevel;
                        break;
                      case 2:
                        allowLevel.id = user.id;
                        break;
                      case 3:
                        allowLevel.id = user.locationId;
                        break;
                      default:
                        allowLevel.id = "";
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return allowLevel;
  }
router.get("/Customer", authenticateToken, async (req, res) => {
    try {
      
        console.log(req.user);
      // will be undefined in first call
      console.log(req.query);
      const Users = db.collection("Users");
      const usersSnap = await Users.where("email", "==", req.user.email).get();
  
      usersSnap.forEach((doc) => {
        user = doc.data();
        user.id = doc.id;
      });
      let perPage = parseInt(req.query.perPage);
      let currentPage = parseInt(req.query.currentPage);
      let allApptOutcomes = [];
  
      const appointmentOutcomes = await db
        .collection("AppointmentOutcomes")
        .get();
      appointmentOutcomes.forEach((doc) => {
        apptOutcome = doc.data();
        apptOutcome.id = doc.id;
        allApptOutcomes.push(apptOutcome);
      });
      let allUsers = [];
  
      const userquery = await db.collection("Users").get();
      userquery.forEach((doc) => {
        userData = doc.data();
        userData.id = doc.id;
        allUsers.push(userData);
      });
      let reqId = req.query.reqId;
  
      // console.log(req.query.statusFilters);
      // console.log(req.query.userFilters);
  
      let filterStr = "";
      let filtersArr = [];
      if (req.query.statusFilters != undefined) {
        filtersArr = JSON.parse(req.query.statusFilters);
        for (let i = 0; i < filtersArr.length; i++) {
          if (i == 0) {
            filterStr += '(status:"' + filtersArr[i] + '"';
          } else {
            filterStr += ' OR status:"' + filtersArr[i] + '"';
          }
          if (i == filtersArr.length - 1) {
            filterStr += ")";
          }
        }
      }
  
      if (req.query.userFilters != undefined) {
        filtersArr = JSON.parse(req.query.userFilters);
  
        if (filterStr != "") {
          filterStr += " AND ";
        }
  
        for (let i = 0; i < filtersArr.length; i++) {
          if (i == 0) {
            filterStr +=
              '(rep:"' + filtersArr[i] + '" OR setter:"' + filtersArr[i] + '"';
          } else {
            filterStr +=
              ' OR rep:"' + filtersArr[i] + '" OR setter:"' + filtersArr[i] + '"';
          }
          if (i == filtersArr.length - 1) {
            filterStr += ")";
          }
        }
      }
  
      const index = client.initIndex("Customers");
      canView = await isAllowedToView3(
        "lead-view",
        req.user,
        "lead-view-action"
      );
  
      if (canView.rank == 2) {
        if (filterStr != "") {
          filterStr += " AND ";
        }
        filterStr +=
          '(rep:"' + req.user.id + '" OR setter:"' + req.user.id + '")';
      }
  
      if (canView.rank == 3) {
        if (filterStr != "") {
          filterStr += " AND ";
        }
        filterStr += 'locationId: "' + req.user.locationId + '"';
      }
      console.log("filterStr = " + filterStr);
  
      let hits = [];
      let leadInput = req.query.leadInput;
      if (leadInput == undefined) {
        leadInput = "";
      }
      if (leadInput == "") {
        index
          .browseObjects({
            query: "",
            filters: filterStr,
            batch: (batch) => {
              hits = hits.concat(batch);
            },
          })
          .then(async () => {
            console.log("Query Returned", hits.length, "Records - Browsing");
            for (let h = 0; h < hits.length; h++) {
              for (let u = 0; u < allUsers.length; u++) {
                if (allUsers[u].id == hits[h].setter) {
                  hits[h].setter = allUsers[u];
                }
              }
            }
  
            console.log("Users Joined");
  
            // sorts by date (newest to oldest)
            hits.sort((a, b) => {
              let da = new Date(a.dateCreated),
                db = new Date(b.dateCreated);
              return db - da;
            });
  
            console.log("Got data for ", reqId);
  
            // let paginationData =  hits.slice((currentPage-1)*perPage,((currentPage-1)*perPage)+perPage)
            res.status(200).send({
              hits: hits,
              allApptOutcomes: allApptOutcomes,
              reqId: reqId,
              // totalLead:hits.length,
              // perPage:perPage,
              // currentPage:currentPage
            });
          })
          .catch((err) => {
            res.status(404).send(err);
          });
      } else {
        index
          .search(leadInput, {
            filters: filterStr,
          })
          .then(async ({ hits }) => {
            console.log("Query Returned", hits.length, "Records - Searching");
            for (let h = 0; h < hits.length; h++) {
              for (let u = 0; u < allUsers.length; u++) {
                if (allUsers[u].id == hits[h].setter) {
                  hits[h].setter = allUsers[u];
                }
              }
            }
  
            // sorts by date (newest to oldest)
            hits.sort((a, b) => {
              let da = new Date(a.dateCreated),
                db = new Date(b.dateCreated);
              return db - da;
            });
  
            console.log("Got data for ", reqId);
            //  let paginationData =  hits.slice((currentPage-1)*perPage,((currentPage-1)*perPage)+10)
            res.status(200).send({
              hits: hits,
              allApptOutcomes: allApptOutcomes,
              reqId: reqId,
              // totalLead:hits.length,
              // perPage:perPage,
              // currentPage:currentPage
            });
          })
          .catch((err) => {
            res.status(404).send(err);
          });
      }
    } catch {
      res.status(404).send("Catch Error");
    }
  });
  
  app.post("/editCustomer", async (req, res) => {
    try {
      let customerId = req.query.customerId;
      const Customer = {
        city: req.body.city,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        fullName: req.body.fullName,
        proposalId: req.body.proposalId,
        state: req.body.state,
        street: req.body.street,
        zip: req.body.zip,
      };
      console.log("check data", Customer);
      const Customers = await db
        .collection("Customers")
        .doc(customerId)
        .update(Customer)
        .then(() => {
          res.status(200).send("Customers Updated");
        });
    } catch {
      res.status(500).send("Unsuccessfull Customers Update");
    }
});
router.post("/createCustomer", async (req, res) => {
  let customerData = req.body.customerData;
  let forceNew = req.body.forceNew;
  await CreateCustomer(customerData, false).then(() => {
    res.status(200).send();
  });
});


router.get("/getCLeads", async (req, res) => {
  // let WebHook = [];
    await db
     .collection("Leads")
     .doc("VsZfjPsDFAngp2lfzh2s")
      .get()
      .then(async(doc) => {
        // querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          await CreateCustomer(data)
          // WebHook.push(data);
        // });
      });
      res.status(200).send()
})
router.get("/getCProject", async (req, res) => {
  // let WebHook = [];
    await db
     .collection("Projects")
     .doc("966108")
      .get()
      .then(async(doc) => {
        // querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          await CreateCustomer(data)
          // WebHook.push(data);
        // });
      });
      res.status(200).send()
})
router.get("/getCWebHook", async (req, res) => {
  // let WebHook = [];
    await db
     .collection("WebHook")
     .doc("CUaXfCj4zbT6iO9UTqnX")
      .get()
      .then(async(doc) => {
        // querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          await CreateCustomer(data.data)
          // WebHook.push(data);
        // });
      });
      res.status(200).send()
})
router.get("/LeadsCustomers", async (req, res) => {
  try {
    let Leads = [{"customer_city":"W Melbourne","customer_address_2":null,"m2":null,"prospect_id":null,"date_cancelled":null,"cash_amount":null,"proposal_id":"SOLO_","customer_name":"Beejal Patel","homeowner_id":"SOLO_","dealer_fee_percentage":null,"install_partner":"Arrowpoint","rep_email":"r.miller@ownourenergy.com","customer_phone":"3214602272","product":null,"created":"2022-12-13T08:09:46Z","adders":"0","funding_source":null,"loan_amount":null,"return_sales_date":null,"setter_id":null,"employee_id":15175,"modified":"2022-12-30T08:51:49Z","financing_term":null,"gross_account_value":null,"customer_state":"FL","adders_description":null,"customer_signoff":"2022-12-13T08:09:35Z","rep_name":"Roman Miller","id":964780,"install_partner_id":17,"scheduled_install":null,"customer_email":"mail@mail.com","customer_zip":"32904","financing_rate":null,"m1":null,"kw":null,"customer_address":"4107 Trovita Cir W Melbourne, FL 32904","install_complete":null}];
  //   let Leads = [{
  //     "event": "contractSigned",
  //     "data": {
  //         "kwh_sold": "0.00",
  //         "company_name": "LGCY/UNTD Energy - Own Energy - LGCY Installation Services",
  //         "date_sold": null,
  //         "customerId": "3005900",
  //         "last_name": "Patel",
  //         "proposalId": 4478693,
  //         "zip": "32904",
  //         "proposalRequest": {
  //             "id": 2775355,
  //             "disabled_at": null,
  //             "utility_id": null,
  //             "usage": {
  //                 "averageMonthlyCost": "105.39",
  //                 "type": "averageMonthlyCost"
  //             },
  //             "expected_time_due": "2022-11-19T17:14:36.220Z",
  //             "desired_offset": null,
  //             "realtime": false,
  //             "created_at": "2022-11-18T17:14:36.220Z",
  //             "should_use_sunpixel": false,
  //             "is_sunpixel_ready": false,
  //             "custom_utility": "Clean Choice Energy",
  //             "updated_at": "2022-11-18T17:14:36.220Z",
  //             "customer_id": 3005900,
  //             "offset": 0,
  //             "custom_ppkwh": null
  //         },
  //         "first_name": "Beejal",
  //         "is_roofing": false,
  //         "company_id": 9152,
  //         "city": "W Melbourne",
  //         "id": 3005900,
  //         "firstNote": {
  //             "note": "\n      New customer created successfully via API.\n      Sales Rep can not respond to new messages\n      until the first proposal is delivered.\n      If there is missing information, make this\n      proposal regardless.\n      Lead Generated via Systems for Beejal Patel - rksbjg8Q12bkTpiWDA7j\n      UTILITY COMPANY: Clean Choice Energy\n    • Average Monthly Bill: $105.39\n"
  //         },
  //         "leadNumber": null,
  //         "computedAdders": [
  //             {
  //                 "input_type": "checkbox",
  //                 "customDataLabels": {},
  //                 "totalCost": 150,
  //                 "selectOptions": [],
  //                 "id": 247933,
  //                 "custom": {},
  //                 "inputValue": 0,
  //                 "docsDisplayPrice": true,
  //                 "perWattCost": 0.020053475935828877,
  //                 "name": "Engineering Stamp",
  //                 "selectedIndex": 0,
  //                 "docsDisplayName": true,
  //                 "isBattery": false
  //             }
  //         ],
  //         "utility_bill_id": null,
  //         "address": "4107 Trovita Cir W Melbourne, FL 32904",
  //         "adders": [
  //             {
  //                 "applied": true,
  //                 "specialSettings": {
  //                     "adminOverridePermission": false
  //                 },
  //                 "inputValue": 0,
  //                 "selectedIndex": 0,
  //                 "id": 247933,
  //                 "cost": 150,
  //                 "name": "Engineering Stamp"
  //             }
  //         ],
  //         "loan_amount": "39569.79",
  //         "stateCode": {
  //             "country": "USA",
  //             "state": "Florida",
  //             "code": "FL",
  //             "id": 10
  //         },
  //         "lead_number": null,
  //         "state": "FL",
  //         "path": "https://phx.gosolo.io/customer/3005900",
  //         "lon": "-80.64542569999999",
  //         "realtime": false,
  //         "stateName": "Florida",
  //         "appointment_id": null,
  //         "utility_company": {
  //             "name": "Custom",
  //             "id": 133
  //         },
  //         "salesRep": {
  //             "external_sales_rep_id": null,
  //             "first_name": "David",
  //             "phone": "(510) 825-0731",
  //             "email": "d.seiler@ownourenergy.com",
  //             "last_name": "Seiler",
  //             "manager_id": 156364,
  //             "crm_id": null,
  //             "id": 156434
  //         },
  //         "company_custom": null,
  //         "status": {
  //             "id": 84,
  //             "status_name": "Proposal Delivered"
  //         },
  //         "email": "mail@mail.com",
  //         "user_id": 156434,
  //         "generatedDate": "2022-12-19T18:32:15.581Z",
  //         "phone": "3214602272",
  //         "fullName": "Beejal Patel",
  //         "value_questions": [],
  //         "user": {
  //             "email": "d.seiler@ownourenergy.com",
  //             "crm_id": null,
  //             "last_name": "Seiler",
  //             "id": 156434,
  //             "fullName": "David Seiler",
  //             "company_id": 9146,
  //             "first_name": "David"
  //         },
  //         "lat": "28.0482688",
  //         "lead_type": null,
  //         "proposalType": "24 Hour"
  //     },
  //     "id": "OCK5YKXcWJaHt7yjmjkU"
  // },];
    // await db
    //   .collection("Leads")
    //   .get()
    //   .then((querySanpshot) => {
    //     querySanpshot.forEach((doc) => {
    //       let data = doc.data();
    //       data.id = doc.id;
    //       Leads.push(data);
    //     });
    //   });
    for (let i = 0; i < Leads.length; i++) {
        console.log("leadPayload", Leads[i].id);
        await CreateCustomer(Leads[i], false)
    }
    res.status(200).send()
  } catch (e) {
    res.status(500).send({ "error": e });
  }
});

router.get("/ProjectCustomers", async (req, res) => {
  try {
    let Projects = [];
    await db
      .collection("Projects")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          Projects.push(data);
        });
      });
    for (let i = 0; i < Projects.length; i++) {
      await CreateCustomer(Projects[i], false);
    }
    res.status(200).send()
  } catch (e) {
    res.status(500).send({ "error": e });
  }
});
router.get("/WebHookCustomers", async (req, res) => {
//   try {
    let WebHook = [];
    await db
      .collection("WebHook")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          WebHook.push(data);
        });
      });
    for (let i = 0; i < WebHook.length; i++) {
      await CreateCustomer(WebHook[i], false);
    }
    res.status(200).send()
  
});

module.exports = router;