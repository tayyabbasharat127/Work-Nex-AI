const express = require("express");
const router = express.Router();

const authorizeRoles = require("../middleware/authorizeRoles");
const authenticateToken = require("../middleware/authentication");
const {
  createUser,
  getUser,
  updateUser,
  deleteUser,
} = require("../controller/user");

router.post("/createuser", authenticateToken,  authorizeRoles(1), createUser);
router.get("/getuser", authenticateToken, getUser);
router.put("/users/:id", authenticateToken, authorizeRoles(1), updateUser);
router.delete("/users/:id", authenticateToken, authorizeRoles(1), deleteUser);

module.exports = router;
