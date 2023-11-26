const ngrok = require('ngrok');
const express = require('express');

async function run() {
  const server = express();

  server.post('', async (req, res) => {
    console.log(req.body);
    res.sendStatus(200);
  })

  const url = await ngrok.connect(3000);
  console.log(`URL: ${url}`);
}

run();
