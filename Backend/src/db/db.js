const mongoose = require('mongoose');

async function connectDB(){
  try{
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to Database')
  }catch(err){
    console.log("Failed to connect to Database",err)
  }
}

module.exports = connectDB;