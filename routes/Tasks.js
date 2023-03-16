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
app.use(bodyParser.json(), cors());

const authenticateToken = require("./authenticateToken")

router.get("/fixNotifications", async (req, res) => {
    try {
      let Notifications = [];
      let type;
      await db
        .collection("Notifications")
        .get()
        .then((e) => {
          e.forEach((doc) => {
            data = doc.data();
            data.id = doc.id;
            Notifications.push(data);
          });
        });
      console.log("check noti length", Notifications.length);
      for (let i = 0; i < Notifications.length; i++) {
        if (Notifications[i].isMessage) {
          type = "message";
        } else {
          type = "notification";
        }
        console.log("id", Notifications[i].id);
        console.log("type", type);
        await db
          .collection("Notifications")
          .doc(Notifications[i].id)
          .update({
            type: type,
          })
          .then(() => {
            console.log("notification updated");
          });
      }
      res.status(200).send("updated");
    } catch {
      res.status(500).send();
    }
  });
  
router.post("/createTasks", async (req, res) => {
    try {
      const lastDate = moment("01-01-1990").format("MM-DD-YYYY");
      console.log("m", lastDate);
      console.log(req.body);
      const tasks = {
        startDate: moment(req.body.startDate).format("MM-DD-YYYY"),
        endDate: moment(req.body.endDate).format("MM-DD-YYYY"),
        frequency: req.body.frequency,
        message: req.body.task,
        link: req.body.link,
        sender: req.body.sender,
        recep: req.body.recep,
        lastDate: lastDate,
      };
      await db.collection("Tasks")
        .add(tasks)
        .then(() => {
          console.log("Task Created");
        })
        .catch((e)=>console.log("err", e))
      res.status(200).send(tasks);
    } catch (e) {
      res.status(500).send(e);
    }
  });

  router.get("/Tasks", authenticateToken, async (req, res) => {
    try {
        console.log(req.user);
      let Notifications = [];
      await db
        .collection("Notifications")
        .where("type", "==", "task")
        .get()
        .then((e) => {
          e.forEach((doc) => {
            if (!doc?.data().dismissed && doc?.data().recep == req.user.id) {
            data = doc.data();
            data.id = doc.id;
            Notifications.push(data);
            }
          });
        })
        console.log("detail", Notifications.length);
         checkTasks(req.user)
      res.status(200).send(Notifications);
    } catch {
      res.status(500).send();
    }
  });
  async function SendNotification(
    msg,
    recep,
    link = "",
    objId = "",
    sender = "system",
    type = "notification",
    isDismissed = false,
    user = ""
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
    console.log("semder", sender);
    let Users = [];
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
    
      if (recep.trim().toLowerCase() == "all") {
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
      } else {
        await db.collection("Notifications").add({
          dateCreated: new Date().toISOString(),
          sender: sender,
          recep: recep,
          message: msg,
          type: type,
          dismissed: isDismissed,
          link: link,
          objId: objId,
        });
      }
    }
  async function checkTasks(user) {
    try{
    let task = [];
    await db
      .collection("Tasks")
      .get()
      .then((e) => {
        e.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
          task.push(data);
        });
      });
  
    for (let i = 0; i < task.length; i++) {
      let dateNow = moment().format("MM-DD-YYYY");
      console.log("Date now", dateNow);
  
      var lastDate = task[i].lastDate
      console.log("last date", lastDate);
      var endDate = task[i].endDate
      console.log("last date", endDate);
  
      let daysToAdd =
        task[i].frequency == "daily" ? 1 : task[i].frequency == "weekly" ? 7 : 30;
      console.log("days to add", daysToAdd);
  
      let dayAdded = moment(lastDate).add(daysToAdd, "days").format("MM-DD-YYYY");
      console.log("days added", dayAdded);
  
      let startDate = moment(task[i].startDate).format("MM-DD-YYYY");
      console.log("task start Date", startDate);
  
      if (startDate >= dateNow && dayAdded <= dateNow) {
        // console.log("check");
        // console.log(user.id)
        // console.log("dd", task[i].id,task[i].sender,
        // task[i].recep,
        // task[i].link,);
        await SendNotification(
          task[i].message,
          task[i].recep,
          task[i].link,
          null,
          task[i].sender,
          "task",
          false,
          user
        ).then(async() => {
          console.log("send")
          // task[i].lastDate = dateNow
          await db.collection("Tasks").doc(task[i].id).update({
            lastDate:dateNow
          }).then(()=>{
            console.log("updated");
          })
        });
      }
      if ( endDate <= dateNow) {
        await db
          .collection("Tasks")
          .doc(task[i].id)
          .delete()
          .then(async () => {
            console.log("Task Deleted!");
          });
      }
    }
  }
  catch{
    return console.log("error");
  }
  }

  module.exports= router