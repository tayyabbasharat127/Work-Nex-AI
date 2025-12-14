 const express = require('express');
const router = express.Router();

 const User = require('../models/organization');
  const {signup,verifyOTP,login} = require('../controller/auth');
  
  router.post('/signup',signup);
  router.post('/verifyOTP',verifyOTP);
  router.post('/login',login);



  module.exports = router;