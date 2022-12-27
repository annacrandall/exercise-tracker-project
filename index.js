const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose'); 
const bodyParser = require('body-parser'); 
require('dotenv').config()
// set up packages 

app.use(cors()); 
app.use(express.static('public')); 
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({extended:false})); 
app.use(bodyParser.json()); 
//app middleware

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true}); 
// set up mongoose connection 

const Schema = mongoose.Schema; 

const exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true}, 
  date: String
})
// create schema for exercise 
const userSchema = new Schema({
  username: {type: String, required: true}, 
  log: [exerciseSchema], 
  count: Number
}); 
// create schema for users, include exercise schema as log field 

const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);
// create models for both schemas 

app.post('/api/users', async (req, res) => {
  const {username} = req.body; 
  let user = await User.findOne({username: req.body.username}); 
  if (!user) {
    user = new User({username: username}); 
    await user.save(); 
    res.status(200).send(user)
  }
  else {
    res.status(400).send('User already exists'); 
  }
});
// create a new user in db 

app.get('/api/users', (req, res) => {
  User.find()
  .then((result) => res.status(200).json(result))
  .catch((error) => res.status(400).send(error)); 
}); 

const getDate = (date) => {
  const d = new Date().toLocaleString();
}

app.get("/api/users/:_id/logs", (req, res) => {
  User.findById(req.params._id).then((result) => {
    let resObj = result;

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }
      
      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      resObj.log = resObj.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }
    if (req.query.limit) {
      resObj.log = resObj.log.slice(0, req.query.limit);
    }
    resObj["count"] = result.log.length;
    res.json(resObj);
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;

  let exercise = new Exercise({
    description: description,
    duration: duration,
    date: getDate(date)
  });

  await exercise.save();

  User.findByIdAndUpdate(
    req.params._id,
    { $push: { log: exercise } },
    { new: true }
  ).then((result) => {
    let resObj = {};
    resObj["_id"] = result._id;
    resObj["username"] = result.username;
    resObj["date"] = exercise.date;
    resObj["duration"] = exercise.duration;
    resObj["description"] = exercise.description;

    res.json(resObj);
  })
    .catch(error => res.status(400).send(error));
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
// set up port 
