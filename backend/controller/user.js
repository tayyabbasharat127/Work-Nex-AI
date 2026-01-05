const { User } = require('../models/user');
exports.createuser = async (req, res) => {
  try {
    const { email } = req.body;
    if (await User.findOne({ where: { email } }))
      return res.status(400).json({ success: false, message: "Email already exists" });

    const user = await User.create(req.body);
    const data = user.toJSON(); delete data.password;
    res.status(201).json({ success: true, message: "User created", data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.getuser = async (req,res)=>{
  try {
    const alluser = await User.findAll();
    if(!alluser || alluser.length == 0){
      return res.status(404).json({message:'No user Found'});
    }
    return res.status(201).json(alluser);
  } catch (error) { res.status(500).json({ success: false, message: e.message }); }
}
exports.updateuser = async (req, res) => {
  try {
    const id = req.params.id; 

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required in URL params"
      });
    }

    const [updated] = await User.update(req.body, { where: { id } });

    if (updated === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ["password"] }
    });
  // sequelixe method used to find prinary key via id and in atribute exlude passowrd happens to not show 
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });

  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
exports.deleteuser = async(req,res)=>{
  try {
     const {id} = req.params;
     const deleteuser = await User.destroy({where: {id}});
     return res.status(200).json({ success:true,message:'User deleted Successfully'});
  } catch (e) {
    return res.status(500).json({success:false,message:e.message});
    
  }
};