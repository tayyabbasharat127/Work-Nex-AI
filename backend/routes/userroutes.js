const User = require("../models/user");
const express = require("express");
const router = express.Router();
const {
  createuser,
  getuser,
  updateuser,
  deleteuser,
} = require("../controller/user");
router.post("/createuser", createuser);
router.post("/getuser", getuser);
router.put("/users/:id", updateuser);
router.delete("/users/:id", deleteuser);

module.exports = router;
