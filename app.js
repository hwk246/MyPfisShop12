const express = require("express");
require("dotenv").config();
// ------------------

const sqlsvc = express();
const serverTarget = "http://localhost";
const appPort = process.env.PORT;

//let OP SELECTEER mysql DIE GEMAAKT IS VOOR  = mysql2
const mysql = require("mysql2/promise");
const pool = mysql.createPool({
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  port: 3303,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

// algemene function om een select query te runnen en het antwoord terug te krijgen als een array
async function queryJSON(query) {
  try {
    console.log(`Queried ${query}`);
    let results = await pool.query(query);
    console.log(` and results in  ${results[0].length} rows.`);
    return results[0];
  } catch (e) {
    console.log(`Error occured for query ${query}`);
    console.log(e);
    return [];
  }
}

//voeg een zeker aaantal van een product voor voor een klant toe aan de winkelwagen
// aantal kan negatief zijn, als <=0 dan is dat product niet meer in de winkelwagen "DEletE"
//als product nog niet in de winkelwagen, voeg dan toe "INSERT"
//als product al in winkelwagen, update dan het aantal "UPDATE"
sqlsvc.post(
  "/add2cart/klant/:klant/product/:product/aantal/:aantal",
  async function (req, res) {
    console.log(req.body);
    console.log(req.param);
    let klant = pool.escape(Number(req.params.klant));
    let product = pool.escape(Number(req.params.product));
    let aantal = pool.escape(Number(req.params.aantal));
    console.log(
      `SELECT aantal FROM cart WHERE klant=${klant} AND product=${product}`
    );
    try {
      let result = await pool.query(
        `SELECT aantal FROM cart WHERE klant=${klant} AND product=${product}`
      );
      if (result[0].length > 0) {
        console.log(result[0]);
        aantal = Number(result[0][0].aantal) + Number(aantal);
        if (aantal <= 0)
          query = `DEletE FROM cart WHERE klant=${klant} AND product=${product}`;
        else {
          query = `UPDATE cart SET aantal=${aantal} WHERE klant=${klant} AND product=${product}`;
        }
      } else {
        if (aantal > 0) {
          query = `INSERT INTO cart (klant, product, aantal) VALUES (${klant}, ${product}, ${aantal})`;
        } //do nothing for negative amounts
        else {
          res.end('{ "status": "done" }');
          return;
        }
      }
      console.log(query);
      result = await pool.query(query);
      res.end('{ "status": "done" }');
    } catch (e) {
      console.log("select error" + e);
      res.end('{ "status": "failure" }');
    }
  }
);

//hulpfunction om alle winkelwagens leeg te maken
sqlsvc.delete("/initcart", async function (req, res) {
  let query = `DEletE FROM cart`;
  try {
    let results = await pool.query(query);
    console.log(`Deleted all from cart.`);
    res.end('{ "status": "done" }');
  } catch (e) {
    console.log(e);
    res.end('{ "status": "failure" }');
  }
});

//haalt de inhoud van de winkelwagen op
sqlsvc.get("/cart", async function (req, res) {
  let klant = pool.escape(Number(req.query.klant));
  let query =
    "SELECT products.omschrijving, products.prijs, cart.aantal FROM cart ";
  query +=
    "INNER JOIN products ON cart.product = products.id WHERE klant=" + klant;
  let result = await queryJSON(query);
  console.log(result);
  res.end(JSON.stringify(result));
});

//haalt de lijst met producten op - voor dropdown
sqlsvc.get("/producten", async function (req, res) {
  let result = await queryJSON(
    "SELECT id, CONCAT(omschrijving, ' a ', FORMAT(prijs, 2)) as omschrijving FROM products;"
  );

  res.end(JSON.stringify(result));
});

sqlsvc.get("/prod", async (req, res) => {
  const query =
    "SELECT id, CONCAT(omschrijving, ' a ', FORMAT(prijs, 2)) as omschrijving FROM products;";
  let results = await pool.query(query);

  console.log(`these are the results ${results[0]}`);
  const abc = JSON.stringify(results[0]);
  console.log(abc);
  res.end("");
});

//haalt de lijst met klanten op - voor dropdown
sqlsvc.get("/klanten", async function (req, res) {
  let result = await queryJSON("SELECT id, naam FROM klant");
  res.end(JSON.stringify(result));
});

//Om SPO problemen te voorkomen, haal de in indexpagina op via de server
sqlsvc.get("/index", async function (req, res) {
  res.sendFile("indexV2.html", { root: __dirname });
});

// //start de server
// const server = sqlsvc.listen(appPort, function () {
//   let port = server.address().port;
//   console.log(`Example sqlsvc listening at ${serverTarget}:${port}`);
// });

// // -----------------

// // global error handling
// sqlsvc.use((err, req, res, next) => {
//   console.log(err.stack);
//   console.log(err.name);
//   console.log(err.code);
//   res.status(500).json({ message: "something broke" });
// });

sqlsvc.listen(appPort, () => {
  console.log(`server listen port ${appPort}`);
});
