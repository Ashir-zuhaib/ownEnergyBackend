const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
app.use(express.json());
const cors = require("cors");
const fetch = require("node-fetch");
let headers = new fetch.Headers();
const db = require("./FirebaseDB");
const moment = require("moment-timezone");
const authenticateToken = require("./authenticateToken")
app.use(bodyParser.json(), cors());
process.env.TZ = "Canada/Eastern";
const ejs = require("ejs");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const getOAuth2Client = require("./GoogleAuth/getOAuth2")
const updateLeadStatusName = require("./updateStatusName");
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
router.post("/editLead",authenticateToken, async (req, res) => {
    try {
      let canView = await isAllowedToView3(
        "edit-lead",
        req.user,
        "edit-lead-action"
      );
      if (parseFloat(canView.rank) > 1) {
  
     let leadId = req.query.leadId;
     const lead = req.body;
    console.log("check data",lead)
    let oldLead = await db.collection("Leads").doc(leadId).get()
    const Leads = await db.collection("Leads").doc(leadId).update(lead).then(async() => {
      await changeLeadStatus(leadId, lead.status)
      lead.user = req.user
        
        if(oldLead.data().rep !== lead.rep || oldLead.data().setter !== lead.setter){
          let notificationData = {
            message: `Lead was Edited  ${lead.firstName} ${lead.lastName}`,
            setterRecep: lead.setter,
            repRecep: lead.rep,
            link: `ownourenergy.web.app/lead/${leadId}`,
            objId: null,
          };
          console.log("leadnoti", notificationData);
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
        lead.rep = await getUser(lead.rep);
      lead.setter = await getUser(lead.setter);
      const address =
      req.body.street +
      " " +
      req.body.city +
      ", " +
      req.body.state +
      " " +
      req.body.zip;
      console.log("address", address);
      lead.address = address;
        sendEmails(lead, () => {
          console.log("All Emails Sent.");
        })
      }
      });
      res.status(200).send("Lead Updated");
    } else {
      res.status(404).send("Dont have accessed to this action");
    }
    } catch {
      res.status(500).send("Unsuccessfull Lead Update");
    }
  });
  async function changeLeadStatus(lId, statusId){
    try {
      // allRequests = req.body;
  
      const newStatus = await db
        .collection("AppointmentOutcomes")
        .doc(statusId)
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
                status: statusId,
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
            } 
          })
          .catch((err) => {
            console.log("Error getting document", err);
          });
      } 

    } catch {
      console.log("errr");
    }
  };
  router.post("/getLeadsEvents", async (req, res) => {
    try{
      let Events =[]
      let methodInput = req.body.methodInput
      let dateInput = req.body.dateInput
      console.log(dateInput, methodInput);
      console.log(dateInput, methodInput);
      console.log("dd", moment(dateInput).add(1, "day").format("YYYY-MM-DD") );
      await db
          .collection("Leads")
          // .where("setter", "==", req.user.id)
          .where(`${methodInput}`, ">", moment(dateInput).format("YYYY-MM-DD"))
          .where(`${methodInput}`, "<", moment(dateInput).add(1,"day").format("YYYY-MM-DD"))
          .get()
          .then((query) => {
            query.forEach((doc) => {
              // console.log("data", doc.data());
              let data = doc.data()
              data.id = doc.id
              Events.push(data)
            });
          });
          res.status(200).send(Events)
    }
    catch{
      res.status(500).send()
    }
  })
  router.get("/changeGet", async (req, res) => {

    let lead = await db
          .collection("Leads")
          // .where("appointmentTime",">","2023-01-01")
          .get()
          console.log(lead.size);
          lead.forEach((doc)=>{
            let data = doc.data().appointmentTime
            if(typeof(data)== "object"){
              console.log("dff", data.toDate().toISOString());
            doc.ref.update({
              appointmentTime:data.toDate().toISOString()
            })
          }
            // console.log("fa", data);
          })
          res.status(200).send(lead)

  })
  router.post("/dateFilter", async (req, res) => {
    try{
      let Leads =[]
      let dateInput = moment(req.body.dateInput).format("YYYY-MM-DD")
      console.log(dateInput);
      await db
          .collection("Leads")
          // .where("dateCreated", ">", moment(dateInput).format("YYYY-MM-DD"))
          .get()
          .then((query) => {
            query.forEach((doc) => {
              let data = doc.data()
              data.id = doc.id
              if(data.dateCreated !== undefined){
                if(typeof(data.dateCreated) == "object"){
                  data.dateCreated = data.dateCreated.toDate()
                if(moment(data.dateCreated).format("YYYY-MM-DD") > dateInput){
                  Leads.push(data)
                }
                }
                if(typeof(data.dateCreated) == "string"){
                  if(moment(data.dateCreated).format("YYYY-MM-DD") > dateInput){
                    Leads.push(data)
                  }
                }
              // Leads.push(data)
            }
            });
          });
          Leads.sort((a, b) => {
            let da = new Date(a.dateCreated ? a.dateCreated : a.created),
              db = new Date(b.dateCreated ? b.dateCreated : b.created);
            return db - da;
          });
          res.status(200).send(Leads)
    }
    catch{
      res.status(500).send()
    }
  })
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
        " has been edited by " + appt.user.name+".";
    } else {
      message =
        "A lead " +
        appt.firstName +
        " " +
        appt.lastName +
        " has been edited by " + appt.user.name+
        ".";
      }
      console.log("message", message);
  
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
      "./templates/emailTemplates/editLead.ejs",
      locals
    );
  
    const options = {
      to: recep.email,
      subject:
        "Lead Edited: " +
        appt.firstName +
        " " +
        appt.lastName +
        " by " +
        appt.user.name,
      html: data,
      textEncoding: "base64",
    };
    const messageId = await sendMail(options);
    console.log("Lead Edit From Sub Message sent successfully:", messageId);
  }

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
module.exports = router;