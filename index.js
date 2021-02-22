const News = require("./models/News");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 8080;
app.use(cors());
require("dotenv").config();
mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    if (err) console.log(err);
    console.log("db baglandı");
  }
);
// function delay(x) {
//   return new Promise((res) => setTimeout(() => res()), x);
// }

app.get("/", async function (req, res) {
  // for (let i = 0; i < 999999; i++) {

  //   await delay(60000 * 60 * 12);
  // }
  const data = await pptr();
  let fixedData = [];
  for (let i = 0; i < data.length; i++) {
    let singleData = await News.findOne({ title: data[i].title });
    if (!singleData) {
      fixedData.push(data[i]);
    }
  }
  if (fixedData.length > 0) {
    await News.insertMany(fixedData);
  }
  res.json(fixedData);
});

app.listen(PORT, function () {
  console.log(`Server running on http://localhost:${PORT}`);
});

function urlMaker(text) {
  let trMap = {
    çÇ: "c",
    ğĞ: "g",
    şŞ: "s",
    üÜ: "u",
    ıİ: "i",
    öÖ: "o",
  };
  for (let key in trMap) {
    text = text.replace(new RegExp("[" + key + "]", "g"), trMap[key]);
  }
  return text
    .replace(/[^-a-zA-Z0-9\s]+/gi, "")
    .replace(/\s/gi, "-")
    .replace(/[-]+/gi, "-")
    .toLowerCase();
}

async function pptr() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto("https://kriptokoin.com/haberler/", {
    waitUntil: "networkidle2",
  });
  let myArray = [];
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".entry-title>a")).map(
      (item) => item.href
    )
  );
  const linksFixed = links.filter((link) => link !== "");
  const lastItem = await News.find({}).sort({ id: -1 }).limit(1);
  let id = lastItem[0].id + 1;

  for (let i = 0; i < 10; i++) {
    await page.goto(linksFixed[i]);
    await page.waitForSelector(".entry-title");

    const title = await page.evaluate(() => {
      try {
        return document.querySelector(".entry-title").innerText;
      } catch {
        return null;
      }
    });
    const image = await page.evaluate(async () => {
      return document
        .querySelector('figure[class="post-gallery"]>img')
        .getAttribute("data-original");
    });
    const content = await page.evaluate(async () => {
      let realContent = ``;

      const contentList = Array.from(
        document.querySelectorAll(
          'div[class="post-content entry-content cf"]>p'
        )
      );
      for (let i = 0; i < contentList.length; i++) {
        if (contentList[i].innerText) {
          realContent += " " + contentList[i].innerText;
        }
      }
      return realContent;
    });
    let category;
    if (category === undefined) {
      if (title.indexOf("Bitcoin") !== -1 || title.indexOf("bitcoin") !== -1) {
        category = "Bitcoin";
      }
    }
    if (category === undefined) {
      if (
        title.indexOf("Altcoin") !== -1 ||
        title.indexOf("altcoin") !== -1 ||
        title.indexOf("Ethereum") !== -1 ||
        title.indexOf("Ripple") !== -1 ||
        title.indexOf("coin") !== -1 ||
        title.indexOf("Coin") !== -1
      ) {
        category = "Altcoin";
      }
    }

    if (category === undefined) {
      category = "Genel";
    }

    myArray.push({
      id,
      category,
      title: title,
      image: image,
      content: `${content}`,
      url: urlMaker(title.replace(/ /g, "-").toLocaleLowerCase("en-US")),

      source: linksFixed[i],
    });
    id++;
  }

  browser.close();
  return myArray;
}
