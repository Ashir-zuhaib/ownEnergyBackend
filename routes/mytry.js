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

router.post("/Customer", async (req, res) => {
    let customerData = req.body.customerData
    let forceNew = req.body.forceNew
    await CreateCustomer(customerData, false)
    .then(()=>{
        res.status(200).send()
    })
})
module.exports = router
async function CreateCustomer(customerData, forceNew = false) {
    let leads =[]
    let fields =[]
    // console.log("customerData", customerData);
    let lId = 0;
    if (!forceNew) {
        // propsalId = proposalId
        if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"firstName",
                        split:false
                    },
                    {
                        fieldName:"lastName",
                        split:false
                    },
                    
                ],
                cxDataFields:[
                    {
                        fieldName:"fullName",
                        split:0
                    },
                    {
                        fieldName:"fullName",
                        split:1
                    },
                ]
            }
            lId = await matchCustomer(leads,customerData,fields," ", 1)
        }
       if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"fullName",
                        split:0
                    },
                    {
                        fieldName:"fullName",
                        split:1
                    },
                    
                ],
                cxDataFields:[
                    {
                        fieldName:"firstName",
                        split:false
                    },
                    {
                        fieldName:"lastName",
                        split:false
                    },
                ]
            }
            lId = await matchCustomer(leads,customerData,fields," ", 1)
        }
       if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"firstName",
                        split:false
                    },
                    {
                        fieldName:"lastName",
                        split:false
                    },                   
                ],
                cxDataFields:[
                    {
                        fieldName:"firstName",
                        split:false
                    },
                    {
                        fieldName:"lastName",
                        split:false
                    },
                ]
            }
            lId = await matchCustomer(leads,customerData,fields," ", 1)
        }
       if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"fullName",
                        split:false
                    },
                    
                ],
                cxDataFields:[
                    {
                        fieldName:"fullName",
                        split:false
                    },
                ]
            }
            lId = await matchCustomer(leads,customerData,fields," ", 1)
        }
        await db.collection("Fields").get().then((query)=>{
            query.forEach((doc)=>{
                let data = doc.data()
                data.id = doc.id
                fields.push(data)
            })
        })
        for(let i=0;i<fields.length;i++){
            lId = await matchCustomer(leads,customerData,fields[i]," ")   
        }
    }
    if(lId == 0){
        db.collection("Customers").add(customerData);
    }
    else{
        db.collection("Customers").doc(lId).set(customerData, { merge: true });
    }
}   
async function matchCustomer(leads,customerData,fields,delimeter, propNo){
    let lId = 0;
    console.log("leads in matchCustomer", leads);
    console.log("field in matchCustomer", fields);
    if(leads.length == 0){
        let allLeads =[] // get all Customer/Leads
        await db.collection("Customers").get().then((query)=>{
            query.forEach((doc)=>{
                let data = doc.data()
                data.id = doc.id
                allLeads.push(data)
            })
        })
        for(let i=0; i< allLeads.length; i++){
            let match = false;
            for(let j =0; j< fields.cxFields.length;j++){
                let cxFieldVal;
                let cxDataFieldVal;
                let cxFieldSplit = fields.cxFields[j].split
                let cxFieldName = fields.cxFields[j].fieldName
                let cxDataFieldSplit = fields.cxDataFields[j].split
                let cxDataFieldName = fields.cxDataFields[j].fieldName
                if(allLeads[i][cxFieldName] !== undefined){
                    if(cxFieldSplit !== false){
                        cxFieldVal = allLeads[i][cxFieldName].split(delimeter)[cxFieldSplit]
                    }
                    else{
                        cxFieldVal= allLeads[i][cxFieldName]
                    }
                }
                if(customerData[cxDataFieldName] !== undefined){
                    if(cxDataFieldSplit !== false){
                        cxDataFieldVal = customerData[cxDataFieldName].split(delimeter)[cxDataFieldSplit]
                    }
                    else{
                        cxDataFieldVal= customerData[cxDataFieldName]
                    }
                }

                if(cxFieldVal == cxDataFieldVal){
                    match=true
                    console.log("matched", match);
                }
                else{
                    match = false
                    break;
                }
                
                
            }
            if(match){
                if(allLeads[i].points !== undefined){
                    allLeads[i].points += 1/propNo 
                }
                else{
                    allLeads[i].points = 1/propNo
                }
                leads.push(allLeads[i])
            }
        }
        if (leads.length == 1) {
            lId = leads[0].id;
        }
    }
    else{
        //manage undefiend
        let newLead =[]
        for(let i=0; i< leads.length; i++){
            let match = false
            for(let j =0; j< fields.cxFields.length;j++){
                let cxFieldSplit = fields.cxFields[j].split
                let cxFieldName = fields.cxFields[j].fieldName
                let cxDataFieldSplit = fields.cxDataFields[j].split
                let cxDataFieldName = fields.cxDataFields[j].fieldName
                if(cxFieldSplit !== false){
                    cxFieldVal = leads[i][cxFieldName].split(delimeter)[cxFieldSplit]
                }
                else{
                    cxFieldVal= leads[i][cxFieldName]
                }
                if(cxDataFieldSplit !== false){
                    cxDataFieldVal = customerData[cxDataFieldName].split(delimeter)[cxDataFieldSplit]
                }
                else{
                    cxDataFieldVal= customerData[cxDataFieldName]
                }
                if(cxFieldVal == cxDataFieldVal){
                    match=true
                }
                else{
                    match = false
                    break;
                }
                
            }
            if(match){
                leads[i].points += 1/propNo 
            }
        }
        let maxPoints = 0
        let maxCount =0
        let maxLead;
        for(let i=0; i< leads.length; i++){

            if(leads[i].points >maxPoints ){
                maxPoints = leads[i].points
                maxCount =0
                maxLead= leads[i]
            }
            if(leads[i].points == maxPoints){
                maxCount++
            }
        }
        if(maxCount ==1){
            lId = maxLead.id
        }        
    }
    return lId
}