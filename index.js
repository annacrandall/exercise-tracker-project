const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose'); 
const bodyParser = require('body-parser'); 
const moment = require('moment');
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
  date: {type: String}
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
  if (!date) {
    return new Date().toDateString();
  }
  const correctDate = new Date();
  const dateString = date.split("-");
  correctDate.setFullYear(dateString[0]);
  correctDate.setDate(dateString[2]);
  correctDate.setMonth(dateString[1] - 1);

  return correctDate.toDateString();
};


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

app.get('/api/users/:_id/logs', (req, res)=> {
  const {from, to, limit} = req.query;
  let id = req.params._id;
  const startDate = moment(from)
  const endDate = moment(to)
  let d = startDate
  User.findById(id, (err, data) => {
    if(err) return console.log(err);
    let log = data.log;
      if(from === undefined || to === undefined){
        let array = [];
        for(let i in log){
          if(array >= limit){break;}
          let info = {description: log[i]['description'],
                      duration: log[i]['duration'], 
                      date: new Date((log[i]['date'])).toDateString()}
        array.push(info);
      }
    res.json({
    _id: data._id,
    username: data.username,
    count:  array.length,
    log: array
  });
  }
    
else {    let matches = [];
  while (+d.toDate() < +endDate.toDate()) {
    let next_date = (new Date(d).toDateString());
    d = d.add(1, 'days')
    for(let i in log){
      if(log[i]['date'] === next_date){
        if(matches >= limit){break;}
        let info = {description: log[i]['description'],
                      duration: log[i]['duration'], 
                      date: new Date((log[i]['date'])).toDateString()}
        matches.push(info);
      }
    }
  }
  res.json({
    _id: data._id,
    username: data.username,
    count:  matches.length,
    log: matches
  });}
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
// set up port 
