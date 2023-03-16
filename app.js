require("dotenv").config();
const mysql = require("mysql");
const axios = require("axios");
var formidable = require("formidable");
const fetch = require("node-fetch");
let headers = new fetch.Headers();
const algoliasearch = require("algoliasearch");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const stream = require("stream");
const lodash = require("lodash");
const uuid = require("uuid").v4;
const bcrypt = require("bcrypt");
const { JsonWebTokenError } = require("jsonwebtoken");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const crypto = require("crypto");
const ejs = require("ejs");
const jwt_decode = require("jwt-decode");
const { GoogleAuth } = require("google-auth-library");
// const moment = require('moment');
const emailconfig = require("./emailConfig.js");
const Email = require("email-templates");
const moment = require("moment-timezone");
let nodemailer = require("nodemailer");
var cors = require("cors");
const Proposal = require("./routes/Proposal");
const CreateCustomer1 = require("./routes/CreateCustomer");
const User = require("./routes/User");
const WebHook = require("./routes/WebHook");
const Leads = require("./routes/Leads");
const customer = require("./routes/customer");
const Tasks = require("./routes/Tasks");
const db = require("./routes/FirebaseDB");
const updateLeadStatusName = require("./routes/updateStatusName");
const authenticateToken = require("./routes/authenticateToken");
const updateCreatedBy = require("./routes/updateCreatedBy");
const Authorize = require("./routes/GoogleAuth/Authorize");
const getOAuth2Client = require("./routes/GoogleAuth/getOAuth2");
const sendProposal = require("./routes/sendProposal");
process.env.TZ = "Canada/Eastern";
let transporter = nodemailer.createTransport({
  service: "gmail",
  host: emailconfig.host,
  port: emailconfig.port,
  iSsecure: emailconfig.iSsecure,

  auth: {
    user: emailconfig.username,
    pass: emailconfig.password,
  },
});

const emailObj = new Email({
  views: { root: "./templates", options: { extension: "ejs" } },
  message: {
    from: emailconfig.from,
    subject: "",
  },
  preview: false,
  send: true,
  transport: transporter,
});

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

const TOKEN_PATH = "token.json";

const path = require("path");
const MailComposer = require("nodemailer/lib/mail-composer");

const encodeMessage = (message) => {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const createMail = async (options) => {
  const mailComposer = new MailComposer(options);
  const message = await mailComposer.compile().build();
  return encodeMessage(message);
};
const sendMail = async (options) => {
  const gmail = google.gmail({ version: "v1", auth: await getOAuth2Client() });
  const rawMessage = await createMail(options);
  const { data: { id } = {} } = await gmail.users.messages.send({
    userId: "me",
    resource: {
      raw: rawMessage,
    },
  });
  return id;
};

const client = algoliasearch(process.env.ALGO_APP_ID, process.env.ALGO_API_KEY);

const auth = require("./routes/authentication");
const { json, query, response } = require("express");
const { Console } = require("console");
const { promisify } = require("util");
const { start } = require("repl");
const { get } = require("http");
const { gmail } = require("googleapis/build/src/apis/gmail");
const { oauth2 } = require("googleapis/build/src/apis/oauth2");
const MailMessage = require("nodemailer/lib/mailer/mail-message");
const { drive } = require("googleapis/build/src/apis/drive");
const e = require("express");
const { features } = require("process");
const { docs } = require("googleapis/build/src/apis/docs");

const { all } = require("./routes/authentication");
const {
  last,
  result,
  before,
  lowerFirst,
  first,
  create,
  isBoolean,
} = require("lodash");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/views/pages"));
app.use(express.static(__dirname + "/views/assets"));
app.use(express.json());
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(cookieParser());
app.use(cors());

app.use(auth);
// app.use(upload());
app.get("/ff", async (req, res) => {
  // await updateCreatedBy()
  await db
    .collection("Leads")
    .doc("fZy0DeMBFW0tOxekoEVq")
    .set()
    .then(() => res.status(200).send("added"));
});
app.post("/newLeads", authenticateToken, async (req, res) => {
  try {
    console.log(req.user);
    const index = client.initIndex("Leads");
    index.setSettings({
      customRanking: [],
    });
    if (req.body.sortAttribute !== "" && req.body.sortAttribute !== undefined) {
      console.log("hits");
      index.setSettings({
        customRanking: [`${req.body.order}(${req.body.sortAttribute})`],
      });
    }
    index.setSettings({
      customRanking: ["desc(statusName)"],
    });
    let page;
    if (req.body.page == undefined) {
      page = 1;
    } else {
      page = req.body.page;
    }
    let hits = [];
    // index
    //   .search('Ashir')
    index
      .search("", {
        page: parseInt(page) - 1,
        hitsPerPage: 10,
      })
      .then(({ hits }) => {
        // console.log("hits", hits);
        res.status(200).send(hits);
      })
      .catch((e) => {
        console.log("errror", e);
      });
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("/login", async (req, res) => {
  try {
    res.render("pages/login");
  } catch {
    res.status(500).send();
  }
});

// get an data ffrom another collection of data

app.post("/login", async (req, res) => {
  try {
    const Users = db.collection("Users");
    let userRole = "";
    let userRoleId = "";
    let featureObject = [];
    let permissions = [];
    const allUsers = Users.where("email", "==", req.body.email.toLowerCase())
      .get()
      .then((query) => {
        console.log("query", query.size);
        if (query.size === 0) {
          res.status(404).send("User Not Found");
        } else {
          let data = {};
          query.docs.forEach((doc) => {
            data = doc.data();
            data.id = doc.id;
          });
          db.collection("AccessLevels")
            .doc(data.accessLevel)
            .get()
            .then(async (e) => {
              console.log(e.data().Level);
              userRole = e.data().Level;
              userRoleId = e.id;
            })
            .then(() => {
              let password = "";
              bcrypt
                .compare(req.body.password, data.password)
                .then((e) => {
                  password = e;
                })
                .then(() => {
                  if (password == true && data.active == true) {
                    db.collection("AccessLevelAccess")
                      .where("accessLevelId", "==", data.accessLevel)
                      .get()
                      .then((e) => {
                        e.docs.forEach((doc) => {
                          ds = doc.data();
                          ds.id = doc.id;
                          featureObject.push(ds);
                        });
                      })
                      .then(async () => {
                        let sAccess = [];
                        const subAccess = await db
                          .collection("SubAccess")
                          .get();
                        subAccess.forEach((doc) => {
                          d = doc.data();
                          d.id = doc.id;
                          sAccess.push(d);
                        });
                        let count = 0;
                        for (let i = 0; i < featureObject.length; i++) {
                          for (let j = 0; j < sAccess.length; j++) {
                            if (
                              featureObject[i].subAccessId === sAccess[j].id
                            ) {
                              permissions.push({
                                accessValues: featureObject[i].accessValues,
                                featureName: sAccess[j].featureName,
                              });
                            }
                          }
                        }
                      })
                      .then(() => {
                        const user = {
                          id: data.id,
                          name: data.name,
                          email: data.email,
                          locationId: data.locationId,
                          accessLevelId: data.accessLevel,
                          calId: data.calId,
                          profilePic: data.profilePic ? data.profilePic : null,
                          role: userRole,
                          permissions: permissions,
                        };
                        const access_token = jwt.sign(
                          user,
                          process.env.ACCESS_TOKEN_SECRET
                        );
                        // { expiresIn: "30m" }
                        res.cookie("access_token", access_token, {
                          maxAge: 0.5 * 60 * 1000,
                          httpOnly: true,
                          secure: process.env.NODE_ENV === "production",
                        });
                        res.status(200).send({ user, access_token });
                      });
                  } else {
                    res.status(404).send("Password Wrong");
                  }
                });
            });
        }
      });
  } catch {
    res.send(500).send();
  }
});

app.post("/loginAsUser", async (req, res) => {
  try {
    // let canView = await isAllowedToView3(
    //   "users-view",
    //   req.user,
    //   "users-view-action"
    // );
    // if (canView.rank > 1) {

    const Users = db.collection("Users");
    let userRole = "";
    let userRoleId = "";
    let featureObject = [];
    let permissions = [];
    const allUsers = Users.where("email", "==", req.body.email)
      .get()
      .then((query) => {
        if (query.size === 0) {
          res.status(404).send("User Not Found");
        } else {
          let data = {};
          query.docs.forEach((doc) => {
            data = doc.data();
            data.id = doc.id;
          });
          db.collection("AccessLevels")
            .doc(data.accessLevel)
            .get()
            .then(async (e) => {
              console.log(e.data().Level);
              userRole = e.data().Level;
              userRoleId = e.id;
            })
            .then(() => {
              if (req.body.password == data.password) {
                db.collection("AccessLevelAccess")
                  .where("accessLevelId", "==", data.accessLevel)
                  .get()
                  .then((e) => {
                    e.docs.forEach((doc) => {
                      ds = doc.data();
                      ds.id = doc.id;
                      featureObject.push(ds);
                    });
                  })
                  .then(async () => {
                    let sAccess = [];
                    const subAccess = await db.collection("SubAccess").get();
                    subAccess.forEach((doc) => {
                      d = doc.data();
                      d.id = doc.id;
                      sAccess.push(d);
                    });
                    let count = 0;
                    for (let i = 0; i < featureObject.length; i++) {
                      for (let j = 0; j < sAccess.length; j++) {
                        if (featureObject[i].subAccessId === sAccess[j].id) {
                          permissions.push({
                            accessValues: featureObject[i].accessValues,
                            featureName: sAccess[j].featureName,
                          });
                        }
                      }
                    }
                  })
                  .then(() => {
                    const user = {
                      id: data.id,
                      name: data.name,
                      email: data.email,
                      locationId: data.locationId,
                      accessLevelId: data.accessLevel,
                      calId: data.calId,
                      profilePic: data.profilePic ? data.profilePic : null,
                      role: userRole,
                      permissions: permissions,
                    };
                    const access_token = jwt.sign(
                      user,
                      process.env.ACCESS_TOKEN_SECRET
                    );
                    res.cookie("access_token", access_token, {
                      maxAge: 30 * 60 * 1000,
                      httpOnly: true,
                      secure: process.env.NODE_ENV === "production",
                    });
                    res.status(200).send({ user, access_token });
                  });
              } else {
                res.status(404).send("Password Wrong");
              }
            });
        }
      });
  } catch {
    res.send(500).send();
  }
});
//Authenticated

app.get("/apiExpenses", async (req, res) => {
  try {
    const index = client.initIndex("Projects");

    // only query string
    index.search(req.query.userInput).then(({ hits }) => {
      return res.json(hits);
    });

    // return res.json(projects).status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.get("/cast", async (req, res) => {
  try {
    const query = "SELECT * FROM breeds WHERE name = ?";
    pool.query(query, [req.params.breed], (error, results) => {
      console.log(req.params.breed);

      if (!results[0]) {
        res.json({ status: "Not Found!" });
      } else {
        res.json(results[0]);
      }
    });

    return res.json(data).status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.get("/getAllPayments", authenticateToken, async (req, res) => {
  try {
    let payments = [];
    let data;
    await db
      .collection("Payments")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          data = doc.data();
          data.paymentId = doc.id;
          payments.push(data);
        });
        res.status(200).send(payments);
      });
  } catch {
    res.status(500).send();
  }
});

app.get("/deletePayments", authenticateToken, async (req, res) => {
  try {
    db.collection("Payments")
      .doc(req.query.paymentId)
      .delete()
      .then(async () => {
        res.status(200).send("Payment Deleted");
      });
  } catch {
    res.status(500).send();
  }
});

app.get("/payment", async (req, res) => {
  try {
    let data;
    await db
      .collection("Payments")
      .doc(req.query.paymentId)
      .get()
      .then((snapshot) => {
        data = snapshot.data();
        res.status(200).send(data);
      })
      .catch(() => {
        res.status(500).send("not founf");
      });
  } catch {
    res.status(500).send();
  }
});

app.post("/payment", async (req, res) => {
  if (req.body.method == "delete") {
    db.collection("Payments")
      .doc(req.body.paymentId)
      .delete()
      .then(async () => {
        req.body = req.body;
        res.redirect("/payments");
        console.log("Payment Deleted!");
        return;
      });
  } else {
    const payment = {
      datePaid: req.body.datePaid,
      installCommission: req.body.installCommission,
      CAPPayment: req.body.CAPPayment,
      clawbackBONUS: req.body.clawbackBONUS,
      totalinPeriod: req.body.totalinPeriod,
      prevPaid: req.body.prevPaid,
      totalProjectCommission: req.body.totalProjectCommission,
      projectId: req.body.projectId,
    };
    try {
      if (req.body.method == "put") {
        db.collection("Payments")
          .doc(req.body.paymentId)
          .update(payment)
          .then(async () => {
            req.body = req.body;
            res.redirect("/payments");
            console.log("Payment Updated!");
            return;
            //return res.status(202).send();
          });
      } else {
        db.collection("Payments")
          .add(payment)
          .then(async () => {
            req.body = req.body;
            res.redirect("/payments");
            console.log("New Payment Added!");
            return;
          });
      }
    } catch {
      res.status(500).send();
    }
  }
});
app.get("/expense", async (req, res) => {
  try {
    let snapshot = await db
      .collection("Expenses")
      .doc(req.query.expenseId)
      .get();
    let data = snapshot.data();

    if (data.leadId) {
      snapshot = await db.collection("Leads").doc(data.leadId).get();
      data.lead = await snapshot.data();
    }

    res.status(200).send(data);
  } catch {
    res.status(500).send();
  }
});
app.get("/getAllExpenses", authenticateToken, async (req, res) => {
  try {
    console.log(req.user);
    let canViewExpenses = await isAllowedToView3("expenses-view", req.user);
    console.log("canView1", canViewExpenses.rank);
    if (parseInt(canViewExpenses.rank) > 1) {
      let allExpenses = [];
      let dateFormated = [];
      let snapshot = await db
        .collection("Expenses")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach(async (doc) => {
            data = doc.data();
            data.id = doc.id;
            allExpenses.push(data);
          });
        });
      allExpenses.sort(function (a, b) {
        return new Date(b.invoiceDate) - new Date(a.invoiceDate);
      });
      // for (let i = 0; i < allExpenses.length; i++) {
      //   let invoiceDate = await allExpenses[i].invoiceDate.toDate();
      //   let momentDate = await moment(invoiceDate).format("YYYY/MM/DD");
      //   allExpenses[i].invoiceDate = momentDate;
      //   dateFormated.push(allExpenses[i]);
      // }

      res.status(200).send(allExpenses);
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(500).send();
  }
});
app.post("/expense", async (req, res) => {
  try {
    if (req.body.method == "delete") {
      db.collection("Expenses")
        .doc(req.body.expenseId)
        .delete()
        .then(async () => {
          res.status(200).send(`Expenses Deleted`);
          // req.body = req.body;
          // res.redirect("/expenses");
          // console.log("Expense Deleted!");
          // return;
        });
    } else {
      let date = new Date(req.body.invoiceDate);
      let momentDate = moment(date).format("YYYY/MM/DD");
      console.log("date", momentDate);
      const expense = {
        invoiceDate: momentDate,
        description: req.body.description,
        category: req.body.categoryId,
        amount: req.body.amount,
        status: req.body.status,
        userId: req.body.user,
        leadId: req.body.leadId,
      };
      if (expense.category == "HjntRw3hvVRppk2ocIyl") {
        expense.clawedBack = false;
      }
      if (expense.status == 1) {
        expense.status = false;
      } else {
        expense.status = true;
      }
      try {
        if (req.body.method == "put") {
          console.log(req.body);

          db.collection("Expenses")
            .doc(req.body.expenseId)
            .update(expense)
            .then(async () => {
              res.status(200).send("Expense Updated!");
            });
        } else {
          db.collection("Expenses")
            .add(expense)
            .then(async () => {
              res.status(200).send("Expenses Added");
            });
        }
      } catch (e) {
        console.log("err", e);
        res.status(500).send();
      }
    }
  } catch (e) {
    console.log("err", e);
    res.status(500).send();
  }
});
app.get("/project", async (req, res) => {
  try {
    const snapshot = await db
      .collection("Projects")
      .doc(req.query.projectId)
      .get();
    const data = snapshot.data();
    return res.json(data).status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.post("/project", async (req, res) => {
  if (req.body.method == "delete") {
    db.collection("Projects")
      .doc(req.body.projectId)
      .delete()
      .then(async () => {
        res.status(200).send("Project Deleted");
      });
  } else {
    const project = {
      customerName: req.body.customerName,
      systemSize: req.body.systemSize,
      grossPPW: req.body.grossPPW,
      redline: req.body.redline,
      sOW: req.body.sOW,
      rep: req.body.rep,
      setter: req.body.setter,
      secondaryRep: req.body.secondaryRep,
      secondaryRepSplit: req.body.secondaryRepSplit,
      product: req.body.product,
      installPartner: req.body.installPartner,
      stateUtility: req.body.stateUtility,
      cancelDate: req.body.cancelDate,
      approvedDate: req.body.approvedDate,
      cAPDate: req.body.cAPDate,
      installDate: req.body.installDate,
      paidUpfrontDate: req.body.paidUpfrontDate,
      paidInstallDate: req.body.paidInstallDate,
      dealerFeePercent: req.body.dealerFeePercent,
      dealerFeeDollars: req.body.dealerFeeDollars,
      tsp: req.body.tsp,
    };
    try {
      if (req.body.method == "put") {
        db.collection("Projects")
          .doc(req.body.projectId)
          .update(project)
          .then(async () => {
            res.status(200).send("Project Updated");
          });
      } else {
        db.collection("Projects")
          .add(project)
          .then(async () => {
            res.status(200).send("New Project Added!");
            // req.body = req.body;
            // res.redirect("/projects");
            // console.log("New Project Added!");
            // return;
          });
      }
    } catch (e) {
      res.status(500).send(e);
    }
  }
});

app.post("/api/createAccessLevel", async (req, res) => {
  try {
    await db
      .collection("AccessLevels")
      .add({
        Level: req.body.levelName,
      })
      .then((data) => {
        newAccessLevelId = data.id;
      });

    const subAccesses = await db.collection("SubAccess").get();
    subAccesses.forEach(async (datum) => {
      sId = datum.id;
      AccessLevelAccess = {
        subAccessId: sId,
        accessLevelId: newAccessLevelId,
        accessVal: req.body.accessLevel,
      };
      console.log(AccessLevelAccess);
      await db.collection("AccessLevelAccess").add(AccessLevelAccess);
    });

    res.redirect("/views/manageRoles");
  } catch {
    res.status(500).send();
  }
});

app.post("/api/appointmentOutcome", async (req, res) => {
  if (req.body.method == "delete") {
    await db
      .collection("AppointmentOutcomes")
      .doc(req.body.apptOutcome)
      .delete()
      .then(async () => {
        res.status(200).send("Status Deleted!");
      });
  } else console.log(req.body);
  {
    Status = {
      name: req.body.statusName,
      isSit: !req.body.isSit ? false : true,
      reschedule: !req.body.reschedule ? false : true,
      notesRequired: !req.body.notesRequired ? false : true,
      paymentTrigger: !req.body.paymentTrigger ? false : true,
    };
    try {
      if (req.body.method == "put") {
        await db
          .collection("AppointmentOutcomes")
          .doc(req.body.apptOutcome)
          .update(Status)
          .then(async () => {
            res.status(200).send("Status Updated!");
            // console.log("Status Updated!");
          });
      } else {
        await db
          .collection("AppointmentOutcomes")
          .add(Status)
          .then(async () => {
            res.status(200).send("Status Added");
            console.log("Status Added!");
          });
      }
    } catch {
      res.status(500).send();
    }
  }
});
app.post("/api/createAccess", async (req, res) => {
  const allAccess = await db.collection("Access").get();

  return await db.collection("Access").add({
    category: req.body.category,
    displayName: req.body.displayName,
    keyword: req.body.keyword,
  });
});

app.post("/api/createSubAccess", async (req, res) => {
  await db
    .collection("SubAccess")
    .add({
      accessId: req.body.accessId,
      displayName: req.body.displayName,
      featureName: req.body.featureName,
    })
    .then((data) => {
      newSubAccessLevelId = data.id;
    });

  const accessLevels = await db.collection("AccessLevels").get();
  accessLevels.forEach(async (datum) => {
    aId = datum.id;
    AccessLevelAccess = {
      subAccessId: newSubAccessLevelId,
      accessLevelId: aId,
      accessValues: req.body.accessLevel,
    };
    console.log(AccessLevelAccess);
    await db.collection("AccessLevelAccess").add(AccessLevelAccess);
  });
});

app.get("/getAllProjects", authenticateToken, async (req, res) => {
  try {
    const allProjs = await db.collection("Projects").get();
    let projects = [];
    allProjs.forEach(async (doc) => {
      data = doc.data();
      data.projectId = doc.id;
      console.log("dateCreated", data.id, data.created);
      projects.push(data);
    });
    console.log("project length", projects.length);
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].leadId !== undefined && projects[i].leadId !== "") {
        let lead = await getLeads(projects[i].leadId);
        if (lead.id !== undefined) {
          projects[i].lead = lead;
        }
      }
    }
    let sorted = projects.sort((a, b) => {
      let aDate = new Date(a.created);
      let bDate = new Date(b.created);
      console.log(aDate, bDate);
      return bDate - aDate;
    });
    res.status(200).send(sorted);
  } catch {
    res.status(500).send();
  }
});

app.get("/", authenticateToken, (req, res) => {
  res.redirect("/home");
});

app.get("/home", authenticateToken, async (req, res) => {
  // createAccessLevel('Lowest')
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      res.render("pages/home", {
        data,
      });
    });
  } catch {
    res.status(500).send();
  }

  //hashes clean up
});

app.get("/views/reports", authenticateToken, async (req, res) => {
  // createAccessLevel('Lowest')
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      res.render("pages/reports", {
        data,
      });
    });
  } catch {
    res.status(500).send();
  }
});

app.get("/views/reports2", authenticateToken, async (req, res) => {
  // createAccessLevel('Lowest')
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      res.render("pages/reports2", {
        data,
      });
    });
  } catch {
    res.status(500).send();
  }
  //hashes clean up
});

app.get("/views/leaderboard", authenticateToken, async (req, res) => {
  // createAccessLevel('Lowest')
  try {
    leaderboardData = await getCloserLeaderboardData();
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      res.render("pages/leaderboard", {
        data,
        leaderboardData,
      });
    });
  } catch {
    res.status(500).send();
  }
});

app.get("/views/leaderboardSetters", authenticateToken, async (req, res) => {
  // createAccessLevel('Lowest')
  try {
    leaderboardData = await getSetterLeaderboardData();
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      res.render("pages/leaderboardSetters", {
        data,
        leaderboardData,
      });
    });
  } catch {
    res.status(500).send();
  }
});
app.get("/getLeads", async (req, res) => {
  try {
    const snapshot = await db.collection("Leads").doc(req.query.leadId).get();
    const data = await snapshot.data();

    if (data.rep != undefined) {
      data.rep = await getUser(data.rep);
    }
    if (data.setter != undefined) {
      data.setter = await getUser(data.setter);
    }

    return res.status(200).send(data);
  } catch {
    res.status(500).send();
  }
});

app.post("/leadProject", async (req, res) => {
  try {
    let updatedProject;
    await db
      .collection("Projects")
      .doc(req.body.projectId)
      .get()
      .then(async (doc) => {
        updatedProject = {
          leadId: req.body.leadId,
        };
        if (doc.data().setCommPaid == null) {
          updatedProject.setCommPaid = false;
        }
        if (doc.data().m1Paid == null) {
          updatedProject.m1Paid = false;
        }
        if (doc.data().m2Paid == null) {
          updatedProject.m2Paid = false;
        }
        await db
          .collection("Projects")
          .doc(req.body.projectId)
          .update(updatedProject)
          .then(() => {
            res.status(200).send("Project updated");
          })
          .catch((e) => res.status(200).send(e));
      });
  } catch {
    res.status(500).send();
  }
});

async function isAdminUser(user, next) {
  const snapshot = await db
    .collection("AccessLevels")
    .doc(user.accessLevel)
    .get();
  const AccessLevel = snapshot.data();
  if (AccessLevel.Level == "Superadmin") {
    user.admin = true;
    user.manager = true;
    user.superadmin = true;
  } else {
    user.superadmin = false;
    if (AccessLevel.Level == "Admin") {
      user.admin = true;
      user.manager = true;
    } else {
      user.admin = false;
      if (AccessLevel.Level == "Manager") {
        user.manager = true;
      } else {
        user.manager = false;
      }
    }
  }
  next();
}

app.get("/locationName", authenticateToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("Locations")
      .doc(req.query.locationId)
      .get();

    const data = snapshot.data();
    return res.json(data).status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.get("/api/getUserActivity", authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection("Users").doc(req.query.userId).get();

    const data = snapshot.data();
    return res.json(data).status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.post("/api/updateUserActivity", async (req, res) => {
  try {
    let userId = req.body.userId;
    // converts string to bool
    // var isActive = req.body.isActive === "true";
    await db
      .collection("Users")
      .doc(userId)
      .get()
      .then((doc) => {
        if (doc.data().active == false) {
          doc.ref.update({
            active: true,
          });
        } else {
          doc.ref.update({
            active: false,
          });
        }

        res.status(200).send("Updated");
      });
  } catch {
    res.status(500).send();
  }
});

app.get("/user", async (req, res) => {
  try {
    // let canView = await isAllowedToView3(
    //   "user-view",
    //   req.user,
    //   "user-view-action"
    // );
    // if (parseInt(canView.rank) > 1) {
    const snapshot = await db.collection("Users").doc(req.query.userId).get();

    const data = snapshot.data();
    // if(data.referrer!== ""){
    //    data.referrer = await getUsers(data.referrer)
    // }
    // if(data.referrer!== ""){
    //    data.referrer = await getUsers(data.referrer)
    // }
    console.log("/user GET Successful");
    res.status(200).send(data);
    // } else {
    //   res.status(404).send("Dont have accessed to this page");
    // }
  } catch {
    console.log("/user Error");
    res.status(500).send();
  }
});

app.get("/users", authenticateToken, async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );
    if (parseInt(canView.rank) > 1) {
      let locationsArray = [];
      const locations = await db.collection("Locations").get();

      locations.forEach((doc) => {
        location = doc.data();
        location.id = doc.id;
        locationsArray.push(location);
      });

      const index = client.initIndex("Users");

      canView = await isAllowedToView3(
        "users-view",
        req.user,
        "users-view-action"
      );
      console.log("CanView", canView);
      let userInput = req.query.userInput;
      if (userInput == undefined) {
        userInput = "";
      }
      let hits = [];
      console.log(userInput + " " + canView.id);
      index
        .browseObjects({
          query: canView.id == "" ? userInput : userInput + " " + canView.id,
          batch: (batch) => {
            hits = hits.concat(batch);
          },
        })

        .then(async () => {
          console.log(hits);
          for (let h = 0; h < hits.length; h++) {
            const locationName = locationsArray.filter((location) => {
              return location.id === hits[h].locationId;
            });
            console.log(locationName);
            hits[h].locationName = locationName[0];

            console.log(hits[h]);
          }
          console.log("/users GET Successful");
          return res.status(200).send(hits);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    console.log("/users Error");
    res.status(500).send();
  }
});
app.get("/allUsers", authenticateToken, async (req, res) => {
  try {
    let locationsArray = [];
    const locations = await db.collection("Locations").get();

    locations.forEach((doc) => {
      location = doc.data();
      location.id = doc.id;
      locationsArray.push(location);
    });

    const index = client.initIndex("Users");

    canView = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );
    console.log("CanView", canView);
    let userInput = req.query.userInput;
    if (userInput == undefined) {
      userInput = "";
    }
    let hits = [];
    console.log(userInput + " " + canView.id);
    index
      .browseObjects({
        query: canView.id == "" ? userInput : userInput + " " + canView.id,
        batch: (batch) => {
          hits = hits.concat(batch);
        },
      })

      .then(async () => {
        console.log(hits);
        for (let h = 0; h < hits.length; h++) {
          const locationName = locationsArray.filter((location) => {
            return location.id === hits[h].locationId;
          });
          console.log(locationName);
          hits[h].locationName = locationName[0];

          console.log(hits[h]);
        }
        return res.status(200).send(hits);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/allClosers", authenticateToken, async (req, res) => {
  try {
    let locationsArray = [];
    const locations = await db.collection("Locations").get();

    locations.forEach((doc) => {
      location = doc.data();
      location.id = doc.id;
      locationsArray.push(location);
    });

    const index = client.initIndex("Users");

    canView = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );
    console.log("CanView", canView);
    let userInput = req.query.userInput;
    if (userInput == undefined) {
      userInput = "";
    }
    let hits = [];
    let closers = [];
    console.log(userInput + " " + canView.id);
    index
      .browseObjects({
        query: canView.id == "" ? userInput : userInput + " " + canView.id,
        batch: (batch) => {
          hits = hits.concat(batch);
        },
      })

      .then(async () => {
        console.log(hits);
        for (let h = 0; h < hits.length; h++) {
          if (
            hits[h].accessLevel !== "y3L0EGYgGTO1ooUZh7Nj" &&
            hits[h].available == true
          ) {
            const locationName = locationsArray.filter((location) => {
              return location.id === hits[h].locationId;
            });
            console.log(locationName);
            hits[h].locationName = locationName[0];

            console.log(hits[h]);
            closers.push(hits[h]);
          }
        }
        return res.status(200).send(closers);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/locations", authenticateToken, async (req, res) => {
  try {
    let locationsArray = [];
    const locations = await db.collection("Locations").get();

    locations.forEach((doc) => {
      location = doc.data();
      location.id = doc.id;

      locationsArray.push(location);
    });
    return res.status(200).send(locationsArray);
  } catch {
    res.status(404).send();
  }
});

app.get("/reAssignLeadsUser", authenticateToken, async (req, res) => {
  try {
    let leadLocation = await getLeads(req.query.leadId);
    let allUsers = [];
    let locationName = [];
    let Setters = [];
    let Rep = [];
    await db
      .collection("Users")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          if (
            data.available == true &&
            data.locationId == leadLocation.locationId
          ) {
            allUsers.push(data);
            console.log(allUsers);
          }
        });
      });
    await db
      .collection("Locations")
      .doc(leadLocation.locationId)
      .get()
      .then((doc) => {
        data = doc.data();
        data.id = doc.id;
        console.log("leadLocation", data.id);
        locationName.push(data);
      });
    for (let i = 0; i < allUsers.length; i++) {
      for (let j = 0; j < locationName.length; j++) {
        if (allUsers[i].locationId === locationName[j].id) {
          allUsers[i].locationName = locationName[j];
        }
      }
    }
    for (let i = 0; i < allUsers.length; i++) {
      if (allUsers[i].accessLevel == "y3L0EGYgGTO1ooUZh7Nj") {
        Setters.push(allUsers[i]);
      }
      if (allUsers[i].accessLevel !== "y3L0EGYgGTO1ooUZh7Nj") {
        Rep.push(allUsers[i]);
      }
    }
    res.status(200).send({
      Setters: Setters,
      Reps: Rep,
    });
  } catch {
    res.status(500).send();
  }
});

app.get("/dropdown", authenticateToken, async (req, res) => {
  res.render("pages/dropdown");
});

app.get("/userEmails", authenticateToken, async (req, res) => {
  try {
    const users = db.collection("Users");
    const snapshot = await users.get();
    let allEmails = [];

    snapshot.forEach((doc) => {
      data = doc.data();
      allEmails.push(data.email);
    });

    return res.status(200).send(allEmails);
  } catch {
    res.status(500).send();
  }
});

async function checkAllHashes() {
  const hashes = await db.collection("Hashes").get();

  hashes.forEach(async (doc) => {
    var isInTime = await isHashExpired(doc.id);

    if (!isInTime) {
      console.log(doc.id + " " + isInTime);
      deleteHash(doc.id);
    }
  });
}

// if there are multiple subAccesses for one Access, you need to specify a subAccessFeatureName
async function isAllowedToView3(functionName, user, subAccessFeatureName = "") {
  let allowLevel = {
    rank: 4,
    id: "",
  };

  const access = await db
    .collection("Access")
    .where("keyword", "==", functionName)
    .get();
  console.log("access", access.size);
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
app.get("/views/users", authenticateToken, async (req, res) => {
  try {
    isAllowed = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );

    loginAsUserFunctionality = await isAllowedToView3("loginAsUser", req.user);
    var loginLevel = 4;
    var canLoginAsUser =
      parseInt(loginAsUserFunctionality.rank) == loginLevel ? true : false;

    if (parseInt(isAllowed.rank) > 1) {
      checkAllHashes();

      const allUsers = await db.collection("Users").get();
      let users = [];
      allUsers.forEach(async (doc) => {
        data = doc.data();
        data.userId = doc.id;
        users.push(data);
      });

      const Users = db.collection("Users");
      const usersSnap = await Users.where("email", "==", req.user.email).get();
      usersSnap.forEach((doc) => {
        user = doc.data();
      });

      await isAdminUser(user, () => {
        data = {
          superadmin: user.superadmin,
          admin: user.admin,
          manager: user.manager,
        };
        console.log(data);
        // return res.json(data)
        res.render("pages/users", {
          data,
          canLoginAsUser,
        });
      });
    }
  } catch {
    res.status(500).send();
  }
});

app.get("/views/settings", authenticateToken, async (req, res) => {
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    await isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      console.log(data);
      res.render("pages/settings", {
        data,
      });
    });
  } catch {
    res.status(500).send();
  }
});

// Paystubs Start
app.get("/views/paystubs", async (req, res) => {
  try {
    let paystubs = await getAllpaystubs();

    res.render("pages/paystubs", {
      paystubs,
    });
  } catch {
    res.status(500).send();
  }
});
async function getAllpaystubs() {
  const allpaystubs = await db.collection("Paystubs").get();
  let paystubs = [];
  allpaystubs.forEach(async (doc) => {
    data = doc.data();
    data.id = doc.id;
    paystubs.push(data);
  });
  return paystubs;
}
// Paystubs End

//Payroll Start
app.get("/getPayrolls", authenticateToken, async (req, res) => {
  try {
    let canViewPayroll = await isAllowedToView3(
      "payroll-view",
      req.user,
      "payroll-view-action"
    );
    if (parseInt(canViewPayroll.rank) > 1) {
      let allnames = [];
      let allExpenses = [];
      let combineArray = [];
      // let payrolls = await getAllpayrolls();
      await db
        .collection("Users")
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            data = doc.data();
            data.id = doc.id;
            allnames.push(data);
          });
        });
      await db
        .collection("Expenses")
        .get()
        .then((e) => {
          e.forEach(async (doc) => {
            if (doc?.data().status === false) {
              data = doc.data();
              allExpenses.push(data);
            }
          });
        });
      for (let i = 0; i < allnames.length; i++) {
        let expenses = [];
        console.log(allnames[i]?.id);
        for (let j = 0; j < allExpenses.length; j++) {
          console.log(allExpenses[j].userId);
          if (
            allExpenses[j].category == "xGu6ZnUqP7xItEDCr4iR" &&
            allExpenses[j].userId == allnames[i]?.id
          ) {
            if (
              allExpenses[j].leadId !== "" &&
              allExpenses[j].leadId !== null
            ) {
              allExpenses[j].leadId = await getLeads(allExpenses[j].leadId);
              expenses.push(allExpenses[j]);
            }
          }
        }

        if (expenses.length === 0) {
        } else {
          combineArray.push({
            user: allnames[i],
            expenses: expenses,
          });
        }
      }

      res.status(200).send(combineArray);
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(500).send();
  }
});

app.post("/updatePayroll", authenticateToken, async (req, res) => {
  try {
    let canViewPayroll = await isAllowedToView3(
      "payroll-view",
      req.user,
      "payroll-view-action"
    );
    if (parseInt(canViewPayroll.rank) > 1) {
      await db
        .collection("Expenses")
        .where("status", "==", false)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            if (
              req.body.userId == doc.data().userId &&
              doc.data().category == "xGu6ZnUqP7xItEDCr4iR"
            ) {
              doc.ref.update({
                status: true,
              });
            }
          });
        });
      res.status(200).send("Expense Statuses Updated");
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(500).send();
  }
});

app.post("/updatePayrollamount", authenticateToken, async (req, res) => {
  try {
    let leadSetter = [];
    await db
      .collection("Users")
      .doc(req.body.userId)
      .get()
      .then(async (e) => {
        data = e.data();
        e.ref.update({
          totalAmount:
            parseInt(req.body.amount) + parseInt(e.data().totalAmount),
        });
      });

    await db
      .collection("Leads")
      .where("setter", "==", req.body.userId)
      .where("sitPaid", "==", false)
      .get()
      .then((querySanpshot) => {
        console.log("sixw", querySanpshot.size);
        querySanpshot.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          doc.ref.update({
            sitPaid: true,
            Amount: 100,
          });
          leadSetter.push(data);
        });
      })
      .then(async () => {
        console.log("leadsetter", leadSetter);
        if (leadSetter.length != 0) {
          for (i = 0; i < leadSetter.length; i++) {
            if (i == leadSetter.length) {
              return;
            } else {
              const currdate = moment(new Date()).format("YYYY/MM/DD");
              await db
                .collection("Expenses")
                .add({
                  invoiceDate: currdate,
                  description: "sit Pay",
                  category: req.body.categoryId,
                  amount: 100,
                  status: "Paid",
                  userId: req.body.userId,
                  leadId: leadSetter[i].id,
                })
                .then(() => {
                  console.log("added");
                });
            }
          }
        } else {
          res.status(200).send("no leads");
        }
      });

    res.status(200).send("Successfully Paid");
  } catch {
    res.status(500).send();
  }
});
async function getAllpayrolls() {
  const allpayrolls = await db
    .collection("Leads")
    .where("sitPaid", "==", false)
    .where("setter", "==", "eM50deh4yPcv46AtnAVF")
    .get();
  let payrolls = [];
  allpayrolls.forEach(async (doc) => {
    data = doc.data();
    data.id = doc.id;
    payrolls.push(data);
  });
  console.log("payrolls", payrolls);
  return payrolls;
}
//Payroll end

//Manage Statuses Start

app.get("/views/manageStatuses", authenticateToken, async (req, res) => {
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    let allmanageStatuses = await getAllAppointmentOutcomes();

    await isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      // console.log(allApptOutcomes);
      res.render("pages/manageStatuses", {
        data,
        allmanageStatuses,
      });
    });
  } catch {
    res.status(500).send();
  }
});

//Manage Statuses End

app.get("/views/manageRoles", authenticateToken, async (req, res) => {
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    let accessLevels = await getAllAccessLevels();

    await isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      console.log(data);
      res.status(200).send({
        data,
        accessLevels,
      });
      // res.render("pages/manageRoles", {
      //   data,
      //   accessLevels,
      // });
    });
  } catch {
    res.status(500).send();
  }
});
async function getAllAccessLevels() {
  const allAccessLevels = await db.collection("AccessLevels").get();
  let accessLevels = [];
  allAccessLevels.forEach(async (doc) => {
    data = doc.data();
    data.id = doc.id;
    accessLevels.push(data);
  });
  return accessLevels;
}

app.get("/views/manageOutcomes", authenticateToken, async (req, res) => {
  try {
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    let allApptOutcomes = await getAllAppointmentOutcomes();

    await isAdminUser(user, () => {
      data = {
        admin: user.admin,
        manager: user.manager,
      };
      console.log(data);
      res.status(200).send({
        data,
        allApptOutcomes,
      });
      // res.render("pages/manageOutcomes", {
      //   data,
      //   allApptOutcomes,
      // });
    });
  } catch {
    res.status(500).send();
  }
});

async function getAllAppointmentOutcomes() {
  const appointmentOutcomes = await db.collection("AppointmentOutcomes").get();
  let allApptOutcomes = [];
  appointmentOutcomes.forEach(async (doc) => {
    apptOutcome = doc.data();
    apptOutcome.id = doc.id;
    allApptOutcomes.push(apptOutcome);
  });
  return allApptOutcomes;
}

app.get("/roleAccess", authenticateToken, async (req, res) => {
  try {
    let canViewRoleAcces = await isAllowedToView3(
      "roles-view",
      req.user,
      "roles-view-action"
    );
    if (parseInt(canViewRoleAcces.rank) > 1) {
      const Users = db.collection("Users");
      const usersSnap = await Users.where("email", "==", req.user.email).get();
      usersSnap.forEach((doc) => {
        user = doc.data();
      });

      const accessValues = await db.collection("AccessValues").get();
      let allAccessValues = [];
      accessValues.forEach((doc) => {
        accessValue = doc.data();
        accessValue.id = doc.id;

        allAccessValues.push(accessValue);
      });

      const accessLevels = await db
        .collection("AccessLevels")
        .doc(req.query.aId)
        .get();
      thisAccessLevel = accessLevels.data();

      const accesses = await db.collection("Access").get();
      const subAccesses = await db.collection("SubAccess").get();
      const rules = await db
        .collection("AccessLevelAccess")
        .where("accessLevelId", "==", req.query.aId)
        .get();

      let categories = [];
      accesses.forEach(async (doc) => {
        access = doc.data();
        access.id = doc.id;
        category = access.category;
        // category.accessArray = []

        if (categories.filter((e) => e.category === category).length == 0) {
          categories.push({ category });
        }

        categories.filter((e) => e.category === category)[0].accessArray = [];
      });

      accesses.forEach(async (doc) => {
        access = doc.data();
        access.id = doc.id;

        let accessesSubAccesses = [];
        subAccesses.forEach(async (doc2) => {
          subAccess = doc2.data();
          subAccess.id = doc2.id;

          if (subAccess.accessId == access.id) {
            accessesSubAccesses.push(subAccess);

            rules.forEach(async (doc3) => {
              rule = doc3.data();
              console.log("rule", rule);
              rule.id = doc3.id;

              if (rule.subAccessId == subAccess.id) {
                subAccess.rule = rule;
              }
            });
          }
        });

        access.subAccesses = accessesSubAccesses;
        categories
          .filter((e) => e.category === access.category)[0]
          .accessArray.push(access);
      });

      await isAdminUser(user, () => {
        data = {
          admin: user.admin,
          manager: user.manager,
        };

        res.status(200).send({
          data,
          allAccessValues,
          categories,
          thisAccessLevel,
        });
      });
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(500).send();
  }
});
// app.get("/updateSubAccess", async (req, res) => {
//   const subAccess = db.collection("");
// });

async function isAdminUser2(user, next) {
  const snapshot = await db
    .collection("AccessLevels")
    .doc(user.accessLevel)
    .get();
  const AccessLevel = snapshot.data();
  if (AccessLevel.Level == "Superadmin") {
    user.admin = true;
    user.manager = true;
    user.superadmin = true;
  } else {
    user.superadmin = false;
    if (AccessLevel.Level == "Admin") {
      user.admin = true;
      user.manager = true;
    } else {
      user.admin = false;
      if (AccessLevel.Level == "Manager") {
        user.manager = true;
      } else {
        user.manager = false;
      }
    }
  }
  next();

  data = {
    admin: user.admin,
    manager: user.manager,
  };

  return data;
}

app.post("/roleAccess", authenticateToken, async (req, res) => {
  try {
    let canViewRoleAcces = await isAllowedToView3(
      "roles-view",
      req.user,
      "roles-view-action"
    );
    if (parseInt(canViewRoleAcces.rank) > 1) {
      console.log("req.body", req.body.access);
      accesArray = req.body.access;
      accesArray.forEach(async (e) => {
        const accessValues = await db.collection("AccessValues").get();
        accessValues.forEach(async (doc) => {
          data = doc.data();
          if (e.accesLevelValue == data.rank) {
            await db
              .collection("AccessLevelAccess")
              .doc(e.accessId)
              .update({ accessValues: data.rank })
              .then(() => console.log("updated"))
              .catch((e) => console.log(e));
          }
        });
      });
      res.status(200).send("updated");
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(500).send();
  }
});
app.post("/changeLeadStatus", authenticateToken, async (req, res) => {
  try {
    allRequests = req.body;

    const newStatus = await db
      .collection("AppointmentOutcomes")
      .doc(req.body.newStatus)
      .get();
    const newStatusData = await newStatus.data();
    console.log("status", newStatusData);
    // let paymentTrigger = await ;
    let newLead;
    if (newStatusData.paymentTrigger == true) {
      console.log(newStatusData.paymentTrigger);
      await db
        .collection("Leads")
        .doc(req.query.lId)
        .get()
        .then(async (doc) => {
          if (doc.get("sitDate") == null) {
            newLead = {
              status: req.body.newStatus,
              sitDate: new Date(),
            };
            if (doc.get("sitPaid") == null) {
              newLead.sitPaid = false;
            }
            await db
              .collection("Leads")
              .doc(req.query.lId)
              .set(newLead, { merge: true })
              .then(() => {
                res.status(200).send("statuIdUpdated");
              })
              .catch((e) => {
                res.send(e);
              });
          } else {
            await db
              .collection("Leads")
              .doc(req.query.lId)
              .update({ status: req.body.newStatus })
              .then(() => {
                res.status(200).send("paymenttriggered true data Updated");
              })
              .catch((e) => {
                res.send("error", e);
              });
          }
        })
        .catch((err) => {
          console.log("Error getting document", err);
        });
    } else {
      await db
        .collection("Leads")
        .doc(req.query.lId)
        .update({ status: req.body.newStatus })
        .then(() => {
          res.status(200).send("payment false data  Updated");
        })
        .catch((e) => {
          res.send("error", e);
        });
      // res.sta  tus(204).send();
    }
    //update status Id with Name
    // updateLeadStatusName();
  } catch {
    res.status(500).send();
  }
});
// app.post("/changeLeadStatus", authenticateToken, async (req, res) => {
async function changeLeadStatus() {
  try {
    // allRequests = req.body;

    const newStatus = await db
      .collection("AppointmentOutcomes")
      .doc(newStatus)
      .get();
    const newStatusData = await newStatus.data();
    console.log("status", newStatusData);
    // let paymentTrigger = await ;
    let newLead;
    if (newStatusData.paymentTrigger == true) {
      console.log(newStatusData.paymentTrigger);
      await db
        .collection("Leads")
        .doc(lId)
        .get()
        .then(async (doc) => {
          if (doc.get("sitDate") == null) {
            newLead = {
              status: newStatus,
              sitDate: new Date(),
            };
            if (doc.get("sitPaid") == null) {
              newLead.sitPaid = false;
            }
            await db
              .collection("Leads")
              .doc(lId)
              .set(newLead, { merge: true })
              .then(() => {
                console.log("statuIdUpdated");
              })
              .catch((e) => {
                console.log(e);
              });
          } else {
            await db
              .collection("Leads")
              .doc(lId)
              .update({ status: newStatus })
              .then(() => {
                console.log("paymenttriggered true data Updated");
              })
              .catch((e) => {
                console.log("error", e);
              });
          }
        })
        .catch((err) => {
          console.log("Error getting document", err);
        });
    } else {
      await db
        .collection("Leads")
        .doc(lId)
        .update({ status: newStatus })
        .then(() => {
          res.status(200).send("payment false data  Updated");
        })
        .catch((e) => {
          res.send("error", e);
        });
      // res.sta  tus(204).send();
    }
    //update status Id with Name
    updateLeadStatusName();
  } catch {
    res.status(500).send();
  }
}

async function getAccessLevel(aID) {
  const snapshot = await db.collection("AccessLevels").doc(aID).get();
  const AccessLevel = await snapshot.data();
  return AccessLevel;
}

app.get("/views/addUser", authenticateToken, async (req, res) => {
  try {
    const loggedInAccessLevel = await getAccessLevel(req.user.accessLevelId);
    let DB_Data = await db.collection("AccessLevels").get();
    let accessLevels = [];
    await DB_Data.forEach(async (doc) => {
      data = doc.data();
      data.id = doc.id;
      // console.log(data.Level);
      accessLevels.push(data);
    });

    if (loggedInAccessLevel.Level == "Manager") {
      for (let i = 0; i < accessLevels.length; i++) {
        if (
          accessLevels[i].Level == "Admin" ||
          accessLevels[i].Level == "Manager"
        ) {
          // console.log(accessLevels[i].Level + 'Removed ');
          accessLevels.splice(i, 1);
          i = i - 1;
        }
      }
    }

    DB_Data = await db.collection("Locations").get();
    let locations = [];
    await DB_Data.forEach(async (doc) => {
      data = doc.data();
      data.id = doc.id;
      locations.push(data);
    });

    data = {
      accessLevels: accessLevels,
      locations: locations,
      currLocId: req.user.locationId,
    };
    res.render("pages/addUser", data);
  } catch {
    res.status(500).send();
  }
});

app.get("/views/user", authenticateToken, async (req, res) => {
  try {
    isAllowed = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );
    if (parseInt(isAllowed.rank) > 1) {
      const snapshot = await db.collection("Users").doc(req.query.uId).get();
      const userDoc = snapshot.data();

      const accessLevel = await db
        .collection("AccessLevels")
        .doc(userDoc.accessLevel)
        .get();
      accessLevelData = accessLevel.data();
      userDoc.accessLevelName = accessLevelData.Level;
      userDoc.id = req.query.uId;
      locSnap = await db.collection("Locations").doc(userDoc.locationId).get();
      userDoc.location = locSnap.data();

      console.log(userDoc);

      let allAccessLevels = await getAllAccessLevels();

      const Users = db.collection("Users");
      const usersSnap = await Users.where("email", "==", req.user.email).get();

      editAccessLevel = await isAllowedToView3(
        "edit-user-access-level",
        req.user,
        "edit-user-access-level-action"
      );
      var editLevel = 4;
      var canEditAccessLevel =
        parseInt(editAccessLevel.rank) == editLevel ? true : false;

      let locationsArray = [];
      const locations = await db.collection("Locations").get();

      locations.forEach((doc) => {
        location = doc.data();
        location.id = doc.id;

        locationsArray.push(location);
      });

      usersSnap.forEach(async (doc) => {
        let user = doc.data();

        await isAdminUser(user, () => {
          const data = {
            admin: user.admin,
            manager: user.manager,
          };
          res.render("pages/user", {
            userDoc,
            data,
            allAccessLevels,
            canEditAccessLevel,
            locationsArray,
          });
        });
      });
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});

app.post("/api/editUserLocation", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "edit-user-location",
      req.user,
      "edit-user-location-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      const userId = req.body.userId;
      const user = await db.collection("Users").doc(userId);
      await user.update({ locationId: req.body.locationId }).then(() => {
        res.status(200).send("Success");
      });
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
  } catch {
    res.status(404).send();
  }
});
app.post("/editUserKW", authenticateToken, async (req, res) => {
  try {
    if (req.body.method === "kwPay") {
      let canViewEditUser = await isAllowedToView3(
        "edit-user-kw-pay",
        req.user,
        "edit-user-kw-pay-action"
      );
      if (parseInt(canViewEditUser.rank) > 1) {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            kwPay: parseInt(req.body.kwPay),
          })
          .then(() => {
            res.status(200).send(`${req.body.kwPay} update`);
          });
      } else {
        res.status(404).send("Dont have accessed to this method");
      }
    }
    if (req.body.method === "sitPayAmount") {
      let canViewEditUser = await isAllowedToView3(
        "edit-sit-pay-amount",
        req.user,
        "edit-sit-pay-amount-action"
      );
      if (parseInt(canViewEditUser.rank) > 1) {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            sitPayAmount: parseInt(req.body.sitPayAmount),
          })
          .then(() => {
            res.status(200).send(`${req.body.sitPayAmount} update`);
          });
      } else {
        res.status(404).send("Dont have accessed to this method");
      }
    }
    if (req.body.method === "perSitAmount") {
      let canViewEditUser = await isAllowedToView3(
        "edit-user-kw-pay",
        req.user,
        "edit-user-kw-pay-action"
      );
      if (parseInt(canViewEditUser.rank) > 1) {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            perSitAmount: parseInt(req.body.perSitAmount),
          })
          .then(() => {
            res.status(200).send(`${req.body.perSitAmount} update`);
          });
      } else {
        res.status(404).send("Dont have accessed to this method");
      }
    }
    if (req.body.method === "redline") {
      let canViewUserRedline = await isAllowedToView3(
        "edit-user-redline",
        req.user,
        "edit-user-redline-action"
      );
      if (parseInt(canViewUserRedline.rank) > 1) {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            redline: parseInt(req.body.redline),
          })
          .then(() => {
            res.status(200).send(`${req.body.redline} update`);
          });
      } else {
        res.status(404).send("Dont have accessed to this method");
      }
    }
  } catch {
    res.status(500).send();
  }
});

app.get("/views/lead", authenticateToken, async (req, res) => {
  try {
    let snapshot = await db.collection("Leads").doc(req.query.lId).get();
    let lead = snapshot.data();
    lead.id = req.query.lId;

    snapshot = await db.collection("Users").doc(lead.setter).get();
    const setter = snapshot.data();
    lead.setter = setter.name;

    snapshot = await db.collection("Users").doc(lead.rep).get();
    const rep = snapshot.data();
    lead.rep = rep.name;

    snapshot = await db.collection("Locations").doc(lead.locationId).get();
    const loc = snapshot.data();
    lead.location = loc.name;

    //CheckAction("Edit");

    let allApptOutcomes = [];
    var leadApptOutcomeName = "";
    const appointmentOutcomes = await db
      .collection("AppointmentOutcomes")
      .get();

    console.log(req.user.accessLevelId);
    const userAccessLevel = await db
      .collection("AccessLevels")
      .doc(req.user.accessLevelId)
      .get();
    const userAccessLevelData = userAccessLevel.data();
    const isAdminOrSuper =
      userAccessLevelData.Level == "Admin" ||
      userAccessLevelData.Level == "Superadmin";
    var isSit = false,
      isFollowUp = false;

    for (doc of appointmentOutcomes.docs) {
      apptOutcome = doc.data();
      apptOutcome.id = doc.id;

      if (apptOutcome.id == lead.status) {
        leadApptOutcomeName = apptOutcome.name;
      }

      if (apptOutcome.name == "Sit" && apptOutcome.id == lead.status) {
        isSit = true;
      } else if (
        apptOutcome.name == "Follow up" &&
        apptOutcome.id == lead.status
      ) {
        isFollowUp = true;
      } else if (apptOutcome.name == "New" && apptOutcome.id != lead.status) {
        continue;
      } else if (apptOutcome.name == "Sold" && !isAdminOrSuper) {
        continue;
      }

      allApptOutcomes.push(apptOutcome);
    }

    if (isSit) {
      allApptOutcomes = allApptOutcomes.filter(function (obj) {
        return (
          obj.name !== "Rescheduled" &&
          obj.name !== "New" &&
          obj.name !== "Cancelled at door" &&
          obj.name !== "Cancelled" &&
          obj.name !== "No Show"
        );
      });
    } else if (isFollowUp) {
      allApptOutcomes = allApptOutcomes.filter(function (obj) {
        return obj.name !== "New" && obj.name !== "Cancelled at door";
      });
    }

    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    let locationsArray = [];
    const locations = await db.collection("Locations").get();

    locations.forEach((doc) => {
      location = doc.data();
      location.id = doc.id;

      locationsArray.push(location);
    });

    editRep = await isAllowedToView3("editLead", req.user, "EditRep");
    editSetter = await isAllowedToView3("editLead", req.user, "EditSetter");
    editLocation = await isAllowedToView3("editLead", req.user, "EditLocation");
    editStatus = await isAllowedToView3("editLead", req.user, "EditStatus");

    var editLevel = 4;
    var canEditRep = parseInt(editRep.rank) == editLevel ? true : false;
    var canEditSetter = parseInt(editSetter.rank) == editLevel ? true : false;
    var canEditLocation =
      parseInt(editLocation.rank) == editLevel ? true : false;
    var canEditStatus = parseInt(editStatus.rank) == editLevel ? true : false;

    await isAdminUser(user, () => {
      data = {
        superadmin: user.superadmin,
        admin: user.admin,
        manager: user.manager,
      };

      res.render("pages/lead", {
        lead,
        data,
        allApptOutcomes,
        locationsArray,
        canEditRep,
        canEditSetter,
        canEditLocation,
        canEditStatus,
        leadApptOutcomeName,
      });
    });
  } catch {
    res.status(500).send();
  }
});

app.post("/api/deleteLead", authenticateToken, async (req, res) => {
  try {
    let canViewLeadDelete = await isAllowedToView3(
      "lead-delete",
      req.user,
      "lead-delete-action"
    );
    if (parseInt(canViewLeadDelete.rank) > 1) {
      console.log(req.query);
      let leadId = req.query.objId;
      await db
        .collection("Leads")
        .doc(leadId)
        .delete()
        .then(async () => {
          res.status(200).send("Lead Deleted!");
        });
    } else {
      res.status(404).send("Dont have accessed to this page");
    }
    // res.redirect('/views/leads');
  } catch {
    res.status(500).send();
  }
});

app.post("/api/deleteUser", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "delete-user",
      req.user,
      "delete-user-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      console.log("reached deleteUser");
      console.log(req.query.userId);

      // deletes lead from db
      await db
        .collection("Users")
        .doc(req.query.userId)
        .delete()
        .then(async () => {
          res.redirect("/views/users");
          console.log("User Deleted!");
        });
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
    // res.redirect('/views/users');
  } catch {
    res.status(500).send();
  }
});

app.post("/api/editAccessLevel", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "edit-user-access-level",
      req.user,
      "edit-user-access-level-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      const userId = req.body.userId;

      const user = await db.collection("Users").doc(userId);
      await user.update({ accessLevel: req.body.accessLevelId }).then(() => {
        res.status(200).send("Success");
      });
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(404).send();
  }
});

app.post("/api/editRep", async (req, res) => {
  try {
    const leadId = req.body.leadId;
    const lead = await db.collection("Leads").doc(leadId);
    await lead.update({ rep: req.body.repId }).then(() => {
      // res.redirect("/views/lead?lId=" + leadId);
      res.status(200).send("rep updated");
    });
  } catch {
    res.status(500).send();
  }
});

app.post("/api/editSetter", async (req, res) => {
  try {
    const leadId = req.body.leadId;
    const lead = await db.collection("Leads").doc(leadId);
    await lead.update({ setter: req.body.setterId }).then(() => {
      res.status(200).send("Setter Updated");
    });
  } catch {
    res.status(500).send();
  }
});

app.post("/api/editLocation", async (req, res) => {
  try {
    const leadId = req.body.leadId;
    const lead = await db.collection("Leads").doc(leadId);
    await lead.update({ locationId: req.body.locationId }).then(() => {
      res.status(200).send("Location Updated");
    });
  } catch {
    res.status(500).send();
  }
});
app.get("/checksetter", async (req, res) => {
  try {
    const lead = [];
    await db
      .collection("Leads")
      .get()
      .then(async (querySnapshot) => {
        querySnapshot.forEach((e) => {
          if (e.data().sitPaid == false && e.data().setter != undefined) {
            // lead.push(e.data().rep)
            db.collection("Users")
              .doc(e.data().setter)
              .get()
              .then((q) => {
                lead.push(q.data());
                console.log(q.id);
              });
          }
        });
      });
  } catch {
    res.status(500).send();
  }
});

app.post("/repLeaderBoard", authenticateToken, async (req, res) => {
  let Users = [];
  let NewUser = [];

  let startDate = moment(req.body.startDate).format("YYYY-MM-DD");
  let endDate = moment(req.body.endDate).format("YYYY-MM-DD");
  console.log(startDate, endDate);
  await db
    .collection("Users")
    .where("accessLevel", "!=", "y3L0EGYgGTO1ooUZh7Nj")
    .get()
    .then((query) => {
      query.forEach((doc) => {
        data = doc.data();
        data.id = doc.id;
        Users.push(data);
      });
    });
  for (let i = 0; i < Users.length; i++) {
    let Lead = [];
    let LeadDate = [];
    await db
      .collection("Leads")
      .where("rep", "==", Users[i].id)
      .where("status", "==", "roWLcfnZvHBWpgGyu8qA")
      .get()
      .then((query) => {
        query.forEach(async (doc) => {
          data = doc.data();
          data.id = doc.id;
          LeadDate.push(data);
        });
      });
    if (req.body.startDate !== undefined) {
      for (let k = 0; k < LeadDate.length; k++) {
        let dateCreated;
        if (typeof LeadDate[k].dateCreated == "object") {
          dateCreated = await moment(
            await LeadDate[k].dateCreated.toDate()
          ).format("YYYY-MM-DD");
        } else {
          dateCreated = await moment(await LeadDate[k].dateCreated).format(
            "YYYY-MM-DD"
          );
        }
        if ((await dateCreated) > startDate && (await dateCreated) < endDate) {
          console.log("condit", LeadDate[k].status, LeadDate[k].id);
          // console.log("Id", );
          console.log(dateCreated);
          Lead.push(LeadDate[k]);
          console.log("condition trigerd");
        }
      }
    } else {
      console.log("else condition triggered");
      Lead = Lead.concat(LeadDate);
    }
    let kw = [];
    for (let j = 0; j < Lead.length; j++) {
      if (Lead[j].kw !== undefined) {
        kw.push(Lead[j].kw);
      }
    }
    let totalKw = lodash.sum(kw);
    let TotalLead = Lead.length;
    Users[i].TotalRepLeads = TotalLead;
    Users[i].TotalRepProjectKw = totalKw;
    // await db.collection("Users").doc(Users[i].id).update({
    //   TotalRepLeads:TotalLead,
    //   TotalRepProjectKw:totalKw
    // })
    NewUser.push(Users[i]);
  }
  res.status(200).send(NewUser);
});
app.post("/setterLeaderBoard", authenticateToken, async (req, res) => {
  let Users = [];
  let NewUser = [];
  let startDate = moment(req.body.startDate).format("YYYY-MM-DD");
  let endDate = moment(req.body.endDate).format("YYYY-MM-DD");
  console.log("startDate", startDate, " endDate ", endDate);
  await db
    .collection("Users")
    .where("accessLevel", "==", "y3L0EGYgGTO1ooUZh7Nj")
    .get()
    .then((query) => {
      query.forEach((doc) => {
        data = doc.data();
        data.id = doc.id;
        Users.push(data);
      });
    });
  console.log("TotalUser", Users.length);
  for (let i = 0; i < Users.length; i++) {
    let Lead = [];
    let LeadDate = [];
    let query = await db
      .collection("Leads")
      .where("setter", "==", Users[i].id)
      .get()
      .then((query) => {
        query.forEach(async (doc) => {
          let data = doc.data();
          data.id = doc.id;
          if (
            data.sitDate !== undefined &&
            data.sitDate !== null &&
            data.sitDate !== null
          ) {
            LeadDate.push(data);
          }
        });
      });
    console.log("LeadDATE", LeadDate.length);
    if (req.body.startDate !== undefined) {
      for (let k = 0; k < LeadDate.length; k++) {
        let dateCreated;
        if (typeof LeadDate[k].dateCreated == "object") {
          dateCreated = await moment(
            await LeadDate[k].dateCreated.toDate()
          ).format("YYYY-MM-DD");
        } else {
          dateCreated = await moment(await LeadDate[k].dateCreated).format(
            "YYYY-MM-DD"
          );
        }
        if ((await dateCreated) > startDate && (await dateCreated) < endDate) {
          console.log("condit", LeadDate[k].status, LeadDate[k].id);
          // console.log("Id", );
          console.log(dateCreated);
          Lead.push(LeadDate[k]);
          console.log("condition trigerd");
        }
      }
    } else {
      console.log("else condition triggered");
      Lead = Lead.concat(LeadDate);
    }
    console.log("leadLength", Lead.length);
    let kw = [];
    for (let j = 0; j < Lead.length; j++) {
      if (Lead[j].kw !== undefined) {
        kw.push(Lead[j].kw);
      }
    }
    let totalKw = lodash.sum(kw);
    let TotalLead = Lead.length;
    console.log("totalLead", TotalLead, totalKw);
    Users[i].TotalSetterLeads = TotalLead;
    Users[i].TotalSetterProjectKw = totalKw;
    NewUser.push(Users[i]);
  }
  res.status(200).send(NewUser);
});
app.get("/api/dateCheck", async (req, res) => {
  try {
    //WORKING BUT NOT UPLOADED ON DATABASE
    const dates = [];
    // const UpdatedDate = []
    await db
      .collection("Leads")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((item) => {
          if (item.data().sitDate) {
            const dateSit = item.data().sitDate;
            dates.push({
              Id: item.id,
              mydate: dateSit.toDate(),
            });
          }
        });
      });

    const DateLead = await db.collection("Leads");

    dates.forEach((e) => {
      const firstdate = e.mydate;
      const newDate = moment(firstdate)
        .tz("Canada/Eastern")
        .format("ddd MMM DD YYYY, HH:mm:ss z");
      console.log(newDate);
      // DateLead.doc(e.Id)
      //   .update({
      //     sitDate: newDate.toString(),
      //   })
      //   .then((querysnapshot) => {
      //     console.log(querysnapshot.data().sitDate.toDate());
      //     console.log(querysnapshot.id);
      //     console.log("updated");
      //   })
      //   .catch((e) => {
      //     console.log("updation failed", e);
      //   });
    });
    res.status(200).send("Updated Successfully");
  } catch {
    res.status(500).send();
  }
});

async function isHashExpired(hashId) {
  const hashData = await db.collection("Hashes").doc(hashId).get();
  const hashDataDoc = hashData.data();

  // document with no date field (should be deleted)
  try {
    const hashDate = await hashDataDoc.createdOn.toDate();

    const currDate = new Date();
    const secondsInDay = 60 * 60 * 24; // number of seconds in a day
    const isInTime = Math.abs((currDate - hashDate) / 1000) < secondsInDay * 2; // convert to seconds < 2 days

    return isInTime;
  } catch {
    return false;
  }
}

app.get("/verify/passwordReset", async (req, res) => {
  try {
    var isInTime = await isHashExpired(req.query.hashesId);
    console.log("isontime: " + isInTime);

    if (isInTime) {
      console.log("youre on time");
      res.status(200).send({ success: true });
    } else {
      //await db.collection('Hashes').doc(req.query.hashesId).delete();
      deleteHash(req.query.hashesId);

      console.log("you late");
      res.status(200).send({
        success: false,
      });
    }
  } catch {
    res.status(500).send();
  }
});

async function deleteHash(hashId) {
  const hashToDelete = await db.collection("Hashes").doc(hashId).get();
  const hashToDeleteData = hashToDelete.data();
  // console.log('hashToDeleteData = ' + hashToDeleteData.userId)

  // document may not have a user(empty document to keep collection from deleting)
  try {
    const expiredUser = await db
      .collection("Users")
      .doc(hashToDeleteData.userId)
      .get();
    const expiredUsersData = expiredUser.data();
    console.log("expiredUsersData = " + expiredUsersData);

    const requester = await db
      .collection("Users")
      .doc(hashToDeleteData.requesterId)
      .get();
    const requesterData = requester.data();
    console.log("requesterData = " + requesterData);

    failPasswordRequestorChangeEmail({
      name: requesterData.name,
      email: requesterData.email,
      empName: expiredUsersData.name,
      empEmail: expiredUsersData.email,
    });
  } catch {
  } finally {
    await db.collection("Hashes").doc(hashId).delete();
    isHashesEmpty();
  }
}

// creates a blank document in Hashes if it's empty
async function isHashesEmpty() {
  await db
    .collection("Hashes")
    .get()
    .then(async (snap) => {
      if (snap.size == 0) {
        await db.collection("Hashes").add({});
      }
    });
}

app.post("/passwordReset", async (req, res) => {
  try {
    const hashUser = await db.collection("Hashes").doc(req.body.hashesId).get();
    const hashUserData = hashUser.data();

    // get user's User document
    const userToUpdate = db.collection("Users").doc(hashUserData.userId);

    // deletes user's hashData from db
    await db.collection("Hashes").doc(req.body.hashesId).delete();

    const salt = await bcrypt.genSalt();
    const hashedPass = await bcrypt.hash(req.body.password, salt);

    // updates user's passwords
    await userToUpdate.update({ password: hashedPass });

    const user = await userToUpdate.get();
    const userData = user.data();
    // emails the user a password change success email
    await successPasswordChangeEmail({
      name: userData.name,
      email: userData.email,
    });

    if (hashUserData.requesterId !== undefined) {
      const hashRequester = await db
        .collection("Users")
        .doc(hashUserData.requesterId)
        .get();
      // emails the requester
      const requesterData = hashRequester.data();
      await successPasswordRequestorChangeEmail({
        name: requesterData.name,
        email: requesterData.email,
        empName: userData.name,
      });
    }

    res.status(200).send("Reset Password");
  } catch {
    res.status(500).send();
  }
});

async function getAccessLevelId(user, levelName, next) {
  const AccessLevels = db.collection("AccessLevels");
  const AccessLevelsSnap = await AccessLevels.where(
    "Level",
    "==",
    levelName
  ).get();

  if (AccessLevelsSnap.empty) {
    console.log("getAccessLevelId Failed");
    return "";
  }

  AccessLevelsSnap.forEach((doc) => {
    user.accessLevel = doc.id;
    next();
  });
}

async function getLocationId(user, locationName, next) {
  const Locations = db.collection("Locations");
  const LocationsSnap = await Locations.where("name", "==", locationName).get();

  if (LocationsSnap.empty) {
    console.log("getLocationId Failed");
    return "";
  }

  LocationsSnap.forEach((doc) => {
    user.locationId = doc.id;
    next();
  });
}

async function getStatusId(statusName) {
  const ApptOutcomesSnap = await db
    .collection("AppointmentOutcomes")
    .where("name", "==", statusName)
    .get();

  if (ApptOutcomesSnap.size == 1) {
    for (doc of ApptOutcomesSnap.docs) {
      return doc.id;
    }
  } else {
    console.log("getLocationId Failed");
    return "";
  }
}

function randomString(size = 21) {
  return crypto.randomBytes(size).toString("base64").slice(0, size);
}

async function getUserWithBody(body, next) {
  next(user);
}

app.post("/userPasswordReset", async (req, res) => {
  try {
    console.log("reached reset password");
    await db
      .collection("Users")
      .doc(req.query.userId)
      .get()
      .then(async (thisUser) => {
        thisUserData = thisUser.data();
        console.log("data", thisUserData);
        var date = new Date();
        hashes = await db
          .collection("Hashes")
          .add({
            userId: thisUser.id,
            password: thisUser.data().password,
            createdOn: date,
          })
          .then(async (hashes) => {
            let user = {
              email: thisUser.data().email,
              name: thisUser.data().name,
              password: thisUser.data().password,
              hashesId: hashes.id,
              createdOn: date,
            };
            await sendCreatedUserEmail(user, true);
          })
          .then(() => {
            res.status(200).send("Email Send");
          });
      });
    console.log(req.query.userId);
  } catch {
    res.status(500).send();
  }
});

app.post("/user", async (req, res) => {
  const request = req;

  if (req.body.method == "delete") {
    db.collection("Users")
      .doc(req.body.userId)
      .delete()
      .then(async () => {
        req.body = req.body;
        // res.redirect('/users');
        console.log("User Deleted!");
        return;
      });
  } else {
    try {
      let available;

      var setter;
      if (req.query.type != "reset") {
        setter = await isSetter(req.body.accessLevel);
      } else {
        setter = false;
      }

      if (!req.body.available || setter) {
        available = false;
      } else {
        if (req.body.available == "yes") {
          available = true;
        } else {
          available = false;
        }
      }

      const user = {
        email: req.body.email,
        available: available,
        name: req.body.name,
        calId: req.body.calId,
        hasCalId: req.body.calId != "",
        locationId: req.body.location,
        accessLevel: req.body.accessLevel,
        active: true,
      };

      if (req.body.method != "put") {
        const salt = await bcrypt.genSalt();
        var randomPassword = await randomString();
        const hashedPass = await bcrypt.hash(randomPassword, salt);

        user.password = hashedPass;
      }

      // await getUserWithBody(body, async (user) => {
      let data = {
        tableName: "Users",
        data: user,
      };

      if (req.body.method == "put") {
        db.collection(data.tableName)
          .doc(req.body.userId)
          .update(data.data)
          .then(async () => {
            req.body = req.body;
            // res.redirect('/users');
            console.log("User Updated!");
            return;
          });
      } else {
        if (req.query.type == "reset") {
          console.log("reached reset password");
          await db
            .collection("Users")
            .doc(req.query.userId)
            .get()
            .then(async (thisUser) => {
              thisUserData = thisUser.data();
              thisUserData.id = thisUser.id;
              var date = new Date();
              hashes = await db
                .collection("Hashes")
                .add({
                  userId: thisUserData.id,
                  password: thisUserData.password,
                  createdOn: date,
                })
                .then(async (hashes) => {
                  let user = {
                    email: thisUserData.email,
                    name: thisUserData.name,
                    password: thisUserData.password,
                    hashesId: hashes.id,
                    createdOn: date,
                  };
                  sendCreatedUserEmail(user, true);
                });

              return;
            });
          console.log(req.query.userId);
        } else {
          await db
            .collection(data.tableName)
            .add(data.data)
            .then(async (newData) => {
              console.log("New User added!");
              var requester = await jwt_decode(req.cookies.access_token);
              var date = new Date();

              hashes = await db
                .collection("Hashes")
                .add({
                  userId: newData.id,
                  password: data.data.password,
                  createdOn: date,
                  requesterId: requester.id,
                })
                .then(async (hashes) => {
                  let user = {
                    email: data.data.email,
                    name: data.data.name,
                    password: data.data.password,
                    hashesId: hashes.id,
                    createdOn: date,
                  };
                  sendCreatedUserEmail(user);

                  // console.log(data.data.accessLevel);
                  const addedLevel = await getAccessLevel(
                    data.data.accessLevel
                  );
                  // console.log(addedLevel.Level);
                  sendCreatedUserAdminEmail(
                    (data = {
                      requesterName: requester.name,
                      addedEmail: data.data.email,
                      addedName: data.data.name,
                      addedLevel: addedLevel.Level,
                      createdOn: date,
                    })
                  );
                });
            });
        }
      }
      res.status(200).send("Added");
    } catch {
      console.log("error in post user");
      res.status(500).send();
    }
  }
});

app.post("/addNewUser", async (req, res) => {
  try {
    const user = {
      email: req.body.email.toLowerCase(),
      available: req.body.available,
      name: req.body.name,
      calId: req.body.email.toLowerCase(),
      hasCalId: false,
      locationId: req.body.locationId,
      accessLevel: req.body.accessLevel,
      sitPayAmount: req.body.sitPayAmount || 0,
      override: req.body.override || 0,
      companyCommission: req.body.companyCommission || 0,
      companyKW: req.body.companyKW || 0,
      perSitAmount: req.body.perSitAmount || 0,
      kwPay: req.body.kwPay || 0,
      repCloserCommissionTier:
        req.body.repCloserCommissionTier || "Z2ZMr89s6ihfbNMBEpTu",
      repWithSetterCommissionTier:
        req.body.repWithSetterCommissionTier || "zCKaiQRfkjk1kyhEZ5N2",
      active: true,
      password: "",
      referrer:
        {
          referrerId: req.body.referrerId || "",
          referrerName: req.body.referrerName || "",
          referrerProfilePic: req.body.referrerProfilePic || "",
        } || "",
      referrals: [],
    };
    if (user.calId != undefined && user.calId != "") {
      user.hasCalId = true;
    }
    let data = {
      tableName: "Users",
      data: user,
    };
    await db
      .collection(data.tableName)
      .add(data.data)
      .then(async (newData) => {
        console.log("New User added!");
        let newReferral = {
          referralName: data?.data?.name,
          referralId: newData?.id,
          refferalProfilePic: data?.data?.profilePic || "",
        };
        if (data.data.referrer.referrerId != "") {
          await db
            .collection(data.tableName)
            .doc(data.data.referrer.referrerId)
            .get()
            .then((doc) => {
              let referrals = doc.data().referrals;
              if (referrals) {
                referrals.push(newReferral);
                doc.ref.update({
                  referrals: referrals,
                });
              } else {
                console.log("else cond");
                doc.ref.update({
                  referrals: [newReferral],
                });
              }
            })
            .catch((e) => console.log("er", e));
        }
        const token = req.headers.authorization; //Issue

        const r_token = token.replace(/^Bearer\s/, "");

        var requester = await jwt_decode(r_token);
        console.log("req", requester);
        var date = new Date();
        console.log("date", date);
        hashes = await db
          .collection("Hashes")
          .add({
            userId: newData.id,
            createdOn: date,
            requesterId: requester.id,
          })
          .then(async (hashes) => {
            let user = {
              email: data.data.email,
              name: data.data.name,

              hashesId: hashes.id,
              createdOn: date,
            };
            await sendCreatedUserEmail(user);
            console.log("userEmail added");
            console.log("check access", data.data.accessLevel);
            const addedLevel = await getAccessLevel(data.data.accessLevel);
            console.log("AccessLevel new user", addedLevel.Level);
            await sendCreatedUserAdminEmail(
              (data = {
                requesterName: requester.name,
                addedEmail: data.data.email,
                addedName: data.data.name,
                addedLevel: addedLevel.Level,
                createdOn: date,
              })
            );
          });
      });
    res.status(200).send("Added");
  } catch {
    res.status(500).send();
  }
});

app.post("/transaction", async (req, res) => {
  try {
    const transact = {
      datePaid: req.body.datePaid,
      installCommission: req.body.installCommission,
      CAPPayment: req.body.CAPPayment,
      clawbackBonus: req.body.clawbackBonus,
      totalinPeriod: req.body.totalinPeriod,
      prevPaid: req.body.prevPaid,
      totalProjectCommission: req.body.totalProjectCommission,
      tsp: req.body.totalProjectCommission,
    };
    data = {
      tableName: "Transactions",
      data: transact,
    };
    db.collection(data.tableName)
      .add(data.data)
      .then(() => {
        console.log("New Transaction added");
      });
    res.status(201).send();
  } catch {
    res.status(500).send();
  }
});

app.post("/addPayment", async (req, res) => {
  try {
    const payment = {
      datePaid: req.body.datePaid,
      installCommission: req.body.installCommission,
      CAPPayment: req.body.CAPPayment,
      clawbackBONUS: req.body.clawbackBONUS,
      totalinPeriod: req.body.totalinPeriod,
      prevPaid: req.body.prevPaid,
      totalProjectCommission: req.body.totalProjectCommission,
      projectId: req.body.projectId,
    };

    data = {
      tableName: "Payments",
      data: payment,
    };

    db.collection(data.tableName)
      .add(data.data)
      .then(() => {
        console.log("New Payment added");
      });
    res.status(200).send("New Payment Added");
  } catch {
    res.status(500).send();
  }
});
app.post("/uploadProfileImage", upload.any(), async (req, res) => {
  //working
  try {
    var file = req.files[0];
    let fileId = {};
    fileId = await uploadFile(file).then((e) => {
      console.log("file", fileId);
      db.collection("Users")
        .doc(req.query.userId)
        .update({
          profilePic: e.webContentLink,
        })
        .then(() => {
          console.log("updated");
          res.status(200).send(e.webContentLink);
        })
        .catch((e) => console.log(e));
    });
  } catch {
    res.status(500).send();
  }
});
app.post("/uploadImageUrl", upload.any(), async (req, res) => {
  try {
    var file = req.files[0];
    let fileId = {};

    fileId = await uploadFile(file).then((e) => {
      console.log("e", e);
      res.status(200).send(e.webViewLink);
    });
  } catch {
    res.status(500).send();
  }
});

async function assign(timeTxt, cxName, address, user, notes) {
  let userArray = [];
  let repId = "";
  await db
    .collection("Users")
    .where("hasCalId", "==", true)
    .where("locationId", "==", user?.locationId)
    .get()
    .then(async (e) => {
      e.forEach((doc) => {
        let data = doc.data();
        if (
          data.count > 0 &&
          data.accessLevel !== "y3L0EGYgGTO1ooUZh7Nj" &&
          data.available == true
        ) {
          userArray.push(data); //if one user have count >0
        }
      });
    })
    .then(async () => {
      console.log("userARRAY", userArray);
      if (userArray.length === 0) {
        console.log("When All user count = 0");
        await db
          .collection("Users")
          .where("locationId", "==", user?.locationId)
          .get()
          .then((e) => {
            e.forEach((doc) => {
              doc.ref.update({
                count:
                  doc?.data().count + doc?.data().allotCount >
                  doc?.data().allotCount
                    ? doc?.data().allotCount
                    : doc?.data().count + doc?.data().allotCount,
              });
            });
          })
          .then(async () => {
            repId = await RepAssignAppt(timeTxt, cxName, address, user, notes);
          });
      } else {
        repId = await RepAssignAppt(timeTxt, cxName, address, user, notes);
      }
    });
  return repId;
}
// && data.accessLevel !== "y3L0EGYgGTO1ooUZh7Nj"
//         && data.hasCalId == true && data.available == true

app.post("/addLead", authenticateToken, upload.any(), async (req, res) => {
  try {
    // console.log(req.user);
    console.log(req.body);
    const address =
      req.body.street +
      " " +
      req.body.city +
      ", " +
      req.body.state +
      " " +
      req.body.zip;

    let initialStatus = "";
    let statusName;
    const newStatus = await db
      .collection("AppointmentOutcomes")
      .where("name", "==", "New")
      .get();
    if (newStatus.size == 1) {
      newStatus.forEach((doc) => {
        initialStatus = doc.id;
        statusName = doc.data().name;
      });
    }

    let date = req.body.apptDay + " ";
    date += req.body.apptTime;

    let repId = await assign(
      date,
      req.body.first_name + " " + req.body.last_name,
      address,
      req.user,
      req.body.notes
    );

    const currDate = new Date(); //TimeOffset
    let lead = {
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      email: req.body.email,
      phone: req.body.phone,
      notes: req.body.notes,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      utilPic: req.body.file || "",
      dateCreated: currDate.toISOString(),
      locationId: req.user.locationId,
      rep: repId,
      setter: req.user.id,
      appointmentTime: new Date(
        req.body.apptDay + " " + req.body.apptTime
      ).toISOString(),
      status: initialStatus,
      statusName: statusName,
      apptDay: req.body.apptDay,
      apptTime: req.body.apptTime,
      forceSend: req.body.forceSend ? req.body.forceSend : false,
      lat: parseFloat(req.body.lat) || 0,
      lng: parseFloat(req.body.lng) || 0,
      utility_id: parseFloat(req.body.utility_id) || 0,
      utility_name: req.body.utility_company || "",
      company_id: 9146,
    };
    // console.log("kw", req.body.kw);
    lead.monthlyBill = [
      parseFloat(req.body.jan) || 0,
      parseFloat(req.body.feb) || 0,
      parseFloat(req.body.mar) || 0,
      parseFloat(req.body.apr) || 0,
      parseFloat(req.body.may) || 0,
      parseFloat(req.body.jun) || 0,
      parseFloat(req.body.jul) || 0,
      parseFloat(req.body.aug) || 0,
      parseFloat(req.body.sep) || 0,
      parseFloat(req.body.oct) || 0,
      parseFloat(req.body.nov) || 0,
      parseFloat(req.body.dec) || 0,
    ];
    // if (
    //   req.body.kw != [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] &&
    //   req.body.kw != "0,0,0,0,0,0,0,0,0,0,0,0"
    // ) {
    //   lead.monthlyBill = req.body.kw || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // }
    // if(typeof(req.body.kw) =="string"){
    //   req.body.kw.
    //   // lead.monthlyBill.push(parseInt(lead.monthlyBill[0]))
    //   console.log("kk",lead.monthlyBill);
    // }
    if (req.body.averageMonthlyBill != 0) {
      lead.averageMonthlyBill = parseFloat(req.body.averageMonthlyBill);
    }
    if (req.body.yearlyUsage != 0) {
      lead.annualBill = parseFloat(req.body.yearlyUsage);
    }

    console.log("leads, lead", lead);
    if (lead.rep !== undefined) {
      await db
        .collection("Leads")
        .add(lead)
        .then(async (doc) => {
          let notificationData = {
            message: `New Lead was Added  ${lead.firstName} ${lead.lastName}`,
            setterRecep: lead.setter,
            repRecep: lead.rep,
            link: `ownourenergy.web.app/lead/${doc.id}`,
            objId: null,
          };
          await SendNotification(
            notificationData.message,
            notificationData.setterRecep,
            notificationData.link,
            notificationData.objId
          );
          await SendNotification(
            notificationData.message,
            notificationData.repRecep,
            notificationData.link,
            notificationData.objId
          );
          lead.id = doc.id;
          console.log("email rep", lead.rep);
          lead.rep = await getUser(lead.rep);
          lead.setter = await getUser(lead.setter);
          lead.address = address;
          sendEmails(lead, () => {
            console.log("All Emails Sent.");
          });
        });

      if (lead.forceSend == true || lead.forceSend == "true") {
        await sendProposal(lead)
          .then(() => console.log("sent"))
          .catch(() => console.log("error"));
      }

      res.status(200).send("new lead added");
    } else {
      res.status(204).send();
    }
  } catch {
    res.status(500).send();
  }
});

app.post("/updateAllLeadsStatuses", async (req, res) => {
  try {
    const leads = await db.collection("Leads").get();

    let leadList = [];
    leads.forEach(async (doc) => {
      //let updateVal = {status: 'New'}
      let updateVal = { status: req.body.status };
      await db.collection("Leads").doc(doc.id).update(updateVal);
    });

    return res.json(leadList).status(200).send();
    // updateLeadStatusName();
  } catch {
    res.status(500).send();
  }
});

app.post("/updateAllUsersActivity", async (req, res) => {
  try {
    const users = await db.collection("Users").get();

    let usersList = [];
    users.forEach(async (doc) => {
      //let updateVal = {status: 'New'}
      let updateVal = { active: req.body.active };
      await db.collection("Users").doc(doc.id).update(updateVal);
    });

    return res.json(usersList).status(200).send();
  } catch {
    res.status(500).send();
  }
});

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

  return allData;
}

async function AssignAppt(timeTxt, cxName, address, user, notes) {
  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });
  const calId = await getCalId(user.locationId);
  let time = new Date(Date.parse(timeTxt));
  console.log(time);
  time = new Date(time.getTime() + 4 * 60 * 60 * 1000);
  const endTime = new Date(time.getTime() + 1.5 * 60 * 60 * 1000);
  let startOfDay = new Date(time.toString());
  startOfDay.setHours(0, 0, 0, 0);
  let nextDay = new Date();
  nextDay.setDate(startOfDay.getDate());
  nextDay.setHours(23, 59, 59, 59);
  let h;

  let events;
  let dayEvents;
  let availEmployees = [];
  let lowestRep;

  console.log("Location" + user.locationId);

  if (await isSetter(user.accessLevelId)) {
    const index = client.initIndex("Users");
    await index
      .search(user.locationId, {
        filters: "available = 1 AND hasCalId = 1",
      })
      .then(async ({ hits }) => {
        for (h = 0; h < hits.length; h++) {
          console.log(time, endTime, hits[h].calId);
          events = await calendar.events.list({
            calendarId: hits[h].calId,
            timeMin: time.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
          });

          if (!events.data.items || events.data.items.length === 0) {
            console.log(hits[h].calId, " is Available");
            eventsToday = 0;
            dayEvents = await calendar.events.list({
              calendarId: hits[h].calId,
              timeMin: startOfDay.toISOString(),
              timeMax: nextDay.toISOString(),
              singleEvents: true,
              orderBy: "startTime",
            });

            if (!dayEvents.data.items || dayEvents.data.items.length === 0) {
              console.log(hits[h].calId, " has ", eventsToday, "eventsToday");
              hits[h].eventsToday = eventsToday;
              availEmployees.push(hits[h]);
              continue;
            }
            console.log(
              hits[h].calId,
              "-",
              dayEvents.data.items.length,
              " events on his calendar"
            );
            for (var e = 0; e < dayEvents.data.items.length; e++) {
              if (dayEvents.data.items[e].summary) {
                if (
                  dayEvents.data.items[e].summary.substring(0, 22) ==
                  "Sales Appointment with"
                ) {
                  eventsToday++;
                }
              }
            }
            console.log(
              hits[h].calId,
              "is an available employee with ",
              eventsToday,
              "appts today"
            );
            hits[h].eventsToday = eventsToday;
            availEmployees.push(hits[h]);
          }
        }
      });

    console.log("Determining the lowestRep ... from ", availEmployees.length);
    if (availEmployees.length === 0) {
      console.log("SCHEDULING COLLISION NO ONE IS AVAILABLE AT ", timeTxt);
      return;
    }
    let lowest = 100;
    for (var x = 0; x < availEmployees.length; x++) {
      if (availEmployees[x].eventsToday < lowest) {
        lowest = availEmployees[x].eventsToday;
        lowestRep = availEmployees[x];
      }
    }
    console.log(lowestRep.calId, "is the lowestRep");
    repId = lowestRep.objectID;
  } else {
    lowestRep = user;
    repId = lowestRep.id;
  }
  var event = {
    summary: "Sales Appointment with " + cxName,
    description: address + "\n" + notes,
    start: {
      dateTime: time,
    },
    end: {
      dateTime: endTime,
    },
    reminders: {
      useDefault: false,
    },
    attendees: {
      email: lowestRep.email,
    },
  };

  console.log("Giving ", lowestRep.calId, "the appt");

  var request = await calendar.events.insert(
    {
      calendarId: lowestRep.calId,
      resource: event,
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      // console.log(res);
    }
  );

  return repId;
}
app.get("/sendEmail", authenticateToken, async (req, res) => {
  sendEmail();
});

async function sendEmails(appt, next) {
  if (appt.rep.email == appt.setter.email) {
    await sendEmail(appt, appt.setter, false);
  } else {
    await sendEmail(appt, appt.rep, true);
    await sendEmail(appt, appt.setter, false);
  }
  next();
}

async function sendEmail(appt, recep, includeSubmittedBy) {
  var formomentdate = new Date(appt.appointmentTime);
  var message = "";
  var encodedAddy = appt.address.replace(" ", "+");
  if (appt.setter == recep) {
    message =
      "A lead for " +
      appt.firstName +
      " " +
      appt.lastName +
      " was successfully submitted.";
  } else {
    message =
      "A new lead was submitted for you, " +
      appt.firstName +
      " " +
      appt.lastName +
      ".";
  }

  let locals = {
    cxName: appt.firstName + " " + appt.lastName,
    cxAddress: appt.address,
    address: encodedAddy,
    apptDate: appt.apptDay,
    apptTime: appt.apptTime,
    utilPic: appt.utilPic,
    recepName: recep.name,
    message: message,
    cxPhone: appt.phone,
    cxEmail: appt.email,
    notes: appt.notes,
    includeBy: includeSubmittedBy,
    submittedBy: appt.setter.name,
  };

  const data = await ejs.renderFile(
    "./templates/emailTemplates/html.ejs",
    locals
  );

  const options = {
    to: recep.email,
    subject:
      "New Lead Submitted: " +
      appt.firstName +
      " " +
      appt.lastName +
      " by " +
      appt.setter.name,
    html: data,
    textEncoding: "base64",
  };
  const messageId = await sendMail(options);
  console.log("Lead From Sub Message sent successfully:", messageId);
}

async function sendCreatedUserAdminEmail(data) {
  const htmlData = await ejs.renderFile(
    "./templates/emailTemplates/adminUserCreated.ejs",
    data
  );

  const subject = "A New User was Added to the System";
  let options = {
    to: "developer@ownourenergy.com",
    subject: subject,
    html: htmlData,
    textEncoding: "base64",
  };
  let messageId = await sendMail(options);
  console.log("Account Created Message sent to Admin successfully:", messageId);

  options = {
    to: "r.miller@ownourenergy.com",
    subject: subject,
    html: htmlData,
    textEncoding: "base64",
  };
  messageId = await sendMail(options);
  console.log("Account Created Message sent to Admin successfully:", messageId);
}

async function sendCreatedUserEmail(user, passwordReset = false) {
  console.log("Account Created Message sending... ");

  var data;
  if (!passwordReset) {
    data = await ejs.renderFile("./templates/emailTemplates/userCreated.ejs", {
      userName: user.name,
      link:
        "https://ownourenergy.web.app/reset-password?hashesId=" + user.hashesId,
    });
  } else {
    data = await ejs.renderFile(
      "./templates/emailTemplates/passwordReset.ejs",
      {
        userName: user.name,
        link:
          "https://ownourenergy.web.app/reset-password?hashesId=" +
          user.hashesId,
      }
    );
  }

  const options = {
    to: user.email,
    subject: passwordReset
      ? "Password Reset"
      : "Continue Setting Up Your Account!",
    html: data,
    textEncoding: "base64",
  };
  const messageId = await sendMail(options);
  console.log("Account Created Message sent successfully:", messageId);
}

async function successPasswordChangeEmail(user) {
  const data = await ejs.renderFile(
    "./templates/emailTemplates/successPassword.ejs",
    { userName: user.name }
  );

  const options = {
    to: user.email,
    subject: "Password Change Successful",
    html: data,
    textEncoding: "base64",
  };
  const messageId = await sendMail(options);
  console.log(
    "Successful Password Created Message sent successfully:",
    messageId
  );
  // return res.send('Email Send');
}

async function successPasswordRequestorChangeEmail(requestor) {
  const data = await ejs.renderFile(
    "./templates/emailTemplates/successPasswordRequestor.ejs",
    { requestorName: requestor.name, empName: requestor.empName }
  );

  console.log(requestor.email);

  const options = {
    to: requestor.email,
    subject: "Account Setup Successful",
    html: data,
    textEncoding: "base64",
  };
  const messageId = await sendMail(options);
  console.log(
    "Successful Password Created Message sent successfully:",
    messageId
  );
  // return res.send('Email Send');
}

async function failPasswordRequestorChangeEmail(requestor) {
  const data = await ejs.renderFile(
    "./templates/emailTemplates/expiredPasswordRequestor.ejs",
    {
      requestorName: requestor.name,
      empName: requestor.empName,
      empEmail: requestor.empEmail,
    }
  );

  console.log(requestor.email);

  const options = {
    // to: requestor.email,
    to: "irfan@excel-pros.com",
    subject: "Account Setup Failed",
    html: data,
    textEncoding: "base64",
  };
  const messageId = await sendMail(options);
  console.log("Expired Password Created Message sent successfully:", messageId);
  // return res.send('Email Send');
}

app.get("/Form", authenticateToken, async (req, res) => {
  try {
    // res.render("pages/Form");
    // console.log(req.user);
    for (let i = 0; i < 7; i++) {
      console.log(
        "+++++++++++++++++++++++++++++++++++++++form Number of time  ",
        [i]
      );
      await FixCalendarAvailability(i, req.user);
    }
  } catch {
    res.status(500).send();
  }
});

async function FixCalendarAvailability(dayOffset, user) {
  var startTime = new Date();
  var endTime = new Date();

  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });

  startTime.setDate(startTime.getDate());
  endTime.setDate(endTime.getDate());

  startTime.setDate(startTime.getDate() + dayOffset);
  endTime.setDate(endTime.getDate() + dayOffset);

  console.log("dayOffset", dayOffset);

  startTime.setHours(8, 0, 0, 0);
  endTime.setHours(23, 0, 0, 0);

  const index = client.initIndex("Users");

  let freeRepFound = false;
  let repFound = "";
  let minEvents = 999;
  let calId = "";
  var h;

  await index
    .search(user.locationId, {
      filters: "available = 1 AND hasCalId = 1",
    })
    .then(async ({ hits }) => {
      console.log("Hist", hits);
      for (h = 0; h < hits.length; h++) {
        console.log("Checking ", hits[h].calId, " for ", startTime, endTime);
        const events = await calendar.events.list({
          calendarId: hits[h].calId,
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
        });
        console.log("event", events.data.items.length);
        if (!events.data.items || events.data.items.length === 0) {
          console.log(
            "On ",
            startTime,
            " ",
            events.data.summary,
            " is Totally Free1",
            events?.data?.items?.length
          );
          repFound = events.data.summary;
          freeRepFound = true;

          ClearMasterCalendar(startTime, endTime, user);
          break;
        } else {
          if (events.data.items.length < minEvents) {
            calId = events.data.summary;
            minEvents = events.data.items.length;
          }
        }
      }
    })
    .catch((err) => {
      console.log(err);
    });
  console.log("Rep", freeRepFound);
  if (!freeRepFound) {
    const blockEvents = await calendar.events.list({
      calendarId: calId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    for (var e = 0; e < blockEvents.data.items.length; e++) {
      let blockStart = new Date(blockEvents.data.items[e].start.dateTime);
      let blockEnd = new Date(blockEvents.data.items[e].end.dateTime);
      console.log("Clearing Block", blockStart, "-", blockEnd, "for ", calId);

      blockCleared = false;
      await index
        .search(user.locationId, {
          filters: "available = 1 AND hasCalId = 1",
        })
        .then(async ({ hits }) => {
          for (h = 0; h < hits.length; h++) {
            let userEvents = await calendar.events.list({
              calendarId: hits[h].calId,
              timeMin: blockStart.toISOString(),
              timeMax: blockEnd.toISOString(),
              singleEvents: true,
              orderBy: "startTime",
            });
            if (!userEvents.data.items || userEvents.data.items.length === 0) {
              console.log(
                "Block",
                blockStart,
                "-",
                blockEnd,
                "cleared by ",
                userEvents.data.summary
              );
              blockCleared = true;
              ClearMasterCalendar(blockStart, blockEnd, user);
              break;
            }
          }
        });

      if (!blockCleared) {
        await index
          .search(user.locationId, {
            filters: "available = 1 AND hasCalId = 1",
          })
          .then(async ({ hits }) => {
            for (h = 0; h < hits.length; h++) {
              let userEvents = await calendar.events.list({
                calendarId: hits[h].calId,
                timeMin: blockStart.toISOString(),
                timeMax: blockEnd.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
              });
              // if (userEvents.data.items.length !== 0) {
              for (var e = 0; e < userEvents.data.items.length; e++) {
                if (
                  new Date(userEvents.data.items[e].start.dateTime) > blockStart
                ) {
                  blockStart = new Date(
                    userEvents.data.items[e].start.dateTime
                  );
                }
                if (
                  new Date(userEvents.data.items[e].end.dateTime) < blockEnd
                ) {
                  blockEnd = new Date(userEvents.data.items[e].end.dateTime);
                }
              }
              // }
            }
          });
        BlockMasterCalendar(blockStart, blockEnd, user);
      }
    }
  }
}

async function GetUserEvents(user, startTime, endTime) {
  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });
  calendar.events.list(
    {
      calendarId: user.calId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const events = res.data.items;
      if (events.length) {
        console.log(
          events.length,
          " Events Found for the day:",
          hit.calId,
          startTime,
          endTime
        );
        return events;
      } else {
        console.log("No upcoming events found.");
        return [];
      }
    }
  );
}

async function BlockMasterCalendar(blockStart, blockEnd, user) {
  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });
  calId = await getCalId(user.locationId);

  const events = await calendar.events.list({
    calendarId: calId,
    timeMin: blockStart.toISOString(),
    timeMax: blockEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 10,
  });

  if (!events.data.items || events.data.items.length === 0) {
    var event = {
      summary: "NO SALES AGENTS AVAILABLE",
      start: {
        dateTime: blockStart.toISOString(),
      },
      end: {
        dateTime: blockEnd.toISOString(),
      },
      reminders: {
        useDefault: false,
      },
    };

    var request = calendar.events.insert(
      {
        calendarId: calId,
        resource: event,
      },
      (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        // console.log(res);
      }
    );
    return;
  }
  for (var e = 0; e < events.data.items.length; e++) {
    if (events.data.items[e].summary == "NO SALES AGENTS AVAILABLE") {
      // console.log('Already Blocked');
      return;
    }
  }
  var event = {
    summary: "NO SALES AGENTS AVAILABLE",
    start: {
      dateTime: blockStart.toISOString(),
    },
    end: {
      dateTime: blockEnd.toISOString(),
    },
    reminders: {
      useDefault: false,
    },
  };

  var request = calendar.events.insert(
    {
      calendarId: calId,
      resource: event,
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
    }
  );
}

async function getCalId(locationId) {
  console.log(locationId);
  const snapshot = await db.collection("Locations").doc(locationId).get();
  const data = snapshot.data();
  console.log("calId", data.calId);
  return data.calId;
}

async function ClearMasterCalendar(start, end, user) {
  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });
  console.log(start, end, user);
  calId = await getCalId(user.locationId);

  const events = await calendar.events.list({
    calendarId: calId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 10,
  });
  if (!events.data.items || events.data.items.length === 0) {
    // console.log(events.config.params.timeMin, 'No Events to Delete')
    return;
  }
  // console.log(events.config.params.timeMin, events.data.items.length, ' Event(s) to Delete');
  for (var e = 0; e < events.data.items.length; e++) {
    // console.log(calId, events.data.items[e].summary, events.data.items[e].id);
    if (events.data.items[e].summary == "NO SALES AGENTS AVAILABLE") {
      // eID = events.data.items[e].htmlLink.slice(-76);
      eID = events.data.items[e].id;
      // console.log(events.data.items[e]);
      // console.log(eID);
      calendar.events.delete(
        {
          calendarId: calId,
          eventId: eID,
        },
        (err, res) => {
          if (err) return console.log("The API returned an error: " + err);
          // console.log(res);
        }
      );
    }
  }
}

async function isSetter(aId) {
  const snapshot = await db.collection("AccessLevels").doc(aId).get();
  const data = snapshot.data();
  if (data.Level == "Setter") {
    return true;
  }
  return false;
}
// app.post("/getRepAppointTime", authenticateToken, async (req, res) => {
async function RepAssignAppt(timeTxt, cxName, address, user, notes) {
  try {
    const calId = await getCalId(user.locationId);
    console.log("calId", calId);
    let time = new Date(Date.parse(timeTxt));
    time = new Date(time.getTime() + 0 * 60 * 60 * 1000);
    console.log(time);
    const endTime = new Date(time.getTime() + 1.5 * 60 * 60 * 1000);
    let startOfDay = new Date(time.toString());
    startOfDay.setHours(8, 0, 0, 0);
    let nextDay = new Date();
    nextDay.setDate(startOfDay.getDate());
    nextDay.setHours(23, 0, 0, 0);
    let h;
    let availableRepId = [];
    let recordArray = [];
    let events;
    let dayEvents;
    let availEmployees = [];
    let lowestRep;
    let repCountUser = [];
    let eventsToday = 0;
    console.log(recordArray);
    console.log("Location \t" + user.locationId);
    if (await isSetter(user.accessLevelId)) {
      console.log("user is setter");
      await db
        .collection("Users")
        .where("locationId", "==", user?.locationId)
        .get()
        .then(async (querySnapshot) => {
          await querySnapshot.forEach(async (doc) => {
            data = await doc.data();
            data.id = doc.id;
            recordArray.push(data);
          });
        });
      console.log("Users in my location", recordArray.length);
      for (let i = 0; i < recordArray.length; i++) {
        let count = recordArray[i].count;
        if (
          recordArray[i].available == true &&
          recordArray[i].hasCalId == true &&
          recordArray[i].accessLevel !== "y3L0EGYgGTO1ooUZh7Nj" &&
          recordArray[i].locationId == user.locationId
        ) {
          console.log("all available reps in my location", recordArray.length);
          repCountUser.push(recordArray[i]);
          // console.log("hits my cal Id", time, endTime, recordArray[i].calId);
          calendar = google.calendar({
            version: "v3",
            auth: await getOAuth2Client(),
          });
          const events = await calendar.events.list({
            calendarId: recordArray[i].calId,
            timeMin: time.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 10,
          });
          console.log("Event", events.data.items);
          if (!events.data.items || events.data.items.length === 0) {
            console.log(recordArray[i].calId, " is Available");
            eventsToday = 0;
            dayEvents = await calendar.events.list({
              calendarId: recordArray[i].calId,
              timeMin: startOfDay.toISOString(),
              timeMax: nextDay.toISOString(),
              singleEvents: true,
              orderBy: "startTime",
            });
            if (!dayEvents.data.items || dayEvents.data.items.length === 0) {
              console.log(
                recordArray[i].calId,
                "has ",
                eventsToday,
                "eventsToday"
              );
              recordArray[i].eventsToday = eventsToday;
              availEmployees.push(recordArray[i]);
              continue;
            } else {
              console.log("Length not equal 0");
              recordArray[i].eventsToday = events.data.items.length;
              availEmployees.push(recordArray[i]);
              continue;
            }
          }
        }
      }
      console.log("rep", repCountUser);
    } else {
      calendar = google.calendar({
        version: "v3",
        auth: await getOAuth2Client(),
      });
      console.log("user", user);
      var event = {
        summary: "Sales Appointment with " + cxName,
        description: address + "\n" + notes,
        start: {
          dateTime: time.toISOString(),
        },
        end: {
          dateTime: endTime.toISOString(),
        },
        reminders: {
          useDefault: false,
        },
        attendees: {
          email: user.email,
        },
      };
      await calendar.events.insert(
        {
          calendarId: user.calId,
          resource: event,
        },
        (err, res) => {
          if (err) return console.log("The API returned an error: " + err);
          // console.log(res);
        }
      );
      return user.id;
    }
    console.log("kk", user.id);
    console.log("repcount", repCountUser, "AvailableEmbloyes", availEmployees);
    let free = [];

    await availEmployees.sort(function (a, b) {
      return parseFloat(b.priority) - parseFloat(a.priority);
    });
    console.log("avail employee", availEmployees);
    var biggest = await availEmployees.reduce(function (highest, count) {
      return highest.priority < count.priority && highest.count < count.count
        ? highest
        : count;
    }, 0);
    console.log("biggest ", biggest);
    var startDateTime = time.getTime() - 7 * 60 * 60 * 1000;
    var EndDateTime = endTime.getTime() - 5.5 * 60 * 60 * 1000;
    var event = {
      summary: "Sales Appointment with " + cxName,
      description: address + "\n" + notes,
      start: {
        dateTime: time.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      reminders: {
        useDefault: false,
      },
      attendees: {
        email: biggest.email,
      },
    };
    await db
      .collection("Users")
      .where("locationId", "==", biggest.locationId)
      .where("calId", "==", biggest.calId)
      .where("email", "==", biggest.email)
      .get()
      .then(async (querySnapshot) => {
        await querySnapshot.forEach(async (doc) => {
          docId = await doc.id;
          availableRepId.push(docId);
        });
      })
      .then(async () => {
        await db
          .collection("Users")
          .doc(availableRepId[0])
          .update({
            count: biggest.count - 1,
          })
          .then(async () => {
            console.log("Insert");
            await calendar.events.insert(
              {
                calendarId: biggest.calId,
                resource: event,
              },
              (err, res) => {
                if (err)
                  return console.log("The API returned an error: " + err);
                // console.log(res);
              }
            );
          });
      });
    console.log("availableRepId", availableRepId[0]);
    return availableRepId[0];
  } catch (e) {
    console.log("erroe", e);
  }
}
app.get("/getApptTimes", authenticateToken, async (req, res) => {
  var startTimes = [];
  var start = new Date(Date.parse(req.query.selectedDate));
  start.setHours(8, 0, 0, 0);
  let calId;

  for (i = 0; i < 31; i++) {
    end = new Date(start.getTime() + 90 * 60000);
    if (start >= new Date()) {
      if (await isSetter(req.user.accessLevelId)) {
        calId = await getCalId(req.user.locationId);
        console.log("Looking in Location's calId - ", calId);
      } else {
        calId = req.user.calId;
        console.log("Looking in User's calId - ", calId);
      }

      if (await approveNextTime(calId, start, end)) {
        timeAvailable = moment(start)
          .tz("Canada/Eastern")
          .format("ddd MMM DD YYYY, HH:mm:ss z");
        // timeAvailable = start.toLocaleString("en-US", {
        //   hour: "numeric",
        //   minute: "numeric",
        //   hour12: false,
        // });
        startTimes.push(timeAvailable);
        console.log("time available", timeAvailable);
      }
    }
    start = new Date(start.getTime() + 30 * 60000);
  }
  req = req;
  return res.status(200).send(startTimes);
});

app.get("/api/getApptTimes", authenticateToken, async (req, res) => {
  try {
    console.log(req.user);
    var startTimes = [];
    var start = new Date(Date.parse(req.query.selectedDate));
    start = new Date(start.getTime() + 1 * 60 * 60 * 1000);
    start.setHours(8, 0, 0, 0);
    console.log("currentStart", start);

    let calId;

    for (i = 0; i < 31; i++) {
      end = new Date(start.getTime() + 1.5 * 60 * 60 * 1000);
      if (start > new Date()) {
        if (await isSetter(req.user.accessLevelId)) {
          calId = await getCalId(req.user.locationId);
          console.log("Looking in Location's  calId - ", calId);
        } else {
          calId = req.user.calId;
          console.log("Looking in User's calId - ", calId);
        }

        if (await approveNextTime(calId, start, end)) {
          console.log("mystart", start);
          console.log("myend", end);
          //  timeAvailable = moment(start)
          // .tz('America/Toronto')
          // .format(" HH:mm");
          const timeAvailable = start.toLocaleString("en-US", {
            timeZone: "America/Toronto",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          });
          startTimes.push(timeAvailable);

          // console.log("time start available", timeAvailable );
          console.log("time available", timeAvailable);
        }
      }
      start = new Date(start.getTime() + 30 * 60 * 1000);
    }

    req = req;
    return res.status(200).send(startTimes);
  } catch (e) {
    console.log("responseError", e);
    res.status(404).send(e);
  }
});

app.post("/updateRepLead", authenticateToken, async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "edit-alot-count",
      req.user,
      "edit-alot-count-action"
    );
    if (parseInt(canView.rank) > 1) {
      const userId = req.body.userId;
      const allotCount = req.body.appointCount;
      await db
        .collection("Users")
        .doc(req.body.userId)
        .get()
        .then((e) => {
          count = e.data().count;
          console.log(count);
          if (count === 0 || count === undefined) {
            console.log("Count 0");
            e.ref.update({
              count: allotCount,
              allotCount: allotCount,
            });
          } else {
            console.log("Count");
            e.ref
              .update({
                allotCount: allotCount,
              })
              .then(() => {
                res.status(200).send("Updated");
              });
          }
        });
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});

app.post("/updatePriorityList", authenticateToken, async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "edit-alot-count",
      req.user,
      "edit-alot-count-action"
    );
    if (parseInt(canView.rank) > 1) {
      const data = req.body.data;
      console.log(data.length);
      console.log(data);
      if (data.length === 0) {
        res.status(204).send("No Found");
      } else {
        for (let i = 0; i < data.length; i++) {
          if (i > data.length) {
            return;
          } else {
            await db
              .collection("Users")
              .doc(data[i].userId)
              .get()
              .then((e) => {
                count = e.data().count;
                console.log("dd", count);
                if (count == 0 || count == undefined) {
                  console.log("Count 0");
                  e.ref.update({
                    priority: data[i].priority,
                    count: data[i].allotCount,
                    allotCount: data[i].allotCount,
                  });
                } else {
                  console.log("Count");
                  e.ref.update({
                    priority: data[i].priority,
                    allotCount: data[i].allotCount,
                  });
                }
              });
          }
        }
      }
      res.status(200).send("Update");
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});

app.get("/api/getEmail", authenticateToken, async (req, res) => {
  const Users = db.collection("Users");
  const allUsers = await Users.where("email", "==", req.query.email).get();

  let allEmailUsers = [];
  allUsers.forEach(async (doc) => {
    data = doc.data();
    allEmailUsers.push(data);
  });

  return res.json(allEmailUsers);
});

async function approveNextTime(calId, start, end) {
  const checkTimeStart = new Date(start.getTime() + 0 * 60 * 60 * 1000);
  const checkTimeEnd = new Date(end.getTime() + 0 * 60 * 60 * 1000);
  console.log(
    "Checking ",
    checkTimeStart.toISOString(),
    checkTimeEnd.toISOString()
  );
  const calendar = google.calendar({
    version: "v3",
    auth: await getOAuth2Client(),
  });

  const events = await calendar.events.list({
    calendarId: calId,
    timeMin: checkTimeStart.toISOString(),
    timeMax: checkTimeEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 10,
  });
  console.log(events.data.items);

  if (!events.data.items || events.data.items.length === 0) {
    return true;
  }

  return false;
}

// function authenticateToken(req, res, next) {
//   if (!req.headers.access_token) {
//     //res.render('../views/pages/login')
//     res.status(404);
//     // return;
//   }
//   const token = req.headers.authorization; //Issue
//   const r_token = token.replace(/^Bearer\s/, "");
//   jwt.verify(r_token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//     if (err) {
//       res.status(404).send(err);
//       return;
//     }
//     req.user = user;
//     next();
//   });
// }

app.listen(port, (_) => {
  console.log(`Server running at ${port}`);
  Authorize();
  // Backup();
});

app.get("/views/leads", authenticateToken, async (req, res) => {
  isAllowed = await isAllowedToView3(
    "leads-view",
    req.user,
    "leads-view-action"
  );
  if (parseInt(isAllowed.rank) > 1) {
    const Users = db.collection("Users");

    const usersSnap = await Users.where("email", "==", req.user.email).get();
    let user;
    usersSnap.forEach((doc) => {
      user = doc.data();
    });

    const index = client.initIndex("Users");
    canViewUsers = await isAllowedToView3("viewUsers", req.user);
    console.log("canview" + canViewUsers.rank);
    let hits = [];
    let users = [];
    // index.search(" " + canViewUsers.id).then(async ({ hits }) => {
    index
      .browseObjects({
        query: canViewUsers.id,
        batch: (batch) => {
          hits = hits.concat(batch);
        },
      })
      .then(async () => {
        console.log("hits length= " + hits.length);

        if (canViewUsers.rank > 1) {
          users = hits;
        }

        users.sort(function (person1, person2) {
          return person1.name.localeCompare(person2.name);
        });

        let allApptOutcomes = [];
        const appointmentOutcomes = await db
          .collection("AppointmentOutcomes")
          .get();
        appointmentOutcomes.forEach((doc) => {
          apptOutcome = doc.data();
          apptOutcome.id = doc.id;
          allApptOutcomes.push(apptOutcome);
        });

        await isAdminUser(user, () => {
          data = {
            admin: user.admin,
            manager: user.manager,
          };
          res.status(200).send({
            data,
            users,
            allApptOutcomes,
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
app.get("/allAppointments", async (req, res) => {
  try {
    const appoint = await db.collection("AppointmentOutcomes").get();
    const allAppoint = [];
    appoint.forEach((doc) => {
      data = doc.data();
      data.id = doc.id;
      allAppoint.push(data);
    });
    res.status(200).send(allAppoint);
  } catch {
    res.status(500).send();
  }
});

app.get("/getAccessLevel", async (req, res) => {
  try {
    const accessLevel = await db
      .collection("AccessLevels")
      .orderBy("priority")
      .get();
    let access_Level = [];
    accessLevel.forEach((doc) => {
      data = doc.data();
      data.id = doc.id;
      access_Level.push(data);
    });
    res.status(200).send(access_Level);
  } catch {
    res.status(500).send();
  }
});
app.get("/getAllUsersName", async (req, res) => {
  try {
    const appoint = await db.collection("Users").get();
    const allAppoint = [];
    appoint.forEach((doc) => {
      data = doc.data();
      data.id = doc.id;
      if (data.active == true) {
        allAppoint.push(data);
      }
    });
    res.status(200).send(allAppoint);
  } catch {
    res.status(500).send();
  }
});
app.get("/leads", authenticateToken, async (req, res) => {
  try {
    // will be undefined in first call
    console.log(req.query);
    const Users = db.collection("Users");
    const usersSnap = await Users.where("email", "==", req.user.email).get();

    usersSnap.forEach((doc) => {
      user = doc.data();
      user.id = doc.id;
    });
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

    const index = client.initIndex("Leads");
    index.setSettings({
      paginationLimitedTo: 10000000000,
    });
    canView = await isAllowedToView3(
      "leads-view",
      req.user,
      "leads-view-action"
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
            if (typeof hits[h].dateCreated == "number") {
              hits[h].dateCreated = new Date(hits[h].dateCreated);
            }

            for (let u = 0; u < allUsers.length; u++) {
              if (allUsers[u].id == hits[h].setter) {
                hits[h].setter = allUsers[u];
              }
            }
          }

          console.log("Users Joined");

          // sorts by date (newest to oldest)
          hits.sort((a, b) => {
            let da = new Date(a.dateCreated ? a.dateCreated : a.created),
              db = new Date(b.dateCreated ? b.dateCreated : b.created);
            return db - da;
          });

          console.log("Got data for ", reqId);

          res.status(200).send({
            hits: hits,
            allApptOutcomes: allApptOutcomes,
            reqId: reqId,
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
            if (typeof hits[h].dateCreated == "number") {
              hits[h].dateCreated = new Date(hits[h].dateCreated);
            }
            for (let u = 0; u < allUsers.length; u++) {
              if (allUsers[u].id == hits[h].setter) {
                hits[h].setter = allUsers[u];
              }
            }
          }

          // sorts by date (newest to oldest)
          hits.sort((a, b) => {
            let da = new Date(a.dateCreated ? a.dateCreated : a.created),
              db = new Date(b.dateCreated ? b.dateCreated : b.created);
            return db - da;
          });
          console.log("Got data for ", reqId);
          //  let paginationData =  hits.slice((currentPage-1)*perPage,((currentPage-1)*perPage)+10)
          res.status(200).send({
            hits: hits,
            allApptOutcomes: allApptOutcomes,
            reqId: reqId,
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

app.get("/reportData", authenticateToken, async (req, res) => {
  try {
    canView = await isAllowedToView3("viewLeadsLeaderboard", req.user);
    console.log(canView.id);

    let allApptOutcomes = [];
    const appointmentOutcomes = await db
      .collection("AppointmentOutcomes")
      .get();
    appointmentOutcomes.forEach((doc) => {
      apptOutcome = doc.data();
      apptOutcome.id = doc.id;
      allApptOutcomes.push(apptOutcome);
    });

    const usersIndex = client.initIndex("Users");
    const leadsIndex = client.initIndex("Leads");

    let obj = {};
    obj.allApptOutcomes = allApptOutcomes;

    //req.query.leadInput + " " + canView.id
    completeObj = await usersIndex
      .search("" + canView.id)
      .then(async ({ hits }) => {
        obj.usersAndLeads = hits;
        for (let h = 0; h < obj.usersAndLeads.length; h++) {
          await leadsIndex
            .search("", {
              filters:
                "setter: " +
                obj.usersAndLeads[h].objectID +
                " OR rep: " +
                obj.usersAndLeads[h].objectID,
            })
            .then(async ({ hits }) => {
              obj.usersAndLeads[h].leads = hits;
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });

    return res.json(obj);
  } catch {
    res.status(500).send();
  }
});

// app.get('/leaderboard', authenticateToken, async (req, res) => {
async function getCloserLeaderboardData() {
  let userLeaderBoard = [];
  var setterDocId = "",
    soldId = "";

  const setterAccessLevel = await db
    .collection("AccessLevels")
    .where("Level", "==", "Setter")
    .get();
  // outer loop runs once (necessary to get setter's doc id)
  for (doc of setterAccessLevel.docs) {
    setterDocId = doc.id;

    const sold = await db
      .collection("AppointmentOutcomes")
      .where("name", "==", "Sold")
      .get();
    // outer loop runs once (necessary to get sold status doc id)
    for (doc of sold.docs) {
      soldId = doc.id;

      // all closers
      const closers = await db
        .collection("Users")
        .where("accessLevel", "!=", setterDocId)
        .get();

      for (doc of closers.docs) {
        closerData = doc.data();
        const closerSoldLeads = await db
          .collection("Leads")
          .where("rep", "==", doc.id)
          .where("status", "==", soldId)
          .get();
        const locationName = await db
          .collection("Locations")
          .doc(closerData.locationId)
          .get();

        locationData = locationName.data();
        soldSize = closerSoldLeads.size;

        if (soldSize != 0) {
          userLeaderBoard.push({
            name: closerData.name,
            sold: soldSize,
            location: locationData.name,
          });
        }
      }
    }
  }

  userLeaderBoard.sort((a, b) => {
    return b.sold - a.sold;
  });
  return userLeaderBoard;
}

async function getSetterLeaderboardData() {
  let userLeaderBoard = [];
  var setterDocId = "",
    soldId = "",
    sitId = "";

  const setterAccessLevel = await db
    .collection("AccessLevels")
    .where("Level", "==", "Setter")
    .get();
  // outer loop runs once (necessary to get setter's doc id)
  for (doc of setterAccessLevel.docs) {
    setterDocId = doc.id;

    soldId = await getStatusId("Sold");
    sitId = await getStatusId("Sit");

    // all setters
    const setters = await db
      .collection("Users")
      .where("accessLevel", "==", setterDocId)
      .get();

    for (doc of setters.docs) {
      setterData = doc.data();
      const setterSitOrSoldLeads = await db
        .collection("Leads")
        .where("setter", "==", doc.id)
        .where("status", "in", [soldId, sitId])
        .get();
      const locationName = await db
        .collection("Locations")
        .doc(setterData.locationId)
        .get();

      locationData = locationName.data();
      soldOrSitSize = setterSitOrSoldLeads.size;

      if (soldOrSitSize != 0) {
        userLeaderBoard.push({
          name: setterData.name,
          soldOrSit: soldOrSitSize,
          location: locationData.name,
        });
      }
    }
  }

  userLeaderBoard.sort((a, b) => {
    return b.soldOrSit - a.soldOrSit;
  });

  return userLeaderBoard;
}

async function uploadFile(fileObject) {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);
  const { data } = await google
    .drive({ version: "v3", auth: await getOAuth2Client() })
    .files.create({
      media: {
        mimeType: fileObject.mimeType,
        body: bufferStream,
      },
      requestBody: {
        name: fileObject.originalname,
        // parents: ['1LUGuZD0AMTiChdxnVjbkXQ6ce2scMJuS'],
      },
      // fields: 'id,name',
    });
  console.log("fiobje", data);

  return makeFilePublic(data.id);
}

async function makeFilePublic(fileId) {
  try {
    await google
      .drive({ version: "v3", auth: await getOAuth2Client() })
      .permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    const result = await drive({
      version: "v3",
      auth: await getOAuth2Client(),
    }).files.get({
      fileId: fileId,
      fields: "webViewLink , webContentLink",
    });
    return result.data;
  } catch (error) {
    console.log(error.message);
  }
}

app.get("/getAllAccounts", async (req, res) => {
  await db
    .collection("ProjectRuns")
    .doc("111")
    .get()
    .then(async (doc) => {
      data = doc.data();
      let startDate = data.start.toDate();
      console.log("start", startDate);
      let startMome = moment(startDate).add(1, "Hours");
      // data.start.setHours(data.start.getHours() + 1)
      if (startMome !== null && startMome < new Date()) {
        await db
          .collection("ProjectRuns")
          .doc("111")
          .update({
            end: null,
            start: new Date(),
          })
          .then(async () => {
            let allResult = [];
            let matchFound;
            headers.append("Content-Type", "application/json");
            let user = JSON.stringify({
              username: "own_energy",
              password: "8z0R%74LGLn!",
            });
            var requestOptions = {
              method: "POST",
              headers: headers,
              body: user,
              redirect: "follow",
            };
            await fetch(
              "https://lgcy-analytics.com/api/api-token-auth",
              requestOptions
            )
              .then((response) => response.text())
              .then(async (result) => {
                let token = await JSON.parse(result);
                let tokenInt = token.token;
                console.log();
                await fetch(
                  "https://lgcy-analytics.com/api/sales_partners/accounts/",
                  {
                    headers: {
                      "content-type": "application/json",
                      Authorization: "Bearer " + tokenInt,
                    },
                  }
                )
                  .then((response) => response.text())
                  .then(async (result) => {
                    let results = await JSON.parse(result);
                    let allResultLength = await results.count;
                    console.log("Results", results.count);
                    console.log("Total Page", results.total_pages);
                    for (let i = 1; i <= results.total_pages; i++) {
                      await fetch(
                        `https://lgcy-analytics.com/api/sales_partners/accounts/?page=${i}`,
                        {
                          headers: {
                            "content-type": "application/json",
                            Authorization: "Bearer " + tokenInt,
                          },
                        }
                      )
                        .then((response) => response.text())
                        .then(async (loopresult) => {
                          let results = await JSON.parse(loopresult);
                          let array1 = results.results;
                          allResult.push(...array1);
                        });
                    }
                    let addCount = 0;
                    let updateCount = 0;
                    for (let i = 0; i < allResult.length; i++) {
                      (await CreateCustomer(allResult[i]))
                        ? addCount++
                        : updateCount++;
                    }
                    console.log(
                      addCount,
                      "Customers Added,",
                      updateCount,
                      "Customers Updated"
                    );
                  });
              });
          })
          .then(async () => {
            await db.collection("ProjectRuns").doc("111").update({
              end: new Date(),
            });
            res.status(200).send("Project Reconciliation Completed");
          });
      }
    });
  res.status(200).send();
});

app.get("/getAllAccountsold", async (req, res) => {
  try {
    let allResult = [];
    let allProject = [];
    let matchFound;
    headers.append("Content-Type", "application/json");
    let user = JSON.stringify({
      username: "own_energy",
      password: "8z0R%74LGLn!",
    });
    var requestOptions = {
      method: "POST",
      headers: headers,
      body: user,
      redirect: "follow",
    };
    await fetch("https://lgcy-analytics.com/api/api-token-auth", requestOptions)
      .then((response) => response.text())
      .then(async (result) => {
        let token = await JSON.parse(result);
        let tokenInt = token.token;
        console.log();
        await fetch("https://lgcy-analytics.com/api/sales_partners/accounts/", {
          headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + tokenInt,
          },
        })
          .then((response) => response.text())
          .then(async (result) => {
            let results = await JSON.parse(result);
            let allResultLength = await results.count;
            console.log("gg", results.count);
            console.log("gg", results.total_pages);
            for (let i = 1; i <= results.total_pages; i++) {
              await fetch(
                `https://lgcy-analytics.com/api/sales_partners/accounts/?page=${i}`,
                {
                  headers: {
                    "content-type": "application/json",
                    Authorization: "Bearer " + tokenInt,
                  },
                }
              )
                .then((response) => response.text())
                .then(async (loopresult) => {
                  let results = await JSON.parse(loopresult);
                  let array1 = results.results;
                  allResult.push(...array1);
                });
            }
            // res.status(200).send(allResult)
            if (allResultLength == allResult.length) {
              await db
                .collection("Projects")
                .get()
                .then((querySnapshot) => {
                  querySnapshot.forEach(async (doc) => {
                    data = doc.data();
                    data.id = doc.id;
                    docId = doc.id;
                    allProject.push(data);
                  });
                })
                .catch((e) => console.log("for Each Error", e));
              console.log(allResult.length, allProject.length);
            }
          });
      })
      .catch((error) => console.log("Fetcherror", error));
    console.log(allResult.length, allProject.length);
    for (let i = 0; i < allResult.length; i++) {
      // console.log("pID", allResult[i].id);
      matchFound = false;
      for (let j = 0; j < allProject.length; j++) {
        // console.log("pID", allResult[i].id, parseInt(allProject[j].id));
        if (allResult[i].id == allProject[j].id) {
          matchFound = true;
          // console.log("Matched", allResult[i].id, allProject[j].id, "Update");
          let stringDoc = allResult[i].id.toString();
          await db
            .collection("Projects")
            .doc(stringDoc)
            .update({
              id: allResult[i].id,
              prospect_id: allResult[i].prospect_id,
              homeowner_id: allResult[i].homeowner_id,
              proposal_id: allResult[i].proposal_id,
              customer_name: allResult[i].customer_name,
              customer_address: allResult[i].customer_address,
              customer_address_2: allResult[i].customer_address_2,
              customer_city: allResult[i].customer_city,
              customer_state: allResult[i].customer_state,
              customer_zip: allResult[i].customer_zip,
              customer_email: allResult[i].customer_email,
              customer_phone: allResult[i].customer_phone,
              setter_id: allResult[i].setter_id,
              rep_name: allResult[i].rep_name,
              rep_email: allResult[i].rep_email,
              employee_id: allResult[i].employee_id,
              install_partner: allResult[i].install_partner,
              install_partner_id: allResult[i].install_partner_id,
              created: allResult[i].created,
              modified: allResult[i].modified,
              customer_signoff: allResult[i].customer_signoff,
              m1: allResult[i].m1,
              scheduled_install: allResult[i].scheduled_install,
              install_complete: allResult[i].install_complete,
              m2: allResult[i].m2,
              date_cancelled: allResult[i].date_cancelled,
              return_sales_date: allResult[i].return_sales_date,
              cash_amount: allResult[i].cash_amount,
              loan_amount: allResult[i].loan_amount,
              kw: allResult[i].kw,
              dealer_fee_percentage: allResult[i].dealer_fee_percentage,
              adders: allResult[i].adders,
              adders_description: allResult[i].adders_description,
              financing_rate: allResult[i].financing_rate,
              financing_term: allResult[i].financing_term,
              product: allResult[i].product,
              funding_source: allResult[i].funding_source,
              gross_account_value: allResult[i].gross_account_value,
            })
            .then(() => {
              matchFound = true;
              // console.log("Existing Result Updated");
            })
            .catch((e) => console.log(e));
          break;
        }
      }
      console.log("match", matchFound);
      if (matchFound == false) {
        console.log("UnMatched", allResult[i], "Add");
        // matched = true
        let stringDoc = allResult[i].id.toString();
        await db
          .collection("Projects")
          .doc(stringDoc)
          .set({
            id: allResult[i].id,
            prospect_id: allResult[i].prospect_id,
            homeowner_id: allResult[i].homeowner_id,
            proposal_id: allResult[i].proposal_id,
            customer_name: allResult[i].customer_name,
            customer_address: allResult[i].customer_address,
            customer_address_2: allResult[i].customer_address_2,
            customer_city: allResult[i].customer_city,
            customer_state: allResult[i].customer_state,
            customer_zip: allResult[i].customer_zip,
            customer_email: allResult[i].customer_email,
            customer_phone: allResult[i].customer_phone,
            setter_id: allResult[i].setter_id,
            rep_name: allResult[i].rep_name,
            rep_email: allResult[i].rep_email,
            employee_id: allResult[i].employee_id,
            install_partner: allResult[i].install_partner,
            install_partner_id: allResult[i].install_partner_id,
            created: allResult[i].created,
            modified: allResult[i].modified,
            customer_signoff: allResult[i].customer_signoff,
            m1: allResult[i].m1,
            scheduled_install: allResult[i].scheduled_install,
            install_complete: allResult[i].install_complete,
            m2: allResult[i].m2,
            date_cancelled: allResult[i].date_cancelled,
            return_sales_date: allResult[i].return_sales_date,
            cash_amount: allResult[i].cash_amount,
            loan_amount: allResult[i].loan_amount,
            kw: allResult[i].kw,
            dealer_fee_percentage: allResult[i].dealer_fee_percentage,
            adders: allResult[i].adders,
            adders_description: allResult[i].adders_description,
            financing_rate: allResult[i].financing_rate,
            financing_term: allResult[i].financing_term,
            product: allResult[i].product,
            funding_source: allResult[i].funding_source,
            gross_account_value: allResult[i].gross_account_value,
          })
          .then(() => console.log("Add new ID"))
          .catch((e) => console.log(e));
      }
    }
    res.status(200).send();
  } catch {
    res.status(500).send();
  }
});

app.post("/createAccessLevel", authenticateToken, async (req, res) => {
  try {
    const levelName = req.body.levelName;
    const subAccesId = [];
    const accessLevelId = db.collection("AccessLevels").doc().id;
    console.log(accessLevelId);
    db.collection("AccessLevels")
      .doc(accessLevelId)
      .set({
        Level: levelName,
      })
      .then(() => {
        db.collection("SubAccess")
          .get()
          .then((e) => {
            console.log(e.size);
            e.forEach((doc) => {
              data = doc.data();
              data.id = doc.id;
              subAccesId.push(data);
            });
          })
          .then(() => {
            for (let i = 0; i < subAccesId.length; i++) {
              if (i > subAccesId.length) {
                return;
              } else {
                db.collection("AccessLevelAccess").doc().set({
                  accessLevelId: accessLevelId,
                  accessValues: 1,
                  subAccessId: subAccesId[i].id,
                });
              }
            }
            res.status(200).send("Added");
          });
      });
  } catch {
    res.status(500).send();
  }
});

app.post("/createSubAccess", authenticateToken, async (req, res) => {
  try {
    const subAccessId = db.collection("SubAccess").doc().id;
    console.log("sub Access Id", subAccessId);
    const accessLevel = [];
    db.collection("SubAccess")
      .doc(subAccessId)
      .set({
        accessId: req.body.accessId,
        displayName: req.body.displayName,
        featureName: req.body.featureName,
      })
      .then(() => {
        db.collection("AccessLevels")
          .get()
          .then((e) => {
            console.log(e.size);
            console.log(e);
            e.forEach((doc) => {
              data = doc.data();
              data.id = doc.id;
              accessLevel.push(data);
            });
          })
          .then(() => {
            for (let i = 0; i < accessLevel.length; i++) {
              if (i > accessLevel.length) {
                return;
              } else {
                db.collection("AccessLevelAccess").doc().set({
                  accessLevelId: accessLevel[i].id,
                  accessValues: 1,
                  subAccessId: subAccessId,
                });
              }
            }
            res.status(200).send("Added");
          });
      });
  } catch {
    res.status(500).send();
  }
});
app.post("/accessUser", authenticateToken, async (req, res) => {
  try {
    await db
      .collection("Access")
      .add({
        category: req.body.category,
        displayName: req.body.displayName,
        keyword: req.body.keyword,
      })
      .then((e) => {
        console.log(e.id);
        res.status(200).send(e.id);
      });
  } catch {
    res.status(500).send("error");
  }
});
app.get("/getAccess", authenticateToken, async (req, res) => {
  try {
    let allAccess = [];
    const access = await db.collection("Access").get();
    access.forEach((doc) => {
      data = doc.data();
      data.id = doc.id;
      allAccess.push(data);
      console.log(data);
    });
    res.status(200).send(allAccess);
  } catch {
    res.status(500).send("error");
  }
});

app.get("/getLeadCountWithStatusId", authenticateToken, async (req, res) => {
  try {
    await db
      .collection("Leads")
      .where("status", "==", req.query.statusId)
      .get()
      .then((e) => {
        const count = e.size;
        res.send(200, count);
      });
  } catch {
    res.status(500).send();
  }
});
app.get(
  "/getPaymentCountWithCategoryId",
  authenticateToken,
  async (req, res) => {
    try {
      await db
        .collection("Payments")
        .where("expenseStatus", "==", req.query.categoryId)
        .get()
        .then((e) => {
          const count = e.size;
          res.send(200, count);
        });
    } catch {
      res.status(500).send();
    }
  }
);

app.post(
  "/deleteStatusAfterLeadUpdate",
  authenticateToken,
  async (req, res) => {
    try {
      const statusId = req.body.statusId;
      const leadCount = req.body.leadCount;
      await db
        .collection("Leads")
        .where("status", "==", statusId)
        .get()
        .then((e) => {
          e.forEach((doc) => {
            doc.ref.update({
              status: req.body.newStatusId,
            });
          });
        })
        .then(() => {
          db.collection("AppointmentOutcomes")
            .doc(statusId)
            .delete()
            .then(() => {
              res.send(200, "value");
            });
        });
      // updateLeadStatusName();
    } catch {
      res.status(500).send();
    }
  }
);

app.post("/leadFilter", authenticateToken, async (req, res) => {
  try {
    let FilterData = [];
    await db
      .collection("Leads")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach(async (item) => {
          const dateCreated = moment(item?.data().dateCreated).format(
            "YYYY-MM-DD"
          );
          console.log(dateCreated);

          if (
            dateCreated >= req.body.startDate &&
            dateCreated <= req.body.endDate
          ) {
            console.log("FilterData", item.data());
            FilterData.push(item.data());
          }
          console.log("dateArra", FilterData);
          // else{
          //   const mySetter = await item.data().setter;
          //   console.log("Yes")
          //   leadSetter.push(mySetter);
          // }
        });
      });
    res.status(200).send(FilterData);
  } catch {
    res.status(500).send();
  }
});
app.post("/addExpenseCategory", authenticateToken, async (req, res) => {
  try {
    db.collection("ExpenseCategory")
      .add({
        name: req.body.name,
      })
      .then(() => {
        res.status(200).send("Expense Category added");
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/getAllExpensCategory", authenticateToken, async (req, res) => {
  try {
    let allExpenses = [];
    await db
      .collection("ExpenseCategory")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          console.log("allExpense", data);
          data.id = doc.id;
          allExpenses.push(data);
        });
      });
    res.status(200).send(allExpenses);
  } catch {
    res.status(500).send();
  }
});
app.post("/updateExpenseCategory", authenticateToken, async (req, res) => {
  try {
    db.collection("ExpenseCategory")
      .doc(req.query.categoryId)
      .update({
        name: req.body.name,
      })
      .then(() => {
        res.status(200).send("Expense Category Updated");
      });
  } catch {
    res.status(500).send();
  }
});
app.post("/deleteExpenseCategory", authenticateToken, async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    // const leadCount = req.body.leadCount;
    await db
      .collection("Payments")
      .where("category", "==", categoryId)
      .get()
      .then((e) => {
        e.forEach((doc) => {
          doc.ref.update({
            status: req.body.newCategoryId,
          });
        });
      })
      .then(() => {
        db.collection("ExpenseCategory")
          .doc(categoryId)
          .delete()
          .then(() => {
            res.send(200, "deleted");
          });
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/payroll", authenticateToken, async (req, res) => {
  let repId = await RepAssignAppt(
    "Sat 1 Oct 2022 4:00 PM",
    "Hassan",
    "Karachi",
    req?.user,
    "abc"
  );
  res?.send(200, repId);
});
app.post("/createAccessLevel", authenticateToken, async (req, res) => {
  try {
    const levelName = req.body.levelName;
    const subAccesId = [];
    const accessLevelId = db.collection("AccessLevels").doc().id;
    console.log(accessLevelId);
    db.collection("AccessLevels")
      .doc(accessLevelId)
      .set({
        Level: levelName,
      })
      .then(() => {
        db.collection("SubAccess")
          .get()
          .then((e) => {
            console.log(e.size);
            e.forEach((doc) => {
              data = doc.data();
              data.id = doc.id;
              subAccesId.push(data);
            });
          })
          .then(() => {
            for (let i = 0; i < subAccesId.length; i++) {
              if (i > subAccesId.length) {
                return;
              } else {
                db.collection("AccessLevelAccess").doc().set({
                  accessLevelId: accessLevelId,
                  accessValues: 1,
                  subAccessId: subAccesId[i].id,
                });
              }
            }
            res.status(200).send("Added");
          });
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/getAllExpensCategory", authenticateToken, async (req, res) => {
  try {
    let allExpenses = [];
    await db
      .collection("ExpenseCategory")
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          console.log("allExpense", data);
          data.id = doc.id;
          allExpenses.push(data);
        });
      });
    res.status(200).send(allExpenses);
  } catch {
    res.status(500).send();
  }
});
app.post("/updateExpenseCategory", authenticateToken, async (req, res) => {
  try {
    db.collection("ExpenseCategory")
      .doc(req.query.categoryId)
      .update({
        name: req.body.name,
      })
      .then(() => {
        res.status(200).send("Expense Category Updated");
      });
  } catch {
    res.status(500).send();
  }
});
app.post("/deleteExpenseCategory", authenticateToken, async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    // const leadCount = req.body.leadCount;
    await db
      .collection("Payments")
      .where("category", "==", categoryId)
      .get()
      .then((e) => {
        e.forEach((doc) => {
          doc.ref.update({
            status: req.body.newCategoryId,
          });
        });
      })
      .then(() => {
        db.collection("ExpenseCategory")
          .doc(categoryId)
          .delete()
          .then(() => {
            res.send(200, "deleted");
          });
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/allLeads", authenticateToken, async (req, res) => {
  try {
    let allLeads = [];
    await db
      .collection("Leads")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          allLeads.push(data);
        });
      });
    res.status(200).send(allLeads);
  } catch {
    res.status(500).send();
  }
});
app.get("/getMonthGraph", authenticateToken, async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "pay-history-view",
      req.user,
      "pay-history-view-action"
    );
    if (parseInt(canView.rank) > 1) {
      let monthName;
      let myExpenses = [];
      let month = [];
      let currendate = moment().format("YYYY/MM/DD");
      // console.log(lastYear)
      await db
        .collection("Expenses")
        .where("userId", "==", req.user.id)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            data = doc.data();
            myExpenses.push(data);
          });
        });
      console.log(myExpenses.length);
      for (let i = 11; i >= 0; i--) {
        let lastYear = moment(currendate)
          .subtract(i, "months")
          .startOf("month")
          .format("YYYY/MM/DD");
        console.log("lastYear", lastYear);
        let endOfMonth = moment(lastYear).endOf("month").format("YYYY/MM/DD");
        console.log("endofmonh", endOfMonth);
        let monthAmounts = [];
        for (let j = 0; j < myExpenses.length; j++) {
          // console.log("working")
          var invoiceDate = moment(myExpenses[j].invoiceDate).format(
            "YYYY/MM/DD"
          );
          if (invoiceDate > lastYear && invoiceDate < endOfMonth) {
            // console.log("if working")
            let amount = parseInt(myExpenses[j].amount);
            monthAmounts.push(amount);
            // console.log(monthName, myExpenses[j].amount)
          }
        }
        monthName = moment(endOfMonth).format("MMM");
        let totalMonthAmount = monthAmounts.reduce((a, b) => {
          return a + b;
        }, 0);
        month.push({
          monthName: monthName,
          total: "$" + totalMonthAmount,
        });
        console.log({
          monthName: monthName,
          total: totalMonthAmount,
        });
      }
      res.status(200).send(month);
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});
app.get("/payToDate", authenticateToken, async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "pay-history-view",
      req.user,
      "pay-history-view-action"
    );
    if (parseInt(canView.rank) > 1) {
      let myExpenses = [];
      let currentMonthAmount = [];
      let lastMonthAmount = [];
      let currentYearAmount = [];
      let lastYearAmount = [];
      let AllTime = [];
      let firstofYear = moment().startOf("year").format("YYYY/MM/DD");
      let firstOfMonth = moment().startOf("month").format("YYYY/MM/DD");
      let currendate = moment().format("YYYY/MM/DD");
      let lastYear = moment(currendate)
        .subtract(12, "months")
        .format("YYYY/MM/DD");
      console.log("lastYear", lastYear);
      await db
        .collection("Expenses")
        .where("userId", "==", req.user.id)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            data = doc.data();
            myExpenses.push(data);
          });
        });
      console.log(myExpenses);
      for (i = 0; i < myExpenses.length; i++) {
        let allTimeAmount = parseInt(myExpenses[i].amount);
        AllTime.push(allTimeAmount);
        var invoiceDate = moment(myExpenses[i].invoiceDate).format(
          "YYYY/MM/DD"
        );

        if (invoiceDate >= firstofYear && invoiceDate <= currendate) {
          let amount = parseInt(myExpenses[i].amount);
          currentYearAmount.push(amount);
        }

        if (invoiceDate >= firstOfMonth && invoiceDate <= currendate) {
          let monthamount = parseInt(myExpenses[i].amount);
          currentMonthAmount.push(monthamount);
          console.log("this working");
        }

        if (invoiceDate >= lastYear && invoiceDate <= currendate) {
          let lastyearamount = parseInt(myExpenses[i].amount);
          lastYearAmount.push(lastyearamount);
          console.log("this is also working");
        }
      }

      let totalMonthAmount = currentMonthAmount.reduce((a, b) => {
        return a + b;
      }, 0);

      let totalYearAmount = currentYearAmount.reduce((a, b) => {
        return a + b;
      }, 0);

      let lastYearTotalAmount = lastYearAmount.reduce((a, b) => {
        return a + b;
      }, 0);

      let allTimeTotal = AllTime.reduce((a, b) => {
        return a + b;
      }, 0);

      res.status(200).send({
        currentMonth: totalMonthAmount.toString(),
        currentYear: totalYearAmount.toString(),
        lastYear: lastYearTotalAmount.toString(),
        allTime: allTimeTotal.toString(),
      });
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.send("error");
  }
});
app.get("/getPayHistory", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "pay-history-view",
      req.user,
      "pay-history-view-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      let myExpenses = [];
      await db
        .collection("Expenses")
        .where("userId", "==", req.user.id)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            data = doc.data();
            const payHistory = {
              name: req.user.name,
              amount: doc.data().amount,
              date: doc.data().invoiceDate,
              desc: doc.data().description,
            };
            myExpenses.push(payHistory);
          });
        });
      console.log(myExpenses);
      res.status(200).send(myExpenses);
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});
app.post("/userLeadToOpenExpense", async (req, res) => {
  try {
    let user = req.body.user;
    let setterLead = [];
    await db
      .collection("Leads")
      .where("setter", "==", user)
      .get()
      .then((query) => {
        query.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          setterLead.push(data);
        });
      });
    for (let i = 0; i < setterLead.length; i++) {
      let expense = {
        invoiceDate: req.body.invoiceDate,
        description: req.body.description,
        category: req.body.categoryId,
        amount: req.body.amount,
        status: "Un Paid",
        userId: user,
        leadId: setterLead[i].id,
      };

      db.collection("Expenses").doc().set(expense);
    }
  } catch {
    res.status(500).send();
  }
});
app.post("/updateAvailabilty", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "edit-user",
      req.user,
      "edit-user-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      if (req.body.availabilty == true) {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            available: true,
          })
          .then(() => {
            res.status(200).send("availabe updated");
          });
      } else {
        await db
          .collection("Users")
          .doc(req.body.userId)
          .update({
            available: false,
          })
          .then(() => {
            res.status(200).send("availabe updated");
          });
      }
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});
app.get("/usersCount", authenticateToken,async (req, res) => {
  try {
    let canView = await isAllowedToView3(
      "edit-alot-count",
      req.user,
      "edit-alot-count-action"
    );
    if (parseInt(canView.rank) > 1) {
      let count = [];
      let allUsers = [];
      await db
        .collection("Users")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach(async (doc) => {
            data = doc.data();
            data.id = doc.id;
            if (
              data.count > 1 ||
              data.count < 1 ||
              data.count == undefined ||
              data.allotCount > 1 ||
              data.allotCount < 1 ||
              data.allotCount == undefined
            ) {
              allUsers.push(data);
            }
          });
        });
      if (allUsers.length == 0) {
        res.status(200).send("count already reset to 1");
      } else {
        for (let i = 0; i < allUsers.length; i++) {
          console.log("working");
          await db
            .collection("Users")
            .doc(allUsers[i].id)
            .get()
            .then((doc) => {
              doc.ref.update({
                count:
                  doc?.data().count + doc?.data().allotCount >
                  doc?.data().allotCount
                    ? doc?.data().allotCount
                    : doc?.data().count + doc?.data().allotCount,
              });
            })
            .then(async () => {
              await db
                .collection("Users")
                .doc(allUsers[i].id)
                .get()
                .then((doc) => {
                  let updatedData = doc.data();
                  updatedData.id = doc.id;
                  count.push(updatedData);
                  console.log(count);
                });
            });
        }
        res.status(200).send(count);
      }
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch {
    res.status(500).send();
  }
});
app.get("/Setter", async (req, res) => {
  try {
    await db
      .collection("Leads")
      .where("setterBonusPaid", "==", true)
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          doc.ref.update({
            setterBonusPaid: false,
          });
        });
      });
    res.status(200).send("update");
  } catch {
    res.status(500).send();
  }
});

async function getLeads(aId) {
  let leads = {};
  const snapshot = await db
    .collection("Leads")
    .doc(aId)
    .get()
    .then((e) => {
      if (e.data()) {
        leads = e.data();
        console.log("aid", aId);
        leads.id = e.id;
      }
      // leads = data
    });
  return leads;
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
async function getManager(lId) {
  let manager = {};
  await db
    .collection("Users")
    .where("accessLevel", "==", "qj9oadxrweMxUGdtvtDr")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        data = doc.data();
        data.id = doc.id;
        if (data.locationId == lId) {
          manager = data;
        }
      });
    })
    .catch((e) => {
      console.log("errro", e);
    });
  return manager;
}
async function GetRepCommissionTier(tId) {
  let tier = {};
  const snapshot = await db
    .collection("RepCommissionTiers")
    .doc(tId)
    .get()
    .then((e) => {
      tier = e.data();
      tier.id = e.id;
    });
  return tier;
}

app.get("/calculatePayroll", async (req, res) => {
  try {
    await db
      .collection("PayrollRuns")
      .doc("7zzkl6LqIRk6hiJ7RxYY")
      .get()
      .then(async (doc) => {
        data = doc.data();
        if (data.end !== null) {
          await db
            .collection("PayrollRuns")
            .doc("7zzkl6LqIRk6hiJ7RxYY")
            .update({
              end: null,
              start: new Date(),
            })
            .then(async () => {
              await calcSitPay1();
              await calculateSetterKWM11();
              await calculateSetterKWM21();
              await calculateRepKWPayM11();
              await calculateRepKWPayM21();
              await calcSetterBonus1();
              await managerOverRide1();
              await calcRepBonus1();
              await calcRepIncentive1();
              await calcManagerSitpay1();
              await calcCompanyComission1();
            })
            .then(async () => {
              await db
                .collection("PayrollRuns")
                .doc("7zzkl6LqIRk6hiJ7RxYY")
                .update({
                  end: new Date(),
                });
              res.status(200).send("Payroll Completed");
            });
        } else {
          res.status(200).send("Payroll Running");
        }
      });
  } catch {
    res.status(500).send();
  }
});
app.get("/getRepCommTiers", async (req, res) => {
  try {
    let RepCommissionTiers = [];
    await db
      .collection("RepCommissionTiers")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          RepCommissionTiers.push(data);
        });
      });
    res.status(200).send(RepCommissionTiers);
  } catch {
    res.status(500).send();
  }
});

app.get("/resetLeads", async (req, res) => {
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        data = doc.data();
        doc.ref.update({
          sitPaid: false,
          setterBonusPaid: false,
          setterBonusAmount: 0,
        });
      });
    });
  res.status(200).send("Reset Leads");
});

app.get("/setupUsers", async (req, res) => {
  await db
    .collection("Users")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        data = doc.data();
        doc.ref.update({
          sitPayAmount: 100,
          repCloserCommissionTier: "Z2ZMr89s6iBEpTuhfbNM",
          repWithSetterCommissionTier: "zCKaiQRfkjk1kyhEZ5N2",
          override: 150,
          kwPay: 100,
        });
      });
    });
  res.status(200).send("Setup Users Done");
});
app.get("/messageSendTo", async (req, res) => {
  try {
    let Users = [];
    if (req.query.sendTo.trim().toLowerCase() == "role") {
      await db
        .collection("AccessLevels")
        .get()
        .then((query) => {
          query.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            Users.push(data);
          });
        });
    }
    if (req.query.sendTo.trim().toLowerCase() == "user") {
      await db
        .collection("Users")
        .get()
        .then((query) => {
          query.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            Users.push(data);
          });
        });
    }
    res.status(200).send(Users);
  } catch {
    res.status(500).send();
  }
});
app.get("/isPayrollRunning", async (req, res) => {
  let running = false;
  await db
    .collection("PayrollRuns")
    .doc("7zzkl6LqIRk6hiJ7RxYY")
    .get()
    .then(async (doc) => {
      data = doc.data();
      if (data.end == null) {
        running = true;
      }
    });
  res?.status(200).send(running);
});

async function SendNotification(
  msg,
  recep,
  link = "",
  objId = "",
  sender = "system",
  type = "notification",
  isDismissed = false,
  user = "",
  recepType = "user"
) {
  if (sender.trim().toLowerCase() == "system") {
    sender = "SYSTEM";
  } else {
    sender = {
      userId: user.id,
      name: user.name,
      avatar: user.profilePic,
    };
  }
  let Users = [];
  if (recepType.trim().toLowerCase() == "all") {
    await db
      .collection("Users")
      .get()
      .then((e) => {
        e.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          Users.push(data);
        });
      });
  }
  if (recepType.trim().toLowerCase() == "role") {
    console.log("recep", recep);
    await db
      .collection("Users")
      .where("accessLevel", "==", recep)
      .get()
      .then((e) => {
        e.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          Users.push(data);
        });
      });
    console.log(Users.length);
  }
  if (recepType.trim().toLowerCase() == "user") {
    await db
      .collection("Users")
      .doc(recep)
      .get()
      .then((doc) => {
        data = doc.data();
        data.id = doc.id;
        Users.push(data);
      });
  }

  for (let i = 0; i < Users.length; i++) {
    await db.collection("Notifications").add({
      dateCreated: new Date().toISOString(),
      sender: sender,
      recep: Users[i].id,
      message: msg,
      type: type,
      dismissed: isDismissed,
      link: link,
      objId: objId,
    });
  }
}

app.get("/Tasks", authenticateToken, async (req, res) => {
  try {
    let Tasks = [];
    console.log(req.user.id);
    await db
      .collection("Notifications")
      .where("recep", "==", req?.user?.id) //yahan req.user say user id get krlena
      .get()
      .then((e) => {
        e.forEach((doc) => {
          if (!doc?.data().dismissed && doc?.data().type == "task") {
            console.log(doc.data());
            data = doc.data();
            data.id = doc.id;
            Tasks.push(data);
          }
        });
      })
      .catch((e) => {
        console.log("er", e);
      });

    res.status(200).send(Tasks);
  } catch {
    res.status(500).send();
  }
});
app.get("/Notifications", authenticateToken, async (req, res) => {
  try {
    let Notifications = [];
    console.log(req.user.id);
    await db
      .collection("Notifications")
      .where("recep", "==", req.user.id) //yahan req.user say user id get krlena
      .get()
      .then((e) => {
        e.forEach((doc) => {
          console.log(doc.data());
          if (!doc.data().dismissed && doc.data().type == "notification") {
            data = doc.data();
            data.id = doc.id;
            Notifications.push(data);
          }
        });
      });

    res.status(200).send(Notifications);
  } catch {
    res.status(500).send();
  }
});
app.get("/Messages", authenticateToken, async (req, res) => {
  try {
    let Messages = [];
    let AllMessage = [];
    await db
      .collection("Notifications")
      .where("recep", "==", req.user.id) //yahan req.user say user id get krlena
      .get()
      .then((e) => {
        e.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          Messages.push(data);
        });
      });
    for (let i = 0; i < Messages.length; i++) {
      if (Messages[i].dismissed == false && Messages[i].type == "message") {
        AllMessage.push(Messages[i]);
      }
    }
    res.status(200).send(AllMessage);
  } catch {
    res.status(500).send();
  }
});
app.get("/DismissMessage", async (req, res) => {
  try {
    const id = req.query.id;
    await db
      .collection("Notifications")
      .doc(id)
      .update({
        dismissed: true,
      })
      .then(() => {
        res.status(200).send("Message Dismissed");
      });
  } catch {
    res.status(500).send();
  }
});
app.post("/SendMessage", authenticateToken, async (req, res) => {
  try {
    let recep = req.body.recep;
    let sender = req.body.sender;
    let link = req.body.link;
    let message = req.body.message;
    let sendTo = req.body.sendTo;

    await SendNotification(
      message,
      recep,
      link,
      null,
      sender,
      "message",
      false,
      req.user,
      sendTo
    ).then(() => {
      res.status(200).send("Message Sent");
    });
  } catch {
    res.status(500).send();
  }
});
async function getProject(objId) {
  let data;

  await db
    .collection("Projects")
    .doc(objId)
    .get()
    .then((doc) => {
      if (doc.data()) {
        data = doc.data();
        data.id = doc.id;
      }
    });

  return data;
}

app.get("/GetObjMessages", authenticateToken, async (req, res) => {
  try {
    let objId = req.query.objId;
    let Notifications = [];
    let project;
    let lead = await getLeads(objId);
    console.log("lead null", lead);
    if (lead == null || lead.id == undefined) {
      project = await getProject(objId);
      if (project.leadId !== undefined) {
        lead = await getLeads(project.leadId);
      }
    } else {
      await db
        .collection("Projects")
        .where("leadId", "==", objId)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            project = doc.data();
            project.id = doc.id;
          });
        });
    }
    console.log("checkProject", project);
    console.log("checkLead", lead.id);
    // if((lead.id !== undefined && project.id !== undefined) && (lead.id !== null && project.id!== null)){
    if (lead.id != undefined) {
      await db
        .collection("Notifications")
        .where("objId", "==", lead.id)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            Notifications.push(data);
          });
        });
      console.log(Notifications);
    }

    if (project) {
      await db
        .collection("Notifications")
        .where("objId", "==", parseFloat(project.id))
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            Notifications.push(data);
          });
        });
      console.log("projectNoti", Notifications);
    }

    console.log(Notifications.length);

    //date sort
    Notifications.sort((a, b) => {
      let da = new Date(a.dateCreated),
        db = new Date(b.dateCreated);
      return db - da;
    });
    res.status(200).send(Notifications);
  } catch {
    res.status(500).send();
  }
});
app.post("/AddNote", authenticateToken, async (req, res) => {
  try {
    console.log(req.body);
    let message = req.body.message;
    let objId = req.body.objId;
    if (req.body.task == true) {
      await sendTask(
        message,
        req.body.recep,
        null,
        objId,
        req.user.id,
        false,
        req.user,
        req.body.task,
        req.body.startDate,
        req.body.endDate,
        req.body.frequency
      )
        .then(() => {
          res.status(200).send("Task Added");
        })
        .catch((e) => {
          console.log("e", e);
        });
    } else {
      await SendNotification(
        message,
        null,
        null,
        objId,
        req.user.id,
        "notification",
        true,
        req.user
      )
        .then(() => {
          res.status(200).send("Note Added");
        })
        .catch((e) => {
          console.log("e", e);
        });
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).send("error");
  }
});
app.get("/updateCommissionTier", authenticateToken, async (req, res) => {
  await db
    .collection("Users")
    .get()
    .then((e) => {
      e.forEach((doc) => {
        doc.ref.update({
          repCloserCommissionTier: "Z2ZMr89s6ihfbNMBEpTu",
        });
      });
    });
});

app.get("/SetterGet", async (req, res) => {
  let Leads = [];
  await db
    .collection("Users")
    // .where("accessLevel", "==", "y3L0EGYgGTO1ooUZh7Nj")
    .get()
    .then((e) => {
      e.forEach(async (doc) => {
        let data = doc.data();
        data.id = doc.id;
        if (data.active == true) {
          Leads.push(data);
        }
      });
    });
  res.status(200).send(Leads);
  console.log(Leads);
});
app.get("/repGet", authenticateToken, async (req, res) => {
  let Leads = [];
  let data = [];
  await db
    .collection("Users")
    .where("accessLevel", "!=", "y3L0EGYgGTO1ooUZh7Nj")
    .get()
    .then((e) => {
      e.forEach(async (doc) => {
        let data = doc.data();
        data.id = doc.id;
        if (data.available == true && data.active == true) {
          Leads.push(data);
        }
      });
    });
  res.status(200).send(Leads);
  console.log(Leads);
});

app.get("/LeadExpenses", authenticateToken, async (req, res) => {
  try {
    let monthName;
    let myExpenses = [];
    let month = [];
    let currendate = moment().format("YYYY/MM/DD");
    // console.log(lastYear)
    await db
      .collection("Expenses")
      .where("leadId", "==", req.query.leadId)
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          data = doc.data();
          myExpenses.push(data);
        });
      });
    console.log(myExpenses.length);
    for (let i = 11; i >= 0; i--) {
      let lastYear = moment(currendate)
        .subtract(i, "months")
        .startOf("month")
        .format("YYYY/MM/DD");
      console.log("lastYear", lastYear);
      let endOfMonth = moment(lastYear).endOf("month").format("YYYY/MM/DD");
      console.log("endofmonh", endOfMonth);
      let monthAmounts = [];
      for (let j = 0; j < myExpenses.length; j++) {
        // console.log("working")
        var invoiceDate = moment(myExpenses[j].invoiceDate).format(
          "YYYY/MM/DD"
        );
        if (invoiceDate > lastYear && invoiceDate < endOfMonth) {
          // console.log("if working")
          let amount = parseInt(myExpenses[j].amount);
          monthAmounts.push(amount);
          // console.log(monthName, myExpenses[j].amount)
        }
      }
      monthName = moment(endOfMonth).format("MMM");
      let totalMonthAmount = monthAmounts.reduce((a, b) => {
        return a + b;
      }, 0);
      month.push({
        monthName: monthName,
        total: totalMonthAmount,
      });
      console.log({
        monthName: monthName,
        total: totalMonthAmount,
      });
    }
    res.status(200).send(month);
  } catch {
    res.status(500).send();
  }
});

app.get("/leadpayHistory", authenticateToken, async (req, res) => {
  try {
    let canViewEditUser = await isAllowedToView3(
      "pay-history-view",
      req.user,
      "pay-history-view-action"
    );
    if (parseInt(canViewEditUser.rank) > 1) {
      let Array = [];
      await db
        .collection("Expenses")
        .where("leadId", "==", req.query.leadId)
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            let Obj = {
              amount: doc.data().amount,
              description: doc.data().description,
              invoiceDate: doc.data().invoiceDate,
            };

            Array.push(Obj);
            console.log(doc.data());
          });
        });
      res.status(200).send(Array);
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("/tokenExpired", async (req, res) => {
  try {
    const token = req.headers.authorization; //Issue
    const r_token = token.replace(/^Bearer\s/, "");
    jwt.verify(r_token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        res.status(200).send({
          isTokenExprired: true,
        });
        return;
      } else {
        res.status(200).send({
          isTokenExprired: false,
        });
      }
    });
  } catch {
    res.status(500).send();
  }
});
app.post("/createSheetinfolder", async (req, res) => {
  try {
    const success = await createSpreadSheet();
    res.status(200).send(success);
  } catch (e) {
    res.status(500).send({ error: e });
  }
});

async function createSpreadSheet() {
  var sheets = google.sheets("v4");
  var auth = await getOAuth2Client();

  const sheetsService = google.sheets({ version: "v4", auth });
  const resource = {
    properties: {
      title:
        "Hourly Data Backup " +
        new Date().toLocaleDateString("en-US") +
        " - " +
        new Date().toLocaleTimeString("en-US"),
    },
  };
  try {
    const spreadsheet = await sheetsService.spreadsheets.create({
      resource,
      fields: "spreadsheetId",
    });
    console.log(`Spreadsheet ID: ${spreadsheet.data.spreadsheetId}`);
    const driveService = google.drive({ version: "v3", auth: auth });
    try {
      const file = await driveService.files.get({
        fileId: spreadsheet.data.spreadsheetId,
        fields: "parents",
      });
      const previousParents = file.data.parents
        .map(function (parent) {
          return parent.id;
        })
        .join(",");
      const files = await driveService.files.update({
        fileId: spreadsheet.data.spreadsheetId,
        addParents: "1xA0BOiRUv9aObPgFNXkD8wk2oV-aYb43",
        removeParents: previousParents,
        fields: "id, parents",
      });
      console.log(files.status);
    } catch (err) {
      console.log("File Move Error", err);
      throw err;
    }
    await backupToSpreadsheet(spreadsheet.data.spreadsheetId);
  } catch (err) {
    console.log("File Create Error", err);
    throw err;
  }
}

async function backupToSpreadsheet(spreadsheetId) {
  let Leads = [];
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        Leads.push([Object.values(data)]);
      });
    });

  const service = google.sheets({
    version: "v4",
    auth: await getOAuth2Client(),
  });
  // let  = [
  // [
  //   // Cell values ...
  // ],
  // Additional rows ...
  // ];
  for (let i = 0; i < Leads.length; i++) {
    let resource = {
      values: Leads[i],
    };
    console.table("Table", resource.values);
    try {
      const result = await service.spreadsheets.values.update({
        spreadsheetId,
        range: "A" + (i + 1),
        valueInputOption: "RAW",
        resource,
      });
      console.log("%d cells updated.", result.data.updatedCells);
    } catch (err) {
      console.log("Lead Write Error", err);
      throw err;
    }
  }
}

app.use("/Proposal", Proposal);
app.use("/User", User);
app.use("/Leads", Leads);
app.use("/WebHook", WebHook);
app.use("/Tasks", Tasks);
app.use("/Customer", customer);

app.get("/checkprojectAdders", async (req, res) => {
  try {
    let Project = [];
    let adders = [];
    let eng = [];
    let adderselement = [];
    await db
      .collection("Projects")
      .get()
      .then((query) => {
        query.forEach((doc) => {
          let data = doc.data();
          Project.push(data);
        });
      });
    console.log(Project.length);
    for (let i = 0; i < Project.length; i++) {
      Project[i].total = 300;
      const element = Project[i].adders_description;
      // console.log("before",element);

      // if(element!== "" && element !== null && element !== undefined){
      if (!element?.includes("Engineering Stamp")) {
        console.log("Project", element);
        Project[i].total = Project[i].total - 150;
        adders.push({
          id: Project[i].id,
          element: element,
          total: Project[i].total,
        });
      }
      if (element?.includes("Engineering Stamp")) {
        console.log("Project", element);
        Project[i].total = Project[i].total - 200;
        adderselement.push({
          id: Project[i].id,
          element: element,
          total: Project[i].total,
        });
      }
      // }
      eng.push({
        id: Project[i].id,
        element: element,
        total: Project[i].total,
      });
    }
    console.log(eng.length);
    console.log(adders.length);
    console.log(adderselement.length);
    res.status(200).send({
      proje: eng,
      adders: adders,
      adderselement: adderselement,
    });
  } catch (e) {
    console.log("err", e);
    res.status(500).send();
  }
});

app.get("/updateAlgolialeads", authenticateToken, async (req, res) => {
  try {
    let matchFound;
    let found = [];
    // will be undefined in first call
    let updatedLead = [];
    console.log(req.query);
    const Users = db.collection("Users");
    let firebaseLead = [];
    await db
      .collection("Leads")
      .get()
      .then((query) => {
        query.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          firebaseLead.push(data);
        });
      });
    console.log("length,", firebaseLead.length);
    console.log("length,", firebaseLead.length);
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

    const index = client.initIndex("Leads");
    canView = await isAllowedToView3(
      "leads-view",
      req.user,
      "leads-view-action"
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
            matchFound = false;
            for (let u = 0; u < firebaseLead.length; u++) {
              if (firebaseLead[u].id == hits[h].objectID) {
                console.log("found", hits[h].objectID);
                found.push(hits[h]);
                matchFound = true;
              }
            }
            if (matchFound == false) {
              updatedLead.push(hits[h]);
              await db
                .collection("Leads")
                .doc(hits[h].objectID)
                .set(hits[h])
                .then(() => {
                  console.log("add");
                });
            }
          }

          console.log("Users Joined");
          console.log("algolia found ", found.length);
          console.log("to update", updatedLead.length);
          // sorts by date (newest to oldest)
          // hits.sort((a, b) => {
          //   let da = new Date(a.dateCreated),
          //     db = new Date(b.dateCreated);
          //   return db - da;
          // });

          // console.log("Got data for ", reqId);

          // let paginationData =  hits.slice((currentPage-1)*perPage,((currentPage-1)*perPage)+perPage)
          res.status(200).send({
            hits: updatedLead,
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

app.get("/updateLeadStatusName", async (req, res) => {
  updateLeadStatusName();
});
// app.get("/calcManagerSitpay", async (req, res) => {
app.get("/lowerCaseUserEmail", async (req, res) => {
  await db
    .collection("Users")
    .get()
    .then((query) => {
      query.forEach((doc) => {
        let email = doc.data().email.toLowerCase();
        console.log("email", email);
        doc.ref
          .update({
            email: email,
          })
          .then(() => console.log("updated"));
      });
    })
    .then(() => res.status(200).send("updated"));
});
app.post("/trynew", async (req, res) => {
  let arr = [
    {
      delimiter: " ",
      points: 1,
      cxFields: [
        {
          fieldName: "proposal_id",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "proposal_id",
          split: false,
        },
      ],
    },
    {
      delimiter: "_",
      points: 1,
      cxFields: [
        {
          fieldName: "proposal_id",
          split: "1",
        },
      ],
      cxDataFields: [
        {
          fieldName: "proposalId",
          split: false,
        },
      ],
    },
    {
      delimiter: " ",
      points: 1,
      cxFields: [
        {
          fieldName: "customerId",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "customerId",
          split: false,
        },
      ],
    },
    {
      delimiter: "/",
      points: 1,
      cxFields: [
        {
          fieldName: "customerId",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "path",
          split: 4,
        },
      ],
    },
    {
      delimiter: " ",
      points: 1,
      cxFields: [
        {
          fieldName: "proposalId",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "proposalId",
          split: false,
        },
      ],
    },
    {
      delimiter: "_",
      points: 1,
      cxFields: [
        {
          fieldName: "proposalId",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "proposal_id",
          split: 1,
        },
      ],
    },
    {
      delimiter: " ",
      points: 1,
      cxFields: [
        {
          fieldName: "path",
          split: false,
        },
      ],
      cxDataFields: [
        {
          fieldName: "path",
          split: false,
        },
      ],
    },
    {
      delimiter: "/",
      points: 1,
      cxFields: [
        {
          fieldName: "path",
          split: 4,
        },
      ],
      cxDataFields: [
        {
          fieldName: "customerId",
          split: false,
        },
      ],
    },
  ];
  for (let i = 0; i < arr.length; i++) {
    await db
      .collection("Fields")
      .add({ fields: arr[i] })
      .then(() => console.log("added", [i]));
  }
});
app.get("/backupLeads", async (req, res) => {
  let arr = [];
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      console.log(querySanpshot);
      querySanpshot.forEach(async (doc) => {
        let data = doc.data();
        data.id = doc.id;
        await db
          .collection("LeadsBackup")
          .doc(data.id)
          .set(data)
          .then(() => console.log("Updated"));
      });
    });
  res.status(200).send();
});

app.get("/getCustomers", async (req, res) => {
  await db
    .collection("Leads")
    .doc("rplurLHesQqCaTQ4MxZY")
    .get()
    .then((querySanpshot) => {
      console.log(querySanpshot);
      // querySanpshot.forEach((doc) => {
      let data = querySanpshot.data();
      data.id = querySanpshot.id;
      CreateCustomer(data.data); //Add .data for Webhooks!!!
      // });
    });
  res.status(200).send("Done");
});
app.get;
app.get("/cleanupLeads", async (req, res) => {
  let arr = [];
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      console.log(querySanpshot);
      querySanpshot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        arr.push(data);
      });
    });
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].customer_name !== undefined && arr[i].customer_name !== null) {
      let ids = await db
        .collection("Leads")
        .where("customer_name", "==", arr[i].customer_name)
        .get();
      if (ids.size > 1) {
        console.log("Deleting", ids.size, "Leads -", arr[i].customer_name);
        await db
          .collection("Leads")
          .where("customer_name", "==", arr[i].customer_name)
          .get()
          .then((querySanpshot) => {
            console.log(querySanpshot);
            querySanpshot.forEach((doc) => {
              let data = doc.data();
              doc.ref.delete();
            });
          });
      }
    }
  }

  res.status(200).send("Done");
});

app.get("/resetPayroll", async (req, res) => {
  let leadCount = 0;
  await db
    .collection("Expenses")
    .where("invoiceDate", "==", "2023/01/04")
    .where("description", "==", "Rep KW Pay (M2)")
    .get()
    .then(async (querySnapshot) => {
      querySnapshot.forEach(async (doc) => {
        data = doc.data();

        console.log("Updating", data.leadId);
        console.log("Updating", ++leadCount);

        await db
          .collection("Leads")
          .doc(data.leadId)
          .get()
          .then(async (querySnapshot) => {
            await querySnapshot.ref.update({
              repKWM2Paid: false,
            });
          });

        doc.ref.delete();
      });
    });
  res.status(200).send("Payroll Reset");
});

async function calcSitPay1() {
  console.log("Calculating Sit Pay");
  let Leads = [];

  console.log("Looking for Leads that have been Sat");

  await db
    .collection("Leads")
    .where("sitPaid", "==", false)
    .get()
    .then((e) => {
      e.forEach(async (doc) => {
        let data = doc.data();
        data.id = doc.id;
        Leads.push(data);
      });
    });

  console.log(Leads.length + " Leads Found");

  let lastSunday = moment().startOf("week");

  console.log(
    "Finding Leads with Setters and Appointments prior to: " +
      lastSunday.format("MM-DD-YYYY")
  );

  for (let i = 0; i < Leads.length; i++) {
    let LeadDate = Leads[i].appointmentTime;
    let appointmentTime = moment(LeadDate);
    let user = await getUsers(Leads[i].setter);
    let leadCount = i + 1;

    console.log(
      "Lead " + leadCount + ": " + Leads[i].id + ". Setter: " + user.name
    );
    console.log(
      "User AccessLevel is Setter: ",
      user.accessLevel == "y3L0EGYgGTO1ooUZh7Nj"
    );
    console.log(
      appointmentTime.format("MM-DD-YYYY") +
        " < " +
        lastSunday.format("MM-DD-YYYY"),
      appointmentTime < lastSunday
    );

    if (
      user.accessLevel == "y3L0EGYgGTO1ooUZh7Nj" &&
      appointmentTime < lastSunday
    ) {
      console.log("Paying Sit Pay");
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          status: false,
          amount: parseInt(user.sitPayAmount),
          description: "Sit Pay",
          leadId: Leads[i].id,
          userId: user.id,
        })
        .then(async () => {
          await db.collection("Leads").doc(Leads[i].id).update({
            sitPaid: true,
          });
          console.log(
            "Sit Pay Expense created for Lead " +
              Leads[i].id +
              " for " +
              user.name
          );
        })
        .catch(() => {
          console.log(
            "Error while Creating Sit Pay Expense for Lead " +
              Leads[i].id +
              " for " +
              user.name
          );
        });
    }
  }
  console.log("Sit Pay Complete");
}

async function calculateSetterKWM11() {
  console.log("Calculating Setter KW Pay - M1");

  let leads = [];

  console.log("Looking for Leads that have M1 Dates");

  await db
    .collection("Leads")
    .where("m1", "!=", null)
    .get()
    .then((e) => {
      e.forEach((doc) => {
        if (doc.data().m1Paid == undefined || doc.data().m1Paid == false) {
          data = doc.data();
          data.id = doc.id;
          leads.push(data);
        }
      });
    });

  console.log(leads.length + " Leads Found");

  for (let i = 0; i < leads.length; i++) {
    let leadCount = i + 1;
    if (leads[i].setter !== undefined) {
      const user = await getUsers(leads[i].setter);
      if (user.accessLevel == "y3L0EGYgGTO1ooUZh7Nj") {
        console.log("conditionTrue");
        console.log(
          "Lead " + leadCount + ": " + leads[i].id + ". Setter: " + user.name
        );
        console.log("leadExist", leads[i]);
        if (leads[i].kw != undefined && user.kwPay != undefined) {
          let ttlCommission = leads[i].kw * parseInt(user?.kwPay);
          console.log("Project KW", leads[i].kw);
          console.log("User KW Pay", user?.kwPay);
          console.log("Total Commission:", ttlCommission);

          let m1Amount = ttlCommission / 2 > 500 ? 500 : ttlCommission / 2;
          let m2Amount = ttlCommission - m1Amount;

          console.log("M1 Amount: ", m1Amount);
          console.log("M2 Amount: ", m2Amount);

          await db
            .collection("Expenses")
            .add({
              amount: m1Amount,
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Setter KW Pay (M1)",
              invoiceDate: moment().format("YYYY/MM/DD"),
              leadId: leads[i]?.id,
              status: false,
              userId: user.id,
            })
            .then(async () => {
              console.log(
                "Setter KW Pay (M1) Expense created for Lead " +
                  leads[i].id +
                  " for " +
                  user.name
              );
              await db
                .collection("Leads")
                .doc(leads[i].id)
                .update({
                  m1Paid: true,
                  m2Amount: m2Amount,
                })
                .then(async () => {
                  console.log("M1 Marked Paid and M2 Amount Set");
                });
            });
        }
      }
    } else {
      console.log(
        "Lead " +
          leadCount +
          ": Setter Not Set for Lead " +
          leads[i].id +
          " - " +
          leads[i].customer_name
      );
    }
  }
  console.log("Setter KW Pay - M1 Complete");
}
async function calculateSetterKWM21() {
  console.log("Calculating Setter KW Pay - M2");

  let leads = [];

  console.log(
    "Looking for Leads that have M2 Amounts and Dates that have not yet been Paid"
  );

  await db
    .collection("Leads")
    .where("m2", "!=", null)
    .get()
    .then((e) => {
      e.forEach((doc) => {
        if (
          (doc.data().m2Paid == undefined || doc.data().m2Paid == false) &&
          doc.data().m2Amount !== null &&
          doc.data().m2Amount !== undefined
        ) {
          data = doc.data();
          data.id = doc.id;
          leads.push(data);
        }
      });
    });

  console.log(leads.length + " Leads Found");

  for (let i = 0; i < leads.length; i++) {
    const user = await getUsers(leads[i].setter);
    let leadCount = i + 1;
    if (user.accessLevel == "y3L0EGYgGTO1ooUZh7Nj") {
      console.log(
        "Lead " +
          leadCount +
          ": " +
          leads[i].id +
          ". Setter: " +
          user.name +
          " M2 Amount: " +
          leads[i].m2Amount
      );

      await db
        .collection("Expenses")
        .add({
          amount: leads[i].m2Amount,
          category: "xGu6ZnUqP7xItEDCr4iR",
          description: "Setter KW Pay (M2)",
          invoiceDate: moment().format("YYYY/MM/DD"),
          leadId: leads[i].id,
          status: false,
          userId: leads[i].setter,
        })
        .then(async () => {
          console.log(
            "Setter KW Pay (M2) Expense created for Lead " +
              leads[i].id +
              " for " +
              user.name
          );
          await db
            .collection("Leads")
            .doc(leads[i].id)
            .update({
              m2Paid: true,
            })
            .then(async () => {
              console.log("M2 Marked Paid");
            });
        });
    }
  }
  console.log("Setter KW Pay - M2 Complete");
}
async function calculateRepKWPayM11() {
  console.log("Calculating Rep KW Pay - M1");
  let leads = [];

  console.log(
    "Looking for Leads that have M1 Dates that have not yet been Paid"
  );

  await db
    .collection("Leads")
    .where("m1", "!=", null)
    .get()
    .then((e) => {
      e.forEach((doc) => {
        if (
          doc.data().repKWM1Paid == false ||
          doc.data().repKWM1Paid == undefined
        ) {
          data = doc.data();
          data.id = doc.id;
          leads.push(data);
        }
      });
    });

  console.log(leads.length + " Leads Found");

  for (let i = 0; i < leads.length; i++) {
    let leadCount = i + 1;
    console.log("Lead " + leadCount + ": " + leads[i].id);
    if (leads[i].rep !== undefined && leads[i].rep !== "") {
      const user = await getUsers(leads[i].rep);
      if (
        user.accessLevel != "y3L0EGYgGTO1ooUZh7Nj" &&
        leads[i].docRequest?.pricing?.ppw !== undefined &&
        leads[i].docRequest?.pricing?.ppw !== ""
      ) {
        console.log(
          "Lead " +
            leadCount +
            ": " +
            leads[i].customer_name +
            ". Rep: " +
            user.name
        );

        let gross = parseFloat(leads[i].gross_account_value).toFixed(2);
        console.log("gross", gross);

        let dealerFee = parseFloat(leads[i].dealer_fee_percentage).toFixed(2);
        dealerFee = dealerFee / 100;
        dealerFee = dealerFee.toFixed(2);
        let kw = parseFloat(leads[i].kw).toFixed(2);
        // let sysSize = kw * 1000;
        // let net =
        //   (await gross) * (1 - dealerFee) -
        //   parseFloat(leads[i].adders).toFixed(2);
        let basePPW;
        // changing in this section
        console.log("leads id ", leads[i].id);
        if (leads[i].docRequest != undefined) {
          console.log("defined", leads[i].docRequest);
          basePPW = leads[i].docRequest.pricing.ppw;
        } else {
          basePPW = 0; // (await net) / sysSize;
        }
        let rct = {};
        let kwPay = 0;
        console.log("true 2");
        console.log("Gross:", gross);
        // console.log("System Size:", sysSize);
        console.log("Dealer Fee:", dealerFee);
        // console.log("Net:", net);
        console.log("Base ppw:", basePPW);

        let maxAmount = 0;
        if (leads[i].rep == leads[i].setter) {
          rct = await GetRepCommissionTier(user.repCloserCommissionTier);
          maxAmount = 1000;
          console.log("Rep Only Deal", rct.name);
        } else {
          rct = await GetRepCommissionTier(user.repWithSetterCommissionTier);
          maxAmount = 500;
          console.log("Rep + Setter Deal", rct.name);
        }
        console.log("basePPW", parseFloat(basePPW));
        console.log("rct.lowLimit", parseFloat(rct.lowLimit));
        console.log("rct.zero", parseFloat(rct.zero));
        console.log(
          "basePPW >= rct.lowLimit",
          parseFloat(basePPW) >= parseFloat(rct.lowLimit)
        );
        console.log(
          "basePPW >= rct.zero",
          parseFloat(basePPW) >= parseFloat(rct.zero)
        );

        if (basePPW >= rct.lowLimit) {
          let calcAmount = rct.m * basePPW - rct.b;
          kwPay = calcAmount;
        } else {
          kwPay = basePPW >= rct.zero ? rct.lowAmount : 0;
        }

        console.log("KW:", kw);
        console.log("KW Pay:", kwPay);

        let ttlCommission = kw * parseFloat(kwPay);

        ttlCommission = ttlCommission.toFixed(2);

        console.log("Total Commission:", ttlCommission);

        if (ttlCommission > 0) {
          let adders_description = leads[i].adders_description;
          // if (!adders_description?.includes("Engineering Stamp")) {
          //   console.log("Missing Engineering Stamp, deducting 150");
          //   ttlCommission = ttlCommission - 150;
          //   console.log("Total Commission:", ttlCommission);
          // }

          let m1Amount =
            ttlCommission / 2 > maxAmount ? maxAmount : ttlCommission / 2;
          let m2Amount = ttlCommission - m1Amount;

          console.log("M1 Amount: ", m1Amount);
          console.log("M2 Amount: ", m2Amount);
          await db
            .collection("Expenses")
            .add({
              amount: m1Amount,
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Rep KW Pay (M1)",
              invoiceDate: moment().format("YYYY/MM/DD"),
              leadId: leads[i].id,
              status: false,
              userId: user.id,
            })
            .then(async () => {
              console.log(
                "Rep KW Pay (M1) Expense created for Lead " +
                  leads[i].customer_name +
                  " for " +
                  user.name
              );
              await db
                .collection("Leads")
                .doc(leads[i].id)
                .update({
                  repKWM1Paid: true,
                  repKWM2Amount: m2Amount,
                  repKWM2Paid: false,
                })
                .then(async () => {
                  console.log("M1 Marked Paid and M2 Amount Set");
                });
            });
        }
      }
    }
  }
  console.log("Rep KW Pay - M1 Complete");
}
async function calculateRepKWPayM21() {
  console.log("Calculating Rep KW Pay - M2");
  let leads = [];

  console.log(
    "Looking for Leads that have Rep M2 Amounts and Dates that have not yet been Paid"
  );

  await db
    .collection("Leads")
    .where("m2", "!=", null)
    .get()
    .then(async (docs) => {
      docs.forEach(async (doc) => {
        projectData = doc.data();
        projectData.id = doc.id;
        if (
          projectData.repKWM2Amount !== null &&
          projectData.repKWM2Amount !== undefined &&
          (projectData.repKWM2Paid == false ||
            projectData.repKWM2Paid == undefined)
        ) {
          leads.push(projectData);
        }
      });
    });

  console.log(leads.length + " Leads Found");

  for (let i = 0; i < leads.length; i++) {
    if (leads[i].rep !== undefined) {
      const user = await getUsers(leads[i].rep);
      let leadCount = i + 1;
      if (user.accessLevel != "y3L0EGYgGTO1ooUZh7Nj") {
        console.log(
          "Lead " +
            leadCount +
            ": " +
            leads[i].customer_name +
            ". Rep: " +
            user.name +
            " M2 Amount: " +
            leads[i].m2Amount
        );

        await db
          .collection("Expenses")
          .add({
            amount: leads[i].repKWM2Amount,
            category: "xGu6ZnUqP7xItEDCr4iR",
            description: "Rep KW Pay (M2)",
            invoiceDate: moment().format("YYYY/MM/DD"),
            leadId: leads[i].id,
            status: false,
            userId: user.id,
          })
          .then(async () => {
            console.log(
              "Rep KW Pay (M2) Expense created for Lead " +
                leads[i].customer_name +
                " for " +
                user.name
            );
            await db
              .collection("Leads")
              .doc(leads[i].id)
              .update({
                repKWM2Paid: true,
              })
              .then(() => {
                console.log("M2 Marked Paid");
              });
          });
      }
    }
  }
  console.log("Rep KW Pay - M2 Complete");
}
async function calcSetterBonus1() {
  let getLeads = [];
  let Users = [];
  let soldAccountList = [];
  let currendate = moment().format("MM-DD-YYYY");
  console.log("currendate", currendate);

  let lastmonth = moment(currendate)
    .subtract(1, "months")
    .startOf("month")
    .format("MM-DD-YYYY");
  console.log("lastmonth", lastmonth);

  let endOflastmonth = moment(currendate)
    .subtract(1, "months")
    .endOf("month")
    .format("MM-DD-YYYY");
  console.log("endOflastmonth", endOflastmonth);
  await db
    .collection("Users")
    .where("accessLevel", "==", "y3L0EGYgGTO1ooUZh7Nj")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        data = doc.data();
        data.id = doc.id;
        Users.push(data);
      });
    });
  console.log("users", Users.id);
  await db
    .collection("Leads")
    .get()
    .then(async (querySanpshot) => {
      querySanpshot.forEach(async (doc) => {
        data = doc.data();
        data.id = doc.id;
        // date = new Date();
        let dateCreated;
        if (typeof data.dateCreated == "object") {
          dateCreated = moment(data.dateCreated.toDate()).format("MM-DD-YYYY");
        } else {
          dateCreated = moment(data.dateCreated).format("MM-DD-YYYY");
        }
        if (
          (data.setterBonusPaid !== true ||
            data.setterBonusPaid == undefined) &&
          data.status === "roWLcfnZvHBWpgGyu8qA" &&
          dateCreated >= lastmonth &&
          dateCreated <= endOflastmonth
        ) {
          getLeads.push(data);
          console.log("data id ", data.id);
        }
      });
    });
  console.log("length", getLeads.length);
  for (let i = 0; i < Users.length; i++) {
    for (let j = 0; j < getLeads.length; j++) {
      if (getLeads[j].setter == Users[i].id) {
        console.log("Users", Users[i].id);
        soldAccountList.push(getLeads[j]);
      }
    }
    console.log("length sol", soldAccountList.length);
    // for(let k=0;k<soldAccountList.length;k++){
    //   if(soldAccountList[k].setter == Users[i].id){
    if (soldAccountList.length >= 20) {
      console.log("16000 condition", soldAccountList.length);
      let bonus = 16000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          console.log("data updated for 16000");
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }
    if (soldAccountList.length >= 17 && soldAccountList.length < 20) {
      let bonus = 11000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }
    if (soldAccountList.length >= 14 && soldAccountList.length < 17) {
      //7000
      let bonus = 7000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }
    if (soldAccountList.length >= 11 && soldAccountList.length < 14) {
      //4000
      let bonus = 4000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }
    if (soldAccountList.length >= 8 && soldAccountList.length < 11) {
      //2000
      let bonus = 2000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }
    if (soldAccountList.length >= 5 && soldAccountList.length < 8) {
      let bonus = 1000;
      await db
        .collection("Expenses")
        .add({
          invoiceDate: moment().format("YYYY/MM/DD"),
          category: "xGu6ZnUqP7xItEDCr4iR",
          amount: bonus,
          description: "Setter Bonus Pay",
          status: false,
          leadId: null,
          userId: Users[i].id,
        })
        .then(async () => {
          for (k = 0; k < soldAccountList.length; k++) {
            await db
              .collection("Leads")
              .doc(soldAccountList[k].id)
              .update({
                setterBonusPaid: true,
                setterBonusAmount: bonus / soldAccountList.length,
              })
              .then(() => {
                console.log("Lead Bonus Amounts Updated");
              });
          }
        })
        .catch((e) => {
          console.log("eroor", e);
        });
    }

    soldAccountList.length = 0;
  }
  console.log("Setter Bonus Paid Complete");
}
async function managerOverRide1() {
  console.log("Manager Over Ride Start");
  let Leads = [];
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        data = doc.data();
        data.id = doc.id;
        if (
          data.m2 != null &&
          (data.overRidePaid == false || data.overRidePaid == undefined)
        ) {
          Leads.push(data);
        }
      });
    });
  for (let i = 0; i < Leads.length; i++) {
    // let lead = await getLeads(Leads[i].leadId);
    let manager;
    if (Leads[i].locationId != undefined) {
      manager = await getManager(Leads[i].locationId);
      console.log("manage location", manager.locationId);
      if (Leads[i].locationId == manager.locationId) {
        let amount = manager.override * Leads[i].kw;
        console.log("amount", amount);
        await db
          .collection("Expenses")
          .add({
            invoiceDate: moment().format("YYYY/MM/DD"),
            category: "xGu6ZnUqP7xItEDCr4iR",
            amount: parseInt(amount),
            description: "Office Override Pay",
            status: false,
            leadId: Leads[i].id,
            userId: manager.id,
          })
          .then(async () => {
            await db
              .collection("Leads")
              .doc(Leads[i].id)
              .update({
                overRidePaid: true,
              })
              .then(() => console.log("Leads over ride update"));
          });
      }
    }
  }
  console.log("Manager Over Ride Complete");
}
async function calcRepBonus1() {
  console.log("Calc Rep Bonus Start");
  let Leads = [];
  let Users = [];
  let newLead = [];
  let currendate = moment().format("MM-DD-YYYY");
  let bonusAmount = 0;
  let soldAccountList = [];

  let lastmonth = moment(currendate)
    .subtract(1, "months")
    .startOf("month")
    .format("MM-DD-YYYY");

  let endOflastmonth = moment(currendate)
    .subtract(1, "months")
    .endOf("month")
    .format("MM-DD-YYYY");
  await db
    .collection("Leads")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;

        // changing in this section

        Leads.push(data);
      });
    });
  console.log("leads get");
  for (let j = 0; j < Leads.length; j++) {
    let dateCreated;
    console.log(Leads.length);
    if (Leads[j].dateCreated != undefined) {
      console.log("object check");
      if (typeof Leads[j].dateCreated == "object") {
        dateCreated = moment(Leads[j].dateCreated.toDate()).format(
          "MM-DD-YYYY"
        );
      } else {
        console.log("data data", Leads[j].dateCreated);
        dateCreated = moment(Leads[j].dateCreated).format("MM-DD-YYYY");
      }
    } else {
      dateCreated = moment(data.created).format("MM-DD-YYYY");
    }

    console.log(
      "date cre" +
        " " +
        dateCreated +
        " " +
        "end of last month" +
        "" +
        endOflastmonth +
        " " +
        "last month" +
        " " +
        lastmonth
    );
    console.log("lead id before if", Leads[j].id);

    if (
      (Leads[j].repBonusPaid === false || Leads[j].repBonusPaid == undefined) &&
      dateCreated >= lastmonth &&
      dateCreated <= endOflastmonth
    ) {
      console.log("lead id after if", Leads[j].id);
      newLead.push(Leads[j]);
    }
  }

  console.log("new Le", newLead.length);
  await db
    .collection("Users")
    .where("accessLevel", "==", "s04YXwRyEiyrElm8qoE6")
    .get()
    .then((querySanpshot) => {
      querySanpshot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        Users.push(data);
      });
      console.log("user successfull");
    });
  for (let i = 0; i < Users.length; i++) {
    soldAccountList.length = 0;
    Users[i].basePPWAvg = 0;
    console.log("user in for loop Id", Users[i].id);
    console.log("lead length in for loop", newLead.length);
    for (let j = 0; j < newLead.length; j++) {
      if (
        newLead[j].gross_account_value != undefined &&
        newLead[j].dealer_fee_percentage != undefined &&
        newLead[j].kw != undefined
      ) {
        // console.log(Projects[j].id, "projectLead", Projects[j].leadId);
        // let leads = await getLeads(Projects[j].leadId);
        // console.log("users all id", Users[i].id);
        if (newLead[j].rep == Users[i].id) {
          console.log("rep = leadid");
          soldAccountList.push(newLead[j]);

          let gross = newLead[j].gross_account_value;
          let dealerFee = newLead[j].dealer_fee_percentage;
          let kw = newLead[j].kw;
          let sysSize = kw * 1000;
          let net = gross * (1 - dealerFee);
          // let basePPW = net / sysSize;
          // changin in this section
          let basePPW;
          if (newLead[j].docRequest != undefined) {
            basePPW = newLead[j].docRequest.pricing.ppw;
          } else {
            basePPW = 0; //(await net) / sysSize;
          }
          console.log("baseppw", basePPW);

          Users[i].basePPWAvg =
            (Users[i].basePPWAvg * soldAccountList.length - 1 + basePPW) /
            soldAccountList.length;
        }
        console.log("avg", Users[i].basePPWAvg);
      }
      console.log("forLoop finished");
      if (soldAccountList.length > 0) {
        console.log("sold acount list", soldAccountList.length);
        if (Users[i].basePPWAvg >= 2.3 && Users[i].basePPWAvg < 2.7) {
          if (soldAccountList.length >= 3 && soldAccountList.length < 6) {
            bonusAmount = 500;
          } else {
            if (soldAccountList.length >= 6 && soldAccountList.length < 9) {
              bonusAmount = 1000;
            } else {
              if (soldAccountList.length >= 9 && soldAccountList.length < 11) {
                bonusAmount = 3000;
              } else {
                if (soldAccountList.length >= 11) {
                  bonusAmount = 5000;
                }
              }
            }
          }
        } else {
          if (Users[i].basePPWAvg >= 2.7 && Users[i].basePPWAvg < 3) {
            if (soldAccountList.length >= 3 && soldAccountList.length < 6) {
              bonusAmount = 1000;
            } else {
              if (soldAccountList.length >= 6 && soldAccountList.length < 9) {
                bonusAmount = 2000;
              } else {
                if (
                  soldAccountList.length >= 9 &&
                  soldAccountList.length < 11
                ) {
                  bonusAmount = 4000;
                } else {
                  if (soldAccountList.length >= 11) {
                    bonusAmount = 7000;
                  }
                }
              }
            }
          } else {
            if (Users[i].basePPWAvg >= 3 && Users[i].basePPWAvg < 3.3) {
              if (soldAccountList.length >= 3 && soldAccountList.length < 6) {
                bonusAmount = 1000;
              } else {
                if (soldAccountList.length >= 6 && soldAccountList.length < 9) {
                  bonusAmount = 3000;
                } else {
                  if (
                    soldAccountList.length >= 9 &&
                    soldAccountList.length < 11
                  ) {
                    bonusAmount = 5000;
                  } else {
                    if (soldAccountList.length >= 11) {
                      bonusAmount = 10000;
                    }
                  }
                }
              }
            } else {
              if (Users[i].basePPWAvg >= 3.3) {
                if (soldAccountList.length >= 3 && soldAccountList.length < 6) {
                  bonusAmount = 1000;
                } else {
                  if (
                    soldAccountList.length >= 6 &&
                    soldAccountList.length < 9
                  ) {
                    bonusAmount = 3000;
                  } else {
                    if (
                      soldAccountList.length >= 9 &&
                      soldAccountList.length < 11
                    ) {
                      bonusAmount = 6000;
                    } else {
                      if (soldAccountList.length >= 11) {
                        bonusAmount = 11000;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        console.log("bonos amount", bonusAmount);
        if (bonusAmount > 0) {
          await db
            .collection("Expenses")
            .add({
              amount: bonusAmount,
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Rep Bonus",
              invoiceDate: moment().format("YYYY/MM/DD"),
              leadId: null,
              status: false,
              userId: Users[i].id,
            })
            .then(async () => {
              for (k = 0; k < soldAccountList.length; k++) {
                await db
                  .collection("Leads")
                  .doc(soldAccountList[k].id)
                  .update({
                    repBonusPaid: true,
                    repBonusAmount: bonusAmount / soldAccountList.length,
                  })
                  .then(async () => {
                    console.log("Leads Updated");
                  });
              }
            });
        }
      }
    }
  }
  console.log("Calc Rep Bonus Complete");
}
async function calcRepIncentive1() {
  try {
    console.log("Calc Rep Incentive Start");
    let Leads = [];
    await db
      .collection("Leads")
      .where("repKWM2Paid", "==", true)
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          console.log(data.id);
          Leads.push(data);
        });
      });
    console.log("Leads length", Leads.length);
    for (let i = 0; i < Leads.length; i++) {
      let Expenses = [];
      await db
        .collection("Expenses")
        .where("category", "==", "HjntRw3hvVRppk2ocIyl")
        .where("leadId", "==", Leads[i].id)
        .where("clawedBack", "==", false)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            console.log("check", data);
            Expenses.push(data);
          });
        });
      for (let k = 0; k < Expenses.length; k++) {
        console.log("amount", Expenses[k].amount);
        await db
          .collection("Expenses")
          .add({
            amount: Expenses[k].amount,
            category: "xGu6ZnUqP7xItEDCr4iR",
            description: "Incentive Clawback",
            invoiceDate: moment().format("YYYY/MM/DD"),
            leadId: Leads[i].id,
            status: false,
            userId: Leads[i]?.rep,
          })
          .then(async (e) => {
            await db.collection("Expenses").doc(Expenses[k].id).update({
              clawedBack: true,
            });
          });
        //expense.update(clawedBack = true)
      }
    }
  } catch {
    console.log("error in rep incentive");
  }
  console.log("Calc Rep Incentive Complete");
}

async function calcManagerSitpay1() {
  try {
    console.log("Manager Sit Pay Start");
    let User = [];
    let Leads = [];
    newLead = [];

    let currendate = moment().format("MM-DD-YYYY");
    console.log("cuurent date", currendate);
    let Lastsunday = moment(currendate)
      .subtract(1, "weeks")
      .format("MM-DD-YYYY");
    await db
      .collection("Leads")
      .where("managerSitPay", "==", false)
      .get()
      .then(async (querySanpshot) => {
        querySanpshot.forEach(async (doc) => {
          data = doc.data();
          data.id = doc.id;
          console.log("get lead", data.id);
          Leads.push(data);
        });
      })
      .then(() => {
        console.log("getlead successfull", Leads.length);
      })
      .catch((e) => {
        console.log(e, "not get Leads");
      });
    let appointment;
    for (let j = 0; j < Leads.length; j++) {
      if (Leads[j].appointmentTime != undefined) {
        console.log("object check");
        if (typeof Leads[j].appointmentTime == "object") {
          appointment = moment(Leads[j].appointmentTime.toDate()).format(
            "MM-DD-YYYY"
          );
        } else {
          appointment = moment(Leads[j].appointmentTime).format("MM-DD-YYYY");
        }
        if (new Date(appointment) <= new Date(Lastsunday)) {
          console.log("lead id in for loop", Leads[j].id);
          newLead.push(Leads[j]);
        }
      }
    }

    await db
      .collection("Users")
      .get()
      .then(async (querySnapshot) => {
        querySnapshot.forEach(async (doc) => {
          data = doc.data();
          data.id = doc.id;
          if (data.accessLevel == "w1HG5jtdkf9XEC3VEtJn") {
            User.push(data);
          }
        });
      })
      .then(() => {
        console.log("get User", User.length);
      })
      .catch((e) => {
        console.log(e, "not get user");
      });
    for (let j = 0; j < newLead.length; j++) {
      for (let i = 0; i < User.length; i++) {
        if (User[i].locationId == newLead[j].locationId) {
          await db
            .collection("Expenses")
            .add({
              amount: parseInt(User[i].perSitAmount),
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Setter Manager Sit Pay",
              invoiceDate: moment().format("YYYY/MM/DD"),
              userId: User[i].id,
              status: false,
              leadId: newLead[j].id,
            })
            .then(() => {
              console.log("Successfull add PerSitAmount in Expense");
            });
        }
      }
    }
    console.log("Successfull run function");
  } catch {
    console.log("UnSuccessfull run function");
    // res.status(500).send("unsuccessfull");
  }
  console.log("Manager Sit Pay Complete");
}
async function calcCompanyComission1() {
  try {
    console.log("Company Comission Start");
    let Lead = [];
    let User = [];
    await db
      .collection("Users")
      .get()
      .then((e) => {
        e.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          if (data.companyCommission == true) {
            User.push(data);
          }
        });
      });
    console.log("User Length", User.length);

    await db
      .collection("Leads")
      .where("m2", "!=", null)
      .get()
      .then(async (querySnapshot) => {
        querySnapshot.forEach(async (doc) => {
          data = doc.data();
          data.id = doc.id;
          Lead.push(data);
        });
      });

    console.log("Leads", Lead.length);
    for (let i = 0; i < Lead.length; i++) {
      for (let j = 0; j < User.length; j++) {
        let total = 0;
        console.log("leadId after if", Lead[i].id);
        if (Lead[i].kw != undefined && User[j].companyKW != undefined) {
          total = Lead[i].kw * User[j].companyKW;
        }
        console.log("leadId after if", Lead[i].id);
        console.log("user", User[j].id);
        console.log("total", total);
        await db
          .collection("Expenses")
          .add({
            amount: total,
            category: "xGu6ZnUqP7xItEDCr4iR",
            description: "Company Commisston pay",
            invoiceDate: moment().format("YYYY/MM/DD"),
            leadId: Lead[i].id,
            status: false,
            userId: User[j].id,
          })
          .then(() => {
            console.log("successfull add Expense ");
          })
          .catch((e) => {
            console.log("Unsuccessfull add Expense ");
          });
      }
      await db
        .collection("Leads")
        .doc(Lead[i].id)
        .update({
          companyOveride: true,
        })
        .then(() => {
          console.log("successfull Company overRide True ");
        })
        .catch((e) => {
          console.log("ERROR Updating");
        });
    }
    console.log("Successfull True");
  } catch {
    console.log("ERROR IN CHECK");
  }
  console.log("Company Comission Complete");
}
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

app.post("/forgetPassword", async (req, res) => {
  try {
    console.log("forget password");
    await db
      .collection("Users")
      .where("email", "==", req.body.email.toLowerCase())
      .get()
      .then(async (e) => {
        console.log("e", e.size);
        if (e.size === 0) {
          res.status(200).send("Forget Email Send SuccessFull");
        } else {
          e.forEach(async (doc) => {
            let thisUser = doc.data();
            thisUser.id = doc.id;
            if (thisUser.active == true) {
              console.log("user");
              var date = new Date();
              hashes = await db
                .collection("Hashes")
                .add({
                  userId: thisUser.id,
                  password: thisUser.password,
                  createdOn: date,
                })
                .then(async (hashes) => {
                  let user = {
                    email: thisUser.email,
                    name: thisUser.name,
                    password: thisUser.password,
                    hashesId: hashes.id,
                    createdOn: date,
                  };
                  await sendCreatedUserEmail(user, true);
                })
                .then(() => {
                  res.status(200).send("Forget Email Send SuccessFull");
                });
            } else {
              res.status(200).send("Forget Email Send SuccessFull");
            }
          });
        }
      });
  } catch {
    res.status(500).send();
  }
});
//update access
app.post("/updateAccessPriorityList", async (req, res) => {
  try {
    const list = req.body.list;
    for (let i = 0; i < list.length; i++) {
      let priority = i + 1;
      await db
        .collection("AccessLevels")
        .doc(list[i].id)
        .update({
          priority: priority,
        })
        .then(() => {
          console.log("successfull");
        });
    }
    res.status(200).send("SuccessFull");
  } catch {
    res.status(500).send();
  }
});

app.post("/newAlgo", async (req, res) => {
  try {
    const index = client.initIndex("Leads");
    index.setSettings({
      customRanking: ["asc(firstName)"],
    });
    let hits = [];
    await index
      .browseObjects({
        query: "",
        // filters: filterStr,
        batch: (batch) => {
          hits = hits.concat(batch);
        },
      })
      .then(async () => {
        console.log("Query Returned", hits.length, "Records - Browsing");
        res.status(200).send(hits);
      });
  } catch {
    res.status(500).send();
  }
});

app.post("/testIs", authenticateToken, async (req, res) => {
  try {
    console.log(req.user);
    // console.log(
    //   "isallowd",
    //   await isAllowedToView3("edit-lead", req.user, "edit-lead-action")
    // );
    let canView = await isAllowedToView3(
      "users-view",
      req.user,
      "users-view-action"
    );
    if (canView.rank > 1) {
      let methodInput = req.body.methodInput;
      let dateInput = req.body.dateInput;
      if (canView.rank == 2) {
        await db
          .collection("Leads")
          .where("setter", "==", req.user.id)
          .where(`${methodInput}`, ">", moment(dateInput).format("YYYY-MM-DD"))
          .get()
          .then((query) => {
            query.forEach((doc) => {
              console.log("data", doc.data());
            });
          });
      }
      if (canView.rank == 3) {
        console.log("canview ", methodInput, dateInput, req.user.locationId);
        await db
          .collection("Leads")
          .where("locationId", "==", req.user.locationId)
          .where(`${methodInput}`, ">", moment(dateInput).format("YYYY-MM-DD"))
          .get()
          .then((query) => {
            console.log("sizw", query.size);
            query.forEach((doc) => {
              // console.log("data", doc.data());
            });
          });
      }

      if (canView.rank == 4) {
        await db
          .collection("Leads")
          .where(`${methodInput}`, ">", moment(dateInput).format("YYYY-MM-DD"))
          .get()
          .then((query) => {
            query.forEach((doc) => {
              console.log("data", doc.data());
            });
          });
      }
      res.status(200).send("got access");
    } else {
      res.status(200).send("You Don't Have Access");
    }
  } catch {
    res.status(500).send();
  }
});
