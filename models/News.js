const mongoose = require("mongoose");
const NewsSchema = new mongoose.Schema({
  id: Number,
  category: String,
  title: String,
  image: String,
  content: String,
  url: String,
  date: { type: Date, default: Date.now },
  source: String,
});

module.exports = mongoose.models.News || mongoose.model("News", NewsSchema);
