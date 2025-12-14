 const express = require('express');
 const router = express.Router();
 const {createleave} = require('../controller/leave');
 router.post('/createleave',createleave);
 module.exports = router;