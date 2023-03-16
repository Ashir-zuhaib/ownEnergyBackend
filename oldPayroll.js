async function calcSitPay() {
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
  async function calculateSetterKWM1() {
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
          console.log(
            "Lead " + leadCount + ": " + leads[i].id + ". Setter: " + user.name
          );
  
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
  async function calculateSetterKWM2() {
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
  async function getSetter(accessLevelId) {
    await db
      .collection("AccessLevels")
      .doc(accessLevelId)
      .get()
      .then((e) => {
        if (e.data().Level === "Setter") {
          return true;
        } else {
          return false;
        }
      });
  }
  
  async function calcSetterBonus() {
    let getLeads = [];
    let Users = [];
    let soldAccountList = [];
    let currendate = moment().format("MM-DD-YYYY");
    let lastmonth = moment(currendate)
      .subtract(1, "months")
      .startOf("month")
      .format("MM-DD-YYYY");
    let endOflastmonth = moment(currendate)
      .subtract(1, "months")
      .endOf("month")
      .format("MM-DD-YYYY");
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
    await db
      .collection("Leads")
      .get()
      .then(async (querySanpshot) => {
        querySanpshot.forEach(async (doc) => {
          data = doc.data();
          data.id = doc.id;
          date = new Date(data.dateCreated);
          let dateCreated = moment(date).format("MM-DD-YYYY");
          if (
            (data.setterBonusPaid !== true ||
              data.setterBonusPaid == undefined) &&
            data.status === "roWLcfnZvHBWpgGyu8qA" &&
            dateCreated >= lastmonth &&
            dateCreated <= endOflastmonth
          ) {
            getLeads.push(data);
          }
        });
      });
    for (let i = 0; i < Users.length; i++) {
      for (let j = 0; j < getLeads.length; j++) {
        if (getLeads[j].setter == Users[i].id) {
          console.log("Users", Users[i].id);
          soldAccountList.push(getLeads[j]);
        }
      }
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
  }
  
  async function managerOverRide() {
    // app.get("/managerOverRide", authenticateToken,async( req, res)=>{
    let Projects = [];
    await db
      .collection("Projects")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          data = doc.data();
          data.id = doc.id;
  
          if (
            data.m2 !== null &&
            data.leadId !== undefined &&
            data.leadId !== "" &&
            data.leadId !== null &&
            (data.overRidePaid == false || data.overRidePaid == undefined)
          )
            Projects.push(data);
        });
      });
    for (let i = 0; i < Projects.length; i++) {
      let lead = await getLeads(Projects[i].leadId);
      let manager = await getManager(lead.locationId);
      console.log("manage location", manager.locationId);
      console.log("lead leadLocation", lead.locationId);
      if (lead.locationId == manager.locationId) {
        let amount = manager.override * Projects[i].kw;
        console.log("amount", amount);
        await db
          .collection("Expenses")
          .add({
            invoiceDate: moment().format("YYYY/MM/DD"),
            category: "xGu6ZnUqP7xItEDCr4iR",
            amount: parseInt(amount),
            description: "Office Override Pay",
            status: false,
            leadId: lead.id,
            userId: manager.id,
          })
          .then(async () => {
            await db
              .collection("Projects")
              .doc(Projects[i].id)
              .update({
                overRidePaid: true,
              })
              .then(() => console.log("project over ride update"));
          });
      }
    }
  }
  // app.get("/calcRepBonus", authenticateToken,async( req, res)=>{
  async function calcRepBonus() {
    let Projects = [];
    let Users = [];
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
    console.log("date", lastmonth);
    console.log("date", endOflastmonth);
    await db
      .collection("Projects")
      .get()
      .then((querySanpshot) => {
        querySanpshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          date = new Date(data.created);
          console.log("ne", date);
          let dateCreated = moment(date).format("MM-DD-YYYY");
          console.log("mo", dateCreated);
          if (
            (data.repBonusPaid === false || data.repBonusPaid == undefined) &&
            dateCreated >= lastmonth &&
            dateCreated <= endOflastmonth &&
            data.leadId !== undefined &&
            data.leadId !== ""
          ) {
            Projects.push(data);
          }
        });
      });
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
      });
    for (let i = 0; i < Users.length; i++) {
      soldAccountList.length = 0;
      Users[i].basePPWAvg = 0;
      console.log("userId", Users[i].id);
      for (let j = 0; j < Projects.length; j++) {
        console.log(Projects[j].id, "projectLead", Projects[j].leadId);
        let leads = await getLeads(Projects[j].leadId);
        console.log("Lead", leads.rep, Users[i].id);
        if (leads.rep == Users[i].id) {
          console.log("rep = leadid");
          soldAccountList.push(Projects[j]);
          let gross = Projects[j].gross_account_value;
          let dealerFee = Projects[j].dealer_fee_percentage;
          let kw = Projects[j].kw;
          let sysSize = kw * 1000;
          let net = gross * (1 - dealerFee);
          let basePPW = net / sysSize;
  
          Users[i].basePPWAvg =
            (Users[i].basePPWAvg * soldAccountList.length - 1 + basePPW) /
            soldAccountList.length;
        }
      }
      console.log("forLoop finished");
      if (soldAccountList.length > 0) {
        console.log("sold acount list");
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
                if (soldAccountList.length >= 9 && soldAccountList.length < 11) {
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
                  if (soldAccountList.length >= 6 && soldAccountList.length < 9) {
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
                  .collection("Projects")
                  .doc(soldAccountList[k].id)
                  .update({
                    repBonusPaid: true,
                    repBonusAmount: bonusAmount / soldAccountList.length,
                  })
                  .then(async () => {
                    console.log("Projects Updated");
                  });
              }
            });
        }
      }
    }
  }
  
  // app.get("/calculateRepKWPayM1", async (req, res) => {
  async function calculateRepKWPayM1() {
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
  
      if (leads[i].rep !== undefined) {
        const user = await getUsers(leads[i].rep);
  
        if (
          user.accessLevel != "y3L0EGYgGTO1ooUZh7Nj" &&
          leads[i].docRequest?.pricing?.ppw !== undefined
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
          let dealerFee = parseFloat(leads[i].dealer_fee_percentage).toFixed(2);
          dealerFee = dealerFee / 100;
          dealerFee = dealerFee.toFixed(2);
          let kw = parseFloat(leads[i].kw).toFixed(2);
          let sysSize = kw * 1000;
          let net =
            gross * (1 - dealerFee) - parseFloat(leads[i].adders).toFixed(2);
          let basePPW = leads[i].docRequest.pricing.ppw;
          let rct = {};
          let kwPay = 0;
  
          console.log("Gross:", gross);
          console.log("System Size:", sysSize);
          console.log("Dealer Fee:", dealerFee);
          console.log("Net:", net);
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
  
          console.log("KW:", leads[i].kw);
          console.log("KW Pay:", kwPay);
  
          let ttlCommission = leads[i].kw * parseFloat(kwPay);
  
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
      } else {
        console.log(
          "Lead " +
            leadCount +
            ": Rep Not Set for Lead " +
            leads[i].id +
            " - " +
            leads[i].customer_name
        );
      }
    }
    console.log("Rep KW Pay - M1 Complete");
  }
  
  
  async function calculateRepKWPayM2() {
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
  // app.get("/CalcCompanyComission", async (req, res) => {
  async function CalcCompanyComission() {
    try {
      let projects = [];
      let getUsers = [];
      console.log("run");
      await db
        .collection("Users")
        .get()
        .then((e) => {
          e.forEach((doc) => {
            data = doc.data();
            data.id = doc.id;
            if (data.companyCommission == true) {
              getUsers.push(data);
            }
          });
        });
      console.log("users", getUsers.length);
  
      await db
        .collection("Projects")
        .where("m2", "!=", null)
        .get()
        .then(async (querySnapshot) => {
          querySnapshot.forEach(async (doc) => {
            let data = doc.data();
            if (
              (data.leadId != null || data.leadId != undefined) &&
              (data.companyOveride != undefined || data.companyOveride == false)
            ) {
              projects.push(data);
            }
          });
        });
  
      console.log("users", projects.length);
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < getUsers.length; j++) {
          let total = projects[i].kw * getUsers[j].companyKW;
  
          console.log("leadId", projects[i].leadId);
          console.log("user", getUsers[j].id);
  
          console.log("total", total);
          await db
            .collection("Expense")
            .add({
              amount: total,
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Company Commisston pay",
              invoiceDate: moment().format("YYYY/MM/DD"),
              leadId: projects[i].leadId,
              status: false,
              userId: getUsers[j].id,
            })
            .then(() => {
              res.status(200).send("successfull add Expense");
            })
            .catch((e) => {
              res.status(500).send("error in add expense");
            });
        }
  
        await db
          .collection("Projects")
          .doc(JSON.stringify(projects[i].id))
          .update({
            companyOveride: true,
          })
          .then(() => {
            res.status(200).send("successfull");
          })
          .catch((e) => {
            res.status(500).send(" not update");
          });
      }
      res.status(200).send("Successfull True");
    } catch {
      res.status(500).send();
    }
  }
  async function calcRepIncentive() {
    try {
      let Projects = [];
      await db
        .collection("Projects")
        .where("repKWM2Paid", "==", true)
        .get()
        .then((querySanpshot) => {
          querySanpshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            if (
              data.leadId !== undefined &&
              data.leadId !== "" &&
              data.leadId !== null
            ) {
              Projects.push(data);
            }
          });
        });
  
      //for (let i = 0; i < Projects.length; i++) {
      // .where("category", "==", "HjntRw3hvVRppk2ocIyl")
      // && if (Projects[i].leadId == Expenses[j].leadId) {
      //&& expense.clawedBack = false
      //
      console.log("projects length", Projects);
      for (let i = 0; i < Projects.length; i++) {
        let Expenses = [];
        await db
          .collection("Expenses")
          .where("category", "==", "HjntRw3hvVRppk2ocIyl")
          .where("leadId", "==", Projects[i].leadId)
          .where("clawedBack", "==", false)
          .get()
          .then((querySanpshot) => {
            querySanpshot.forEach((doc) => {
              let data = doc.data();
              data.id = doc.id;
              Expenses.push(data);
            });
          });
        let lead = await getLeads(Projects[i].leadId);
        console.log("expenses length", Expenses);
        for (let k = 0; k < Expenses.length; k++) {
          await db
            .collection("Expenses")
            .add({
              amount: -Expenses[k].amount,
              category: "xGu6ZnUqP7xItEDCr4iR",
              description: "Incentive Clawback",
              invoiceDate: moment().format("YYYY/MM/DD"),
              leadId: Projects[i].leadId,
              status: false,
              userId: lead.rep,
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
  }
  async function calcManagerSitpay() {
    try {
      let User = [];
      let Leads = [];
  
      let currendate = moment().format("MM-DD-YYYY");
      console.log("cuurent date", currendate);
      let Lastsunday = moment(currendate)
        .subtract(1, "weeks")
        .format("MM-DD-YYYY");
      console.log("Lastsunday", Lastsunday);
      // leads section start
      await db
        .collection("Leads")
        .where("managerSitPay", "==", false)
        .get()
        .then(async (querySanpshot) => {
          querySanpshot.forEach(async (doc) => {
            data = doc.data();
            data.id = doc.id;
            date = new Date(data.appointmentTime);
            console.log("data app", data.appointmentTime);
            let appointment = moment(date).format("MM-DD-YYYY");
            console.log("date created", appointment);
            if (appointment <= Lastsunday) {
              Leads.push(data);
            }
          });
        })
        .then(() => {
          console.log("get Leads");
        })
        .catch((e) => {
          console.log(e, "not get Leads");
        });
      // leads section end
      // User section start
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
          console.log("get User");
        })
        .catch((e) => {
          console.log(e, "not get user");
        });
      // User section End
      console.log("get Leads", Leads);
      console.log(User);
      for (let j = 0; j < Leads.length; j++) {
        for (let i = 0; i < User.length; i++) {
          if (User[i].locationId == Leads[j].locationId) {
            console.log("User 1", User[i].id);
            console.log("Lead 2", Leads[j].id);
            await db
              .collection("Expenses")
              .add({
                amount: parseInt(User[i].perSitAmount),
                category: "xGu6ZnUqP7xItEDCr4iR",
                description: "Setter Manager Sit Pay",
                invoiceDate: moment().format("YYYY/MM/DD"),
                userId: User[i].id,
                status: false,
                leadId: Leads[j].id,
              })
              .then(() => {
                console.log("Successfull add PerSitAmount in Expense");
              })
              .catch((e) => {
                console.log(e, "error in add expense");
              });
          }
        }
        res.status(200).send();
      }
      res.status(200).send();
    } catch {
      res.status(500).send("unsuccessfull");
    }
  }
  