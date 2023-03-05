const express     = require('express')
const fs          = require('fs').promises

const webSockets  = require('./appWS.js')
const post        = require('./utilsPost.js')
const database    = require('./utilsMySQL.js')
const wait        = require('./utilsWait.js')


var db = new database()   // Database example: await db.query("SELECT * FROM test")
var ws = new webSockets()

// Start HTTP server
const app = express()
const port = process.env.PORT || 3000

// Publish static files from 'public' folder
app.use(express.static('public'))

// Activate HTTP server
const httpServer = app.listen(port, appListen)
function appListen () {
  console.log(`Listening for HTTP queries on: http://localhost:${port}`)
}

// Close connections when process is killed
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close()
  db.end()
  ws.end()
  process.exit(0);
}

// Init objects
db.init({
  host: process.env.MYSQLHOST || "containers-us-west-17.railway.app",
  port: process.env.MYSQLPORT || 6814,
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "v8YAlXUOxMeu5nkLJCrY",
  database: process.env.MYSQLDATABASE || "railway"
})
ws.init(httpServer, port, db)

// Define routes
app.post('/dades', getPostDades)
async function getPostDades (req, res) {

  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Unkown type" }

  var textFile = await fs.readFile("./public/consoles/consoles-list.json", { encoding: 'utf8'})
  var objConsolesList = JSON.parse(textFile)

  if (receivedPOST) {

    switch(receivedPOST.type){

      case "connect":
        result = { status: "OK", result: "connected"}
      break;

      case "addUser":
        try{
          let correctData = true;
          if(receivedPOST.phoneNumber.length != 9){
            correctData = false;
            result = { status: "KO", result: "Número de teléfono incorrecto"}
          }

          if(!receivedPOST.email.includes("@")){
            correctData = false;
            result = { status: "KO", result: "Email incorrecto"}
          }

          if(correctData){
            queryResult = await db.query("insert into usuaris (nom, cognom, email, telefon, direccio, ciutat) values('"+ receivedPOST.name +"', '"+ receivedPOST.lastName +"', '"+ receivedPOST.email +"', '"+ receivedPOST.phoneNumber +"', '"+ receivedPOST.address +"','" + receivedPOST.city + "');")
            result = { status: "OK", result: "query result"} 
          }

        }catch(error){
          result = { status: "KO", result: "error :/"} 
        }
      break;

      case "getUsersList":
        try{
          queryResult = await db.query("select id,nom from usuaris;");
          result = { status: "OK", result: queryResult}
        }catch(error){
          result = { status: "KO", result: "error :/"}
        }
        
      break;

      case "getUserData":
        try{
          queryResult = await db.query("select * from usuaris where id = " + receivedPOST.id +";");
          result = { status: "OK", result: queryResult}
        }catch(error){
          result = { status: "KO", result: "error :/"}
        }
      break;

      case "modifyUserData":
        try{
          queryResult = await db.query("update usuaris set nom = '" + receivedPOST.newName + "', cognom = '"+ receivedPOST.newLastName +"', email = '"+ receivedPOST.newEmail +"', telefon = '"+ receivedPOST.newPhoneNumber +"',direccio = '"+ receivedPOST.newAddress +"', ciutat = '"+ receivedPOST.newCity +"' where id = "+ receivedPOST.id +";");
          result = { status: "OK", result: queryResult}
        }catch(error){
          result = { status: "KO", result: "error :/"}
        }
      break;

    }
    await wait(1500)
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(result))

}